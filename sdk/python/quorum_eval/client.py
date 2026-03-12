from __future__ import annotations

import time
from typing import Generator, Literal

import httpx

from .exceptions import (
    AuthenticationError,
    EvaluationError,
    NotFoundError,
    QuorumError,
    RateLimitError,
    TimeoutError,
)
from .models import BenchmarkResult, EvaluationResult, TestCase

_DEFAULT_BASE_URL = "https://app.quorum.ai"
_POLL_INTERVAL = 2  # seconds between status polls
_DEFAULT_TIMEOUT = 300  # seconds


def _normalize_test_cases(test_cases: list[TestCase | dict]) -> list[dict]:
    result = []
    for tc in test_cases:
        if isinstance(tc, dict):
            result.append({
                "input": tc.get("input") or tc.get("input"),
                "actualOutput": tc.get("actualOutput") or tc.get("actual_output"),
                "retrievalContext": tc.get("retrievalContext") or tc.get("retrieval_context", []),
                **({"expectedOutput": tc["expectedOutput"]} if "expectedOutput" in tc else {}),
                **({"expectedOutput": tc["expected_output"]} if "expected_output" in tc else {}),
                **({"metadata": tc["metadata"]} if "metadata" in tc else {}),
            })
        else:
            result.append(tc.to_api_dict())
    return result


def _raise_for_status(response: httpx.Response) -> None:
    if response.status_code == 401:
        raise AuthenticationError("Invalid or missing API key", status_code=401)
    if response.status_code == 429:
        raise RateLimitError("Rate limit exceeded", status_code=429)
    if response.status_code == 404:
        raise NotFoundError("Resource not found", status_code=404)
    if response.status_code >= 400:
        try:
            detail = response.json().get("error", response.text)
        except Exception:
            detail = response.text
        raise QuorumError(f"API error {response.status_code}: {detail}", status_code=response.status_code)


class QuorumClient:
    """
    Synchronous client for the Quorum RAG evaluation platform.

    Usage::

        from quorum_eval import QuorumClient

        client = QuorumClient(api_key="qrm_...")
        result = client.evaluate(
            test_cases=[{
                "input": "What is the capital of France?",
                "actualOutput": "Paris.",
                "retrievalContext": ["Paris is the capital of France."],
            }]
        )
        print(result.summary.pass_rate)
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = _DEFAULT_BASE_URL,
        timeout: int = _DEFAULT_TIMEOUT,
    ):
        self._base_url = base_url.rstrip("/")
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "quorum-eval-python/0.1.0",
        }
        self._timeout = timeout

    def _get(self, path: str) -> httpx.Response:
        with httpx.Client(headers=self._headers, timeout=30) as client:
            response = client.get(f"{self._base_url}{path}")
        _raise_for_status(response)
        return response

    def _post(self, path: str, body: dict) -> httpx.Response:
        with httpx.Client(headers=self._headers, timeout=30) as client:
            response = client.post(f"{self._base_url}{path}", json=body)
        _raise_for_status(response)
        return response

    def evaluate(
        self,
        test_cases: list[TestCase | dict],
        strategy: Literal["auto", "council", "hybrid", "single"] = "auto",
        name: str | None = None,
        timeout: int | None = None,
    ) -> EvaluationResult:
        """
        Submit test cases for evaluation and block until complete.

        :param test_cases: List of TestCase objects or dicts with input/actualOutput/retrievalContext.
        :param strategy: Evaluation strategy. 'auto' uses adaptive risk-based routing.
        :param name: Optional label for this evaluation run.
        :param timeout: Max seconds to wait. Defaults to client timeout.
        :returns: EvaluationResult with per-case verdicts and summary statistics.
        :raises TimeoutError: If evaluation does not complete within timeout.
        :raises EvaluationError: If the evaluation fails on the server.
        """
        payload = {
            "testCases": _normalize_test_cases(test_cases),
            "options": {"strategy": strategy},
        }
        if name:
            payload["name"] = name

        response = self._post("/api/evaluate", payload)
        job_id = response.json()["jobId"]

        deadline = time.time() + (timeout or self._timeout)
        while time.time() < deadline:
            result_res = self._get(f"/api/results/{job_id}")
            data = result_res.json()

            if result_res.status_code == 200 and data.get("status") == "complete":
                return EvaluationResult.model_validate(data)

            if data.get("status") == "failed":
                raise EvaluationError(f"Evaluation {job_id} failed on the server")

            time.sleep(_POLL_INTERVAL)

        raise TimeoutError(
            f"Evaluation {job_id} did not complete within {timeout or self._timeout}s"
        )

    def evaluate_stream(
        self,
        test_cases: list[TestCase | dict],
        strategy: Literal["auto", "council", "hybrid", "single"] = "auto",
        name: str | None = None,
    ) -> Generator[dict, None, None]:
        """
        Submit test cases and yield SSE events as they arrive.

        Each yielded value is a dict with 'event' and 'data' keys.
        The stream ends with an 'evaluation_complete' or 'evaluation_error' event.

        Usage::

            for event in client.evaluate_stream(test_cases):
                print(event["event"], event["data"])
        """
        payload = {
            "testCases": _normalize_test_cases(test_cases),
            "options": {"strategy": strategy},
        }
        if name:
            payload["name"] = name

        response = self._post("/api/evaluate", payload)
        job_id = response.json()["jobId"]

        with httpx.Client(headers=self._headers, timeout=self._timeout) as client:
            with client.stream("GET", f"{self._base_url}/api/stream/{job_id}") as stream:
                _raise_for_status(stream)
                event_name = None
                for line in stream.iter_lines():
                    if line.startswith("event:"):
                        event_name = line[6:].strip()
                    elif line.startswith("data:") and event_name:
                        import json
                        try:
                            data = json.loads(line[5:].strip())
                        except json.JSONDecodeError:
                            data = line[5:].strip()
                        yield {"event": event_name, "data": data}
                        if event_name in ("evaluation_complete", "evaluation_error", "replay_complete"):
                            return
                        event_name = None

    def get_result(self, job_id: str) -> EvaluationResult:
        """Retrieve a completed evaluation result by job ID."""
        response = self._get(f"/api/results/{job_id}")
        return EvaluationResult.model_validate(response.json())

    def run_benchmark(self, timeout: int = 600) -> BenchmarkResult:
        """
        Run the canonical calibration benchmark.

        Compares council evaluation vs single-judge on 80 curated test cases
        with human-labeled ground truth. Blocks until complete.

        :returns: BenchmarkResult with statistical comparison.
        """
        response = self._post("/api/benchmark/run", {})
        run_id = response.json()["runId"]

        deadline = time.time() + timeout
        while time.time() < deadline:
            result_res = self._get(f"/api/benchmark/runs/{run_id}")
            data = result_res.json()
            if data.get("status") == "complete":
                return BenchmarkResult.model_validate(data)
            if data.get("status") == "failed":
                raise EvaluationError(f"Benchmark run {run_id} failed")
            time.sleep(3)

        raise TimeoutError(f"Benchmark run {run_id} did not complete within {timeout}s")

    def list_evaluations(self, limit: int = 20, cursor: str | None = None) -> dict:
        """List past evaluations with cursor-based pagination."""
        params = f"?limit={limit}"
        if cursor:
            params += f"&cursor={cursor}"
        response = self._get(f"/api/history{params}")
        return response.json()

"""
quorum-eval — Python client for the Quorum RAG evaluation platform.

Quick start::

    from quorum_eval import QuorumClient

    client = QuorumClient(api_key="qrm_...")
    result = client.evaluate(
        test_cases=[{
            "input": "What is the capital of France?",
            "actualOutput": "Paris is the capital.",
            "retrievalContext": ["Paris is the capital and most populous city of France."],
        }],
        strategy="auto",
    )
    print(f"Pass rate: {result.pass_rate:.1%}")
    print(f"Total cost: ${result.summary.total_cost:.4f}")
"""

from .client import QuorumClient
from .models import (
    BenchmarkResult,
    BenchmarkStatistics,
    EvaluationResult,
    EvaluationSummary,
    JudgeResult,
    TestCase,
    TestCaseResult,
)
from .exceptions import (
    AuthenticationError,
    EvaluationError,
    NotFoundError,
    QuorumError,
    RateLimitError,
    TimeoutError,
)

__version__ = "0.1.0"
__all__ = [
    "QuorumClient",
    "TestCase",
    "EvaluationResult",
    "EvaluationSummary",
    "TestCaseResult",
    "JudgeResult",
    "BenchmarkResult",
    "BenchmarkStatistics",
    "QuorumError",
    "AuthenticationError",
    "RateLimitError",
    "EvaluationError",
    "TimeoutError",
    "NotFoundError",
]

"""
CI quality gate — fail the build if evaluation pass rate falls below threshold.

Usage in a CI script:
    python examples/ci_gate.py tests/eval_cases.json --threshold 0.80

Exit code 0 = pass, 1 = fail.
"""
import json
import os
import sys

from quorum_eval import QuorumClient, EvaluationError, TimeoutError

THRESHOLD = float(os.environ.get("QUORUM_PASS_THRESHOLD", "0.80"))

def main():
    if len(sys.argv) < 2:
        print("Usage: python ci_gate.py <test_cases.json> [--threshold 0.80]")
        sys.exit(2)

    test_cases_path = sys.argv[1]

    threshold = THRESHOLD
    if "--threshold" in sys.argv:
        idx = sys.argv.index("--threshold")
        threshold = float(sys.argv[idx + 1])

    with open(test_cases_path) as f:
        test_cases = json.load(f)

    client = QuorumClient(api_key=os.environ["QUORUM_API_KEY"])

    print(f"Running evaluation on {len(test_cases)} test cases (threshold: {threshold:.0%})...")

    try:
        result = client.evaluate(test_cases, strategy="auto")
    except TimeoutError as e:
        print(f"TIMEOUT: {e}")
        sys.exit(1)
    except EvaluationError as e:
        print(f"EVALUATION ERROR: {e}")
        sys.exit(1)

    pass_rate = result.pass_rate
    total_cost = result.summary.total_cost if result.summary else 0

    print(f"\nResults:")
    print(f"  Pass rate:  {pass_rate:.1%}  (threshold: {threshold:.0%})")
    print(f"  Total cost: ${total_cost:.6f}")
    print(f"  Job ID:     {result.job_id}")

    for r in result.results:
        verdict = r.verdict or "—"
        score = f"{r.final_score:.2f}" if r.final_score is not None else "—"
        status = "✓" if verdict == "PASS" else "✗"
        print(f"  {status} Case {r.test_case_index}: {verdict} ({score}) [{r.strategy}]")

    if pass_rate < threshold:
        print(f"\nFAIL: Pass rate {pass_rate:.1%} is below threshold {threshold:.0%}")
        sys.exit(1)

    print(f"\nPASS: {pass_rate:.1%} pass rate meets threshold {threshold:.0%}")
    sys.exit(0)


if __name__ == "__main__":
    main()

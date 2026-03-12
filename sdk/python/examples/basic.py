"""Basic evaluation example."""
import os
from quorum_eval import QuorumClient

client = QuorumClient(api_key=os.environ["QUORUM_API_KEY"])

result = client.evaluate(
    test_cases=[
        {
            "input": "What are the side effects of ibuprofen?",
            "actualOutput": "Ibuprofen is completely safe and has no side effects.",
            "retrievalContext": [
                "Common ibuprofen side effects include stomach pain, nausea, heartburn, "
                "dizziness, and increased risk of GI bleeding. Rare but serious risks include "
                "cardiovascular events and renal impairment."
            ],
        },
        {
            "input": "What is the capital of France?",
            "actualOutput": "The capital of France is Paris.",
            "retrievalContext": ["Paris is the capital and most populous city of France."],
        },
    ],
    strategy="auto",
    name="Basic example",
)

print(f"Pass rate:  {result.pass_rate:.1%}")
print(f"Total cost: ${result.summary.total_cost:.6f}")
print()

for r in result.results:
    verdict = r.verdict or "—"
    score = f"{r.final_score:.2f}" if r.final_score is not None else "—"
    print(f"  Case {r.test_case_index}: {verdict} (score: {score}, strategy: {r.strategy})")

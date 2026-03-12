# quorum-eval

Python client for the [Quorum](https://quorum.ai) RAG evaluation platform — Council of LLMs.

## Install

```bash
pip install quorum-eval
```

## Quick start

```python
from quorum_eval import QuorumClient

client = QuorumClient(api_key="qrm_...")

result = client.evaluate(
    test_cases=[{
        "input": "What is the boiling point of water?",
        "actualOutput": "Water boils at 100°C at sea level.",
        "retrievalContext": ["The boiling point of water at standard pressure is 100°C (212°F)."],
    }],
    strategy="auto",  # council | hybrid | single | auto
)

print(f"Pass rate: {result.pass_rate:.1%}")
print(f"Cost:      ${result.summary.total_cost:.4f}")
```

## Streaming

```python
for event in client.evaluate_stream(test_cases):
    print(event["event"], event["data"])
```

## CI gate

```python
from quorum_eval import QuorumClient, EvaluationError
import sys

client = QuorumClient(api_key=os.environ["QUORUM_API_KEY"])
result = client.evaluate(test_cases, strategy="auto")

if result.pass_rate < 0.80:
    print(f"FAIL: {result.pass_rate:.1%} below threshold")
    sys.exit(1)
```

## Calibration benchmark

```python
benchmark = client.run_benchmark()
stats = benchmark.statistics

print(f"Council accuracy:       {stats.council.accuracy:.0%}")
print(f"Single-judge accuracy:  {stats.single_openai.accuracy:.0%}")
print(f"Delta:                  +{stats.council_vs_single_openai_delta:.0%}")
print(f"Statistically sig.:     {stats.statistically_significant_vs_openai}")
```

## Strategies

| Strategy | When | Cost/case |
|----------|------|-----------|
| `council` | High-stakes (medical, legal, financial) | ~$0.0035 |
| `hybrid` | Medium-risk queries | ~$0.0002 |
| `single` | Low-risk factoids | ~$0.00005 |
| `auto` | Adaptive risk-based routing | Variable |

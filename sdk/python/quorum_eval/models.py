from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel, Field


class TestCase(BaseModel):
    input: str = Field(..., min_length=1, max_length=1000)
    actual_output: str = Field(..., min_length=1, max_length=5000, alias="actualOutput")
    retrieval_context: list[str] = Field(..., min_length=1, alias="retrievalContext")
    expected_output: str | None = Field(None, alias="expectedOutput")
    metadata: dict[str, Any] | None = None

    model_config = {"populate_by_name": True}

    def to_api_dict(self) -> dict:
        return {
            "input": self.input,
            "actualOutput": self.actual_output,
            "retrievalContext": self.retrieval_context,
            **({"expectedOutput": self.expected_output} if self.expected_output else {}),
            **({"metadata": self.metadata} if self.metadata else {}),
        }


class TokenUsage(BaseModel):
    input: int = 0
    output: int = 0
    total: int = 0


class JudgeResult(BaseModel):
    judge: str
    metric: str
    model: str
    score: float | None
    reason: str | None = None
    tokens: TokenUsage | None = None
    cost: float | None = None
    latency: int | None = None
    error: str | None = None


class DeterministicCheck(BaseModel):
    score: float
    detail: str | None = None


class DeterministicChecks(BaseModel):
    entity_match: DeterministicCheck | None = Field(None, alias="entityMatch")
    freshness: DeterministicCheck | None = None
    context_overlap: DeterministicCheck | None = Field(None, alias="contextOverlap")
    completeness: DeterministicCheck | None = None
    avg_score: float | None = Field(None, alias="avgScore")

    model_config = {"populate_by_name": True}


class AggregatorResult(BaseModel):
    model: str | None = None
    final_score: float | None = Field(None, alias="finalScore")
    verdict: Literal["PASS", "WARN", "FAIL", "ERROR"] | None = None
    synthesis: str | None = None
    disagreements: list[str] = []
    recommendation: str | None = None
    tokens: TokenUsage | None = None
    cost: float | None = None
    latency: int | None = None
    error: str | None = None

    model_config = {"populate_by_name": True}


class TestCaseResult(BaseModel):
    test_case_index: int = Field(..., alias="testCaseIndex")
    strategy: Literal["council", "hybrid", "single"] | None = None
    risk_score: float | None = Field(None, alias="riskScore")
    judges: dict[str, JudgeResult] = {}
    aggregator: AggregatorResult | None = None
    deterministic_checks: DeterministicChecks | None = Field(None, alias="deterministicChecks")
    strategy_cost: float | None = Field(None, alias="strategyCost")

    model_config = {"populate_by_name": True}

    @property
    def verdict(self) -> str | None:
        return self.aggregator.verdict if self.aggregator else None

    @property
    def final_score(self) -> float | None:
        return self.aggregator.final_score if self.aggregator else None


class EvaluationSummary(BaseModel):
    avg_faithfulness: float | None = Field(None, alias="avgFaithfulness")
    avg_groundedness: float | None = Field(None, alias="avgGroundedness")
    avg_relevancy: float | None = Field(None, alias="avgRelevancy")
    avg_final_score: float | None = Field(None, alias="avgFinalScore")
    pass_rate: int | None = Field(None, alias="passRate")
    total_cost: float | None = Field(None, alias="totalCost")
    strategy_counts: dict[str, int] = Field(default_factory=dict, alias="strategyCounts")
    cost_by_strategy: dict[str, float] = Field(default_factory=dict, alias="costByStrategy")
    avg_risk_score: float | None = Field(None, alias="avgRiskScore")

    model_config = {"populate_by_name": True}


class EvaluationResult(BaseModel):
    job_id: str = Field(..., alias="jobId")
    status: str
    summary: EvaluationSummary | None = None
    results: list[TestCaseResult] = []

    model_config = {"populate_by_name": True}

    @property
    def passed(self) -> bool:
        return self.summary is not None and (self.summary.pass_rate or 0) == 100

    @property
    def pass_rate(self) -> float:
        if self.summary is None:
            return 0.0
        return (self.summary.pass_rate or 0) / 100


class BenchmarkEvaluatorStats(BaseModel):
    accuracy: float | None = None
    precision: float | None = None
    recall: float | None = None
    f1: float | None = None
    cohens_kappa: float | None = Field(None, alias="cohensKappa")
    kappa_ci95: dict | None = Field(None, alias="kappaCI95")
    avg_cost: float | None = Field(None, alias="avgCost")
    avg_latency: float | None = Field(None, alias="avgLatency")
    per_domain: dict | None = Field(None, alias="perDomain")

    model_config = {"populate_by_name": True}


class BenchmarkStatistics(BaseModel):
    council: BenchmarkEvaluatorStats | None = None
    single_openai: BenchmarkEvaluatorStats | None = Field(None, alias="singleOpenai")
    single_gemini: BenchmarkEvaluatorStats | None = Field(None, alias="singleGemini")
    council_vs_single_openai_delta: float | None = Field(None, alias="councilVsSingleOpenaiDelta")
    mcnemar_p_value_vs_openai: float | None = Field(None, alias="mcnemarPValueVsOpenai")
    statistically_significant_vs_openai: bool | None = Field(None, alias="statisticallySignificantVsOpenai")
    total_cases: int | None = Field(None, alias="totalCases")
    pass_cases: int | None = Field(None, alias="passCases")
    fail_cases: int | None = Field(None, alias="failCases")

    model_config = {"populate_by_name": True}


class BenchmarkResult(BaseModel):
    run_id: str = Field(..., alias="runId")
    status: str
    dataset_version: str | None = Field(None, alias="datasetVersion")
    total_cases: int | None = Field(None, alias="totalCases")
    statistics: BenchmarkStatistics | None = None

    model_config = {"populate_by_name": True}

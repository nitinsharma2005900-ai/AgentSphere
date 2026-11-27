import asyncio
import time
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from ..providers.gateway import gateway
from ..providers.base import Message

class RegressionTestCase(BaseModel):
    id: str
    name: str
    prompt: str
    system_instruction: str = ""
    expected_keywords: List[str] = Field(default_factory=list)
    max_acceptable_latency_ms: float = 2000.0

class EvaluationResult(BaseModel):
    test_id: str
    name: str
    passed: bool
    latency_ms: float
    tokens_used: int
    cost_usd: float
    output_preview: str
    notes: str

class PromptRegressionRunner:
    def __init__(self):
        self.default_dataset: List[RegressionTestCase] = [
            RegressionTestCase(
                id="REG-01",
                name="Customer Support Intent Classification",
                prompt="Customer says: 'I cannot log into my account after password reset'. Categorize intent.",
                system_instruction="You are a customer support agent classifier. Return the intent category.",
                expected_keywords=["account", "login", "password"]
            ),
            RegressionTestCase(
                id="REG-02",
                name="Workflow Node Execution Summarizer",
                prompt="Summarize execution state: 12 nodes passed, 1 pending approval, 0 errors.",
                system_instruction="Provide executive status summary in 1 sentence.",
                expected_keywords=["execution", "approval", "nodes"]
            ),
            RegressionTestCase(
                id="REG-03",
                name="Tool Execution Format Compliance",
                prompt="Calculate the monthly cost of 15 million tokens at $0.30 per million.",
                system_instruction="Answer clearly with the final figure.",
                expected_keywords=["4.5", "cost", "tokens"]
            ),
            RegressionTestCase(
                id="REG-04",
                name="Knowledge RAG Context Grounding",
                prompt="According to the company policy document, what is the maximum document upload size limit?",
                system_instruction="Context: The company AgentSphere platform sets a maximum file size limit of 25MB for document uploads.",
                expected_keywords=["25mb", "limit"]
            )
        ]

    async def run_evaluation_suite(self, provider: str = "mock") -> Dict[str, Any]:
        results: List[EvaluationResult] = []
        total_tokens = 0
        total_cost = 0.0

        for test in self.default_dataset:
            start_time = time.perf_counter()
            messages = [Message(role="user", content=test.prompt)]
            
            try:
                response = await gateway.generate_response(
                    messages=messages,
                    provider_name=provider,
                    system_instruction=test.system_instruction,
                    temperature=0.2,
                    max_tokens=500
                )
                latency = round((time.perf_counter() - start_time) * 1000, 2)
                content_lower = response.content.lower()

                # Check keyword assertion
                keywords_matched = [kw for kw in test.expected_keywords if kw.lower() in content_lower]
                passed = (len(keywords_matched) > 0 or not test.expected_keywords) and latency <= test.max_acceptable_latency_ms

                tokens = response.usage.total_tokens
                cost = response.usage.estimated_cost_usd
                total_tokens += tokens
                total_cost += cost

                results.append(EvaluationResult(
                    test_id=test.id,
                    name=test.name,
                    passed=passed,
                    latency_ms=latency,
                    tokens_used=tokens,
                    cost_usd=cost,
                    output_preview=response.content[:120] + "...",
                    notes=f"Matched {len(keywords_matched)}/{len(test.expected_keywords)} keywords. Provider: {response.provider}"
                ))
            except Exception as e:
                latency = round((time.perf_counter() - start_time) * 1000, 2)
                results.append(EvaluationResult(
                    test_id=test.id,
                    name=test.name,
                    passed=False,
                    latency_ms=latency,
                    tokens_used=0,
                    cost_usd=0.0,
                    output_preview="",
                    notes=f"Failed with exception: {str(e)}"
                ))

        passed_count = sum(1 for r in results if r.passed)
        total_count = len(results)
        pass_rate = round((passed_count / total_count) * 100, 1) if total_count else 0.0

        return {
            "suite_name": "AgentSphere Prompt Regression & Safety Suite",
            "provider_evaluated": provider,
            "timestamp": time.time(),
            "total_tests": total_count,
            "passed_tests": passed_count,
            "pass_rate_percent": pass_rate,
            "total_tokens_consumed": total_tokens,
            "total_estimated_cost_usd": round(total_cost, 6),
            "results": [r.model_dump() for r in results]
        }

regression_runner = PromptRegressionRunner()

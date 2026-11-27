import asyncio
import hashlib
import json
import math
import re
from typing import AsyncGenerator, Dict, Any, List, Optional
from .base import (
    BaseAIProvider,
    Message,
    ToolDefinition,
    ToolCall,
    ExecutionUsage,
    GenerationResponse,
)
from ..core.config import settings

class DeterministicMockProvider(BaseAIProvider):
    def __init__(self, model_name: str = "agentsphere-mock-v1"):
        self.model_name = model_name
        self.provider_name = "mock"

    def _estimate_tokens(self, text: str) -> int:
        return max(1, len(text) // 4)

    def _calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        prompt_cost = (prompt_tokens / 1_000_000.0) * settings.INPUT_COST_PER_M_TOKENS
        completion_cost = (completion_tokens / 1_000_000.0) * settings.OUTPUT_COST_PER_M_TOKENS
        return round(prompt_cost + completion_cost, 6)

    async def generate_response(
        self,
        messages: List[Message],
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        tools: Optional[List[ToolDefinition]] = None,
        response_schema: Optional[Dict[str, Any]] = None,
    ) -> GenerationResponse:
        await asyncio.sleep(0.05) # Tiny simulated latency
        
        last_message = messages[-1].content if messages else ""
        prompt_text = (system_instruction or "") + " " + " ".join([m.content for m in messages])
        prompt_tokens = self._estimate_tokens(prompt_text)

        # Check for tool calling trigger
        tool_calls: Optional[List[ToolCall]] = None
        if tools and len(tools) > 0 and "tool_result" not in last_message:
            lower_msg = last_message.lower()
            if "calculate" in lower_msg or "math" in lower_msg or re.search(r"\d+\s*[\+\-\*\/]\s*\d+", lower_msg):
                for t in tools:
                    if t.name == "calculator":
                        expr_match = re.search(r"(\d+(\.\d+)?\s*[\+\-\*\/]\s*\d+(\.\d+)?)", last_message)
                        expression = expr_match.group(1) if expr_match else "42 * 2"
                        tool_calls = [ToolCall(tool_name="calculator", arguments={"expression": expression})]
                        break
            elif "search" in lower_msg or "find" in lower_msg or "knowledge" in lower_msg:
                for t in tools:
                    if t.name in ["knowledge_search", "document_retrieval"]:
                        query = last_message.replace("search", "").replace("find", "").strip() or "general knowledge"
                        tool_calls = [ToolCall(tool_name=t.name, arguments={"query": query})]
                        break
            elif "time" in lower_msg or "date" in lower_msg:
                for t in tools:
                    if t.name in ["date_time", "time_tool"]:
                        tool_calls = [ToolCall(tool_name=t.name, arguments={"format": "iso"})]
                        break

        if tool_calls:
            content = f"Invoking tool {tool_calls[0].tool_name} with parameters: {json.dumps(tool_calls[0].arguments)}"
        elif response_schema:
            content = json.dumps({
                "status": "success",
                "summary": f"Structured analysis of request: {last_message[:60]}",
                "confidence": 0.98,
                "recommendation": "AgentSphere automated execution proceeding as specified."
            })
        else:
            content = (
                f"[AgentSphere Mock AI] Response to: \"{last_message[:100]}\"\n\n"
                f"Analysis: Request parsed successfully in simulated environment.\n"
                f"Status: Executed deterministically under tenant boundaries.\n"
                f"Details: Verified parameters, instructions ('{system_instruction or 'Standard Agent'}'), "
                f"and resource governance limits."
            )

        content = content[:max_tokens*4]
        completion_tokens = self._estimate_tokens(content)
        total_tokens = prompt_tokens + completion_tokens
        cost = 0.0  # No provider charge occurs for a development mock.

        return GenerationResponse(
            content=content,
            tool_calls=tool_calls,
            finish_reason="tool_calls" if tool_calls else "stop",
            usage=ExecutionUsage(
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                estimated_cost_usd=cost
            ),
            provider=self.provider_name,
            model=self.model_name,
            is_fallback=False
        )

    async def generate_stream(
        self,
        messages: List[Message],
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        tools: Optional[List[ToolDefinition]] = None,
    ) -> AsyncGenerator[str, None]:
        res = await self.generate_response(messages, system_instruction, temperature, max_tokens, tools)
        words = res.content.split(" ")
        for word in words:
            await asyncio.sleep(0.015)
            yield word + " "

    async def check_health(self) -> Dict[str, Any]:
        return {
            "status": "healthy",
            "provider": self.provider_name,
            "model": self.model_name,
            "verified": False,
            "configured": True,
            "note": "Deterministic secondary mock provider active and operational"
        }

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        embeddings = []
        for text in texts:
            words = re.findall(r"\b\w+\b", text.lower())
            dim = 768
            vector = [0.0] * dim
            for i, word in enumerate(words):
                h = int(hashlib.sha256(word.encode()).hexdigest(), 16)
                idx = h % dim
                weight = 1.0 / (1.0 + 0.1 * i)
                vector[idx] += weight
            norm = math.sqrt(sum(x * x for x in vector)) or 1.0
            normalized = [round(x / norm, 6) for x in vector]
            embeddings.append(normalized)
        return embeddings

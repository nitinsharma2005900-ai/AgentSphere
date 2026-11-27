import logging
from typing import AsyncGenerator, Dict, Any, List, Optional
from .base import (
    BaseAIProvider,
    Message,
    ToolDefinition,
    GenerationResponse,
)
from .gemini_provider import GeminiProvider
from .mock_provider import DeterministicMockProvider
from ..core.config import settings

logger = logging.getLogger(__name__)

class ProviderGateway:
    def __init__(self):
        self.gemini_provider = GeminiProvider()
        self.mock_provider = DeterministicMockProvider()
        self.primary_provider_name = settings.AI_PROVIDER.lower()

    def get_provider(self, requested_provider: Optional[str] = None) -> BaseAIProvider:
        target = (requested_provider or self.primary_provider_name).lower()
        if target == "gemini":
            if self.gemini_provider.is_available():
                return self.gemini_provider
            logger.info("Gemini credentials missing or unavailable; using Deterministic Mock Provider.")
            return self.mock_provider
        return self.mock_provider

    async def generate_response(
        self,
        messages: List[Message],
        provider_name: Optional[str] = None,
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        tools: Optional[List[ToolDefinition]] = None,
        response_schema: Optional[Dict[str, Any]] = None,
    ) -> GenerationResponse:
        provider = self.get_provider(provider_name)
        try:
            return await provider.generate_response(
                messages=messages,
                system_instruction=system_instruction,
                temperature=temperature,
                max_tokens=max_tokens,
                tools=tools,
                response_schema=response_schema,
            )
        except Exception as e:
            logger.error(f"Error in primary provider {provider.provider_name}: {e}")
            # Controlled fallback to secondary mock provider if primary was gemini and failed
            if provider.provider_name == "gemini":
                logger.warning("Failing over to Deterministic Mock Provider due to upstream error.")
                fallback_res = await self.mock_provider.generate_response(
                    messages=messages,
                    system_instruction=system_instruction,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    tools=tools,
                    response_schema=response_schema,
                )
                fallback_res.is_fallback = True
                fallback_res.content = f"[Fallback Notice: Gemini upstream unavailable ({str(e)})]\n\n" + fallback_res.content
                return fallback_res
            raise

    async def generate_stream(
        self,
        messages: List[Message],
        provider_name: Optional[str] = None,
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        tools: Optional[List[ToolDefinition]] = None,
    ) -> AsyncGenerator[str, None]:
        provider = self.get_provider(provider_name)
        try:
            async for chunk in provider.generate_stream(
                messages=messages,
                system_instruction=system_instruction,
                temperature=temperature,
                max_tokens=max_tokens,
                tools=tools,
            ):
                yield chunk
        except Exception as e:
            logger.error(f"Streaming failed on {provider.provider_name}: {e}")
            if provider.provider_name == "gemini":
                yield f"[Fallback Notice: Gemini streaming unavailable: {str(e)}]\n\n"
                async for chunk in self.mock_provider.generate_stream(
                    messages=messages,
                    system_instruction=system_instruction,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    tools=tools,
                ):
                    yield chunk
            else:
                raise

    async def check_all_health(self) -> Dict[str, Any]:
        gemini_health = await self.gemini_provider.check_health()
        mock_health = await self.mock_provider.check_health()
        active_provider = "gemini" if self.gemini_provider.is_available() else "mock"
        
        return {
            "status": "healthy" if (mock_health["status"] == "healthy") else "degraded",
            "active_provider": active_provider,
            "providers": {
                "gemini": gemini_health,
                "mock": mock_health
            }
        }

    async def get_embeddings(self, texts: List[str], provider_name: Optional[str] = None) -> List[List[float]]:
        provider = self.get_provider(provider_name)
        try:
            return await provider.get_embeddings(texts)
        except Exception as e:
            logger.warning(f"Embedding generation on {provider.provider_name} failed: {e}; falling back to mock vectorizer.")
            return await self.mock_provider.get_embeddings(texts)

gateway = ProviderGateway()

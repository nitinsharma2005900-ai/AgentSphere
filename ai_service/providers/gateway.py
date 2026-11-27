import asyncio
import json
import logging
from .gemini_provider import GeminiProvider
from .mock_provider import DeterministicMockProvider
from ..core.config import settings
logger = logging.getLogger(__name__)
class ProviderGateway:
    def __init__(self):
        self.gemini_provider = GeminiProvider()
        self.mock_provider = DeterministicMockProvider()
        self.primary_provider_name = settings.AI_PROVIDER.lower()
    def get_provider(self, requested_provider=None):
        name=(requested_provider or self.primary_provider_name).lower()
        if name=='mock' and settings.ALLOW_MOCK_PROVIDER:
            return self.mock_provider
        if name=='gemini':
            return self.gemini_provider
        raise ValueError('Provider is unsupported or disabled')
    async def generate_response(self,messages,provider_name=None,system_instruction=None,temperature=0.7,max_tokens=2048,tools=None,response_schema=None):
        provider=self.get_provider(provider_name)
        kwargs=dict(messages=messages,system_instruction=system_instruction,temperature=temperature,max_tokens=max_tokens,tools=tools,response_schema=response_schema)
        try:
            result=await asyncio.wait_for(provider.generate_response(**kwargs),timeout=settings.EXECUTION_TIMEOUT_SECONDS+5)
        except Exception:
            # A secondary real Gemini model is preferred. Mock fallback requires an explicit development flag.
            if provider.provider_name=='gemini' and settings.GEMINI_FALLBACK_MODEL:
                result=await GeminiProvider(model_name=settings.GEMINI_FALLBACK_MODEL).generate_response(**kwargs)
            elif provider.provider_name=='gemini' and settings.ALLOW_MOCK_PROVIDER:
                result=await self.mock_provider.generate_response(**kwargs)
            else:
                raise RuntimeError('Model provider unavailable. Configure credentials and retry.') from None
            result.is_fallback=True
            if result.provider=='mock':
                result.content='[DEVELOPMENT MOCK FALLBACK — not a real AI response]\n'+result.content
        if response_schema:
            from jsonschema import validate
            validate(json.loads(result.content),response_schema)
        return result
    async def generate_stream(self,messages,provider_name=None,system_instruction=None,temperature=0.7,max_tokens=2048,tools=None):
        provider=self.get_provider(provider_name)
        # Never append a second provider after partial output: callers must retry a fresh stream.
        async for chunk in provider.generate_stream(messages,system_instruction,temperature,max_tokens,tools):
            yield chunk
    async def check_all_health(self):
        configured=self.gemini_provider.is_available()
        return {'status':'configured' if configured else 'degraded','active_provider':'gemini' if configured else ('mock' if settings.ALLOW_MOCK_PROVIDER else 'unavailable'),
                'providers':{'gemini':await self.gemini_provider.check_health(),'mock':{**await self.mock_provider.check_health(),'enabled':settings.ALLOW_MOCK_PROVIDER}},
                'embeddings':{'provider':settings.EMBEDDING_PROVIDER,'model':settings.EMBEDDING_MODEL if settings.EMBEDDING_PROVIDER=='gemini' else 'local-feature-hash-v1','semantic':settings.EMBEDDING_PROVIDER=='gemini'}}
    async def get_embeddings(self,texts,provider_name=None):
        # A corpus uses one fixed embedding space. Never silently mix real and local vectors.
        if settings.EMBEDDING_PROVIDER=='gemini':
            return await self.gemini_provider.get_embeddings(texts)
        return await self.mock_provider.get_embeddings(texts)
    @property
    def embedding_model(self):
        return settings.EMBEDDING_MODEL if settings.EMBEDDING_PROVIDER=='gemini' else 'local-feature-hash-v1'
gateway=ProviderGateway()

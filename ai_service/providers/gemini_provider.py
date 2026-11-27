import asyncio
import logging
import time
from typing import List, Optional, Dict, Any, AsyncGenerator
from .base import BaseAIProvider, Message, ToolDefinition, ToolCall, ExecutionUsage, GenerationResponse
from ..core.config import settings
logger = logging.getLogger(__name__)
class GeminiProvider(BaseAIProvider):
    def __init__(self, api_key=None, model_name=None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL
        self.provider_name = 'gemini'
        self._client = None
        if self.api_key:
            from google import genai
            from google.genai import types
            self._client = genai.Client(api_key=self.api_key, http_options=types.HttpOptions(timeout=25000))
    def is_available(self):
        return self._client is not None
    def _config(self, system_instruction, temperature, max_tokens, tools=None, response_schema=None):
        from google.genai import types
        args = dict(temperature=temperature, max_output_tokens=max_tokens, system_instruction=system_instruction,
                    thinking_config=types.ThinkingConfig(thinking_level="low"))
        if tools:
            args['tools'] = [types.Tool(function_declarations=[types.FunctionDeclaration(name=t.name, description=t.description, parameters_json_schema=t.parameters) for t in tools])]
            args['automatic_function_calling'] = types.AutomaticFunctionCallingConfig(disable=True)
        if response_schema:
            args.update(response_mime_type='application/json', response_json_schema=response_schema)
        return types.GenerateContentConfig(**args)
    def _contents(self, messages):
        from google.genai import types
        return [types.Content(role='model' if m.role == 'assistant' else 'user', parts=[types.Part.from_text(text=m.content)]) for m in messages]
    async def generate_response(self, messages, system_instruction=None, temperature=0.7, max_tokens=2048, tools=None, response_schema=None):
        if not self.is_available():
            raise RuntimeError('Gemini is not configured')
        config = self._config(system_instruction, temperature, max_tokens, tools, response_schema)
        response = None
        for attempt in range(3):
            try:
                response = await asyncio.wait_for(self._client.aio.models.generate_content(model=self.model_name, contents=self._contents(messages), config=config), timeout=settings.EXECUTION_TIMEOUT_SECONDS)
                break
            except Exception as exc:
                code = getattr(exc, 'code', None)
                if code not in (429, 500, 502, 503, 504) or attempt == 2:
                    raise RuntimeError('Gemini generation unavailable') from None
                await asyncio.sleep(0.5 * 2**attempt)
        usage = response.usage_metadata
        if not usage:
            raise RuntimeError('Provider did not return token usage')
        prompt_tokens = usage.prompt_token_count or 0
        completion_tokens = (usage.candidates_token_count or 0) + (getattr(usage, 'thoughts_token_count', 0) or 0)
        calls = [ToolCall(tool_name=c.name, arguments=dict(c.args or {})) for c in (response.function_calls or [])]
        text = response.text or ''
        if not text and not calls:
            raise RuntimeError('Provider returned no usable output')
        return GenerationResponse(content=text, tool_calls=calls or None, finish_reason='tool_calls' if calls else 'stop',
            usage=ExecutionUsage(prompt_tokens=prompt_tokens, completion_tokens=completion_tokens, total_tokens=usage.total_token_count or prompt_tokens+completion_tokens,
            estimated_cost_usd=round((prompt_tokens*settings.INPUT_COST_PER_M_TOKENS+completion_tokens*settings.OUTPUT_COST_PER_M_TOKENS)/1_000_000,8)),provider='gemini',model=self.model_name)
    async def generate_stream(self, messages, system_instruction=None, temperature=0.7, max_tokens=2048, tools=None):
        if not self.is_available():
            raise RuntimeError('Gemini is not configured')
        stream = await self._client.aio.models.generate_content_stream(model=self.model_name, contents=self._contents(messages), config=self._config(system_instruction,temperature,max_tokens,tools))
        async with asyncio.timeout(settings.EXECUTION_TIMEOUT_SECONDS):
            async for chunk in stream:
                if chunk.text:
                    yield chunk.text
    async def check_health(self):
        # Configuration probe is deliberately non-billable. Live inference is verified separately.
        return dict(status='configured' if self.is_available() else 'not_configured',provider='gemini',model=self.model_name,configured=self.is_available(),verified=False)
    async def get_embeddings(self,texts):
        if not self.is_available():
            raise RuntimeError('Gemini embeddings are not configured')
        from google.genai import types
        response = await asyncio.wait_for(self._client.aio.models.embed_content(model=settings.EMBEDDING_MODEL, contents=texts, config=types.EmbedContentConfig(output_dimensionality=768)), timeout=settings.EXECUTION_TIMEOUT_SECONDS)
        if not response.embeddings or len(response.embeddings)!=len(texts):
            raise RuntimeError('Invalid embedding count')
        return [list(e.values) for e in response.embeddings]

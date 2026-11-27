from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from ..providers.gateway import gateway
from ..providers.base import Message, ToolDefinition, GenerationResponse
from ..guardrails.safety import SafetyGuardrail

router = APIRouter(prefix="/ai", tags=["AI Generation & Streaming"])

class ChatRequest(BaseModel):
    messages: List[Message]
    provider: Optional[str] = None
    system_instruction: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2048
    tools: Optional[List[ToolDefinition]] = None
    response_schema: Optional[Dict[str, Any]] = None
    tenant_id: Optional[str] = None

@router.post("/generate", response_model=GenerationResponse)
async def generate_chat(req: ChatRequest):
    # Prompt injection safety check
    for msg in req.messages:
        is_safe, reason = SafetyGuardrail.inspect_prompt(msg.content)
        if not is_safe:
            raise HTTPException(status_code=400, detail=reason)

    try:
        response = await gateway.generate_response(
            messages=req.messages,
            provider_name=req.provider,
            system_instruction=req.system_instruction,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
            tools=req.tools,
            response_schema=req.response_schema,
        )
        # Sanitize sensitive data in response content
        response.content = SafetyGuardrail.sanitize_output(response.content)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stream")
async def stream_chat(req: ChatRequest):
    for msg in req.messages:
        is_safe, reason = SafetyGuardrail.inspect_prompt(msg.content)
        if not is_safe:
            raise HTTPException(status_code=400, detail=reason)

    async def stream_generator():
        try:
            async for token in gateway.generate_stream(
                messages=req.messages,
                provider_name=req.provider,
                system_instruction=req.system_instruction,
                temperature=req.temperature,
                max_tokens=req.max_tokens,
                tools=req.tools,
            ):
                yield token
        except Exception as e:
            yield f"\n[Streaming error: {str(e)}]"

    return StreamingResponse(stream_generator(), media_type="text/plain")

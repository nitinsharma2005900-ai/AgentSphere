from fastapi import APIRouter,HTTPException,Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel,Field
from typing import List,Optional,Dict,Any
import json
from ..providers.gateway import gateway
from ..providers.base import Message,ToolDefinition,GenerationResponse
from ..guardrails.safety import SafetyGuardrail
router=APIRouter(prefix='/ai',tags=['AI Generation & Streaming'])
class ChatRequest(BaseModel):
    messages:List[Message]=Field(min_length=1,max_length=40)
    provider:Optional[str]=None
    model:Optional[str]=None
    system_instruction:Optional[str]=Field(None,max_length=24000)
    temperature:float=Field(0.7,ge=0,le=2)
    max_tokens:int=Field(2048,ge=1,le=4096)
    tools:Optional[List[ToolDefinition]]=Field(None,max_length=20)
    response_schema:Optional[Dict[str,Any]]=None
    tenant_id:str=Field(min_length=1,max_length=150)
def inspect(req,tenant):
    if req.tenant_id!=tenant:raise HTTPException(403,'Tenant scope mismatch')
    if sum(len(m.content) for m in req.messages)>100000:raise HTTPException(400,'Message context is too large')
    for msg in req.messages:
        safe,reason=SafetyGuardrail.inspect_prompt(msg.content)
        if not safe:raise HTTPException(400,'Prompt rejected by safety policy')
@router.post('/generate',response_model=GenerationResponse)
async def generate_chat(req:ChatRequest,x_tenant_id:str=Header(...)):
    inspect(req,x_tenant_id)
    try:
        response=await gateway.generate_response(messages=req.messages,provider_name=req.provider,system_instruction=req.system_instruction,temperature=req.temperature,max_tokens=req.max_tokens,tools=req.tools,response_schema=req.response_schema)
        response.content=SafetyGuardrail.sanitize_output(response.content)
        return response
    except ValueError:raise HTTPException(400,'Provider configuration or output schema is invalid') from None
    except Exception:raise HTTPException(503,'Model provider unavailable. Check configuration and retry.') from None
@router.post('/stream')
async def stream_chat(req:ChatRequest,x_tenant_id:str=Header(...)):
    inspect(req,x_tenant_id)
    try:gateway.get_provider(req.provider)
    except ValueError:raise HTTPException(400,'Provider is unsupported or disabled') from None
    async def chunks():
        pending=''
        try:
            async for token in gateway.generate_stream(messages=req.messages,provider_name=req.provider,system_instruction=req.system_instruction,temperature=req.temperature,max_tokens=req.max_tokens,tools=req.tools):
                pending+=token
                cut=pending.rfind(' ',0,max(0,len(pending)-512))
                if cut>0:
                    yield 'data: '+json.dumps({'text':SafetyGuardrail.sanitize_output(pending[:cut+1])})+'\n\n'
                    pending=pending[cut+1:]
            if pending:yield 'data: '+json.dumps({'text':SafetyGuardrail.sanitize_output(pending)})+'\n\n'
            yield 'event: done\ndata: {}\n\n'
        except Exception:
            yield 'event: error\ndata: {"error":"Provider stream interrupted. Retry a new request."}\n\n'
    return StreamingResponse(chunks(),media_type='text/event-stream',headers={'Cache-Control':'no-cache','X-Accel-Buffering':'no'})

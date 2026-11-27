from abc import ABC, abstractmethod
from typing import AsyncGenerator, Dict, Any, List, Optional, Literal
from pydantic import BaseModel, Field

class Message(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str = Field(min_length=1, max_length=100000)

class ToolDefinition(BaseModel):
    name: str
    description: str
    parameters: Dict[str, Any] = Field(default_factory=dict)

class ToolCall(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]

class ExecutionUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_usd: float = 0.0

class GenerationResponse(BaseModel):
    content: str
    tool_calls: Optional[List[ToolCall]] = None
    finish_reason: str = "stop"
    usage: ExecutionUsage = Field(default_factory=ExecutionUsage)
    provider: str
    model: str
    cached: bool = False
    is_fallback: bool = False

class BaseAIProvider(ABC):
    @abstractmethod
    async def generate_response(
        self,
        messages: List[Message],
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        tools: Optional[List[ToolDefinition]] = None,
        response_schema: Optional[Dict[str, Any]] = None,
    ) -> GenerationResponse:
        pass

    @abstractmethod
    async def generate_stream(
        self,
        messages: List[Message],
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        tools: Optional[List[ToolDefinition]] = None,
    ) -> AsyncGenerator[str, None]:
        pass

    @abstractmethod
    async def check_health(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        pass

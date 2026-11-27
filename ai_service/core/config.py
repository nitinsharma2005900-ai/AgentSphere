import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="allow")

    PROJECT_NAME: str = "AgentSphere AI Gateway"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # AI Provider Settings
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "gemini")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-004")
    
    # Guardrails and Safety
    ENABLE_PROMPT_INJECTION_DEFENSE: bool = True
    MAX_OUTPUT_TOKENS: int = 4096
    DEFAULT_TEMPERATURE: float = 0.7
    EXECUTION_TIMEOUT_SECONDS: int = 30
    MAX_STEPS_LIMIT: int = 20
    
    # Service Auth & Port
    PORT: int = int(os.getenv("AI_SERVICE_PORT", "8000"))
    HOST: str = "0.0.0.0"
    SERVICE_SECRET: str = os.getenv("SERVICE_SECRET", "agentsphere-internal-service-secret-key-32b")
    
    # Pricing (per 1M tokens) - Configurable
    INPUT_COST_PER_M_TOKENS: float = 0.075 # $0.075 per 1M prompt tokens for Gemini 2.5 Flash
    OUTPUT_COST_PER_M_TOKENS: float = 0.30  # $0.30 per 1M output tokens

settings = Settings()

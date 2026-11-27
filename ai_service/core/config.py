from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(Path(__file__).resolve().parents[2] / '.env'), extra='ignore')
    PROJECT_NAME: str = 'AgentSphere AI Gateway'
    VERSION: str = '1.1.0'
    API_V1_STR: str = '/api/v1'
    AI_PROVIDER: str = 'gemini'
    ALLOW_MOCK_PROVIDER: bool = False
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = 'gemini-3.8-flash'
    GEMINI_FALLBACK_MODEL: Optional[str] = None
    EMBEDDING_PROVIDER: str = 'local'
    EMBEDDING_MODEL: str = 'gemini-embedding-001'
    DATABASE_URL: str = ''
    VECTOR_STORE_PATH: str = str(Path(__file__).resolve().parents[2] / 'data' / 'vectors.sqlite3')
    SERVICE_SECRET: str = ''
    PORT: int = 8000
    HOST: str = '0.0.0.0'
    EXECUTION_TIMEOUT_SECONDS: int = 30
    MAX_OUTPUT_TOKENS: int = 4096
    MAX_STEPS_LIMIT: int = 30
    INPUT_COST_PER_M_TOKENS: float = 0.30
    OUTPUT_COST_PER_M_TOKENS: float = 2.50
settings = Settings()

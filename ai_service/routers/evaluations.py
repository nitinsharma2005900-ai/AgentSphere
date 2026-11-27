from fastapi import APIRouter
from typing import Optional
from ..evaluations.evaluator import regression_runner

router = APIRouter(prefix="/evaluations", tags=["Prompt Regression & CI/CD Evaluations"])

@router.post("/run")
async def run_evaluation_suite(provider: Optional[str] = "mock"):
    return await regression_runner.run_evaluation_suite(provider=provider)

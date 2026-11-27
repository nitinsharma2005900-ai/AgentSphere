from fastapi import APIRouter
from ..providers.gateway import gateway

router = APIRouter(prefix="/health", tags=["Health & Providers"])

@router.get("/")
async def health_check():
    return await gateway.check_all_health()

from fastapi import FastAPI,Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
import hmac
import logging
from .core.config import settings
from .routers import health,chat,documents,evaluations
logger=logging.getLogger(__name__)
app=FastAPI(title=settings.PROJECT_NAME,version=settings.VERSION,description='Authenticated internal model and document gateway')
@app.middleware('http')
async def service_auth(request:Request,call_next):
    if request.url.path.startswith('/api/v1/') and not request.url.path.startswith('/api/v1/health'):
        key=request.headers.get('X-Service-Key','')
        if not settings.SERVICE_SECRET or not hmac.compare_digest(key,settings.SERVICE_SECRET):
            return JSONResponse(status_code=401,content={'detail':'Service authentication required'})
        if not request.headers.get('X-Tenant-Id'):
            return JSONResponse(status_code=400,content={'detail':'Tenant scope header required'})
    return await call_next(request)
for router in [health.router,chat.router,documents.router,evaluations.router]:app.include_router(router,prefix=settings.API_V1_STR)
@app.get('/')
def root():return {'service':settings.PROJECT_NAME,'version':settings.VERSION,'status':'operational'}
@app.exception_handler(Exception)
async def unhandled(request:Request,exc:Exception):
    logger.error('Service request failed',extra={'path':request.url.path,'error_type':type(exc).__name__})
    return JSONResponse(status_code=500,content={'detail':'Internal service error'})

import pytest
from fastapi.testclient import TestClient
from ai_service.main import app
from ai_service.core.config import settings
from ai_service.providers.gateway import ProviderGateway
from ai_service.providers.base import Message
from ai_service.rag.document_parser import DocumentParser
from ai_service.rag.vector_store import TenantVectorStore,StoredChunk

def test_gateway_requires_service_authentication():
    response=TestClient(app).post('/api/v1/ai/generate',json={})
    assert response.status_code==401

def test_service_rejects_forged_tenant_scope():
    response=TestClient(app).post('/api/v1/documents/search',headers={'X-Service-Key':settings.SERVICE_SECRET,'X-Tenant-Id':'tenant-a'},json={'tenant_id':'tenant-b','query':'secret'})
    assert response.status_code==403

@pytest.mark.parametrize('filename,data',[('bad.pdf',b'not a PDF'),('bad.docx',b'not a zip'),('empty.txt',b''),('binary.exe',b'bad')])
def test_document_pipeline_rejects_invalid_files(filename,data):
    with pytest.raises(ValueError):DocumentParser().process_document(filename,data)

def test_reindex_replaces_chunks_without_duplicates():
    store=TenantVectorStore()
    chunk=StoredChunk(chunk_id='one',document_id='doc',tenant_id='tenant',content='policy',embedding=[1.0,0.0])
    store.insert_chunks('tenant',[chunk]);store.insert_chunks('tenant',[chunk])
    assert len(store.search('tenant',[1.0,0.0]))==1

def test_invalid_batch_does_not_partially_mutate_vector_store():
    store=TenantVectorStore()
    valid=StoredChunk(chunk_id='valid',document_id='doc',tenant_id='a',content='policy',embedding=[1.0])
    invalid=valid.model_copy(update={'chunk_id':'invalid','tenant_id':'b'})
    with pytest.raises(PermissionError):store.insert_chunks('a',[valid,invalid])
    assert store.search('a',[1.0])==[]

@pytest.mark.asyncio
async def test_provider_outage_fails_closed_without_mock_permission(monkeypatch):
    gateway=ProviderGateway()
    monkeypatch.setattr(settings,'ALLOW_MOCK_PROVIDER',False)
    monkeypatch.setattr(settings,'GEMINI_FALLBACK_MODEL',None)
    with pytest.raises(RuntimeError):await gateway.generate_response([Message(role='user',content='hello')],provider_name='gemini')

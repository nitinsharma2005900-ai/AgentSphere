import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from ..rag.document_parser import DocumentParser, ParsedDocument
from ..rag.vector_store import vector_store, StoredChunk, SearchResult
from ..providers.gateway import gateway

router = APIRouter(prefix="/documents", tags=["Knowledge & Documents"])
parser = DocumentParser()

class SemanticSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=8000)
    tenant_id: str = Field(min_length=1, max_length=150)
    top_k: int = Field(4, ge=1, le=10)
    min_similarity: float = Field(0.05, ge=0, le=1)
    filter_doc_ids: Optional[List[str]] = None

class IngestionResponse(BaseModel):
    document_id: str
    filename: str
    file_type: str
    total_chunks: int
    total_characters: int
    status: str = "indexed"
    tenant_id: str = Field(min_length=1, max_length=150)

@router.post("/upload", response_model=IngestionResponse)
async def upload_and_index_document(
    file: UploadFile = File(...),
    tenant_id: str = Form(...),
    document_id: Optional[str] = Form(None),
    x_tenant_id: str = Header(...),
):
    if tenant_id != x_tenant_id:
        raise HTTPException(403, "Tenant scope mismatch")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id is required for tenant isolation")

    file_bytes = await file.read(25*1024*1024 + 1)
    filename = file.filename or "uploaded_file"

    try:
        parsed: ParsedDocument = parser.process_document(
            filename=filename,
            file_bytes=file_bytes,
            extra_metadata={"tenant_id": tenant_id}
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail="Document processing failed") from None

    doc_id = document_id or str(uuid.uuid4())
    
    # Generate embeddings for chunks
    chunk_texts = [c.content for c in parsed.chunks]
    if chunk_texts:
        embeddings = await gateway.get_embeddings(chunk_texts)
        stored_chunks: List[StoredChunk] = []
        for i, chunk in enumerate(parsed.chunks):
            stored_chunks.append(
                StoredChunk(
                    chunk_id=f"{doc_id}_chunk_{i}",
                    document_id=doc_id,
                    tenant_id=tenant_id,
                    content=chunk.content,
                    embedding=embeddings[i],
                    metadata={
                        **chunk.metadata,
                        "document_id": doc_id,
                        "filename": filename,
                        "embedding_model": gateway.embedding_model
                    }
                )
            )
        # Store with strict tenant scoping
        vector_store.insert_chunks(tenant_id=tenant_id, chunks=stored_chunks)

    return IngestionResponse(
        document_id=doc_id,
        filename=filename,
        file_type=parsed.file_type,
        total_chunks=len(parsed.chunks),
        total_characters=parsed.total_characters,
        status="indexed",
        tenant_id=tenant_id
    )

@router.post("/search", response_model=List[SearchResult])
async def search_knowledge(req: SemanticSearchRequest, x_tenant_id: str = Header(...)):
    if req.tenant_id != x_tenant_id:
        raise HTTPException(403, "Tenant scope mismatch")
    if not req.tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id is required for retrieval isolation")

    # Generate query embedding
    query_embeddings = await gateway.get_embeddings([req.query])
    query_vec = query_embeddings[0]

    # Search isolated tenant store
    results = vector_store.search(
        tenant_id=req.tenant_id,
        query_embedding=query_vec,
        top_k=req.top_k,
        min_similarity=req.min_similarity,
        filter_doc_ids=req.filter_doc_ids
    )
    return results

@router.delete("/{tenant_id}/{document_id}")
async def delete_document_index(tenant_id: str, document_id: str, x_tenant_id: str = Header(...)):
    if tenant_id != x_tenant_id:
        raise HTTPException(403, "Tenant scope mismatch")
    removed = vector_store.delete_document_chunks(tenant_id=tenant_id, document_id=document_id)
    return {"deleted_chunks": removed, "tenant_id": tenant_id, "document_id": document_id}

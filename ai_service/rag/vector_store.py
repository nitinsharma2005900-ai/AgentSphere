import math
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class StoredChunk(BaseModel):
    chunk_id: str
    document_id: str
    tenant_id: str
    content: str
    embedding: List[float]
    metadata: Dict[str, Any] = Field(default_factory=dict)

class SearchResult(BaseModel):
    chunk_id: str
    document_id: str
    content: str
    similarity_score: float
    metadata: Dict[str, Any]

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    if len(vec1) != len(vec2) or len(vec1) == 0:
        return 0.0
    dot = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a, b in zip(vec1, vec2))) # optimized if normalized
    norm2 = math.sqrt(sum(b * b for a, b in zip(vec1, vec2)))
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
    return float(dot / (norm1 * norm2))

class TenantVectorStore:
    def __init__(self):
        # In-memory tenant isolated store: tenant_id -> List[StoredChunk]
        self._stores: Dict[str, List[StoredChunk]] = {}

    def insert_chunks(self, tenant_id: str, chunks: List[StoredChunk]) -> int:
        if not tenant_id:
            raise ValueError("Tenant ID is required for vector storage (Tenant Isolation).")
        if tenant_id not in self._stores:
            self._stores[tenant_id] = []
        
        # Verify every chunk belongs to this tenant
        for chunk in chunks:
            if chunk.tenant_id != tenant_id:
                raise PermissionError(f"Cross-tenant vector storage forbidden: {chunk.tenant_id} != {tenant_id}")
            self._stores[tenant_id].append(chunk)
            
        logger.info(f"Stored {len(chunks)} chunks for tenant {tenant_id}")
        return len(chunks)

    def delete_document_chunks(self, tenant_id: str, document_id: str) -> int:
        if tenant_id not in self._stores:
            return 0
        before_count = len(self._stores[tenant_id])
        self._stores[tenant_id] = [c for c in self._stores[tenant_id] if c.document_id != document_id]
        after_count = len(self._stores[tenant_id])
        return before_count - after_count

    def search(
        self,
        tenant_id: str,
        query_embedding: List[float],
        top_k: int = 5,
        min_similarity: float = 0.0,
        filter_doc_ids: Optional[List[str]] = None
    ) -> List[SearchResult]:
        if not tenant_id:
            raise ValueError("Tenant ID is strictly required for retrieval isolation.")

        tenant_chunks = self._stores.get(tenant_id, [])
        if not tenant_chunks:
            return []

        scored_chunks: List[SearchResult] = []
        for chunk in tenant_chunks:
            # Document ID filter check
            if filter_doc_ids and chunk.document_id not in filter_doc_ids:
                continue

            sim = cosine_similarity(query_embedding, chunk.embedding)
            if sim >= min_similarity:
                scored_chunks.append(
                    SearchResult(
                        chunk_id=chunk.chunk_id,
                        document_id=chunk.document_id,
                        content=chunk.content,
                        similarity_score=round(sim, 4),
                        metadata=chunk.metadata
                    )
                )

        scored_chunks.sort(key=lambda x: x.similarity_score, reverse=True)
        return scored_chunks[:top_k]

vector_store = TenantVectorStore()

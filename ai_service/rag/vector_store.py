import json
import math
import sqlite3
from pathlib import Path
from typing import List,Dict,Any,Optional
from pydantic import BaseModel,Field
from ..core.config import settings
class StoredChunk(BaseModel):
    chunk_id:str
    document_id:str
    tenant_id:str
    content:str
    embedding:List[float]
    metadata:Dict[str,Any]=Field(default_factory=dict)
class SearchResult(BaseModel):
    chunk_id:str
    document_id:str
    content:str
    similarity_score:float
    metadata:Dict[str,Any]
def cosine_similarity(a,b):
    if not a or len(a)!=len(b):return 0.0
    den=math.sqrt(sum(x*x for x in a))*math.sqrt(sum(x*x for x in b))
    return sum(x*y for x,y in zip(a,b))/den if den else 0.0
class TenantVectorStore:
    def __init__(self, database_url=None, local_path=':memory:'):
        self.database_url=database_url
        self.local_path=local_path
        self._sqlite=None
    def _connect(self):
        if self.database_url:
            import psycopg
            return psycopg.connect(self.database_url,connect_timeout=10)
        if self._sqlite is None:
            if self.local_path!=':memory:':Path(self.local_path).parent.mkdir(parents=True,exist_ok=True)
            self._sqlite=sqlite3.connect(self.local_path,check_same_thread=False)
            self._sqlite.execute('CREATE TABLE IF NOT EXISTS document_chunks(tenant_id TEXT,document_id TEXT,chunk_id TEXT,content TEXT,embedding TEXT,metadata TEXT,PRIMARY KEY(tenant_id,chunk_id))')
        return self._sqlite
    def _rows(self,sql,params):
        connection=self._connect()
        try:
            cursor=connection.execute(sql if self.database_url else sql.replace('%s','?'),params)
            result=cursor.fetchall() if cursor.description else []
            connection.commit()
            return result
        except Exception:
            connection.rollback()
            raise
        finally:
            if self.database_url:connection.close()
    def insert_chunks(self,tenant_id,chunks):
        if not tenant_id:raise ValueError('Tenant ID is required')
        # Validate the complete batch before mutation, so an invalid suffix cannot cause partial insertion.
        if any(c.tenant_id!=tenant_id for c in chunks):raise PermissionError('Cross-tenant vector storage forbidden')
        connection=self._connect()
        try:
            doc_ids={c.document_id for c in chunks}
            for doc_id in doc_ids:
                connection.execute('DELETE FROM document_chunks WHERE tenant_id=%s AND document_id=%s' if self.database_url else 'DELETE FROM document_chunks WHERE tenant_id=? AND document_id=?',(tenant_id,doc_id))
            sql='INSERT INTO document_chunks(tenant_id,document_id,chunk_id,content,embedding,metadata) VALUES(%s,%s,%s,%s,%s,%s)'
            for chunk in chunks:
                connection.execute(sql if self.database_url else sql.replace('%s','?'),(tenant_id,chunk.document_id,chunk.chunk_id,chunk.content,json.dumps(chunk.embedding),json.dumps(chunk.metadata)))
            connection.commit()
        except Exception:
            connection.rollback();raise
        finally:
            if self.database_url:connection.close()
        return len(chunks)
    def delete_document_chunks(self,tenant_id,document_id):
        rows=self._rows('SELECT chunk_id FROM document_chunks WHERE tenant_id=%s AND document_id=%s',(tenant_id,document_id))
        self._rows('DELETE FROM document_chunks WHERE tenant_id=%s AND document_id=%s',(tenant_id,document_id))
        return len(rows)
    def search(self,tenant_id,query_embedding,top_k=5,min_similarity=0.0,filter_doc_ids=None):
        if not tenant_id:raise ValueError('Tenant ID is required')
        rows=self._rows('SELECT chunk_id,document_id,content,embedding,metadata FROM document_chunks WHERE tenant_id=%s',(tenant_id,))
        results=[]
        for cid,did,content,vector,metadata in rows:
            if filter_doc_ids is not None and did not in filter_doc_ids:continue
            vector=json.loads(vector) if isinstance(vector,str) else vector
            metadata=json.loads(metadata) if isinstance(metadata,str) else metadata
            if metadata.get('embedding_model') not in (None,settings.EMBEDDING_MODEL if settings.EMBEDDING_PROVIDER=='gemini' else 'local-feature-hash-v1'):
                continue
            score=cosine_similarity(query_embedding,vector)
            if score>=min_similarity:results.append(SearchResult(chunk_id=cid,document_id=did,content=content,similarity_score=round(score,4),metadata=metadata))
        return sorted(results,key=lambda r:r.similarity_score,reverse=True)[:top_k]
vector_store=TenantVectorStore(settings.DATABASE_URL or None,settings.VECTOR_STORE_PATH)

import io
import csv
import re
from typing import List, Dict, Any, Tuple
from pydantic import BaseModel, Field

SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".docx", ".csv", ".md"}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB

class DocumentChunk(BaseModel):
    chunk_index: int
    content: str
    token_count: int
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ParsedDocument(BaseModel):
    filename: str
    file_type: str
    total_characters: int
    total_words: int
    chunks: List[DocumentChunk]
    metadata: Dict[str, Any] = Field(default_factory=dict)

class DocumentParser:
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def validate_file(self, filename: str, file_bytes: bytes) -> Tuple[bool, str]:
        if not filename:
            return False, "Filename cannot be empty"
        ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in SUPPORTED_EXTENSIONS:
            return False, f"Unsupported file type '{ext}'. Supported formats: {', '.join(SUPPORTED_EXTENSIONS)}"
        if len(file_bytes) == 0:
            return False, "File is empty"
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            return False, f"File size exceeds limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB"
        return True, ""

    def extract_text(self, filename: str, file_bytes: bytes) -> str:
        ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
        text = ""

        if ext == ".txt" or ext == ".md":
            text = file_bytes.decode("utf-8", errors="replace")

        elif ext == ".csv":
            decoded = file_bytes.decode("utf-8", errors="replace")
            reader = csv.reader(io.StringIO(decoded))
            rows = [", ".join(row) for row in reader if row]
            text = "\n".join(rows)

        elif ext == ".pdf":
            try:
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(file_bytes))
                pages_text = []
                for i, page in enumerate(reader.pages):
                    extracted = page.extract_text()
                    if extracted:
                        pages_text.append(f"[Page {i+1}]\n{extracted}")
                text = "\n\n".join(pages_text)
            except Exception as e:
                # Fallback to UTF-8 extraction if pypdf fails
                text = file_bytes.decode("utf-8", errors="ignore")

        elif ext == ".docx":
            # Extract basic XML text or fallback
            try:
                import zipfile
                import xml.etree.ElementTree as ET
                with zipfile.ZipFile(io.BytesIO(file_bytes)) as docx_zip:
                    xml_content = docx_zip.read('word/document.xml')
                    tree = ET.fromstring(xml_content)
                    paragraphs = []
                    for node in tree.iter():
                        if node.tag.endswith('}t') and node.text:
                            paragraphs.append(node.text)
                    text = " ".join(paragraphs)
            except Exception:
                text = file_bytes.decode("utf-8", errors="ignore")

        return text.strip()

    def chunk_text(self, text: str, metadata: Dict[str, Any]) -> List[DocumentChunk]:
        # Split into words/tokens
        words = text.split()
        if not words:
            return []

        chunks: List[DocumentChunk] = []
        step = self.chunk_size - self.chunk_overlap
        if step <= 0:
            step = self.chunk_size

        chunk_idx = 0
        for i in range(0, len(words), step):
            chunk_words = words[i:i + self.chunk_size]
            chunk_content = " ".join(chunk_words)
            token_count = max(1, len(chunk_words))
            
            chunk_meta = {
                **metadata,
                "start_word": i,
                "end_word": i + len(chunk_words),
                "chunk_size": len(chunk_words)
            }
            
            chunks.append(DocumentChunk(
                chunk_index=chunk_idx,
                content=chunk_content,
                token_count=token_count,
                metadata=chunk_meta
            ))
            chunk_idx += 1

        return chunks

    def process_document(
        self,
        filename: str,
        file_bytes: bytes,
        extra_metadata: Dict[str, Any] = None
    ) -> ParsedDocument:
        valid, err = self.validate_file(filename, file_bytes)
        if not valid:
            raise ValueError(err)

        ext = "." + filename.split(".")[-1].lower()
        extracted_text = self.extract_text(filename, file_bytes)
        
        meta = extra_metadata.copy() if extra_metadata else {}
        meta["filename"] = filename
        meta["extension"] = ext
        meta["file_size_bytes"] = len(file_bytes)

        chunks = self.chunk_text(extracted_text, meta)
        
        words_count = len(extracted_text.split())
        chars_count = len(extracted_text)

        return ParsedDocument(
            filename=filename,
            file_type=ext.replace(".", ""),
            total_characters=chars_count,
            total_words=words_count,
            chunks=chunks,
            metadata=meta
        )

import os

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain_core.documents import Document

from loaders.ocr_loader import extract_text_from_pdf
from services.vector_store import get_vectorstore


def _load_document(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        docs = PyPDFLoader(file_path).load()

        extracted_text = "\n".join(
            [(d.page_content or "").strip() for d in docs]
        ).strip()

        if len(extracted_text) < 100:
            ocr_text = extract_text_from_pdf(file_path).strip()
            if not ocr_text:
                raise ValueError(
                    "Could not extract text from PDF(native + OCR failed)."
                )
            return [
                Document(
                    page_content=ocr_text, metadata={"source": file_path, "ocr": True}
                )
            ]

        return docs

    if ext == ".docx":
        return Docx2txtLoader(file_path).load()

    return TextLoader(file_path, encoding="utf-8", autodetect_encoding=True).load()


def ingest_document(file_path):
    docs = _load_document(file_path)

    splitter = RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=50)
    chunks = splitter.split_documents(docs)
    clean_chunks = [c for c in chunks if len((c.page_content or "").strip()) > 50]

    if not clean_chunks:
        raise ValueError("No meaningful text found to index.")

    vectorstore = get_vectorstore()
    vectorstore.add_documents(clean_chunks)
    return "Document ingested successfully."

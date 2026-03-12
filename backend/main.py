from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel
import json

import os
from uuid import uuid4

from rag.ingest import ingest_document
from rag.pipeline import ask_question, ask_question_stream
from services.vector_store import ensure_collection
from services.embeddings import get_embeddings

app = FastAPI()

FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS", "http://localhost:3000,http://localhost:5173"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_UPLOAD_SIZE_MB = 20
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


class AskRequest(BaseModel):
    query: str


@app.on_event("startup")
def startup_event():
    ensure_collection()
    get_embeddings()


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    filename = os.path.basename(file.filename or "upload.bin")
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    file_path = os.path.join(UPLOAD_FOLDER, f"{uuid4()}_{filename}")
    total_size = 0

    try:
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break

                total_size += len(chunk)
                if total_size > MAX_UPLOAD_SIZE_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Max size is {MAX_UPLOAD_SIZE_MB}MB.",
                    )

                buffer.write(chunk)

        await run_in_threadpool(ingest_document, file_path)
        return {"message": "Document uploaded and processed"}

    except HTTPException:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")
    finally:
        await file.close()


@app.get("/ask")
def ask(query: str):
    return ask_question(query)


@app.post("/ask")
def ask_post(payload: AskRequest):
    return ask_question(payload.query)


@app.post("/ask/stream")
def ask_stream(payload: AskRequest):
    def _event_stream():
        for event in ask_question_stream(payload.query):
            yield json.dumps(event) + "\n"

    return StreamingResponse(_event_stream(), media_type="application/x-ndjson")


@app.get("/documents")
def get_documents():

    files = os.listdir(UPLOAD_FOLDER)

    return [
        {
            "id": f,
            "name": f.split("_", 1)[1] if "_" in f else f,
            "type": f.split(".")[-1],
            "status": "indexed",
        }
        for f in files
    ]

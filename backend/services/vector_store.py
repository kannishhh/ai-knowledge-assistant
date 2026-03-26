from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from langchain_qdrant import QdrantVectorStore

from config import QDRANT_URL, QDRANT_COLLECTION
from services.embeddings import get_embeddings

VECTOR_DIM = 384

client = QdrantClient(url=QDRANT_URL)

_vectorstore = None


def ensure_collection() -> None:
    if not client.collection_exists(QDRANT_COLLECTION):
        client.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
        )


def get_vectorstore():
    global _vectorstore

    if _vectorstore is None:
        ensure_collection()

        _vectorstore = QdrantVectorStore(
            client=client,
            collection_name=QDRANT_COLLECTION,
            embedding=get_embeddings(),
        )
    return _vectorstore

"""
db/chroma_client.py
Shared ChromaDB client — imported by rag_tool.py and graph nodes.
"""

from __future__ import annotations

import os
import chromadb
from chromadb.config import Settings
from langchain_ollama import OllamaEmbeddings
from dotenv import load_dotenv

load_dotenv()

CHROMA_PATH     = os.getenv("CHROMA_PATH", "../ingestion/chroma_store")
EMBED_MODEL     = os.getenv("EMBED_MODEL", "nomic-embed-text")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# Singleton client — created once, reused across requests
_client: chromadb.PersistentClient | None = None


def get_chroma_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(
            path=CHROMA_PATH,
            settings=Settings(anonymized_telemetry=False),
        )
    return _client


def get_embedder() -> OllamaEmbeddings:
    return OllamaEmbeddings(
        model=EMBED_MODEL,
        base_url=OLLAMA_BASE_URL,
    )


def query_collection(
    collection_name: str,
    query: str,
    n_results: int = 4,
) -> list[dict]:
    """
    Embeds `query`, searches `collection_name` in ChromaDB.
    Returns list of { text, source, filename, distance } dicts.
    distance is a cosine distance (0 = identical, 1 = orthogonal).
    """
    client   = get_chroma_client()
    embedder = get_embedder()

    try:
        collection = client.get_collection(collection_name)
    except Exception:
        return []

    count = collection.count()
    if count == 0:
        return []

    query_vec = embedder.embed_query(query)
    results   = collection.query(
        query_embeddings=[query_vec],
        n_results=min(n_results, count),
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    docs      = results["documents"][0]
    metas     = results["metadatas"][0]
    distances = results["distances"][0]

    for doc, meta, dist in zip(docs, metas, distances):
        chunks.append({
            "text":     doc,
            "source":   meta.get("source", ""),
            "filename": meta.get("filename", ""),
            "distance": dist,   # lower = more similar (cosine space)
        })

    return chunks
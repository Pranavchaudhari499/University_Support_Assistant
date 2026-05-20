"""
db/chroma_client.py
Shared ChromaDB client — imported by rag_tool.py
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
    Embeds `query`, searches `collection_name` in ChromaDB,
    returns list of { text, source, filename } dicts.
    """
    client   = get_chroma_client()
    embedder = get_embedder()

    try:
        collection = client.get_collection(collection_name)
    except Exception:
        return []

    query_vec = embedder.embed_query(query)
    results   = collection.query(
        query_embeddings=[query_vec],
        n_results=min(n_results, collection.count()),
        include=["documents", "metadatas"],
    )

    chunks = []
    for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
        chunks.append({
            "text":     doc,
            "source":   meta.get("source", ""),
            "filename": meta.get("filename", ""),
        })
    return chunks
"""
University Support Agent — Ingestion Pipeline
============================================
Run this script once (or whenever documents change) to embed and
store all university .txt files into ChromaDB.

Usage:
    python ingest.py

Requirements:
    - Ollama running locally  →  ollama serve
    - nomic-embed-text pulled →  ollama pull nomic-embed-text
    - pip install -r requirements.txt
"""

import os
from tqdm import tqdm
import chromadb
from chromadb.config import Settings
from langchain_ollama import OllamaEmbeddings
from loaders import load_txt_files, chunk_documents


# ── Config ──────────────────────────────────────────────────────────────────

# Where ChromaDB persists its data on disk
CHROMA_PATH = "./chroma_store"

# Ollama embedding model (100% local, no API key)
EMBED_MODEL = "nomic-embed-text"
OLLAMA_BASE_URL = "http://localhost:11434"

# Map collection name → folder path (relative to this script)
COLLECTIONS = {
    "policies": "./data/policies",
    "courses":  "./data/courses",
    "events":   "./data/events",
}


# ── ChromaDB client ──────────────────────────────────────────────────────────

def get_chroma_client() -> chromadb.PersistentClient:
    return chromadb.PersistentClient(
        path=CHROMA_PATH,
        settings=Settings(anonymized_telemetry=False),
    )


# ── Embedding ────────────────────────────────────────────────────────────────

def get_embedder() -> OllamaEmbeddings:
    return OllamaEmbeddings(
        model=EMBED_MODEL,
        base_url=OLLAMA_BASE_URL,
    )


# ── Core ingestion logic ─────────────────────────────────────────────────────

def ingest_collection(
    client: chromadb.PersistentClient,
    embedder: OllamaEmbeddings,
    collection_name: str,
    folder: str,
) -> None:
    print(f"\n{'='*55}")
    print(f"  Collection : {collection_name}")
    print(f"  Folder     : {folder}")
    print(f"{'='*55}")

    # 1. Load raw .txt files from disk
    docs = load_txt_files(folder)
    if not docs:
        print("  [skip] nothing to ingest for this collection.")
        return

    # 2. Chunk into smaller pieces
    chunks = chunk_documents(docs)

    # 3. Delete old collection (if any) and create fresh
    #    This ensures stale data is removed on re-ingestion
    #    metadata={"hnsw:space": "cosine"} makes similarity search more accurate
    try:
        client.delete_collection(name=collection_name)
        print(f"  [clean] deleted old '{collection_name}' collection")
    except Exception:
        pass  # collection didn't exist yet
    collection = client.create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )

    # 4. Embed and upsert in batches of 50
    BATCH_SIZE = 50
    total = len(chunks)

    for i in tqdm(range(0, total, BATCH_SIZE), desc=f"  Upserting {collection_name}"):
        batch = chunks[i : i + BATCH_SIZE]

        texts = [c.page_content for c in batch]
        metadatas = [c.metadata for c in batch]

        # Generate embeddings via Ollama locally
        embeddings = embedder.embed_documents(texts)

        # Build stable IDs: collection_name + chunk index
        ids = [f"{collection_name}_{i + j}" for j, _ in enumerate(batch)]

        collection.upsert(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )

    print(f"  [done] {total} chunks upserted into '{collection_name}'")


# ── Entry point ──────────────────────────────────────────────────────────────

def main():
    print("\n University Support Agent — Ingestion Pipeline")
    print(" ================================================\n")

    # Sanity check: make sure data folders exist
    os.makedirs("./data/policies", exist_ok=True)
    os.makedirs("./data/courses",  exist_ok=True)
    os.makedirs("./data/events",   exist_ok=True)

    print(f"  ChromaDB store : {CHROMA_PATH}")
    print(f"  Embedding model: {EMBED_MODEL}\n")

    client   = get_chroma_client()
    embedder = get_embedder()

    for collection_name, folder in COLLECTIONS.items():
        ingest_collection(client, embedder, collection_name, folder)

    # Final summary
    print(f"\n{'='*55}")
    print("  Summary")
    print(f"{'='*55}")
    for name in COLLECTIONS:
        try:
            col   = client.get_collection(name)
            count = col.count()
            print(f"  {name:<12} -> {count} chunks stored")
        except Exception:
            print(f"  {name:<12} -> (not created - no files found)")

    print("\n  Ingestion complete. ChromaDB is ready.\n")


if __name__ == "__main__":
    main()
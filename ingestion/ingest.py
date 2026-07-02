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

CHROMA_PATH      = "./chroma_store"
EMBED_MODEL      = "nomic-embed-text"
OLLAMA_BASE_URL  = "http://localhost:11434"

# Map collection name → folder path (relative to this script)
COLLECTIONS = {
    "policies":    "./data/policies",
    "courses":     "./data/courses",
    "events":      "./data/events",
    "scholarships": "./data/scholarships",
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

    docs = load_txt_files(folder)
    if not docs:
        print("  [skip] nothing to ingest for this collection.")
        return

    chunks = chunk_documents(docs)

    # Delete old collection and recreate fresh
    try:
        client.delete_collection(name=collection_name)
        print(f"  [clean] deleted old '{collection_name}' collection")
    except Exception:
        pass  # collection didn't exist yet

    collection = client.create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )

    BATCH_SIZE = 50
    total      = len(chunks)

    for i in tqdm(range(0, total, BATCH_SIZE), desc=f"  Upserting {collection_name}"):
        batch      = chunks[i : i + BATCH_SIZE]
        texts      = [c.page_content for c in batch]
        metadatas  = [c.metadata for c in batch]
        embeddings = embedder.embed_documents(texts)
        ids        = [f"{collection_name}_{i + j}" for j, _ in enumerate(batch)]

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

    # Ensure all data folders exist
    for folder in COLLECTIONS.values():
        os.makedirs(folder, exist_ok=True)

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
            print(f"  {name:<14} -> {count} chunks stored")
        except Exception:
            print(f"  {name:<14} -> (not created - no files found)")

    print("\n  Ingestion complete. ChromaDB is ready.\n")


if __name__ == "__main__":
    main()
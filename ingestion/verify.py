"""
verify.py — Run this after ingest.py to confirm ChromaDB is populated
and that semantic search is working correctly.

Usage:
    python verify.py
"""

import chromadb
from chromadb.config import Settings
from langchain_ollama import OllamaEmbeddings


CHROMA_PATH    = "./chroma_store"
EMBED_MODEL    = "nomic-embed-text"
OLLAMA_BASE_URL = "http://localhost:11434"
COLLECTIONS    = ["policies", "courses", "events"]


def main():
    print("\n Verifying ChromaDB store...\n")

    client   = chromadb.PersistentClient(
        path=CHROMA_PATH,
        settings=Settings(anonymized_telemetry=False),
    )
    embedder = OllamaEmbeddings(model=EMBED_MODEL, base_url=OLLAMA_BASE_URL)

    for name in COLLECTIONS:
        try:
            col   = client.get_collection(name)
            count = col.count()
            print(f"  [{name}]  {count} chunks")

            if count == 0:
                print(f"    → empty — add .txt files to data/{name}/ and re-run ingest.py\n")
                continue

            # Run a test semantic search
            test_queries = {
                "policies": "What are the exam rules?",
                "courses":  "Which courses are offered in computer science?",
                "events":   "What events are happening this semester?",
            }
            query = test_queries.get(name, "university information")
            vec   = embedder.embed_query(query)

            results = col.query(
                query_embeddings=[vec],
                n_results=min(2, count),
                include=["documents", "metadatas"],
            )

            print(f"    Test query : \"{query}\"")
            for i, (doc, meta) in enumerate(zip(
                results["documents"][0],
                results["metadatas"][0],
            )):
                print(f"    Result {i+1}  ({meta.get('filename', '?')})")
                print(f"      {doc[:120].strip()}...")
            print()

        except Exception as e:
            print(f"  [{name}]  not found — run ingest.py first. ({e})\n")

    print("  Verification complete.\n")


if __name__ == "__main__":
    main()
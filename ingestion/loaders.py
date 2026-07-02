import os
from pathlib import Path
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document

CHUNK_SIZE    = 1000
CHUNK_OVERLAP = 200


def load_txt_files(folder: str) -> list[Document]:
    folder_path = Path(folder)
    if not folder_path.exists():
        print(f"  [warn] folder not found: {folder} — skipping")
        return []

    docs = []
    txt_files = list(folder_path.glob("*.txt"))

    if not txt_files:
        print(f"  [warn] no .txt files found in {folder} — skipping")
        return []

    for filepath in txt_files:
        try:
            text = filepath.read_text(encoding="utf-8").strip()
            if not text:
                print(f"  [skip] empty file: {filepath.name}")
                continue
            docs.append(Document(
                page_content=text,
                metadata={
                    "source":     str(filepath),
                    "filename":   filepath.name,
                    "collection": folder_path.name,
                }
            ))
            print(f"  [load] {filepath.name}  ({len(text)} chars)")
        except Exception as e:
            print(f"  [error] could not read {filepath.name}: {e}")

    return docs


def chunk_documents(docs: list[Document]) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        # Split on double newlines first — keeps sections intact
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(docs)
    print(f"  [chunk] {len(docs)} doc(s) -> {len(chunks)} chunks "
          f"(size={CHUNK_SIZE}, overlap={CHUNK_OVERLAP})")
    return chunks
"""
agent/tools/rag_tool.py — RAG pipeline (used by rag_node in the LangGraph graph)
Retrieves relevant chunks from ChromaDB and generates an answer using the LLM.
Searches all 3 collections with smart routing and query expansion.
"""

import os
from langchain_groq import ChatGroq
from langchain_ollama import OllamaLLM
from dotenv import load_dotenv

from db.chroma_client import query_collection
from agent.prompts import RAG_SYSTEM_PROMPT

load_dotenv()

GROQ_API_KEY    = os.getenv("GROQ_API_KEY")
GROQ_MODEL      = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "phi3")

# ── LLM setup ─────────────────────────────────────────────────────────────────

def _get_llm(streaming: bool = False):
    """Returns Groq LLM if API key present, else falls back to Ollama."""
    if GROQ_API_KEY:
        return ChatGroq(
            model=GROQ_MODEL,
            temperature=0.1,
            api_key=GROQ_API_KEY,
            streaming=streaming,
        )
    return OllamaLLM(
        model=OLLAMA_MODEL,
        base_url=OLLAMA_BASE_URL,
        temperature=0.1,
        streaming=streaming,
    )


# ── Smart collection routing ──────────────────────────────────────────────────

COURSE_KEYWORDS  = ['course', 'subject', 'semester', 'curriculum', 'syllabus',
                    'department', 'hod', 'head', 'lab', 'laboratory', 'intake',
                    'cse', 'it', 'aids', 'entc', 'mech', 'civil', 'iot',
                    'data science', 'software engineering', 'computer']

EVENT_KEYWORDS   = ['event', 'fest', 'gandharva', 'club', 'sports', 'workshop',
                    'seminar', 'competition', 'hackathon', 'placement drive',
                    'upcoming', 'schedule', 'happening']

POLICY_KEYWORDS  = ['attendance', 'exam', 'fee', 'rule', 'policy', 'library',
                    'hostel', 'mess', 'placement', 'cgpa', 'backlog', 'atkt',
                    'deadline', 'grievance', 'anti-ragging', 'grading',
                    'scholarship', 'admission', 'result', 'revaluation',
                    'fine', 'eligibility', 'internship', 'regulation', 'counseling']


def _route_collections(query: str) -> list[str]:
    """Returns ordered list of collections to search based on query keywords."""
    q = query.lower()
    scores = {'policies': 0, 'courses': 0, 'events': 0}
    for kw in POLICY_KEYWORDS:
        if kw in q: scores['policies'] += 1
    for kw in COURSE_KEYWORDS:
        if kw in q: scores['courses'] += 1
    for kw in EVENT_KEYWORDS:
        if kw in q: scores['events'] += 1

    ranked = sorted(scores, key=lambda k: scores[k], reverse=True)
    if scores[ranked[0]] == 0:
        return ['policies', 'courses', 'events']
    return ranked


# ── Query expansion ───────────────────────────────────────────────────────────

EXPANSION_MAP = {
    'hod':           'Head of Department',
    'head':          'Head of Department',
    'prof':          'Professor faculty',
    'dr':            'Doctor faculty',
    'timing':        'timings hours schedule',
    'time':          'timings hours',
    'fee':           'fees charges payment',
    'fine':          'fine penalty charges',
    'pass':          'passing marks minimum percentage',
    'fail':          'fail failure minimum marks',
    'cgpa':          'CGPA grade point average',
    'backlog':       'backlog ATKT arrear failed subject',
    'atkt':          'ATKT backlog allowed to keep terms',
    'wifi':          'WiFi internet network connectivity',
    'hostel':        'hostel accommodation residential',
    'mess':          'mess food canteen meals',
    'placement':     'placement training campus recruitment',
    'internship':    'internship training industry',
    'library':       'library books borrow reading',
    're-evaluation': 're-evaluation revaluation answer sheet',
    'grievance':     'grievance complaint redressal',
    'counseling':    'counseling mental health support wellness',
}


def _expand_query(query: str) -> str:
    q = query.lower()
    expansions = [exp for term, exp in EXPANSION_MAP.items() if term in q]
    return f"{query} {' '.join(expansions)}" if expansions else query


# ── Retrieval with confidence filtering ──────────────────────────────────────

CONFIDENCE_THRESHOLD = 0.55   # skip chunks with cosine distance > this


def _retrieve_context(query: str) -> tuple[str, list[str], float]:
    """
    Returns:
        context      : formatted string for the prompt
        sources      : list of source filenames
        avg_score    : average retrieval confidence (0–1, higher = better)
    """
    expanded_query = _expand_query(query)
    collections    = _route_collections(query)
    n_results_map  = [5, 3, 2]

    all_chunks: list[dict] = []
    sources: set[str] = set()

    for i, collection in enumerate(collections):
        n = n_results_map[i] if i < len(n_results_map) else 2
        chunks = query_collection(collection, expanded_query, n_results=n)
        all_chunks.extend(chunks)
        for c in chunks:
            if c.get('filename'):
                sources.add(c['filename'])

    # Deduplicate by text
    seen, unique = set(), []
    for c in all_chunks:
        if c['text'] not in seen:
            seen.add(c['text'])
            unique.append(c)

    if not unique:
        return '', [], 0.0

    # Compute avg confidence from distance scores (ChromaDB returns L2 or cosine distances)
    distances = [c.get('distance', 1.0) for c in unique]
    avg_score = round(1 - (sum(distances) / len(distances)), 2)

    context_parts = [
        f"[Source: {c['filename']}]\n{c['text']}"
        for c in unique
    ]
    return '\n\n---\n\n'.join(context_parts), list(sources), avg_score


# ── Generation ────────────────────────────────────────────────────────────────

def run_rag_query(query: str) -> dict:
    """Full RAG pipeline — retrieve + generate. Returns {answer, sources, confidence}."""
    context, sources, confidence = _retrieve_context(query)

    if not context:
        return {
            'answer': (
                'I could not find relevant information in the university documents. '
                'Please contact the university at +91-20-2605-2000 or visit portal.viit.ac.in'
            ),
            'sources': [],
            'confidence': 0.0,
        }

    prompt = RAG_SYSTEM_PROMPT.format(context=context) + f'\n\nStudent Query: {query}\n\nAnswer:'
    llm    = _get_llm(streaming=False)

    # Handle both ChatGroq (returns AIMessage) and OllamaLLM (returns str)
    response = llm.invoke(prompt)
    answer   = response.content if hasattr(response, 'content') else str(response)

    return {'answer': answer.strip(), 'sources': sources, 'confidence': confidence}


def stream_rag_query(query: str):
    """Generator — yields text tokens for streaming responses."""
    context, sources, _ = _retrieve_context(query)

    if not context:
        yield 'I could not find relevant information in the university documents. '
        yield 'Please contact the university at +91-20-2605-2000 or visit portal.viit.ac.in'
        return

    prompt = RAG_SYSTEM_PROMPT.format(context=context) + f'\n\nStudent Query: {query}\n\nAnswer:'
    llm    = _get_llm(streaming=True)

    for chunk in llm.stream(prompt):
        # Handle both ChatGroq chunks (AIMessageChunk) and OllamaLLM chunks (str)
        token = chunk.content if hasattr(chunk, 'content') else str(chunk)
        if token:
            yield token
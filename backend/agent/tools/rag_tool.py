
"""
agent/tools/rag_tool.py — Fixed RAG pipeline
Improvements:
  1. Smart collection routing — picks the right collection based on query intent
  2. Query expansion — rewrites query to better match document language
  3. Higher n_results — retrieves more chunks before filtering
  4. Better prompt — stricter instruction to use context
"""

import os
from langchain_ollama import OllamaLLM
from dotenv import load_dotenv

from db.chroma_client import query_collection
from agent.prompts import RAG_SYSTEM_PROMPT

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "llama3")


def _get_llm(streaming=False):
    return OllamaLLM(
        model=OLLAMA_MODEL,
        base_url=OLLAMA_BASE_URL,
        temperature=0.1,
        streaming=streaming,
    )


# ── Smart collection routing ──────────────────────────────────────────────────
# Instead of searching all 3 collections (which adds noise),
# pick the most relevant one(s) based on keywords in the query.

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
                    'fine', 'eligibility', 'internship', 'regulation']


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

    # Sort by score descending — always search at least top 2
    ranked = sorted(scores, key=lambda k: scores[k], reverse=True)

    # If top collection has clear signal, search it first with more results
    # Always include at least 2 collections to avoid missing context
    if scores[ranked[0]] == 0:
        return ['policies', 'courses', 'events']   # no signal — search all

    return ranked   # return all, but ordered by relevance


# ── Query expansion ───────────────────────────────────────────────────────────
# Rewrites the user query into terms that better match document language.
# E.g. "who is HOD of CSE" → "Head of Department CSE Computer Science Dr contact email"

EXPANSION_MAP = {
    'hod':              'Head of Department',
    'head':             'Head of Department',
    'prof':             'Professor faculty',
    'dr':               'Doctor faculty',
    'timing':           'timings hours schedule',
    'time':             'timings hours',
    'fee':              'fees charges payment',
    'fine':             'fine penalty charges',
    'pass':             'passing marks minimum percentage',
    'fail':             'fail failure minimum marks',
    'cgpa':             'CGPA grade point average',
    'backlog':          'backlog ATKT arrear failed subject',
    'atkt':             'ATKT backlog allowed to keep terms',
    'wifi':             'WiFi internet network connectivity',
    'hostel':           'hostel accommodation residential',
    'mess':             'mess food canteen meals',
    'placement':        'placement training campus recruitment',
    'internship':       'internship training industry',
    'library':          'library books borrow reading',
    're-evaluation':    're-evaluation revaluation answer sheet',
    'grievance':        'grievance complaint redressal',
}

def _expand_query(query: str) -> str:
    """Expands abbreviations and adds related terms to improve retrieval."""
    q = query.lower()
    expansions = []
    for term, expansion in EXPANSION_MAP.items():
        if term in q:
            expansions.append(expansion)
    if expansions:
        return f"{query} {' '.join(expansions)}"
    return query


# ── Retrieval ─────────────────────────────────────────────────────────────────

def _retrieve_context(query: str) -> tuple[str, list[str]]:
    expanded_query = _expand_query(query)
    collections    = _route_collections(query)

    all_chunks = []
    sources    = set()

    # Search top collection with more results, others with fewer
    n_results_map = [5, 3, 2]

    for i, collection in enumerate(collections):
        n = n_results_map[i] if i < len(n_results_map) else 2
        chunks = query_collection(collection, expanded_query, n_results=n)
        all_chunks.extend(chunks)
        for c in chunks:
            if c['filename']:
                sources.add(c['filename'])

    # Deduplicate by text
    seen, unique = set(), []
    for c in all_chunks:
        if c['text'] not in seen:
            seen.add(c['text'])
            unique.append(c)

    if not unique:
        return '', []

    context_parts = [
        f"[Source: {c['filename']}]\n{c['text']}"
        for c in unique
    ]
    return '\n\n---\n\n'.join(context_parts), list(sources)


# ── Generation ────────────────────────────────────────────────────────────────

def run_rag_query(query: str) -> dict:
    context, sources = _retrieve_context(query)

    if not context:
        return {
            'answer': (
                'I could not find relevant information for your query in the university documents. '
                'Please contact the university at +91-20-2605-2000 or visit portal.viit.ac.in'
            ),
            'sources': [],
        }

    prompt = RAG_SYSTEM_PROMPT.format(context=context) + f'\n\nStudent Query: {query}\n\nAnswer:'
    llm    = _get_llm(streaming=False)
    answer = llm.invoke(prompt)

    return {'answer': answer.strip(), 'sources': sources}


def stream_rag_query(query: str):
    context, sources = _retrieve_context(query)

    if not context:
        yield 'I could not find relevant information in the university documents. '
        yield 'Please contact the university at +91-20-2605-2000 or visit portal.viit.ac.in'
        return

    prompt = RAG_SYSTEM_PROMPT.format(context=context) + f'\n\nStudent Query: {query}\n\nAnswer:'
    llm    = _get_llm(streaming=True)

    for token in llm.stream(prompt):
        yield token
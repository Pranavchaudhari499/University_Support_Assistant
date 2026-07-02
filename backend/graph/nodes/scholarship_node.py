"""
graph/nodes/scholarship_node.py — Scholarship Finder Agent Node

Highest societal impact agent: searches government scholarship databases
(Mahadbt, NSP, AICTE) to find financial aid that students are eligible for.

Works in two steps:
1. RAG: retrieves local scholarship data from ChromaDB (fast, accurate)
2. Web search: finds any additional live scholarships via Tavily
"""

import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_ollama import OllamaLLM
from tavily import TavilyClient

from graph.state import AgentState
from agent.prompts import SCHOLARSHIP_PROMPT
from db.chroma_client import query_collection

load_dotenv()

TAVILY_API_KEY  = os.getenv("TAVILY_API_KEY")
GROQ_API_KEY    = os.getenv("GROQ_API_KEY")
GROQ_MODEL      = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "phi3")


def _get_llm():
    if GROQ_API_KEY:
        return ChatGroq(model=GROQ_MODEL, temperature=0.1, api_key=GROQ_API_KEY)
    return OllamaLLM(model=OLLAMA_MODEL, base_url=OLLAMA_BASE_URL, temperature=0.1)


def _extract_profile_from_query(query: str) -> dict:
    """
    Extracts student profile signals from the query text.
    Used when no structured profile is provided.
    """
    q = query.lower()
    profile = {}

    # Category detection
    for cat in ["sc", "st", "obc", "vjnt", "nt", "sbc", "ebc", "open", "general",
                "minority", "muslim", "christian", "female", "girl", "differently abled"]:
        if cat in q:
            profile["category"] = cat
            break

    # CGPA detection (e.g. "8.2 cgpa" or "cgpa 7.5")
    import re
    cgpa_match = re.search(r"(\d+\.?\d*)\s*cgpa|cgpa\s*(\d+\.?\d*)", q)
    if cgpa_match:
        profile["cgpa"] = float(cgpa_match.group(1) or cgpa_match.group(2))

    # Income detection (e.g. "income 3 lakh")
    income_match = re.search(r"income\s*(\d+\.?\d*)\s*lakh", q)
    if income_match:
        profile["income_lakh"] = float(income_match.group(1))

    return profile


def scholarship_node(state: AgentState) -> AgentState:
    """Finds scholarships the student is eligible for based on their profile."""
    query   = state["query"]
    profile = state.get("student_profile") or _extract_profile_from_query(query)

    trace = state.get("agent_trace", [])
    trace.append({
        "agent": "scholarship",
        "status": "running",
        "detail": f"Finding scholarships for profile: {profile or 'extracting from query...'}",
    })

    # ── Step 1: RAG retrieval from local scholarship data ─────────────────────
    local_chunks = query_collection("scholarships", query, n_results=5)
    local_context = "\n\n".join(
        f"[Local DB] {c['text']}" for c in local_chunks
    ) if local_chunks else ""

    # ── Step 2: Live web search ────────────────────────────────────────────────
    web_context = ""
    if TAVILY_API_KEY:
        try:
            category = profile.get("category", "")
            cgpa     = profile.get("cgpa", "")
            search_q = f"scholarship engineering student Maharashtra India 2024 2025 {category} {cgpa} CGPA Mahadbt NSP AICTE"

            client  = TavilyClient(api_key=TAVILY_API_KEY)
            results = client.search(
                query=search_q,
                max_results=5,
                search_depth="basic",
                include_domains=["mahadbt.maharashtra.gov.in", "scholarships.gov.in",
                                 "aicte-india.org", "sppu.ac.in"],
            )
            raw = results.get("results", [])
            if raw:
                web_context = "\n\n".join(
                    f"[Web] {r.get('title','')}\nURL: {r.get('url','')}\n{r.get('content','')}"
                    for r in raw
                )
                # Collect URLs as sources
                urls        = [r.get("url", "") for r in raw if r.get("url")]
                all_sources = list(set(state.get("sources", []) + urls))
                state       = {**state, "sources": all_sources}
        except Exception:
            pass

    combined_context = "\n\n===\n\n".join(filter(None, [local_context, web_context]))

    if not combined_context:
        trace[-1] = {"agent": "scholarship", "status": "done", "detail": "No scholarship data found"}
        return {
            **state,
            "scholarship_result": (
                "I couldn't find specific scholarship information. "
                "Please visit mahadbt.maharashtra.gov.in and scholarships.gov.in directly, "
                "or contact VIIT's scholarship cell at scholarships@viit.ac.in"
            ),
            "agent_trace": trace,
        }

    # ── Step 3: LLM synthesis ─────────────────────────────────────────────────
    profile_text = (
        "\n".join(f"  - {k}: {v}" for k, v in profile.items())
        if profile else "  - Not specified (general query)"
    )

    llm    = _get_llm()
    prompt = SCHOLARSHIP_PROMPT.format(
        student_profile=profile_text,
        search_results=combined_context,
    )
    resp   = llm.invoke(prompt)
    answer = resp.content if hasattr(resp, "content") else str(resp)

    trace[-1] = {
        "agent": "scholarship",
        "status": "done",
        "detail": f"Found scholarships from {len(local_chunks)} local + web sources",
    }

    return {
        **state,
        "scholarship_result": answer.strip(),
        "agent_trace": trace,
    }

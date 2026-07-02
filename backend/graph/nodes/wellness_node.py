"""
graph/nodes/wellness_node.py — Student Wellness & Mental Health Agent Node

Highest societal impact: provides empathetic first-response support to
students experiencing stress, burnout, anxiety, or crisis.

IMPORTANT: This agent is NOT a replacement for professional counseling.
It is a compassionate first point of contact that:
1. Acknowledges the student's feelings
2. Offers evidence-based coping strategies
3. Connects them to VIIT counseling and national helplines

Always retrieves VIIT's counseling resources from ChromaDB first.
"""

import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_ollama import OllamaLLM

from graph.state import AgentState
from agent.prompts import WELLNESS_PROMPT
from db.chroma_client import query_collection

load_dotenv()

GROQ_API_KEY    = os.getenv("GROQ_API_KEY")
GROQ_MODEL      = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "phi3")

# Critical safety signals — if detected, ALWAYS include crisis helplines prominently
CRISIS_SIGNALS = [
    "suicid", "end my life", "kill myself", "don't want to live",
    "self harm", "hurt myself", "no reason to live", "can't go on"
]


def _get_llm():
    if GROQ_API_KEY:
        # Use a slightly more capable model for wellness — empathy matters
        return ChatGroq(model="llama-3.1-8b-instant", temperature=0.4, api_key=GROQ_API_KEY)
    return OllamaLLM(model=OLLAMA_MODEL, base_url=OLLAMA_BASE_URL, temperature=0.4)


def _is_crisis(query: str) -> bool:
    q = query.lower()
    return any(signal in q for signal in CRISIS_SIGNALS)


def wellness_node(state: AgentState) -> AgentState:
    """Provides empathetic wellness support and connects to counseling resources."""
    query     = state["query"]
    is_crisis = _is_crisis(query)

    trace = state.get("agent_trace", [])
    trace.append({
        "agent": "wellness",
        "status": "running",
        "detail": "Providing wellness support...",
    })

    # ── Retrieve VIIT counseling resources from ChromaDB ──────────────────────
    viit_chunks = query_collection(
        "policies",
        "counseling mental health support wellness student",
        n_results=3,
    )
    viit_resources = "\n".join(c["text"] for c in viit_chunks) if viit_chunks else (
        "VIIT Counseling Cell: counseling@viit.ac.in | +91-20-2605-2000 Ext. 312\n"
        "Walk-in: Tuesday & Thursday, 2–4 PM"
    )

    # ── Crisis override: prepend emergency message ─────────────────────────────
    crisis_prefix = ""
    if is_crisis:
        crisis_prefix = (
            "⚠️ **If you are in immediate danger, please call 112 (Emergency) now.**\n\n"
            "**Crisis Helplines (available right now):**\n"
            "- iCall: **9152987821** (Mon–Sat, 8am–10pm)\n"
            "- Vandrevala Foundation: **1860-2662-345** (24/7, free)\n"
            "- NIMHANS: **080-46110007**\n\n"
            "---\n\n"
        )

    # ── Generate empathetic response ──────────────────────────────────────────
    llm    = _get_llm()
    prompt = WELLNESS_PROMPT.format(
        message=query,
        viit_resources=viit_resources,
    )
    resp   = llm.invoke(prompt)
    answer = resp.content if hasattr(resp, "content") else str(resp)

    full_answer = crisis_prefix + answer.strip()

    trace[-1] = {
        "agent": "wellness",
        "status": "done",
        "detail": "Crisis response" if is_crisis else "Wellness support provided",
    }

    return {
        **state,
        "wellness_result": full_answer,
        "agent_trace": trace,
    }

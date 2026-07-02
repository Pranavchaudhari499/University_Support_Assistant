"""
graph/supervisor.py — The Supervisor Node.
Classifies the user's query and decides which agents to invoke.
Uses Groq (Llama 3.1) for fast, reliable intent classification.
"""

import os
import json
import re
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_ollama import OllamaLLM

from graph.state import AgentState
from agent.prompts import SUPERVISOR_PROMPT

load_dotenv()

GROQ_API_KEY    = os.getenv("GROQ_API_KEY")
GROQ_MODEL      = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "phi3")

# Valid agent names the supervisor can choose from
VALID_AGENTS = {"rag", "websearch", "scholarship", "career", "wellness"}


def _get_llm():
    if GROQ_API_KEY:
        return ChatGroq(model=GROQ_MODEL, temperature=0.0, api_key=GROQ_API_KEY)
    return OllamaLLM(model=OLLAMA_MODEL, base_url=OLLAMA_BASE_URL, temperature=0.0)


def _parse_supervisor_response(raw: str) -> dict:
    """
    Robustly extract JSON from supervisor LLM output.
    Handles cases where the LLM wraps JSON in markdown code blocks.
    """
    # Strip markdown code fences if present
    cleaned = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()

    # Find the first { ... } block
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # Fallback — default to RAG only
    return {
        "intent": "general university query",
        "agents": ["rag"],
        "needs_profile": False,
        "reasoning": "JSON parse failed — defaulting to RAG",
    }


def supervisor_node(state: AgentState) -> AgentState:
    """
    Supervisor node: classifies query and populates agents_to_call.
    """
    query = state["query"]

    # ── Wellness override: catch emotional distress immediately ───────────────
    distress_signals = [
        "stressed", "stress", "anxious", "anxiety", "depressed", "depression",
        "hopeless", "give up", "can't cope", "mental", "burnout", "overwhelmed",
        "panic", "scared", "afraid", "lonely", "suicid", "harm", "help me",
        "tired of", "can't take", "losing it"
    ]
    q_lower = query.lower()
    if any(signal in q_lower for signal in distress_signals):
        trace = state.get("agent_trace", [])
        trace.append({
            "agent": "supervisor",
            "status": "done",
            "detail": "Detected wellness concern — routing to Wellness Agent"
        })
        return {
            **state,
            "intent": "student expressing emotional distress",
            "agents_to_call": ["wellness", "rag"],
            "needs_profile": False,
            "agent_trace": trace,
        }

    # ── Standard LLM classification ───────────────────────────────────────────
    llm    = _get_llm()
    prompt = SUPERVISOR_PROMPT.format(query=query)

    response = llm.invoke(prompt)
    raw      = response.content if hasattr(response, "content") else str(response)
    parsed   = _parse_supervisor_response(raw)

    # Sanitize: only keep valid agent names
    agents = [a for a in parsed.get("agents", ["rag"]) if a in VALID_AGENTS]
    if not agents:
        agents = ["rag"]

    trace = state.get("agent_trace", [])
    trace.append({
        "agent": "supervisor",
        "status": "done",
        "detail": f"Routing to: {', '.join(agents)} | {parsed.get('reasoning', '')}",
    })

    return {
        **state,
        "intent": parsed.get("intent", "general university query"),
        "agents_to_call": agents,
        "needs_profile": parsed.get("needs_profile", False),
        "agent_trace": trace,
    }

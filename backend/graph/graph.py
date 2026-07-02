"""
graph/graph.py — LangGraph StateGraph compiler.

Wires the Supervisor + 5 Agent Nodes into a complete graph:

    START → supervisor → [rag, websearch, scholarship, career, wellness] → synthesizer → END

The supervisor decides which agents run. Only selected agents execute.
The synthesizer merges all results into one coherent final answer.
"""

import os
from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END
from langchain_groq import ChatGroq
from langchain_ollama import OllamaLLM

from graph.state import AgentState
from graph.supervisor import supervisor_node
from graph.nodes.rag_node import rag_node
from graph.nodes.websearch_node import websearch_node
from graph.nodes.scholarship_node import scholarship_node
from graph.nodes.career_node import career_node
from graph.nodes.wellness_node import wellness_node
from agent.prompts import SYNTHESIZER_PROMPT

load_dotenv()

GROQ_API_KEY    = os.getenv("GROQ_API_KEY")
GROQ_MODEL      = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "phi3")


# ── LLM for synthesis ─────────────────────────────────────────────────────────

def _get_synth_llm():
    if GROQ_API_KEY:
        return ChatGroq(model=GROQ_MODEL, temperature=0.2, api_key=GROQ_API_KEY)
    return OllamaLLM(model=OLLAMA_MODEL, base_url=OLLAMA_BASE_URL, temperature=0.2)


# ── Conditional routing ───────────────────────────────────────────────────────

def _should_run_rag(state: AgentState) -> bool:
    return "rag" in state.get("agents_to_call", [])

def _should_run_websearch(state: AgentState) -> bool:
    return "websearch" in state.get("agents_to_call", [])

def _should_run_scholarship(state: AgentState) -> bool:
    return "scholarship" in state.get("agents_to_call", [])

def _should_run_career(state: AgentState) -> bool:
    return "career" in state.get("agents_to_call", [])

def _should_run_wellness(state: AgentState) -> bool:
    return "wellness" in state.get("agents_to_call", [])


# ── Conditional node wrappers (skip if not selected) ─────────────────────────

def rag_node_conditional(state: AgentState) -> AgentState:
    if _should_run_rag(state):
        return rag_node(state)
    return state

def websearch_node_conditional(state: AgentState) -> AgentState:
    if _should_run_websearch(state):
        return websearch_node(state)
    return state

def scholarship_node_conditional(state: AgentState) -> AgentState:
    if _should_run_scholarship(state):
        return scholarship_node(state)
    return state

def career_node_conditional(state: AgentState) -> AgentState:
    if _should_run_career(state):
        return career_node(state)
    return state

def wellness_node_conditional(state: AgentState) -> AgentState:
    if _should_run_wellness(state):
        return wellness_node(state)
    return state


# ── Synthesizer node ──────────────────────────────────────────────────────────

def synthesizer_node(state: AgentState) -> AgentState:
    """Merges outputs from all agents into one coherent answer."""
    query = state["query"]

    trace = state.get("agent_trace", [])
    trace.append({"agent": "synthesizer", "status": "running", "detail": "Merging agent outputs..."})

    # Collect non-None results
    results = []
    if state.get("rag_result"):
        results.append(("University Documents (RAG)", state["rag_result"]))
    if state.get("websearch_result"):
        results.append(("Web Search", state["websearch_result"]))
    if state.get("scholarship_result"):
        results.append(("Scholarship Finder", state["scholarship_result"]))
    if state.get("career_result"):
        results.append(("Career Advisor", state["career_result"]))
    if state.get("wellness_result"):
        results.append(("Wellness Support", state["wellness_result"]))

    if not results:
        trace[-1] = {"agent": "synthesizer", "status": "done", "detail": "No agent results to merge"}
        return {
            **state,
            "final_answer": "I couldn't find relevant information for your query. Please contact VIIT at +91-20-2605-2000.",
            "agent_trace": trace,
        }

    # If only one agent ran, return its result directly (no synthesis overhead)
    if len(results) == 1:
        trace[-1] = {"agent": "synthesizer", "status": "done", "detail": "Single agent — direct response"}
        return {**state, "final_answer": results[0][1], "agent_trace": trace}

    # Multiple agents — synthesize with LLM
    agent_outputs = "\n\n===\n\n".join(
        f"[{name}]:\n{content}" for name, content in results
    )

    llm    = _get_synth_llm()
    prompt = SYNTHESIZER_PROMPT.format(query=query, agent_outputs=agent_outputs)
    resp   = llm.invoke(prompt)
    answer = resp.content if hasattr(resp, "content") else str(resp)

    trace[-1] = {
        "agent": "synthesizer",
        "status": "done",
        "detail": f"Merged {len(results)} agent output(s)",
    }

    return {**state, "final_answer": answer.strip(), "agent_trace": trace}


# ── Graph compilation ─────────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    """Builds and compiles the full LangGraph StateGraph."""
    builder = StateGraph(AgentState)

    # Add all nodes
    builder.add_node("supervisor",   supervisor_node)
    builder.add_node("rag",          rag_node_conditional)
    builder.add_node("websearch",    websearch_node_conditional)
    builder.add_node("scholarship",  scholarship_node_conditional)
    builder.add_node("career",       career_node_conditional)
    builder.add_node("wellness",     wellness_node_conditional)
    builder.add_node("synthesizer",  synthesizer_node)

    # Edges: START → supervisor → all agents (in sequence) → synthesizer → END
    builder.add_edge(START,        "supervisor")
    builder.add_edge("supervisor", "rag")
    builder.add_edge("rag",        "websearch")
    builder.add_edge("websearch",  "scholarship")
    builder.add_edge("scholarship","career")
    builder.add_edge("career",     "wellness")
    builder.add_edge("wellness",   "synthesizer")
    builder.add_edge("synthesizer", END)

    return builder.compile()


# Compile once at import time — reused across all requests
_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


def run_graph(query: str, student_profile: dict | None = None) -> dict:
    """
    Main entry point. Runs the full multi-agent graph.
    Returns { final_answer, sources, agent_trace, rag_confidence }
    """
    graph = get_graph()

    initial_state: AgentState = {
        "query":               query,
        "intent":              "",
        "agents_to_call":      [],
        "needs_profile":       False,
        "student_profile":     student_profile,
        "rag_result":          None,
        "websearch_result":    None,
        "scholarship_result":  None,
        "career_result":       None,
        "wellness_result":     None,
        "sources":             [],
        "rag_confidence":      0.0,
        "agent_trace":         [],
        "final_answer":        "",
    }

    final_state = graph.invoke(initial_state)

    return {
        "answer":       final_state.get("final_answer", ""),
        "sources":      final_state.get("sources", []),
        "agent_trace":  final_state.get("agent_trace", []),
        "confidence":   final_state.get("rag_confidence", 0.0),
        "intent":       final_state.get("intent", ""),
        "agents_used":  final_state.get("agents_to_call", []),
    }

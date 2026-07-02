"""
graph/nodes/rag_node.py — RAG Agent Node
Retrieves context from ChromaDB and generates an answer using the LLM.
Wraps the existing rag_tool logic into a LangGraph-compatible node.
"""

from graph.state import AgentState
from agent.tools.rag_tool import run_rag_query


def rag_node(state: AgentState) -> AgentState:
    """Calls ChromaDB retrieval + LLM generation for policy/course/event queries."""
    query = state["query"]

    trace = state.get("agent_trace", [])
    trace.append({"agent": "rag", "status": "running", "detail": "Searching university documents..."})

    result     = run_rag_query(query)
    answer     = result.get("answer", "")
    sources    = result.get("sources", [])
    confidence = result.get("confidence", 0.0)

    # Merge sources with any already collected
    all_sources = list(set(state.get("sources", []) + sources))

    # Update trace entry to done
    trace[-1] = {
        "agent": "rag",
        "status": "done",
        "detail": f"Found {len(sources)} source(s) | Confidence: {confidence:.0%}",
    }

    return {
        **state,
        "rag_result": answer,
        "sources": all_sources,
        "rag_confidence": confidence,
        "agent_trace": trace,
    }

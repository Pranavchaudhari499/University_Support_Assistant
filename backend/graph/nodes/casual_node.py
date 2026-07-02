"""
graph/nodes/casual_node.py — Casual Conversation Node
Handles greetings, thanks, and general chit-chat without hitting ChromaDB or web search.
Returns a warm, helpful response directly from the LLM.
"""

import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_ollama import OllamaLLM
from graph.state import AgentState

load_dotenv()

GROQ_API_KEY    = os.getenv("GROQ_API_KEY")
GROQ_MODEL      = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "phi3")

CASUAL_SYSTEM_PROMPT = """
You are VIIT Assistant, a friendly AI support agent for Vishwakarma Institute of
Information Technology (VIIT), Pune.

The student has sent a casual message (greeting, thanks, or general chit-chat).
Respond in a warm, helpful, concise way.

Introduce yourself briefly and tell them what you can help with:
- University policies (attendance, fees, exams, hostel, library)
- Course and department information
- Scholarship discovery (government + AICTE schemes)
- Career guidance and job market info
- Mental wellness support

Keep the response short (3-5 sentences max). Be friendly, not robotic.
Do NOT mention documents, databases, or any technical details.
""".strip()


def _get_llm():
    if GROQ_API_KEY:
        return ChatGroq(model=GROQ_MODEL, temperature=0.5, api_key=GROQ_API_KEY)
    return OllamaLLM(model=OLLAMA_MODEL, base_url=OLLAMA_BASE_URL, temperature=0.5)


def casual_node(state: AgentState) -> AgentState:
    """Handles greetings and casual messages with a direct, warm LLM response."""
    query = state["query"]

    trace = state.get("agent_trace", [])
    trace.append({
        "agent": "casual",
        "status": "running",
        "detail": "Preparing a friendly response...",
    })

    llm    = _get_llm()
    prompt = f"{CASUAL_SYSTEM_PROMPT}\n\nStudent message: {query}\n\nResponse:"

    resp   = llm.invoke(prompt)
    answer = resp.content if hasattr(resp, "content") else str(resp)

    trace[-1] = {
        "agent": "casual",
        "status": "done",
        "detail": "Casual greeting handled",
    }

    return {
        **state,
        "rag_result": answer.strip(),   # reuse rag_result slot — synthesizer picks it up
        "agent_trace": trace,
    }

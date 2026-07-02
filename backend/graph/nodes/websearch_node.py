"""
graph/nodes/websearch_node.py — Web Search Agent Node
Uses Tavily to fetch real-time information from the internet.
Handles: latest SPPU circulars, news, current events, anything not in local docs.
"""

import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_ollama import OllamaLLM
from tavily import TavilyClient

from graph.state import AgentState
from agent.prompts import WEB_SEARCH_PROMPT

load_dotenv()

TAVILY_API_KEY  = os.getenv("TAVILY_API_KEY")
GROQ_API_KEY    = os.getenv("GROQ_API_KEY")
GROQ_MODEL      = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "phi3")


def _get_llm():
    if GROQ_API_KEY:
        return ChatGroq(model=GROQ_MODEL, temperature=0.2, api_key=GROQ_API_KEY)
    return OllamaLLM(model=OLLAMA_MODEL, base_url=OLLAMA_BASE_URL, temperature=0.2)


def _format_search_results(results: list[dict]) -> str:
    """Format Tavily results into a readable context string."""
    parts = []
    for i, r in enumerate(results, 1):
        title   = r.get("title", "No title")
        content = r.get("content", "")
        url     = r.get("url", "")
        parts.append(f"[{i}] {title}\nURL: {url}\n{content}")
    return "\n\n---\n\n".join(parts)


def websearch_node(state: AgentState) -> AgentState:
    """Searches the web for real-time information relevant to the student's query."""
    query = state["query"]

    trace = state.get("agent_trace", [])
    trace.append({"agent": "websearch", "status": "running", "detail": f"Searching: '{query[:60]}...'"})

    if not TAVILY_API_KEY:
        trace[-1] = {"agent": "websearch", "status": "skipped", "detail": "Tavily API key not configured"}
        return {**state, "websearch_result": None, "agent_trace": trace}

    try:
        client  = TavilyClient(api_key=TAVILY_API_KEY)
        # Focus search on Indian education/university context
        enhanced_query = f"{query} SPPU VIIT Pune engineering India"
        results = client.search(
            query=enhanced_query,
            max_results=4,
            search_depth="basic",
            include_domains=["sppu.ac.in", "viit.ac.in", "mahadbt.maharashtra.gov.in",
                             "aicte-india.org", "ugc.ac.in"],
        )
        raw_results = results.get("results", [])

        # Fallback to broader search if no results from restricted domains
        if not raw_results:
            results     = client.search(query=query, max_results=4, search_depth="basic")
            raw_results = results.get("results", [])

        if not raw_results:
            trace[-1] = {"agent": "websearch", "status": "done", "detail": "No results found"}
            return {**state, "websearch_result": "No relevant web results found.", "agent_trace": trace}

        search_context = _format_search_results(raw_results)

        # Synthesize with LLM
        llm    = _get_llm()
        prompt = WEB_SEARCH_PROMPT.format(search_results=search_context, query=query)
        resp   = llm.invoke(prompt)
        answer = resp.content if hasattr(resp, "content") else str(resp)

        # Collect source URLs
        urls = [r.get("url", "") for r in raw_results if r.get("url")]
        all_sources = list(set(state.get("sources", []) + urls))

        trace[-1] = {
            "agent": "websearch",
            "status": "done",
            "detail": f"Found {len(raw_results)} web result(s)",
        }

        return {
            **state,
            "websearch_result": answer.strip(),
            "sources": all_sources,
            "agent_trace": trace,
        }

    except Exception as e:
        trace[-1] = {"agent": "websearch", "status": "error", "detail": str(e)[:100]}
        return {**state, "websearch_result": None, "agent_trace": trace}

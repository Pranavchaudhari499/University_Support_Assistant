"""
graph/nodes/career_node.py — Career Advisor Agent Node

Provides personalized career guidance for engineering students:
- Recommends career paths based on branch + interests
- Fetches live job/internship data from the web
- Suggests specific certifications and skills to develop now
"""

import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_ollama import OllamaLLM
from tavily import TavilyClient

from graph.state import AgentState
from agent.prompts import CAREER_ADVISOR_PROMPT

load_dotenv()

TAVILY_API_KEY  = os.getenv("TAVILY_API_KEY")
GROQ_API_KEY    = os.getenv("GROQ_API_KEY")
GROQ_MODEL      = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "phi3")


def _get_llm():
    if GROQ_API_KEY:
        return ChatGroq(model=GROQ_MODEL, temperature=0.3, api_key=GROQ_API_KEY)
    return OllamaLLM(model=OLLAMA_MODEL, base_url=OLLAMA_BASE_URL, temperature=0.3)


def _extract_career_signals(query: str, profile: dict | None) -> dict:
    """Extract branch, semester, interests from query when profile is missing."""
    q    = query.lower()
    info = dict(profile) if profile else {}

    # Branch detection
    branch_map = {
        "cse": "Computer Science (CSE)",
        "computer science": "Computer Science (CSE)",
        "it": "Information Technology (IT)",
        "entc": "Electronics & Telecomm (ENTC)",
        "electronics": "Electronics & Telecomm (ENTC)",
        "mech": "Mechanical Engineering",
        "mechanical": "Mechanical Engineering",
        "civil": "Civil Engineering",
        "aids": "AI & Data Science (AIDS)",
        "data science": "AI & Data Science (AIDS)",
        "iot": "Internet of Things (CSE-IoT)",
        "se": "Software Engineering (CSE-SE)",
    }
    for key, val in branch_map.items():
        if key in q and "branch" not in info:
            info["branch"] = val
            break

    # Semester detection
    import re
    sem_match = re.search(r"semester\s*(\d+)|sem\s*(\d+)|(\d+)(?:st|nd|rd|th)\s*year", q)
    if sem_match and "semester" not in info:
        num = next(g for g in sem_match.groups() if g)
        info["semester"] = int(num)

    # Interest detection
    interest_keywords = {
        "ai": "Artificial Intelligence / ML",
        "machine learning": "Machine Learning",
        "web": "Web Development",
        "app": "Mobile App Development",
        "cloud": "Cloud Computing",
        "security": "Cybersecurity",
        "data": "Data Science / Analytics",
        "devops": "DevOps / MLOps",
        "blockchain": "Blockchain",
        "embedded": "Embedded Systems / IoT",
    }
    for key, val in interest_keywords.items():
        if key in q and "interests" not in info:
            info["interests"] = val
            break

    return info


def career_node(state: AgentState) -> AgentState:
    """Provides career guidance with live job market data."""
    query   = state["query"]
    profile = _extract_career_signals(query, state.get("student_profile"))

    trace = state.get("agent_trace", [])
    trace.append({
        "agent": "career",
        "status": "running",
        "detail": f"Researching career paths for: {profile.get('branch', 'your branch')}",
    })

    # ── Live web search for job market data ───────────────────────────────────
    web_context = ""
    if TAVILY_API_KEY:
        try:
            branch    = profile.get("branch", "engineering")
            interests = profile.get("interests", "")
            search_q  = f"career paths jobs internships freshers {branch} {interests} India 2025 salary"

            client  = TavilyClient(api_key=TAVILY_API_KEY)
            results = client.search(query=search_q, max_results=5, search_depth="basic")
            raw     = results.get("results", [])

            if raw:
                web_context = "\n\n".join(
                    f"[{r.get('title','')}]\nURL: {r.get('url','')}\n{r.get('content','')}"
                    for r in raw
                )
                urls        = [r.get("url", "") for r in raw if r.get("url")]
                all_sources = list(set(state.get("sources", []) + urls))
                state       = {**state, "sources": all_sources}
        except Exception:
            pass

    # ── LLM synthesis ──────────────────────────────────────────────────────────
    profile_text = "\n".join(f"  - {k}: {v}" for k, v in profile.items()) \
                   if profile else "  - General engineering student"

    semester    = profile.get("semester", "current")
    llm         = _get_llm()
    prompt      = CAREER_ADVISOR_PROMPT.format(
        student_profile=profile_text,
        search_results=web_context or "No live data available — using general knowledge.",
        semester=semester,
    )
    resp   = llm.invoke(prompt)
    answer = resp.content if hasattr(resp, "content") else str(resp)

    trace[-1] = {
        "agent": "career",
        "status": "done",
        "detail": f"Career advice generated for {profile.get('branch', 'engineering')}",
    }

    return {
        **state,
        "career_result": answer.strip(),
        "agent_trace": trace,
    }

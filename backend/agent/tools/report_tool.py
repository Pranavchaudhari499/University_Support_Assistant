"""
agent/tools/report_tool.py
Generates structured university reports:
  - upcoming_deadlines : pulled from ChromaDB events + policies
  - top_issues         : requires summarized feedback input
  - satisfaction_index : requires feedback scores input
"""

import os
from datetime import datetime
from langchain_ollama import OllamaLLM
from dotenv import load_dotenv

from db.chroma_client import query_collection
from agent.prompts import REPORT_SYSTEM_PROMPT

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "llama3")


def _get_llm() -> OllamaLLM:
    return OllamaLLM(
        model=OLLAMA_MODEL,
        base_url=OLLAMA_BASE_URL,
        temperature=0.2,
    )


# ── Report 1: Upcoming Deadlines ─────────────────────────────────────────────

def generate_deadlines_report() -> dict:
    """
    Retrieves deadline-related chunks from ChromaDB and asks LLaMA 3
    to format them as a clean upcoming deadlines report.
    """
    queries = [
        "upcoming deadlines exam submission fee",
        "important dates academic calendar 2025",
        "project submission deadline final year",
    ]

    all_chunks = []
    for q in queries:
        all_chunks.extend(query_collection("policies", q, n_results=3))
        all_chunks.extend(query_collection("events",   q, n_results=2))

    # Deduplicate by text content
    seen, unique = set(), []
    for c in all_chunks:
        if c["text"] not in seen:
            seen.add(c["text"])
            unique.append(c)

    context = "\n\n---\n\n".join(
        f"(from {c['filename']})\n{c['text']}" for c in unique
    )

    prompt = (
        f"{REPORT_SYSTEM_PROMPT}\n\n"
        f"Using the following university data, generate an "
        f"'Upcoming Deadlines Report' for VIIT students.\n"
        f"List deadlines chronologically. Include: deadline name, date, "
        f"relevant department/office, and any fees if applicable.\n\n"
        f"Data:\n{context}\n\n"
        f"Report (today is {datetime.now().strftime('%B %d, %Y')}):"
    )

    llm    = _get_llm()
    report = llm.invoke(prompt).strip()

    return {
        "type":       "upcoming_deadlines",
        "generated":  datetime.now().isoformat(),
        "report":     report,
        "chunks_used": len(unique),
    }


# ── Report 2: Top Issues ──────────────────────────────────────────────────────

def generate_top_issues_report(summaries: list[str]) -> dict:
    """
    Takes a list of pre-generated feedback summaries and produces
    a consolidated Top Issues report.

    Args:
        summaries: list of summary strings (from summarize_tool)
    """
    if not summaries:
        return {
            "type":      "top_issues",
            "generated": datetime.now().isoformat(),
            "report":    "No feedback summaries provided.",
        }

    combined = "\n\n===\n\n".join(summaries)

    prompt = (
        f"{REPORT_SYSTEM_PROMPT}\n\n"
        f"Based on the following feedback summaries from VIIT students/faculty/parents,\n"
        f"generate a 'Top Issues Report'.\n\n"
        f"Include:\n"
        f"1. Top 5 most critical issues ranked by frequency/severity\n"
        f"2. Which group (student/faculty/parent) raised each issue\n"
        f"3. Suggested priority level (High / Medium / Low)\n"
        f"4. Brief recommended action for each issue\n\n"
        f"Summaries:\n{combined}\n\n"
        f"Top Issues Report:"
    )

    llm    = _get_llm()
    report = llm.invoke(prompt).strip()

    return {
        "type":      "top_issues",
        "generated": datetime.now().isoformat(),
        "report":    report,
    }


# ── Report 3: Satisfaction Index ──────────────────────────────────────────────

def generate_satisfaction_report(scores: dict) -> dict:
    """
    Takes satisfaction scores per group and generates an index report.

    Args:
        scores: {
            "student": 7.2,
            "faculty": 6.8,
            "parent":  8.1
        }
    """
    if not scores:
        return {
            "type":      "satisfaction_index",
            "generated": datetime.now().isoformat(),
            "report":    "No scores provided.",
        }

    # Calculate overall index
    values  = list(scores.values())
    overall = round(sum(values) / len(values), 2)

    scores_text = "\n".join(
        f"  - {group.capitalize()}: {score}/10"
        for group, score in scores.items()
    )

    prompt = (
        f"{REPORT_SYSTEM_PROMPT}\n\n"
        f"Generate a 'Satisfaction Index Report' for VIIT based on these scores:\n\n"
        f"{scores_text}\n"
        f"  - Overall Average: {overall}/10\n\n"
        f"Include:\n"
        f"1. Overall satisfaction rating with interpretation\n"
        f"2. Group-wise analysis (who is most/least satisfied and why)\n"
        f"3. Trend interpretation (what the scores suggest)\n"
        f"4. Key areas to improve based on lower scores\n"
        f"5. Recommended actions for administration\n\n"
        f"Satisfaction Index Report:"
    )

    llm    = _get_llm()
    report = llm.invoke(prompt).strip()

    return {
        "type":      "satisfaction_index",
        "generated": datetime.now().isoformat(),
        "scores":    {**scores, "overall": overall},
        "report":    report,
    }
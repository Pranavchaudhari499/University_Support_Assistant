"""
graph/state.py — Shared state object that flows through the entire LangGraph.
Every node reads from and writes to this TypedDict.
"""

from __future__ import annotations
from typing import TypedDict, Optional


class AgentState(TypedDict):
    # ── Input ────────────────────────────────────────────────────────────────
    query: str                          # original user message

    # ── Supervisor outputs ────────────────────────────────────────────────────
    intent: str                         # e.g. "student asking about attendance policy"
    agents_to_call: list[str]           # ["rag", "scholarship", "career"]
    needs_profile: bool                 # True if career/scholarship needs more user info
    student_profile: Optional[dict]     # {"branch": "CSE", "semester": 6, "cgpa": 8.2, ...}

    # ── Agent results ─────────────────────────────────────────────────────────
    rag_result: Optional[str]
    websearch_result: Optional[str]
    scholarship_result: Optional[str]
    career_result: Optional[str]
    wellness_result: Optional[str]

    # ── Metadata ──────────────────────────────────────────────────────────────
    sources: list[str]                  # all source filenames cited
    rag_confidence: float               # 0.0–1.0 retrieval confidence

    # ── Agent trace (for UI display) ──────────────────────────────────────────
    agent_trace: list[dict]             # [{"agent": "rag", "status": "done", "detail": "..."}]

    # ── Final output ──────────────────────────────────────────────────────────
    final_answer: str

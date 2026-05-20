"""
main.py — VIIT University Support Agent API
============================================
    uvicorn main:app --reload --port 8000

Endpoints:
    POST /api/query      — RAG chat (streaming)
    POST /api/summarize  — Feedback summarization
    POST /api/report     — Report generation
    GET  /api/health     — Health check
"""

import os
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent.tools.rag_tool       import run_rag_query, stream_rag_query
from agent.tools.summarize_tool import run_summarize
from agent.tools.report_tool    import (
    generate_deadlines_report,
    generate_top_issues_report,
    generate_satisfaction_report,
)

load_dotenv()

# ── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="VIIT University Support Agent API",
    version="1.0.0",
    description="AI-powered support agent for VIIT students, faculty, and parents.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ─────────────────────────────────────────────────

class QueryRequest(BaseModel):
    message: str
    stream: bool = True          # default to streaming


class ReportRequest(BaseModel):
    type: str                    # 'upcoming_deadlines' | 'top_issues' | 'satisfaction_index'
    summaries: list[str] = []    # for top_issues report
    scores: dict = {}            # for satisfaction_index report
                                 # e.g. {"student": 7.2, "faculty": 6.8, "parent": 8.1}


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "VIIT Support Agent"}


# ── 1. RAG Query (Chat) ───────────────────────────────────────────────────────

@app.post("/api/query")
async def query(request: QueryRequest):
    """
    Accepts a student query, retrieves context from ChromaDB,
    generates an answer using LLaMA 3.

    If stream=true  → returns Server-Sent Events (text/event-stream)
    If stream=false → returns JSON { answer, sources }
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    if request.stream:
        def event_generator():
            try:
                for token in stream_rag_query(request.message):
                    # SSE format: "data: <token>\n\n"
                    yield f"data: {token}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: [ERROR] {str(e)}\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",   # prevents nginx buffering
            },
        )
    else:
        result = run_rag_query(request.message)
        return result


# ── 2. Feedback Summarization ─────────────────────────────────────────────────

@app.post("/api/summarize")
async def summarize(
    file: UploadFile = File(None),
    text: str        = Form(None),
    respondent_type: str = Form("student"),
):
    """
    Accepts survey feedback as either:
      - A .txt or .csv file upload  (multipart/form-data)
      - Raw text in the `text` form field

    respondent_type: 'student' | 'faculty' | 'parent'
    Returns: { summary, respondent_type, total_chars, batch_count }
    """
    feedback_text = ""

    if file:
        raw = await file.read()
        try:
            feedback_text = raw.decode("utf-8")
        except UnicodeDecodeError:
            feedback_text = raw.decode("latin-1")

    elif text:
        feedback_text = text

    else:
        raise HTTPException(
            status_code=400,
            detail="Provide either a file upload or a 'text' field.",
        )

    if not feedback_text.strip():
        raise HTTPException(status_code=400, detail="Feedback content is empty.")

    result = run_summarize(feedback_text, respondent_type)
    return result


# ── 3. Report Generation ──────────────────────────────────────────────────────

@app.post("/api/report")
async def report(request: ReportRequest):
    """
    Generates one of three report types:

    upcoming_deadlines  → no extra data needed
    top_issues          → requires request.summaries (list of summary strings)
    satisfaction_index  → requires request.scores
                          e.g. {"student": 7.2, "faculty": 6.8, "parent": 8.1}

    Returns: { type, generated, report, ... }
    """
    rtype = request.type.strip().lower()

    if rtype == "upcoming_deadlines":
        return generate_deadlines_report()

    elif rtype == "top_issues":
        if not request.summaries:
            raise HTTPException(
                status_code=400,
                detail="Provide 'summaries' list for top_issues report.",
            )
        return generate_top_issues_report(request.summaries)

    elif rtype == "satisfaction_index":
        if not request.scores:
            raise HTTPException(
                status_code=400,
                detail="Provide 'scores' dict for satisfaction_index report.",
            )
        return generate_satisfaction_report(request.scores)

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown report type '{rtype}'. "
                   f"Use: upcoming_deadlines | top_issues | satisfaction_index",
        )
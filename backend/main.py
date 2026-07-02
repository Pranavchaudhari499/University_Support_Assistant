"""
main.py — VIIT University Support Agent API
============================================
Run with:
    uvicorn main:app --reload --port 8000

Endpoints:
    POST /api/agent      — Multi-agent graph (LangGraph) — main endpoint
    POST /api/agent/stream — Streaming version of multi-agent graph
    POST /api/query      — Legacy single RAG query (kept for backward compat)
    POST /api/summarize  — Feedback summarization
    POST /api/report     — Report generation
    GET  /api/health     — Health check
"""

import os
import json
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
from graph.graph import run_graph

load_dotenv()

# ── App setup ──────────────────────────────────────────────────────────────────

app = FastAPI(
    title="VIIT University Support Agent API",
    version="2.0.0",
    description="Multi-agent AI support system for VIIT students, faculty, and parents.",
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
    stream: bool = True


class AgentRequest(BaseModel):
    message: str
    student_profile: dict | None = None   # optional: {"branch": "CSE", "cgpa": 8.2, ...}


class ReportRequest(BaseModel):
    type: str                    # 'upcoming_deadlines' | 'top_issues' | 'satisfaction_index'
    summaries: list[str] = []
    scores: dict = {}


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "VIIT Multi-Agent Support System", "version": "2.0.0"}


# ── 1. Multi-Agent Graph (Main Endpoint) ──────────────────────────────────────

@app.post("/api/agent")
async def agent_query(request: AgentRequest):
    """
    Runs the full LangGraph multi-agent pipeline.
    Returns { answer, sources, agent_trace, confidence, intent, agents_used }
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    result = run_graph(request.message, request.student_profile)
    return result


@app.post("/api/agent/stream")
async def agent_query_stream(request: AgentRequest):
    """
    Streaming version of the multi-agent pipeline.
    Yields SSE events for each agent step + final answer tokens.

    Event types (as JSON in each SSE data field):
        { "type": "trace",  "agent": "rag",   "status": "running", "detail": "..." }
        { "type": "token",  "content": "..." }
        { "type": "sources","sources": [...], "agents_used": [...] }
        { "type": "done" }
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    def event_generator():
        try:
            # Run the full graph synchronously — it returns all trace info
            result = run_graph(request.message, request.student_profile)

            # 1. Emit all agent trace events
            for step in result.get("agent_trace", []):
                payload = json.dumps({"type": "trace", **step})
                yield f"data: {payload}\n\n"

            # 2. Stream the final answer token by token (simulate streaming)
            answer = result.get("answer", "")
            # Break answer into word chunks for a streaming feel
            words = answer.split(" ")
            for i in range(0, len(words), 3):
                chunk   = " ".join(words[i:i+3]) + " "
                payload = json.dumps({"type": "token", "content": chunk})
                yield f"data: {payload}\n\n"

            # 3. Emit sources + agents used
            payload = json.dumps({
                "type":        "sources",
                "sources":     result.get("sources", []),
                "agents_used": result.get("agents_used", []),
                "confidence":  result.get("confidence", 0.0),
                "intent":      result.get("intent", ""),
            })
            yield f"data: {payload}\n\n"

            yield "data: {\"type\": \"done\"}\n\n"

        except Exception as e:
            payload = json.dumps({"type": "error", "detail": str(e)})
            yield f"data: {payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── 2. Legacy RAG Query (Backward Compatible) ─────────────────────────────────

@app.post("/api/query")
async def query(request: QueryRequest):
    """
    Legacy single-agent RAG endpoint.
    Kept for backward compatibility with older frontend versions.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    if request.stream:
        def event_generator():
            try:
                for token in stream_rag_query(request.message):
                    yield f"data: {token}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: [ERROR] {str(e)}\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    else:
        result = run_rag_query(request.message)
        return result


# ── 3. Feedback Summarization ─────────────────────────────────────────────────

@app.post("/api/summarize")
async def summarize(
    file: UploadFile = File(None),
    text: str        = Form(None),
    respondent_type: str = Form("student"),
):
    """
    Accepts survey feedback as a .txt/.csv file or raw text.
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
        raise HTTPException(status_code=400, detail="Provide either a file upload or a 'text' field.")

    if not feedback_text.strip():
        raise HTTPException(status_code=400, detail="Feedback content is empty.")

    result = run_summarize(feedback_text, respondent_type)
    return result


# ── 4. Report Generation ──────────────────────────────────────────────────────

@app.post("/api/report")
async def report(request: ReportRequest):
    """
    Generates one of three report types:
    upcoming_deadlines | top_issues | satisfaction_index
    """
    rtype = request.type.strip().lower()

    if rtype == "upcoming_deadlines":
        return generate_deadlines_report()

    elif rtype == "top_issues":
        if not request.summaries:
            raise HTTPException(status_code=400, detail="Provide 'summaries' list for top_issues report.")
        return generate_top_issues_report(request.summaries)

    elif rtype == "satisfaction_index":
        if not request.scores:
            raise HTTPException(status_code=400, detail="Provide 'scores' dict for satisfaction_index report.")
        return generate_satisfaction_report(request.scores)

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown report type '{rtype}'. Use: upcoming_deadlines | top_issues | satisfaction_index",
        )
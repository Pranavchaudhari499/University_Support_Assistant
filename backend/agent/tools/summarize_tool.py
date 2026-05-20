"""
agent/tools/summarize_tool.py
Takes raw survey feedback text and returns a structured summary using LLaMA 3.
Handles large feedback by chunking it into batches before summarizing.
"""

import os
from langchain_ollama import OllamaLLM
from dotenv import load_dotenv
from agent.prompts import SUMMARIZE_SYSTEM_PROMPT

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "llama3")

# Max characters per batch sent to the LLM
BATCH_CHAR_LIMIT = 3000


def _get_llm() -> OllamaLLM:
    return OllamaLLM(
        model=OLLAMA_MODEL,
        base_url=OLLAMA_BASE_URL,
        temperature=0.3,
    )


def _chunk_feedback(text: str) -> list[str]:
    """Splits large feedback into manageable batches."""
    lines  = text.strip().split("\n")
    batches, current, length = [], [], 0

    for line in lines:
        if length + len(line) > BATCH_CHAR_LIMIT:
            if current:
                batches.append("\n".join(current))
            current, length = [line], len(line)
        else:
            current.append(line)
            length += len(line)

    if current:
        batches.append("\n".join(current))

    return batches


def _summarize_batch(llm: OllamaLLM, batch: str, batch_num: int, total: int) -> str:
    prompt = (
        f"{SUMMARIZE_SYSTEM_PROMPT}\n\n"
        f"--- Feedback Data (batch {batch_num}/{total}) ---\n"
        f"{batch}\n\n"
        f"Provide your structured summary:"
    )
    return llm.invoke(prompt).strip()


def _merge_summaries(llm: OllamaLLM, summaries: list[str]) -> str:
    """If multiple batches, ask LLM to merge them into one final summary."""
    combined = "\n\n===\n\n".join(summaries)
    prompt = (
        f"{SUMMARIZE_SYSTEM_PROMPT}\n\n"
        f"Below are partial summaries from multiple batches of feedback.\n"
        f"Merge them into ONE final unified summary:\n\n"
        f"{combined}\n\n"
        f"Final unified summary:"
    )
    return llm.invoke(prompt).strip()


def run_summarize(feedback_text: str, respondent_type: str = "student") -> dict:
    """
    Main entry point.
    Args:
        feedback_text   : raw survey responses as a single string
        respondent_type : 'student' | 'faculty' | 'parent'
    Returns:
        { summary, respondent_type, total_chars, batch_count }
    """
    if not feedback_text.strip():
        return {
            "summary":        "No feedback text provided.",
            "respondent_type": respondent_type,
            "total_chars":    0,
            "batch_count":    0,
        }

    llm     = _get_llm()
    batches = _chunk_feedback(feedback_text)
    total   = len(batches)

    summaries = []
    for i, batch in enumerate(batches, 1):
        s = _summarize_batch(llm, batch, i, total)
        summaries.append(s)

    final_summary = summaries[0] if total == 1 else _merge_summaries(llm, summaries)

    return {
        "summary":         final_summary,
        "respondent_type": respondent_type,
        "total_chars":     len(feedback_text),
        "batch_count":     total,
    }
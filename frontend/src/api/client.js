// api/client.js — all backend calls live here

const BASE = '/api'   // proxied to http://localhost:8000 via vite.config.js

// ── 1. Streaming RAG query ────────────────────────────────────────────────────
// onToken(token) called for each streamed token
// onDone() called when stream ends
// Returns abort controller so caller can cancel
export function streamQuery(message, onToken, onDone, onError) {
  const controller = new AbortController()

  fetch(`${BASE}/query`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ message, stream: true }),
    signal:  controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') { onDone(); return }
          if (data.startsWith('[ERROR]')) { onError(data.slice(8)); return }
          onToken(data)
        }
      }
      onDone()
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError(err.message)
    })

  return controller
}

// ── 2. Feedback summarization ─────────────────────────────────────────────────
export async function summarizeFeedback(text, respondentType = 'student') {
  const formData = new FormData()
  formData.append('text', text)
  formData.append('respondent_type', respondentType)

  const res = await fetch(`${BASE}/summarize`, {
    method: 'POST',
    body:   formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Server error: ${res.status}`)
  }
  return res.json()
}

// Upload a file instead of raw text
export async function summarizeFeedbackFile(file, respondentType = 'student') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('respondent_type', respondentType)

  const res = await fetch(`${BASE}/summarize`, {
    method: 'POST',
    body:   formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Server error: ${res.status}`)
  }
  return res.json()
}

// ── 3. Report generation ──────────────────────────────────────────────────────
export async function generateReport(type, { summaries = [], scores = {} } = {}) {
  const res = await fetch(`${BASE}/report`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ type, summaries, scores }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Server error: ${res.status}`)
  }
  return res.json()
}
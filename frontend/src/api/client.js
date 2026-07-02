// api/client.js — all backend calls live here

const BASE = '/api'   // proxied to http://localhost:8000 via vite.config.js

// ── 1. Multi-Agent streaming query (NEW — main endpoint) ─────────────────────
// Streams SSE events from /api/agent/stream
// Events: { type: "trace"|"token"|"sources"|"done"|"error", ...payload }
export function streamAgentQuery(message, studentProfile, { onTrace, onToken, onSources, onDone, onError }) {
  const controller = new AbortController()

  fetch(`${BASE}/agent/stream`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ message, student_profile: studentProfile || null }),
    signal:  controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()   // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          try {
            const event = JSON.parse(raw)
            switch (event.type) {
              case 'trace':   onTrace?.(event);   break
              case 'token':   onToken?.(event.content); break
              case 'sources': onSources?.(event); break
              case 'done':    onDone?.();         return
              case 'error':   onError?.(event.detail); return
            }
          } catch {
            // non-JSON line — ignore
          }
        }
      }
      onDone?.()
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError?.(err.message)
    })

  return controller
}

// ── 2. Legacy streaming RAG query (kept for backward compat) ──────────────────
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
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]')          { onDone(); return }
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

// ── 3. Scholarship finder (direct call, non-streaming) ────────────────────────
export async function findScholarships(profile) {
  const res = await fetch(`${BASE}/agent`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      message: `Find scholarships I am eligible for. My profile: branch=${profile.branch}, semester=${profile.semester}, cgpa=${profile.cgpa}, category=${profile.category}, annual family income=${profile.income} lakhs.`,
      student_profile: profile,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Server error: ${res.status}`)
  }
  return res.json()
}

// ── 4. Feedback summarization ─────────────────────────────────────────────────
export async function summarizeFeedback(text, respondentType = 'student') {
  const formData = new FormData()
  formData.append('text', text)
  formData.append('respondent_type', respondentType)

  const res = await fetch(`${BASE}/summarize`, { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Server error: ${res.status}`)
  }
  return res.json()
}

export async function summarizeFeedbackFile(file, respondentType = 'student') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('respondent_type', respondentType)

  const res = await fetch(`${BASE}/summarize`, { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Server error: ${res.status}`)
  }
  return res.json()
}

// ── 5. Report generation ──────────────────────────────────────────────────────
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
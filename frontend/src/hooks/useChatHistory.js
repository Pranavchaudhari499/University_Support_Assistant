// hooks/useChatHistory.js
import { useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'viit_chat_history'
const MAX_SESSIONS = 30

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

function saveSessions(sessions) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS))) }
  catch {}
}

function makeId() {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function makeTitle(firstMessage) {
  return firstMessage.length > 40 ? firstMessage.slice(0, 40) + '…' : firstMessage
}

// Calls backend to summarize the conversation and extract insights
async function summarizeSession(messages) {
  try {
    // Build a readable transcript from the messages
    const transcript = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`)
      .join('\n\n')

    const formData = new FormData()
    formData.append('text', transcript)
    formData.append('respondent_type', 'student')

    const res = await fetch('/api/summarize', { method: 'POST', body: formData })
    if (!res.ok) return null

    const data = await res.json()
    return data.summary || null
  } catch {
    return null
  }
}

export default function useChatHistory() {
  const [sessions, setSessions]        = useState(loadSessions)
  const [activeSessionId, setActiveId] = useState(null)
  const sessionCreatedRef              = useRef(false)

  const activeSession = sessions.find(s => s.id === activeSessionId) || null

  useEffect(() => { saveSessions(sessions) }, [sessions])

  const newChat = () => {
    setActiveId(null)
    sessionCreatedRef.current = false
  }

  const saveMessages = (messages) => {
    if (!messages || messages.length === 0) return
    const completed = messages.filter(m => !m.isStreaming)
    if (completed.length === 0) return

    const firstUserMsg = completed.find(m => m.role === 'user')?.content || 'Untitled'

    if (!sessionCreatedRef.current) {
      const id = makeId()
      sessionCreatedRef.current = true
      const session = {
        id,
        title:     makeTitle(firstUserMsg),
        messages:  completed,
        summary:   null,          // will be filled after session ends
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setSessions(prev => [session, ...prev])
      setActiveId(id)
    } else {
      setActiveId(prev => {
        setSessions(s => s.map(session =>
          session.id === prev
            ? { ...session, messages: completed, updatedAt: new Date().toISOString() }
            : session
        ))
        return prev
      })
    }
  }

  // Called when user clicks "New Chat" or navigates away — triggers summarization
  const finalizeSession = async () => {
    if (!activeSessionId || !sessionCreatedRef.current) return

    const session = sessions.find(s => s.id === activeSessionId)
    if (!session || session.messages.length < 2) return
    if (session.summary) return   // already summarized

    // Run summarization in background — don't block UI
    summarizeSession(session.messages).then(summary => {
      if (!summary) return
      setSessions(prev => prev.map(s =>
        s.id === activeSessionId
          ? { ...s, summary }
          : s
      ))
    })
  }

  const loadSession = (id) => {
    setActiveId(id)
    sessionCreatedRef.current = true
  }

  const deleteSession = (id) => {
    setSessions(prev => prev.filter(s => s.id !== id))
    if (activeSessionId === id) {
      setActiveId(null)
      sessionCreatedRef.current = false
    }
  }

  const clearAll = () => {
    setSessions([])
    setActiveId(null)
    sessionCreatedRef.current = false
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    sessions, activeSession, activeSessionId,
    newChat, saveMessages, finalizeSession,
    loadSession, deleteSession, clearAll,
  }
}
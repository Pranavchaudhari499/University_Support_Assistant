// pages/ChatPage.jsx
import { useState, useRef, useEffect } from 'react'
import { Send, Trash2 } from 'lucide-react'
import MessageBubble  from '../components/MessageBubble'
import AgentTrace     from '../components/AgentTrace'
import SessionInsights from '../components/SessionInsights'
import { streamAgentQuery } from '../api/client'

const SUGGESTIONS = [
  'What is the minimum attendance required?',
  'I\'m OBC with 8.2 CGPA, what scholarships can I get?',
  'Who is the HOD of CSE department?',
  'I\'m a CSE student interested in AI, what career paths?',
  'I\'m feeling very stressed about my backlogs',
  'What are the library timings?',
]

export default function ChatPage({ historyProps }) {
  const [messages,     setMessages]     = useState([])
  const [input,        setInput]        = useState('')
  const [isLoading,    setIsLoading]    = useState(false)
  const [agentSteps,   setAgentSteps]   = useState([])   // live trace steps
  const [showTrace,    setShowTrace]    = useState(true)  // toggle trace panel
  const [showInsights, setShowInsights] = useState(false)

  const bottomRef = useRef(null)
  const abortRef  = useRef(null)

  // Load session when switching from sidebar
  useEffect(() => {
    if (historyProps?.activeSession) {
      setMessages(historyProps.activeSession.messages)
      setShowInsights(!!historyProps.activeSession.summary)
    } else {
      setMessages([])
      setShowInsights(false)
    }
    setAgentSteps([])
    setIsLoading(false)
  }, [historyProps?.activeSessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = (text) => {
    const msg = (text || input).trim()
    if (!msg || isLoading) return

    setInput('')
    setShowInsights(false)
    setAgentSteps([])   // clear previous trace

    setMessages(prev => [
      ...prev,
      { role: 'user',      content: msg },
      { role: 'assistant', content: '', isStreaming: true, sources: [], agentsUsed: [] },
    ])
    setIsLoading(true)

    abortRef.current = streamAgentQuery(msg, null, {
      onTrace: (event) => {
        // Update or add trace step
        setAgentSteps(prev => {
          const existing = prev.findIndex(s => s.agent === event.agent)
          if (existing >= 0) {
            const next = [...prev]
            next[existing] = { agent: event.agent, status: event.status, detail: event.detail }
            return next
          }
          return [...prev, { agent: event.agent, status: event.status, detail: event.detail }]
        })
      },

      onToken: (token) => {
        setMessages(prev => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') {
            next[next.length - 1] = { ...last, content: last.content + token }
          }
          return next
        })
      },

      onSources: (event) => {
        setMessages(prev => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') {
            next[next.length - 1] = {
              ...last,
              sources:    event.sources    || [],
              agentsUsed: event.agents_used || [],
            }
          }
          return next
        })
      },

      onDone: () => {
        setMessages(prev => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') {
            next[next.length - 1] = { ...last, isStreaming: false }
            historyProps?.saveMessages(next)
          }
          return next
        })
        setIsLoading(false)
      },

      onError: (err) => {
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = {
            role: 'assistant',
            content: `Something went wrong: ${err}. Please try again.`,
            isStreaming: false, sources: [], agentsUsed: [],
          }
          historyProps?.saveMessages(next)
          return next
        })
        setIsLoading(false)
      },
    })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleNewChat = async () => {
    if (abortRef.current) abortRef.current.abort()
    setIsLoading(false)
    await historyProps?.finalizeSession()
    setMessages([])
    setAgentSteps([])
    setShowInsights(false)
    historyProps?.newChat()
  }

  const currentSummary = historyProps?.activeSession?.summary || null

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── Main chat area ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400 }}>
              Ask VIIT
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              Multi-agent AI · RAG · Web Search · Scholarships · Career · Wellness
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Toggle Agent Trace panel */}
            <button
              id="toggle-agent-trace"
              onClick={() => setShowTrace(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                border: `1px solid ${showTrace ? 'var(--accent)' : 'var(--border)'}`,
                background: showTrace ? 'var(--accent-glow)' : 'transparent',
                color: showTrace ? 'var(--accent)' : 'var(--text-3)',
                fontSize: 12, transition: 'all var(--transition)',
              }}>
              🧭 {showTrace ? 'Hide' : 'Show'} Agent Trace
            </button>

            {/* Session insights toggle */}
            {currentSummary && (
              <button onClick={() => setShowInsights(p => !p)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                border: `1px solid ${showInsights ? 'var(--accent)' : 'var(--border)'}`,
                background: showInsights ? 'var(--accent-glow)' : 'transparent',
                color: showInsights ? 'var(--accent)' : 'var(--text-2)',
                fontSize: 12, transition: 'all var(--transition)',
              }}>
                💡 {showInsights ? 'Hide' : 'Show'} Insights
              </button>
            )}

            {messages.length > 0 && (
              <button onClick={handleNewChat} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 12,
                transition: 'all var(--transition)',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
              >
                <Trash2 size={13} /> New Chat
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '24px', display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {/* Welcome screen */}
          {messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 520 }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'var(--accent-glow)', border: '1px solid var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--accent)',
              }}>V</div>

              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400, marginBottom: 8 }}>
                Hello! I'm your VIIT Assistant
              </h2>
              <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 10 }}>
                I'm powered by a multi-agent AI system — different specialists handle different questions.
              </p>

              {/* Agent capability pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 28 }}>
                {[
                  ['📚', 'University Policies'],
                  ['🎓', 'Scholarships'],
                  ['💼', 'Career Guidance'],
                  ['🔍', 'Live Web Search'],
                  ['🌱', 'Wellness Support'],
                ].map(([emoji, label]) => (
                  <span key={label} style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 99,
                    background: 'var(--bg-hover)', border: '1px solid var(--border-lite)',
                    color: 'var(--text-2)',
                  }}>
                    {emoji} {label}
                  </span>
                ))}
              </div>

              {/* Suggestion chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => sendMessage(s)} style={{
                    padding: '8px 14px', borderRadius: 99,
                    border: '1px solid var(--border-lite)',
                    background: 'var(--bg-card)', color: 'var(--text-2)',
                    fontSize: 12.5, cursor: 'pointer', transition: 'all var(--transition)',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text-1)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-lite)'; e.currentTarget.style.color = 'var(--text-2)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              role={msg.role}
              content={msg.content}
              isStreaming={msg.isStreaming}
              sources={msg.sources || []}
              agentsUsed={msg.agentsUsed || []}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{ padding: '14px 24px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-end',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-lite)',
            borderRadius: 'var(--radius)', padding: '10px 12px',
            transition: 'border-color var(--transition)',
          }}
          onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border-lite)'}
          >
            <textarea
              id="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about attendance, scholarships, career, wellness, or anything VIIT..."
              rows={1}
              style={{
                flex: 1, resize: 'none', border: 'none', outline: 'none',
                background: 'transparent', color: 'var(--text-1)',
                fontSize: 14, lineHeight: 1.6, maxHeight: 120, overflowY: 'auto',
              }}
            />
            <button
              id="send-button"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              style={{
                width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                background: input.trim() && !isLoading ? 'var(--accent)' : 'var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background var(--transition)',
                cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
              }}>
              {isLoading
                ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : <Send size={15} color="#fff" />
              }
            </button>
          </div>
          <p style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 7, textAlign: 'center' }}>
            Enter to send · Shift+Enter for new line · Multi-agent AI powered by LangGraph
          </p>
        </div>
      </div>

      {/* ── Agent Trace Panel ──────────────────────────────────────────────── */}
      {showTrace && (
        <AgentTrace steps={agentSteps} isActive={isLoading} />
      )}

      {/* ── Session Insights Panel ─────────────────────────────────────────── */}
      {showInsights && currentSummary && (
        <SessionInsights summary={currentSummary} onClose={() => setShowInsights(false)} />
      )}
    </div>
  )
}
// components/AgentTrace.jsx
// Shows live agent activity in a side panel — the "thinking" visualization

const AGENT_META = {
  supervisor:  { label: 'Supervisor',      emoji: '🧭', color: '#8b8fff' },
  rag:         { label: 'University Docs', emoji: '📚', color: '#4f6ef7' },
  websearch:   { label: 'Web Search',      emoji: '🔍', color: '#e8a84c' },
  scholarship: { label: 'Scholarships',    emoji: '🎓', color: '#3ecf8e' },
  career:      { label: 'Career Advisor',  emoji: '💼', color: '#f76e6e' },
  wellness:    { label: 'Wellness',        emoji: '🌱', color: '#7ec87e' },
  synthesizer: { label: 'Synthesizing',    emoji: '✨', color: '#c084fc' },
}

function StatusDot({ status }) {
  if (status === 'running') return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      border: '2px solid var(--accent)', borderTopColor: 'transparent',
      animation: 'spin 0.7s linear infinite', flexShrink: 0,
    }} />
  )
  if (status === 'done')    return <span style={{ color: '#3ecf8e', fontSize: 12 }}>✓</span>
  if (status === 'error')   return <span style={{ color: '#f76e6e', fontSize: 12 }}>✗</span>
  if (status === 'skipped') return <span style={{ color: 'var(--text-3)', fontSize: 11 }}>–</span>
  return null
}

export default function AgentTrace({ steps = [], isActive = false }) {
  if (steps.length === 0 && !isActive) return null

  return (
    <div style={{
      width: 260,
      borderLeft: '1px solid var(--border)',
      background: 'var(--bg-card)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
      animation: 'fadeUp 0.2s ease',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 18px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: isActive ? '#3ecf8e' : 'var(--text-3)',
          boxShadow: isActive ? '0 0 6px #3ecf8e' : 'none',
          animation: isActive ? 'pulse 1.2s ease infinite' : 'none',
        }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.05em' }}>
          AGENT ACTIVITY
        </span>
      </div>

      {/* Steps */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        {steps.map((step, i) => {
          const meta = AGENT_META[step.agent] || { label: step.agent, emoji: '🤖', color: '#aaa' }
          return (
            <div key={i} style={{
              padding: '8px 10px',
              borderRadius: 8,
              background: step.status === 'running' ? 'rgba(79,110,247,0.06)' : 'transparent',
              border: step.status === 'running' ? '1px solid rgba(79,110,247,0.15)' : '1px solid transparent',
              transition: 'all 0.2s ease',
              animation: step.status === 'running' ? 'fadeUp 0.15s ease' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: step.detail ? 4 : 0 }}>
                <span style={{ fontSize: 14 }}>{meta.emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: meta.color, flex: 1 }}>
                  {meta.label}
                </span>
                <StatusDot status={step.status} />
              </div>
              {step.detail && (
                <p style={{
                  fontSize: 10.5, color: 'var(--text-3)',
                  lineHeight: 1.5, margin: 0,
                  paddingLeft: 22,
                }}>
                  {step.detail}
                </p>
              )}
            </div>
          )
        })}

        {/* Empty state while waiting for first event */}
        {steps.length === 0 && isActive && (
          <div style={{ padding: '12px 10px', color: 'var(--text-3)', fontSize: 11 }}>
            Initializing agents...
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        fontSize: 10, color: 'var(--text-3)',
        textAlign: 'center',
      }}>
        Powered by LangGraph · Groq · ChromaDB
      </div>
    </div>
  )
}

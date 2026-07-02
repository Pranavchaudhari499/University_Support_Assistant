// components/MessageBubble.jsx
// Renders a single chat message with optional source citations and streaming cursor

const AGENT_LABELS = {
  rag:         '📚 University Docs',
  websearch:   '🔍 Web Search',
  scholarship: '🎓 Scholarships',
  career:      '💼 Career Advisor',
  wellness:    '🌱 Wellness',
}

export default function MessageBubble({ role, content, isStreaming, sources = [], agentsUsed = [] }) {
  const isUser = role === 'user'

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      animation: 'fadeUp 0.2s ease',
      marginBottom: 4,
    }}>
      {/* Avatar for assistant */}
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'var(--accent-glow)',
          border: '1px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: 'var(--accent)',
          flexShrink: 0, marginRight: 10, marginTop: 4,
          fontFamily: 'var(--font-display)',
        }}>
          V
        </div>
      )}

      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Message bubble */}
        <div style={{
          padding: '12px 16px',
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          background: isUser ? 'var(--accent)' : 'var(--bg-card)',
          border: isUser ? 'none' : '1px solid var(--border)',
          color: isUser ? '#fff' : 'var(--text-1)',
          fontSize: 14, lineHeight: 1.65,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {content}
          {isStreaming && (
            <span style={{
              display: 'inline-block', width: 8, height: 14,
              background: 'var(--accent)', marginLeft: 3,
              verticalAlign: 'middle', borderRadius: 2,
              animation: 'pulse 0.9s ease infinite',
            }} />
          )}
        </div>

        {/* Agent badges — which agents answered this */}
        {!isUser && agentsUsed.length > 0 && !isStreaming && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 2 }}>
            {agentsUsed.map(agent => (
              <span key={agent} style={{
                fontSize: 10, padding: '2px 8px',
                borderRadius: 99,
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-lite)',
                color: 'var(--text-3)',
              }}>
                {AGENT_LABELS[agent] || agent}
              </span>
            ))}
          </div>
        )}

        {/* Source citations */}
        {!isUser && sources.length > 0 && !isStreaming && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 2 }}>
            {sources.slice(0, 5).map((src, i) => {
              const isUrl  = src.startsWith('http')
              const label  = isUrl
                ? new URL(src).hostname.replace('www.', '')
                : src.replace('.txt', '').replace(/_/g, ' ')
              return isUrl ? (
                <a key={i} href={src} target="_blank" rel="noreferrer" style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 99,
                  background: 'rgba(79,110,247,0.08)',
                  border: '1px solid rgba(79,110,247,0.25)',
                  color: 'var(--accent)', textDecoration: 'none',
                }}>
                  🔗 {label}
                </a>
              ) : (
                <span key={i} style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 99,
                  background: 'rgba(79,110,247,0.08)',
                  border: '1px solid rgba(79,110,247,0.25)',
                  color: 'var(--accent)',
                }}>
                  📄 {label}
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
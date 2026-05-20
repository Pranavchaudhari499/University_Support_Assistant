export default function MessageBubble({ role, content, isStreaming }) {
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
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'var(--accent-glow)',
          border: '1px solid var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          color: 'var(--accent)',
          flexShrink: 0,
          marginRight: 10,
          marginTop: 4,
          fontFamily: 'var(--font-display)',
        }}>
          V
        </div>
      )}

      <div style={{
        maxWidth: '72%',
        padding: '12px 16px',
        borderRadius: isUser
          ? '16px 4px 16px 16px'
          : '4px 16px 16px 16px',
        background: isUser ? 'var(--accent)' : 'var(--bg-card)',
        border: isUser ? 'none' : '1px solid var(--border)',
        color: isUser ? '#fff' : 'var(--text-1)',
        fontSize: 14,
        lineHeight: 1.65,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {content}
        {isStreaming && (
          <span style={{
            display: 'inline-block',
            width: 8,
            height: 14,
            background: 'var(--accent)',
            marginLeft: 3,
            verticalAlign: 'middle',
            borderRadius: 2,
            animation: 'pulse 0.9s ease infinite',
          }} />
        )}
      </div>
    </div>
  )
}
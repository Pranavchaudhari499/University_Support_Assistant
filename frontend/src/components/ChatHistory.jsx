// components/ChatHistory.jsx
import { Trash2, MessageSquare, Plus } from 'lucide-react'

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function ChatHistory({ sessions, activeSessionId, onLoad, onDelete, onNew }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1, overflow: 'hidden' }}>

      {/* New chat button */}
      <button
        onClick={onNew}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 12px', margin: '0 0 8px 0',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-lite)',
          background: 'transparent',
          color: 'var(--text-2)', fontSize: 13, fontWeight: 500,
          cursor: 'pointer', transition: 'all var(--transition)',
          width: '100%',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--bg-hover)'
          e.currentTarget.style.color = 'var(--text-1)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--text-2)'
        }}
      >
        <Plus size={14} /> New Chat
      </button>

      {/* History label */}
      {sessions.length > 0 && (
        <div style={{
          fontSize: 10, color: 'var(--text-3)',
          letterSpacing: '0.08em', padding: '4px 4px 6px',
          textTransform: 'uppercase',
        }}>
          Recent
        </div>
      )}

      {/* Session list */}
      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sessions.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 4px' }}>
            No history yet
          </div>
        )}

        {sessions.map(session => {
          const isActive = session.id === activeSessionId
          return (
            <div
              key={session.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                background: isActive ? 'var(--bg-hover)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all var(--transition)',
                group: true,
              }}
              onClick={() => onLoad(session.id)}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <MessageSquare size={12} color={isActive ? 'var(--accent)' : 'var(--text-3)'} style={{ flexShrink: 0 }} />

              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{
                  fontSize: 12.5, fontWeight: isActive ? 500 : 400,
                  color: isActive ? 'var(--text-1)' : 'var(--text-2)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {session.title}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>
                  {timeAgo(session.updatedAt)} · {session.messages.length} msgs
                </div>
              </div>

              <button
                onClick={e => { e.stopPropagation(); onDelete(session.id) }}
                style={{
                  color: 'var(--text-3)', padding: '2px', flexShrink: 0,
                  opacity: 0, transition: 'opacity var(--transition)',
                  borderRadius: 4,
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                // Show on parent hover via CSS workaround
                ref={el => {
                  if (el) {
                    el.closest('div[data-session]')?.addEventListener('mouseenter', () => el.style.opacity = '1')
                    el.closest('div[data-session]')?.addEventListener('mouseleave', () => el.style.opacity = '0')
                  }
                }}
              >
                <Trash2 size={11} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
// components/Sidebar.jsx
import { NavLink, useLocation } from 'react-router-dom'
import { MessageSquare, BarChart2, FileText, GraduationCap, Trash2 } from 'lucide-react'
import ChatHistory from './ChatHistory'

const NAV_LINKS = [
  { to: '/',            icon: MessageSquare,  label: 'Ask VIIT'     },
  { to: '/scholarships',icon: GraduationCap,  label: 'Scholarships' },
  { to: '/feedback',    icon: FileText,       label: 'Feedback'     },
  { to: '/reports',     icon: BarChart2,      label: 'Reports'      },
]

export default function Sidebar({ historyProps }) {
  const location  = useLocation()
  const onChatPage = location.pathname === '/'

  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      minHeight: '100vh',
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 14px',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 24, paddingLeft: 6 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-1)', lineHeight: 1.2 }}>
          VIIT
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em', marginTop: 2 }}>
          MULTI-AGENT AI
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 20 }}>
        {NAV_LINKS.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '9px 10px', borderRadius: 'var(--radius-sm)',
              textDecoration: 'none', fontSize: 13.5, fontWeight: 500,
              color: isActive ? 'var(--text-1)' : 'var(--text-2)',
              background: isActive ? 'var(--bg-hover)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all var(--transition)',
            })}
          >
            <Icon size={15} strokeWidth={1.8} />{label}
          </NavLink>
        ))}
      </nav>

      <div style={{ height: 1, background: 'var(--border)', marginBottom: 16 }} />

      {/* Chat history (only on chat page) */}
      {onChatPage && historyProps && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ChatHistory
            sessions={historyProps.sessions}
            activeSessionId={historyProps.activeSessionId}
            onLoad={historyProps.loadSession}
            onDelete={historyProps.deleteSession}
            onNew={historyProps.newChat}
          />
          {historyProps.sessions.length > 0 && (
            <button onClick={historyProps.clearAll}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)', padding: '8px 4px', marginTop: 8, cursor: 'pointer', transition: 'color var(--transition)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
            >
              <Trash2 size={11} /> Clear all history
            </button>
          )}
        </div>
      )}

      {/* Bottom tech stack badge */}
      <div style={{ paddingLeft: 6, marginTop: onChatPage ? 8 : 'auto' }}>
        <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 2 }}>
          Powered by<br />
          <span style={{ color: 'var(--accent)' }}>LangGraph · Groq</span> · ChromaDB · Tavily
        </div>
      </div>
    </aside>
  )
}
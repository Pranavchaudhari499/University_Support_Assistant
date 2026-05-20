// import { NavLink } from 'react-router-dom'
// import { MessageSquare, BarChart2, FileText } from 'lucide-react'

// const links = [
//   { to: '/',         icon: MessageSquare, label: 'Ask VIIT' },
//   { to: '/feedback', icon: FileText,      label: 'Feedback' },
//   { to: '/reports',  icon: BarChart2,     label: 'Reports'  },
// ]

// export default function Sidebar() {
//   return (
//     <aside style={{
//       width: 'var(--sidebar-w)',
//       minHeight: '100vh',
//       background: 'var(--bg-card)',
//       borderRight: '1px solid var(--border)',
//       display: 'flex',
//       flexDirection: 'column',
//       padding: '28px 16px',
//       flexShrink: 0,
//     }}>
//       {/* Logo */}
//       <div style={{ marginBottom: 36, paddingLeft: 8 }}>
//         <div style={{
//           fontFamily: 'var(--font-display)',
//           fontSize: 22,
//           color: 'var(--text-1)',
//           lineHeight: 1.2,
//         }}>
//           VIIT
//         </div>
//         <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em', marginTop: 2 }}>
//           SUPPORT AGENT
//         </div>
//       </div>

//       {/* Nav links */}
//       <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
//         {links.map(({ to, icon: Icon, label }) => (
//           <NavLink
//             key={to}
//             to={to}
//             end={to === '/'}
//             style={({ isActive }) => ({
//               display: 'flex',
//               alignItems: 'center',
//               gap: 10,
//               padding: '10px 12px',
//               borderRadius: 'var(--radius-sm)',
//               textDecoration: 'none',
//               fontSize: 14,
//               fontWeight: 500,
//               color: isActive ? 'var(--text-1)' : 'var(--text-2)',
//               background: isActive ? 'var(--bg-hover)' : 'transparent',
//               borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
//               transition: 'all var(--transition)',
//             })}
//           >
//             <Icon size={16} strokeWidth={1.8} />
//             {label}
//           </NavLink>
//         ))}
//       </nav>

//       {/* Bottom badge */}
//       <div style={{ marginTop: 'auto', paddingLeft: 8 }}>
//         <div style={{
//           fontSize: 11,
//           color: 'var(--text-3)',
//           lineHeight: 1.8,
//         }}>
//           Powered by<br />
//           <span style={{ color: 'var(--accent)' }}>LLaMA 3</span> · ChromaDB · LangChain
//         </div>
//       </div>
//     </aside>
//   )
// }

// components/Sidebar.jsx
import { NavLink, useLocation } from 'react-router-dom'
import { MessageSquare, BarChart2, FileText, Trash2 } from 'lucide-react'
import ChatHistory from './ChatHistory'

const NAV_LINKS = [
  { to: '/',         icon: MessageSquare, label: 'Ask VIIT'  },
  { to: '/feedback', icon: FileText,      label: 'Feedback'  },
  { to: '/reports',  icon: BarChart2,     label: 'Reports'   },
]

export default function Sidebar({ historyProps }) {
  const location = useLocation()
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
      <div style={{ marginBottom: 24, paddingLeft: 6 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-1)', lineHeight: 1.2 }}>VIIT</div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em', marginTop: 2 }}>SUPPORT AGENT</div>
      </div>

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

      <div style={{ paddingLeft: 6, marginTop: onChatPage ? 8 : 'auto' }}>
        <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 2 }}>
          Powered by<br /><span style={{ color: 'var(--accent)' }}>Ollama phi 3</span> · ChromaDB · LangChain
        </div>
      </div>
    </aside>
  )
}
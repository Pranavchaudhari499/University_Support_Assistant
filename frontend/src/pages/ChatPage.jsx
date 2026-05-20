// import { useState, useRef, useEffect } from 'react'
// import { Send, Trash2 } from 'lucide-react'
// import MessageBubble from '../components/MessageBubble'
// import { streamQuery } from '../api/client'

// const SUGGESTIONS = [
//   'What is the minimum attendance required?',
//   'Who is the HOD of CSE department?',
//   'What are the library timings?',
//   'What is the fee for re-evaluation?',
//   'What are the placement eligibility criteria?',
// ]

// export default function ChatPage() {
//   const [messages, setMessages]     = useState([])
//   const [input, setInput]           = useState('')
//   const [isLoading, setIsLoading]   = useState(false)
//   const bottomRef                   = useRef(null)
//   const abortRef                    = useRef(null)
//   const textareaRef                 = useRef(null)

//   useEffect(() => {
//     bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
//   }, [messages])

//   const sendMessage = (text) => {
//     const msg = (text || input).trim()
//     if (!msg || isLoading) return

//     setInput('')
//     setMessages(prev => [...prev, { role: 'user', content: msg }])
//     setIsLoading(true)

//     // Add empty assistant message to stream into
//     setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }])

//     abortRef.current = streamQuery(
//       msg,
//       // onToken
//       (token) => {
//         setMessages(prev => {
//           const next = [...prev]
//           const last = next[next.length - 1]
//           if (last.role === 'assistant') {
//             next[next.length - 1] = { ...last, content: last.content + token }
//           }
//           return next
//         })
//       },
//       // onDone
//       () => {
//         setMessages(prev => {
//           const next = [...prev]
//           const last = next[next.length - 1]
//           if (last.role === 'assistant') {
//             next[next.length - 1] = { ...last, isStreaming: false }
//           }
//           return next
//         })
//         setIsLoading(false)
//       },
//       // onError
//       (err) => {
//         setMessages(prev => {
//           const next = [...prev]
//           next[next.length - 1] = {
//             role: 'assistant',
//             content: `Something went wrong: ${err}. Please try again.`,
//             isStreaming: false,
//           }
//           return next
//         })
//         setIsLoading(false)
//       }
//     )
//   }

//   const handleKeyDown = (e) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault()
//       sendMessage()
//     }
//   }

//   const clearChat = () => {
//     if (abortRef.current) abortRef.current.abort()
//     setMessages([])
//     setIsLoading(false)
//   }

//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

//       {/* Header */}
//       <div style={{
//         padding: '20px 28px',
//         borderBottom: '1px solid var(--border)',
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//         flexShrink: 0,
//       }}>
//         <div>
//           <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400 }}>
//             Ask VIIT
//           </h1>
//           <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
//             Ask anything about rules, departments, courses, or events
//           </p>
//         </div>
//         {messages.length > 0 && (
//           <button onClick={clearChat} style={{
//             display: 'flex', alignItems: 'center', gap: 6,
//             padding: '7px 14px', borderRadius: 'var(--radius-sm)',
//             border: '1px solid var(--border)', color: 'var(--text-3)',
//             fontSize: 13, transition: 'all var(--transition)',
//           }}
//           onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
//           onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
//           >
//             <Trash2 size={14} /> Clear
//           </button>
//         )}
//       </div>

//       {/* Messages */}
//       <div style={{
//         flex: 1, overflowY: 'auto',
//         padding: '24px 28px',
//         display: 'flex', flexDirection: 'column', gap: 16,
//       }}>
//         {messages.length === 0 && (
//           <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 480 }}>
//             <div style={{
//               width: 56, height: 56, borderRadius: '50%',
//               background: 'var(--accent-glow)',
//               border: '1px solid var(--accent)',
//               display: 'flex', alignItems: 'center', justifyContent: 'center',
//               margin: '0 auto 20px',
//               fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--accent)',
//             }}>V</div>
//             <h2 style={{
//               fontFamily: 'var(--font-display)', fontSize: 26,
//               fontWeight: 400, marginBottom: 8,
//             }}>
//               Hello! I'm your VIIT Assistant
//             </h2>
//             <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 28 }}>
//               I can help you with attendance rules, courses, departments, events, deadlines, and more.
//             </p>
//             <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
//               {SUGGESTIONS.map(s => (
//                 <button key={s} onClick={() => sendMessage(s)} style={{
//                   padding: '8px 14px',
//                   borderRadius: 99,
//                   border: '1px solid var(--border-lite)',
//                   background: 'var(--bg-card)',
//                   color: 'var(--text-2)',
//                   fontSize: 13,
//                   transition: 'all var(--transition)',
//                   cursor: 'pointer',
//                   textAlign: 'left',
//                 }}
//                 onMouseEnter={e => {
//                   e.currentTarget.style.borderColor = 'var(--accent)'
//                   e.currentTarget.style.color = 'var(--text-1)'
//                 }}
//                 onMouseLeave={e => {
//                   e.currentTarget.style.borderColor = 'var(--border-lite)'
//                   e.currentTarget.style.color = 'var(--text-2)'
//                 }}
//                 >
//                   {s}
//                 </button>
//               ))}
//             </div>
//           </div>
//         )}

//         {messages.map((msg, i) => (
//           <MessageBubble
//             key={i}
//             role={msg.role}
//             content={msg.content}
//             isStreaming={msg.isStreaming}
//           />
//         ))}
//         <div ref={bottomRef} />
//       </div>

//       {/* Input */}
//       <div style={{
//         padding: '16px 28px 24px',
//         borderTop: '1px solid var(--border)',
//         flexShrink: 0,
//       }}>
//         <div style={{
//           display: 'flex', gap: 10, alignItems: 'flex-end',
//           background: 'var(--bg-card)',
//           border: '1px solid var(--border-lite)',
//           borderRadius: 'var(--radius)',
//           padding: '10px 12px',
//           transition: 'border-color var(--transition)',
//         }}
//         onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent)'}
//         onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border-lite)'}
//         >
//           <textarea
//             ref={textareaRef}
//             value={input}
//             onChange={e => setInput(e.target.value)}
//             onKeyDown={handleKeyDown}
//             placeholder="Ask about attendance, exams, departments, events..."
//             rows={1}
//             style={{
//               flex: 1, resize: 'none', border: 'none', outline: 'none',
//               background: 'transparent', color: 'var(--text-1)',
//               fontSize: 14, lineHeight: 1.6,
//               maxHeight: 120, overflowY: 'auto',
//             }}
//           />
//           <button
//             onClick={() => sendMessage()}
//             disabled={!input.trim() || isLoading}
//             style={{
//               width: 36, height: 36, borderRadius: 'var(--radius-sm)',
//               background: input.trim() && !isLoading ? 'var(--accent)' : 'var(--border)',
//               display: 'flex', alignItems: 'center', justifyContent: 'center',
//               flexShrink: 0,
//               transition: 'background var(--transition)',
//               cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
//             }}
//           >
//             {isLoading
//               ? <div style={{
//                   width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
//                   borderTopColor: '#fff', borderRadius: '50%',
//                   animation: 'spin 0.7s linear infinite',
//                 }} />
//               : <Send size={15} color="#fff" />
//             }
//           </button>
//         </div>
//         <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, textAlign: 'center' }}>
//           Press Enter to send · Shift+Enter for new line
//         </p>
//       </div>
//     </div>
//   )
// }

// pages/ChatPage.jsx
// pages/ChatPage.jsx
import { useState, useRef, useEffect } from 'react'
import { Send, Trash2 } from 'lucide-react'
import MessageBubble from '../components/MessageBubble'
import SessionInsights from '../components/SessionInsights'
import { streamQuery } from '../api/client'

const SUGGESTIONS = [
  'What is the minimum attendance required?',
  'hod of cse data science department?',
  'What are the library timings?',
  'What is the fee for re-evaluation?',
  'What are the placement eligibility criteria?',
]

export default function ChatPage({ historyProps }) {
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [isLoading, setIsLoading]   = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const bottomRef                   = useRef(null)
  const abortRef                    = useRef(null)

  // Load session when switching from sidebar
  useEffect(() => {
    if (historyProps?.activeSession) {
      setMessages(historyProps.activeSession.messages)
      // Show insights panel if this session has a summary
      setShowInsights(!!historyProps.activeSession.summary)
    } else {
      setMessages([])
      setShowInsights(false)
    }
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
    setMessages(prev => [
      ...prev,
      { role: 'user', content: msg },
      { role: 'assistant', content: '', isStreaming: true },
    ])
    setIsLoading(true)

    abortRef.current = streamQuery(msg,
      (token) => {
        setMessages(prev => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: last.content + token }
          return next
        })
      },
      () => {
        setMessages(prev => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') next[next.length - 1] = { ...last, isStreaming: false }
          historyProps?.saveMessages(next)
          return next
        })
        setIsLoading(false)
      },
      (err) => {
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: `Error: ${err}. Please try again.`, isStreaming: false }
          historyProps?.saveMessages(next)
          return next
        })
        setIsLoading(false)
      }
    )
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // When user starts a new chat — finalize + summarize the current session
  const handleNewChat = async () => {
    if (abortRef.current) abortRef.current.abort()
    setIsLoading(false)

    // Trigger background summarization of current session
    await historyProps?.finalizeSession()

    setMessages([])
    setShowInsights(false)
    historyProps?.newChat()
  }

  // Current session's summary (if already generated)
  const currentSummary = historyProps?.activeSession?.summary || null

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Main chat area */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400 }}>Ask VIIT</h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Ask anything about rules, departments, courses, or events</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Show insights toggle if summary exists */}
            {currentSummary && (
              <button onClick={() => setShowInsights(p => !p)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 'var(--radius-sm)',
                border: `1px solid ${showInsights ? 'var(--accent)' : 'var(--border)'}`,
                background: showInsights ? 'var(--accent-glow)' : 'transparent',
                color: showInsights ? 'var(--accent)' : 'var(--text-2)',
                fontSize: 13, transition: 'all var(--transition)',
              }}>
                💡 {showInsights ? 'Hide' : 'Show'} Insights
              </button>
            )}
            {messages.length > 0 && (
              <button onClick={handleNewChat} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 13,
                transition: 'all var(--transition)',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
              > New Chat</button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 480 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--accent)' }}>V</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400, marginBottom: 8 }}>Hello! I'm your VIIT Assistant</h2>
              <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 28 }}>I can help you with attendance rules, courses, departments, events, deadlines, and more.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => sendMessage(s)} style={{ padding: '8px 14px', borderRadius: 99, border: '1px solid var(--border-lite)', background: 'var(--bg-card)', color: 'var(--text-2)', fontSize: 13, cursor: 'pointer', transition: 'all var(--transition)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text-1)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-lite)'; e.currentTarget.style.color = 'var(--text-2)' }}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} isStreaming={msg.isStreaming} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '16px 28px 24px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'var(--bg-card)', border: '1px solid var(--border-lite)', borderRadius: 'var(--radius)', padding: '10px 12px', transition: 'border-color var(--transition)' }}
            onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border-lite)'}
          >
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Ask about attendance, exams, departments, events..." rows={1}
              style={{ flex: 1, resize: 'none', border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-1)', fontSize: 14, lineHeight: 1.6, maxHeight: 120, overflowY: 'auto' }}
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || isLoading} style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: input.trim() && !isLoading ? 'var(--accent)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background var(--transition)', cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed' }}>
              {isLoading ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <Send size={15} color="#fff" />}
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, textAlign: 'center' }}>Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>

      {/* Insights panel — slides in from the right */}
      {showInsights && currentSummary && (
        <SessionInsights summary={currentSummary} onClose={() => setShowInsights(false)} />
      )}
    </div>
  )
}
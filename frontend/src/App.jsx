// App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar        from './components/Sidebar'
import ChatPage       from './pages/ChatPage'
import FeedbackPage   from './pages/FeedbackPage'
import ReportsPage    from './pages/ReportsPage'
import useChatHistory from './hooks/useChatHistory'

export default function App() {
  const history = useChatHistory()

  const historyProps = {
    sessions:        history.sessions,
    activeSessionId: history.activeSessionId,
    activeSession:   history.activeSession,
    saveMessages:    history.saveMessages,
    finalizeSession: history.finalizeSession,
    loadSession:     history.loadSession,
    deleteSession:   history.deleteSession,
    newChat:         history.newChat,
    clearAll:        history.clearAll,
  }

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar historyProps={historyProps} />
        <main style={{ flex: 1, overflow: 'hidden' }}>
          <Routes>
            <Route path="/"         element={<ChatPage historyProps={historyProps} />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/reports"  element={<ReportsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
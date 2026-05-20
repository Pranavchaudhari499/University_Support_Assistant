import { useState } from 'react'
import { Upload, Send, Users, Download } from 'lucide-react'
import { summarizeFeedback, summarizeFeedbackFile } from '../api/client'

const RESPONDENT_TYPES = ['student', 'faculty', 'parent']

const PLACEHOLDER = `Paste survey responses here, one per line...

Example:
The canteen food quality has gone down this semester.
WiFi in the hostel is very poor after 9pm.
Faculty are helpful but labs need better equipment.
Library should have extended hours during exams.
Placement cell is doing great work.`

export default function FeedbackPage() {
  const [text, setText]                 = useState('')
  const [file, setFile]                 = useState(null)
  const [respondentType, setRespondent] = useState('student')
  const [result, setResult]             = useState(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  const handleSubmit = async () => {
    if (!text.trim() && !file) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      let data
      if (file) {
        data = await summarizeFeedbackFile(file, respondentType)
      } else {
        data = await summarizeFeedback(text, respondentType)
      }
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (f) { setFile(f); setText('') }
  }

  const handleDownload = () => {
    if (!result || !result.summary) return
    const element = document.createElement("a")
    const fileBlob = new Blob([result.summary], {type: 'text/plain'})
    element.href = URL.createObjectURL(fileBlob)
    element.download = `${result.respondent_type}_feedback_summary.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div style={{ height: '100vh', overflowY: 'auto', padding: '28px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400 }}>
          Feedback Summarizer
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>
          Paste survey responses or upload a file — get an AI-generated summary instantly
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 1100 }}>

        {/* Left — Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Respondent type selector */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: 16,
          }}>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={14} /> Respondent Type
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {RESPONDENT_TYPES.map(t => (
                <button key={t} onClick={() => setRespondent(t)} style={{
                  flex: 1, padding: '8px 0',
                  borderRadius: 'var(--radius-sm)',
                  border: respondentType === t ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: respondentType === t ? 'var(--accent-glow)' : 'transparent',
                  color: respondentType === t ? 'var(--accent)' : 'var(--text-3)',
                  fontSize: 13, fontWeight: 500,
                  textTransform: 'capitalize',
                  transition: 'all var(--transition)',
                }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Text area */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            flex: 1,
          }}>
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border)',
              fontSize: 12, color: 'var(--text-3)',
            }}>
              Paste feedback text
            </div>
            <textarea
              value={text}
              onChange={e => { setText(e.target.value); setFile(null) }}
              placeholder={PLACEHOLDER}
              style={{
                width: '100%', minHeight: 240,
                padding: '14px', border: 'none', outline: 'none',
                background: 'transparent', color: 'var(--text-1)',
                fontSize: 13.5, lineHeight: 1.7, resize: 'vertical',
              }}
            />
          </div>

          {/* File upload */}
          <label style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px', borderRadius: 'var(--radius)',
            border: `1px dashed ${file ? 'var(--accent)' : 'var(--border-lite)'}`,
            background: file ? 'var(--accent-glow)' : 'transparent',
            color: file ? 'var(--accent)' : 'var(--text-3)',
            fontSize: 13, cursor: 'pointer',
            transition: 'all var(--transition)',
          }}>
            <Upload size={15} />
            {file ? file.name : 'Or upload a .txt / .csv file'}
            <input type="file" accept=".txt,.csv" onChange={handleFile} style={{ display: 'none' }} />
          </label>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 'var(--radius-sm)',
              background: 'rgba(247,110,110,0.08)',
              border: '1px solid rgba(247,110,110,0.3)',
              color: 'var(--danger)', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={(!text.trim() && !file) || loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px', borderRadius: 'var(--radius)',
              background: (!text.trim() && !file) || loading ? 'var(--border)' : 'var(--accent)',
              color: '#fff', fontSize: 14, fontWeight: 500,
              cursor: (!text.trim() && !file) || loading ? 'not-allowed' : 'pointer',
              transition: 'background var(--transition)',
            }}
          >
            {loading
              ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Summarizing...</>
              : <><Send size={15} /> Summarize Feedback</>
            }
          </button>
        </div>

        {/* Right — Result */}
        <div>
          {!result && !loading && (
            <div style={{
              height: '100%', minHeight: 300,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-3)', fontSize: 13, textAlign: 'center',
              padding: 24,
            }}>
              Your AI-generated summary will appear here
            </div>
          )}

          {loading && (
            <div style={{
              height: '100%', minHeight: 300,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              gap: 12, color: 'var(--text-3)', fontSize: 13,
            }}>
              <div style={{ width: 24, height: 24, border: '2px solid var(--border-lite)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Analyzing feedback with LLaMA 3...
            </div>
          )}

          {result && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              animation: 'fadeUp 0.25s ease',
              overflow: 'hidden',
            }}>
              {/* Result header */}
              <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', textTransform: 'capitalize' }}>
                  {result.respondent_type} Feedback Summary
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {result.total_chars?.toLocaleString()} chars · {result.batch_count} batch{result.batch_count !== 1 ? 'es' : ''}
                  </span>
                  <button onClick={handleDownload} style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 500, transition: 'color var(--transition)',
                  }} onMouseOver={e => e.currentTarget.style.color = 'var(--accent)'}
                     onMouseOut={e => e.currentTarget.style.color = 'var(--text-3)'}>
                    <Download size={13} />
                    Download
                  </button>
                </div>
              </div>
              <pre style={{
                padding: '18px',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                fontSize: 13.5, lineHeight: 1.75,
                color: 'var(--text-2)', fontFamily: 'var(--font-body)',
                maxHeight: 520, overflowY: 'auto',
              }}>
                {result.summary}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
import { useState } from 'react'
import { Calendar, AlertTriangle, TrendingUp, Plus, X } from 'lucide-react'
import ReportCard from '../components/ReportCard'
import { generateReport } from '../api/client'

const REPORT_TYPES = [
  {
    id: 'upcoming_deadlines',
    icon: Calendar,
    label: 'Upcoming Deadlines',
    desc: 'Exam dates, submission deadlines, fee payments',
    color: 'var(--accent)',
  },
  {
    id: 'top_issues',
    icon: AlertTriangle,
    label: 'Top Issues',
    desc: 'Most common complaints from feedback summaries',
    color: 'var(--accent2)',
  },
  // {
  //   id: 'satisfaction_index',
  //   icon: TrendingUp,
  //   label: 'Satisfaction Index',
  //   desc: 'Overall satisfaction scores by stakeholder group',
  //   color: 'var(--success)',
  // },
]

const DEFAULT_SCORES = { student: '', faculty: '', parent: '' }

export default function ReportsPage() {
  const [selected, setSelected]   = useState(null)
  const [report, setReport]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [summaries, setSummaries] = useState([''])
  const [scores, setScores]       = useState(DEFAULT_SCORES)

  const handleGenerate = async () => {
    if (!selected) return
    setLoading(true)
    setError('')
    setReport(null)

    try {
      let extra = {}
      if (selected === 'top_issues') {
        extra.summaries = summaries.filter(s => s.trim())
      }
      // if (selected === 'satisfaction_index') {
      //   const parsed = {}
      //   for (const [k, v] of Object.entries(scores)) {
      //     if (v !== '') parsed[k] = parseFloat(v)
      //   }
      //   extra.scores = parsed
      // }
      const data = await generateReport(selected, extra)
      setReport(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addSummary  = () => setSummaries(p => [...p, ''])
  const removeSummary = (i) => setSummaries(p => p.filter((_, idx) => idx !== i))
  const updateSummary = (i, v) => setSummaries(p => p.map((s, idx) => idx === i ? v : s))

  return (
    <div style={{ height: '100vh', overflowY: 'auto', padding: '28px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400 }}>
          Report Generator
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>
          Generate AI-powered university reports in one click
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, maxWidth: 1100 }}>

        {/* Left — Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Report type selector */}
          {REPORT_TYPES.map(({ id, icon: Icon, label, desc, color }) => (
            <button key={id} onClick={() => { setSelected(id); setReport(null); setError('') }} style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius)',
              border: selected === id ? `1px solid ${color}` : '1px solid var(--border)',
              background: selected === id ? `${color}18` : 'var(--bg-card)',
              textAlign: 'left', cursor: 'pointer',
              transition: 'all var(--transition)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <Icon size={16} color={selected === id ? color : 'var(--text-3)'} />
                <span style={{
                  fontSize: 14, fontWeight: 500,
                  color: selected === id ? 'var(--text-1)' : 'var(--text-2)',
                }}>{label}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 26 }}>{desc}</p>
            </button>
          ))}

          {/* Extra inputs for top_issues */}
          {selected === 'top_issues' && (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: 16,
            }}>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
                Paste feedback summaries
              </div>
              {summaries.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <textarea
                    value={s}
                    onChange={e => updateSummary(i, e.target.value)}
                    placeholder={`Summary ${i + 1}...`}
                    rows={3}
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)', background: 'var(--bg-hover)',
                      color: 'var(--text-1)', fontSize: 12.5, lineHeight: 1.6,
                      resize: 'vertical', outline: 'none',
                    }}
                  />
                  {summaries.length > 1 && (
                    <button onClick={() => removeSummary(i)} style={{ color: 'var(--text-3)', padding: 4 }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addSummary} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: 'var(--accent)', padding: '4px 0',
              }}>
                <Plus size={13} /> Add another summary
              </button>
            </div>
          )}

          {/* Extra inputs for satisfaction_index */}
          {/* {selected === 'satisfaction_index' && (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: 16,
            }}>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
                Enter scores (out of 10)
              </div>
              {Object.keys(DEFAULT_SCORES).map(group => (
                <div key={group} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-2)', textTransform: 'capitalize', width: 60 }}>
                    {group}
                  </span>
                  <input
                    type="number" min="0" max="10" step="0.1"
                    value={scores[group]}
                    onChange={e => setScores(p => ({ ...p, [group]: e.target.value }))}
                    placeholder="e.g. 7.5"
                    style={{
                      flex: 1, padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)', background: 'var(--bg-hover)',
                      color: 'var(--text-1)', fontSize: 13, outline: 'none',
                    }}
                  />
                </div>
              ))}
            </div>
          )} */}

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

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!selected || loading}
            style={{
              padding: '12px', borderRadius: 'var(--radius)',
              background: selected && !loading ? 'var(--accent)' : 'var(--border)',
              color: '#fff', fontSize: 14, fontWeight: 500,
              cursor: selected && !loading ? 'pointer' : 'not-allowed',
              transition: 'background var(--transition)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading
              ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Generating...</>
              : 'Generate Report'
            }
          </button>
        </div>

        {/* Right — Report output */}
        <div>
          {!report && !loading && (
            <div style={{
              height: '100%', minHeight: 300,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px dashed var(--border)', borderRadius: 'var(--radius)',
              color: 'var(--text-3)', fontSize: 13,
            }}>
              Select a report type and click Generate
            </div>
          )}
          {loading && (
            <div style={{
              height: '100%', minHeight: 300,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              gap: 12, color: 'var(--text-3)', fontSize: 13,
            }}>
              <div style={{ width: 24, height: 24, border: '2px solid var(--border-lite)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Generating report with LLaMA 3...
            </div>
          )}
          {report && <ReportCard report={report} />}
        </div>
      </div>
    </div>
  )
}
// components/SessionInsights.jsx
import { X, TrendingUp, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react'

// Parses the raw summary string into sections
function parseSummary(summary) {
  const sections = {
    sentiment:         '',
    topIssues:         [],
    positiveHighlights:[],
    recommendations:   [],
    satisfactionScore: '',
    raw:               summary,
  }

  try {
    const lines = summary.split('\n')
    let current = null

    for (const line of lines) {
      const l = line.trim()
      if (!l) continue

      if (l.startsWith('OVERALL SENTIMENT:')) {
        sections.sentiment = l.replace('OVERALL SENTIMENT:', '').trim()
      } else if (l.startsWith('TOP ISSUES')) {
        current = 'issues'
      } else if (l.startsWith('POSITIVE HIGHLIGHTS')) {
        current = 'positive'
      } else if (l.startsWith('KEY RECOMMENDATIONS')) {
        current = 'recommendations'
      } else if (l.startsWith('SATISFACTION SCORE:')) {
        sections.satisfactionScore = l.replace('SATISFACTION SCORE:', '').trim()
        current = null
      } else if (/^\d+\./.test(l)) {
        const text = l.replace(/^\d+\.\s*/, '').trim()
        if (current === 'issues')           sections.topIssues.push(text)
        else if (current === 'positive')    sections.positiveHighlights.push(text)
        else if (current === 'recommendations') sections.recommendations.push(text)
      }
    }
  } catch {}

  return sections
}

function sentimentColor(sentiment) {
  const s = sentiment.toLowerCase()
  if (s.includes('positive')) return 'var(--success)'
  if (s.includes('negative')) return 'var(--danger)'
  if (s.includes('mixed'))    return 'var(--accent2)'
  return 'var(--text-2)'
}

export default function SessionInsights({ summary, onClose }) {
  const parsed = parseSummary(summary)
  const hasParsed = parsed.topIssues.length > 0 || parsed.positiveHighlights.length > 0

  return (
    <div style={{
      width: 320, flexShrink: 0,
      borderLeft: '1px solid var(--border)',
      background: 'var(--bg-card)',
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      animation: 'fadeUp 0.2s ease',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-glow)', border: '1px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Lightbulb size={14} color="var(--accent)" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Session Insights</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>AI analysis of this chat</div>
          </div>
        </div>
        <button onClick={onClose} style={{ color: 'var(--text-3)', padding: 4, borderRadius: 4, transition: 'color var(--transition)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Sentiment */}
        {parsed.sentiment && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
              Overall Sentiment
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 99,
              background: `${sentimentColor(parsed.sentiment)}18`,
              border: `1px solid ${sentimentColor(parsed.sentiment)}40`,
              color: sentimentColor(parsed.sentiment),
              fontSize: 13, fontWeight: 500,
            }}>
              <TrendingUp size={13} />
              {parsed.sentiment}
            </div>
          </div>
        )}

        {/* Satisfaction Score */}
        {parsed.satisfactionScore && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
              Satisfaction Score
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 32,
              color: 'var(--accent)', lineHeight: 1,
            }}>
              {parsed.satisfactionScore}
            </div>
          </div>
        )}

        {/* Top Issues */}
        {parsed.topIssues.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
              Top Issues
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {parsed.topIssues.map((issue, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(247,110,110,0.06)',
                  border: '1px solid rgba(247,110,110,0.15)',
                }}>
                  <AlertCircle size={13} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{issue}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Positive Highlights */}
        {parsed.positiveHighlights.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
              Positive Highlights
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {parsed.positiveHighlights.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(62,207,142,0.06)',
                  border: '1px solid rgba(62,207,142,0.15)',
                }}>
                  <CheckCircle size={13} color="var(--success)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {parsed.recommendations.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
              Recommendations
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {parsed.recommendations.map((rec, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border)',
                }}>
                  <Lightbulb size={13} color="var(--accent2)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback: show raw summary if parsing didn't extract sections */}
        {!hasParsed && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
              Summary
            </div>
            <pre style={{
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              fontSize: 13, lineHeight: 1.7, color: 'var(--text-2)',
              fontFamily: 'var(--font-body)',
            }}>
              {parsed.raw}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
// pages/ScholarshipPage.jsx
// Dedicated scholarship finder — students enter their profile and get personalized results
import { useState } from 'react'
import { Search, GraduationCap, ExternalLink } from 'lucide-react'
import { findScholarships } from '../api/client'

const BRANCHES = [
  'Computer Science (CSE)', 'Information Technology (IT)',
  'Electronics & Telecomm (ENTC)', 'Mechanical Engineering',
  'Civil Engineering', 'AI & Data Science (AIDS)',
  'CSE - Internet of Things', 'CSE - Software Engineering',
]

const CATEGORIES = [
  { value: 'open',      label: 'Open / General' },
  { value: 'ebc',       label: 'EBC (Economically Backward)' },
  { value: 'obc',       label: 'OBC' },
  { value: 'vjnt',      label: 'VJNT / NT / SBC' },
  { value: 'sc',        label: 'SC (Scheduled Caste)' },
  { value: 'st',        label: 'ST (Scheduled Tribe)' },
  { value: 'minority',  label: 'Minority (Muslim/Christian/Sikh/Buddhist)' },
  { value: 'female',    label: 'Female (all categories)' },
]

const Field = ({ label, children, hint }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.04em' }}>
      {label}
    </label>
    {children}
    {hint && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{hint}</span>}
  </div>
)

const inputStyle = {
  padding: '9px 12px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-lite)', background: 'var(--bg-card)',
  color: 'var(--text-1)', fontSize: 13.5, outline: 'none',
  transition: 'border-color var(--transition)',
  width: '100%',
}

export default function ScholarshipPage() {
  const [profile, setProfile] = useState({
    branch: '', semester: '', cgpa: '', category: '', income: '',
  })
  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const set = (key, val) => setProfile(p => ({ ...p, [key]: val }))

  const isValid = profile.branch && profile.cgpa && profile.category

  const handleSearch = async () => {
    if (!isValid) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await findScholarships(profile)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height: '100vh', overflowY: 'auto', padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28, maxWidth: 800 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(62,207,142,0.12)', border: '1px solid rgba(62,207,142,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <GraduationCap size={20} color="#3ecf8e" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400 }}>
              Scholarship Finder
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              Enter your profile — our AI searches Maharashtra & national scholarship databases for you
            </p>
          </div>
        </div>

        {/* Impact note */}
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: 'rgba(62,207,142,0.06)', border: '1px solid rgba(62,207,142,0.2)',
          fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6,
        }}>
          💡 <strong>Did you know?</strong> Thousands of eligible students miss out on government scholarships
          every year because they don't know they exist. This tool searches Mahadbt, NSP, AICTE &amp; more — for free.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, maxWidth: 1100 }}>

        {/* Left — Profile Form */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: 22,
          display: 'flex', flexDirection: 'column', gap: 18,
          height: 'fit-content',
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>
            Your Profile
          </h2>

          <Field label="BRANCH *">
            <select
              value={profile.branch} onChange={e => set('branch', e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">Select branch...</option>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>

          <Field label="CURRENT SEMESTER">
            <select value={profile.semester} onChange={e => set('semester', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Select semester...</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </Field>

          <Field label="CGPA *" hint="Enter your current CGPA (e.g. 8.2)">
            <input
              type="number" min="0" max="10" step="0.1"
              value={profile.cgpa} onChange={e => set('cgpa', e.target.value)}
              placeholder="e.g. 8.2"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-lite)'}
            />
          </Field>

          <Field label="CATEGORY *">
            <select value={profile.category} onChange={e => set('category', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Select category...</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>

          <Field label="ANNUAL FAMILY INCOME (LAKHS)" hint="Used to check income-based eligibility (optional)">
            <input
              type="number" min="0" step="0.5"
              value={profile.income} onChange={e => set('income', e.target.value)}
              placeholder="e.g. 4.5"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-lite)'}
            />
          </Field>

          {error && (
            <div style={{
              padding: '10px 12px', borderRadius: 8,
              background: 'rgba(247,110,110,0.08)', border: '1px solid rgba(247,110,110,0.3)',
              color: 'var(--danger)', fontSize: 12,
            }}>{error}</div>
          )}

          <button
            id="find-scholarships-btn"
            onClick={handleSearch}
            disabled={!isValid || loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '11px', borderRadius: 'var(--radius-sm)',
              background: isValid && !loading ? '#3ecf8e' : 'var(--border)',
              color: isValid && !loading ? '#0a1a12' : 'var(--text-3)',
              fontSize: 13.5, fontWeight: 600, cursor: isValid && !loading ? 'pointer' : 'not-allowed',
              transition: 'all var(--transition)', border: 'none',
            }}>
            {loading
              ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0a1a12', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Searching...</>
              : <><Search size={15} /> Find My Scholarships</>
            }
          </button>
        </div>

        {/* Right — Results */}
        <div>
          {!result && !loading && (
            <div style={{
              minHeight: 300, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              border: '1px dashed var(--border)', borderRadius: 'var(--radius)',
              color: 'var(--text-3)', textAlign: 'center', padding: 32, gap: 12,
            }}>
              <GraduationCap size={36} strokeWidth={1} />
              <p style={{ fontSize: 13 }}>Fill in your profile and click<br />"Find My Scholarships"</p>
              <p style={{ fontSize: 11 }}>
                We'll search Mahadbt · NSP · AICTE · SPPU databases
              </p>
            </div>
          )}

          {loading && (
            <div style={{
              minHeight: 300, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              gap: 16,
            }}>
              <div style={{ width: 32, height: 32, border: '3px solid var(--border-lite)', borderTopColor: '#3ecf8e', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>Searching scholarship databases...</p>
                <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Checking Mahadbt · NSP · AICTE · SPPU</p>
              </div>
            </div>
          )}

          {result && (
            <div style={{ animation: 'fadeUp 0.25s ease' }}>
              {/* Result header */}
              <div style={{
                background: 'rgba(62,207,142,0.06)', border: '1px solid rgba(62,207,142,0.2)',
                borderRadius: 'var(--radius) var(--radius) 0 0',
                padding: '14px 18px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#3ecf8e' }}>
                  🎓 Scholarships Found
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {result.agents_used?.map(a => (
                    <span key={a} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'var(--bg-hover)', border: '1px solid var(--border-lite)', color: 'var(--text-3)' }}>
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              {/* Answer */}
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderTop: 'none', borderRadius: '0 0 var(--radius) var(--radius)',
                padding: '20px',
              }}>
                <pre style={{
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  fontSize: 13.5, lineHeight: 1.8,
                  color: 'var(--text-1)', fontFamily: 'var(--font-body)',
                  margin: 0,
                }}>
                  {result.answer}
                </pre>

                {/* Source links */}
                {result.sources?.length > 0 && (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>Sources:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {result.sources.filter(s => s.startsWith('http')).slice(0, 5).map((src, i) => (
                        <a key={i} href={src} target="_blank" rel="noreferrer" style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 11, padding: '3px 10px', borderRadius: 99,
                          background: 'rgba(79,110,247,0.08)',
                          border: '1px solid rgba(79,110,247,0.25)',
                          color: 'var(--accent)', textDecoration: 'none',
                        }}>
                          <ExternalLink size={9} /> {new URL(src).hostname.replace('www.','')}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

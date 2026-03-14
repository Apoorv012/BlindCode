import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import './Dashboard.css'
import {
  apiGetContest, apiGetParticipants, apiPauseContest,
  apiEndContest, apiAddParticipant, apiAddProblemToContest,
  apiRemoveProblemFromContest
} from '../api'

type ParticipantStatus = 'coding' | 'idle' | 'submitted' | 'offline'
type ContestState = 'running' | 'paused' | 'ended'
type Tab = 'participants' | 'leaderboard' | 'controls'
type Difficulty = 'Easy' | 'Medium' | 'Hard'

interface Problem {
  _id: string
  code: string
  title: string
  difficulty: Difficulty
}

interface Participant {
  _id: string
  name: string
  currentProblemId?: { title: string; difficulty: string } | null
  reveals: number
  compiles: number
  wrongSubmissions: number
  score: number
  status: ParticipantStatus
  lastActive: string
}

const SCORE_MAP: Record<Difficulty, number> = { Easy: 100, Medium: 200, Hard: 300 }

const statusColors: Record<ParticipantStatus, string> = {
  coding: 'status-coding', idle: 'status-idle', submitted: 'status-submitted', offline: 'status-offline',
}
const statusLabels: Record<ParticipantStatus, string> = {
  coding: '● Coding', idle: '○ Idle', submitted: '✓ Submitted', offline: '✕ Offline',
}

export default function Dashboard() {
  const { contestId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const nav = location.state as { name: string; duration: number } | null

  const [contestName, setContestName] = useState(nav?.name || '')
  const [contestDuration, setContestDuration] = useState(nav?.duration || 60)
  const [contestState, setContestState] = useState<ContestState>('running')
  const [contestProblems, setContestProblems] = useState<Problem[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [tab, setTab] = useState<Tab>('participants')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [timer, setTimer] = useState(0)
  const [ending, setEnding] = useState(false)

  const [addProblemCode, setAddProblemCode] = useState('')
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null)
  const [newParticipantName, setNewParticipantName] = useState('')
  const [addParticipantMsg, setAddParticipantMsg] = useState('')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch contest details
  useEffect(() => {
    if (!contestId) return
    apiGetContest(contestId).then(data => {
      if (!nav?.name) setContestName(data.name)
      if (!nav?.duration) setContestDuration(data.duration)
      setContestState(data.status)
      setContestProblems(data.problemIds || [])
      setTimer(data.duration * 60)
    }).catch(console.error)
  }, [contestId])

  // Poll participants every 2s
  useEffect(() => {
    if (!contestId) return
    const fetch = () => {
      apiGetParticipants(contestId)
        .then(data => setParticipants(data))
        .catch(console.error)
    }
    fetch()
    pollRef.current = setInterval(fetch, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [contestId])

  // Countdown timer
  useEffect(() => {
    if (contestState !== 'running') return
    const interval = setInterval(() => setTimer(t => t > 0 ? t - 1 : 0), 1000)
    return () => clearInterval(interval)
  }, [contestState])

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const handlePause = async () => {
    try {
      const data = await apiPauseContest(contestId!)
      setContestState(data.status)
    } catch (err) { console.error(err) }
  }

  const handleEnd = async () => {
    setEnding(true)
    try {
      await apiEndContest(contestId!)
      navigate(`/results/${contestId}`)
    } catch (err) {
      console.error(err)
      setEnding(false)
    }
  }

  const handleAddParticipant = async () => {
    const name = newParticipantName.trim()
    if (!name) return
    try {
      await apiAddParticipant(contestId!, name, true)
      setNewParticipantName('')
      setAddParticipantMsg(`Added ${name} successfully!`)
      setTimeout(() => setAddParticipantMsg(''), 3000)
    } catch (err: any) {
      setAddParticipantMsg(err.message || 'Failed to add participant')
    }
  }

  const handleAddProblem = async () => {
    setAddError(''); setAddSuccess('')
    const code = addProblemCode.trim().toUpperCase()
    if (!code) return
    try {
      const updated = await apiAddProblemToContest(contestId!, code)
      setContestProblems(updated.problemIds || [])
      setAddProblemCode('')
      setAddSuccess(`Problem added successfully!`)
      setTimeout(() => setAddSuccess(''), 3000)
    } catch (err: any) {
      setAddError(err.message || 'Problem not found')
    }
  }

  const handleRemoveProblem = async (problemId: string) => {
    try {
      const updated = await apiRemoveProblemFromContest(contestId!, problemId)
      setContestProblems(updated.problemIds || [])
      setRemoveConfirm(null)
    } catch (err: any) {
      setAddError(err.message || 'Failed to remove problem')
    }
  }

  const leaderboard = [...participants].sort((a, b) => b.score - a.score)
  const codingCount = participants.filter(p => p.status === 'coding').length
  const submittedCount = participants.filter(p => p.status === 'submitted').length
  const offlineCount = participants.filter(p => p.status === 'offline').length

  return (
    <div className={`app ${theme}`}>
      <header className="header">
        <div className="header-left">
          <div className="logo-mark">BC</div>
          <div>
            <div className="logo-title">{contestName || 'Loading...'}</div>
            <div className="logo-sub">#{contestId}</div>
          </div>
        </div>
        <div className="header-center">
          <div className={`contest-badge contest-${contestState}`}>
            {contestState === 'running' && <span className="pulse-dot" />}
            {contestState.toUpperCase()}
          </div>
          <div className="dash-timer">{formatTimer(timer)}</div>
        </div>
        <div className="header-right">
          <button className="prob-bank-btn" onClick={() => navigate('/problems')}>Problem Bank</button>
          <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <div className="admin-badge">ADMIN</div>
          <button className="logout-btn" onClick={() => {
            localStorage.removeItem('bc_admin_token')
            navigate('/login')
          }}>Sign out</button>
        </div>
      </header>

      <nav className="nav">
        {(['participants', 'leaderboard', 'controls'] as Tab[]).map(t => (
          <button key={t} className={`nav-btn ${tab === t ? 'nav-active' : ''}`} onClick={() => setTab(t)}>
            {t === 'participants' && '⊞ '}
            {t === 'leaderboard' && '⬡ '}
            {t === 'controls' && '⚙ '}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div className="nav-stats">
          <span className="stat-pill">{codingCount} coding</span>
          <span className="stat-pill submitted">{submittedCount} submitted</span>
          <span className="stat-pill offline">{offlineCount} offline</span>
        </div>
      </nav>

      <main className="main">

        {/* Participants Tab */}
        {tab === 'participants' && (
          <div className="tab-content">
            <div className="section-header">
              <h2 className="section-title">Participants <span className="count-badge">{participants.length}</span></h2>
              <p className="section-sub">Live monitoring — updates every 2s</p>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th><th>Name</th><th>Status</th><th>Current Problem</th>
                    <th>Score</th><th>Reveals</th><th>Compiles</th><th>Wrong</th><th>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.length === 0 && (
                    <tr><td colSpan={9} style={{ textAlign: 'center', opacity: 0.5 }}>No participants yet</td></tr>
                  )}
                  {participants.map((p, i) => (
                    <tr key={p._id} className="table-row">
                      <td className="td-num">{i + 1}</td>
                      <td className="td-name">{p.name}</td>
                      <td><span className={`status-tag ${statusColors[p.status]}`}>{statusLabels[p.status]}</span></td>
                      <td className="td-problem">{p.currentProblemId?.title || '—'}</td>
                      <td className="td-score">{p.score}</td>
                      <td className={`td-reveals ${p.reveals > 3 ? 'td-warn' : ''}`}>{p.reveals}</td>
                      <td className={`td-compiles ${p.compiles > 7 ? 'td-warn' : ''}`}>{p.compiles}</td>
                      <td className={`td-wrong ${p.wrongSubmissions > 2 ? 'td-danger' : ''}`}>
                        {p.wrongSubmissions > 0 ? `−${p.wrongSubmissions}` : '—'}
                      </td>
                      <td className="td-active">{new Date(p.lastActive).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {tab === 'leaderboard' && (
          <div className="tab-content">
            <div className="section-header">
              <h2 className="section-title">Leaderboard</h2>
              <p className="section-sub">Ranked by score — Easy +100, Medium +200, Hard +300 · Wrong −50 · Reveal −20</p>
            </div>
            <div className="leaderboard">
              {leaderboard.length === 0 && <div style={{ opacity: 0.5, padding: 24 }}>No participants yet</div>}
              {leaderboard.map((p, i) => (
                <div key={p._id} className={`lb-row ${i === 0 ? 'lb-first' : i === 1 ? 'lb-second' : i === 2 ? 'lb-third' : ''}`}>
                  <div className="lb-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</div>
                  <div className="lb-name">{p.name}</div>
                  <div className="lb-bar-wrap">
                    <div className="lb-bar" style={{ width: `${Math.min((p.score / 400) * 100, 100)}%` }} />
                  </div>
                  <div className="lb-score">{p.score} pts</div>
                  <div className="lb-meta">
                    {p.reveals > 0 && <span className="lb-tag lb-reveal">{p.reveals} reveals</span>}
                    {p.wrongSubmissions > 0 && <span className="lb-tag lb-wrong">{p.wrongSubmissions} wrong</span>}
                    {p.reveals === 0 && p.wrongSubmissions === 0 && <span className="lb-tag lb-clean">clean</span>}
                  </div>
                  <span className={`status-tag ${statusColors[p.status]}`}>{statusLabels[p.status]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls Tab */}
        {tab === 'controls' && (
          <div className="tab-content">
            <div className="section-header">
              <h2 className="section-title">Contest Controls</h2>
              <p className="section-sub">Manage the active contest session</p>
            </div>
            <div className="controls-grid">

              <div className="control-card">
                <div className="control-label">Contest Status</div>
                <div className={`big-status contest-${contestState}`}>
                  {contestState === 'running' && <span className="pulse-dot large" />}
                  {contestState.toUpperCase()}
                </div>
                <div className="control-actions">
                  <button className={`btn ${contestState === 'running' ? 'btn-pause' : 'btn-resume'}`} onClick={handlePause}>
                    {contestState === 'running' ? 'Pause Contest' : 'Resume Contest'}
                  </button>
                  <button className="btn btn-end" onClick={handleEnd} disabled={ending}>
                    {ending ? 'Ending...' : 'End Contest'}
                  </button>
                </div>
              </div>

              <div className="control-card">
                <div className="control-label">Time Remaining</div>
                <div className="duration-display">{formatTimer(timer)}</div>
                <div className="dash-timer-sub">Contest duration: {contestDuration} min</div>
              </div>

              <div className="control-card">
                <div className="control-label">Add Participant</div>
                <div className="add-problem-hint">Manually add a participant mid-contest</div>
                <div className="add-problem-input-row">
                  <input
                    className="add-problem-input"
                    placeholder="Participant name..."
                    value={newParticipantName}
                    onChange={e => { setNewParticipantName(e.target.value); setAddParticipantMsg('') }}
                    onKeyDown={e => e.key === 'Enter' && handleAddParticipant()}
                    style={{ textTransform: 'none', letterSpacing: 'normal' }}
                  />
                  <button className="add-problem-btn" onClick={handleAddParticipant}>+ Add</button>
                </div>
                {addParticipantMsg && (
                  <div className={`add-feedback ${addParticipantMsg.includes('Added') ? 'add-success' : 'add-error'}`}>
                    {addParticipantMsg}
                  </div>
                )}
              </div>

              <div className="control-card">
                <div className="control-label">Quick Stats</div>
                <div className="stats-grid">
                  <div className="stat-box"><div className="stat-val">{participants.length}</div><div className="stat-key">Total</div></div>
                  <div className="stat-box"><div className="stat-val coding">{codingCount}</div><div className="stat-key">Coding</div></div>
                  <div className="stat-box"><div className="stat-val submitted">{submittedCount}</div><div className="stat-key">Submitted</div></div>
                  <div className="stat-box"><div className="stat-val offline">{offlineCount}</div><div className="stat-key">Offline</div></div>
                </div>
              </div>

              <div className="control-card edit-problems-card">
                <div className="control-label">
                  Problems in Contest
                  <span className="problems-count-badge">{contestProblems.length}</span>
                </div>
                <div className="edit-problems-list">
                  {contestProblems.map((prob, i) => (
                    <div key={prob._id} className="edit-problem-row">
                      <span className="edit-prob-num">{i + 1}</span>
                      <span className="edit-prob-code">{prob.code}</span>
                      <span className="edit-prob-name">{prob.title}</span>
                      <span className={`diff-badge diff-${prob.difficulty.toLowerCase()}`}>{prob.difficulty}</span>
                      <span className="edit-prob-score">+{SCORE_MAP[prob.difficulty]}</span>
                      {removeConfirm === prob._id ? (
                        <div className="remove-confirm-inline">
                          <span className="remove-confirm-text">Remove?</span>
                          <button className="remove-yes-btn" onClick={() => handleRemoveProblem(prob._id)}>Yes</button>
                          <button className="remove-no-btn" onClick={() => setRemoveConfirm(null)}>No</button>
                        </div>
                      ) : (
                        <button
                          className="edit-remove-btn"
                          onClick={() => setRemoveConfirm(prob._id)}
                          disabled={contestProblems.length <= 1}
                        >✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="add-problem-section">
                  <div className="add-problem-label">Add Problem by Code</div>
                  <div className="add-problem-input-row">
                    <input
                      className="add-problem-input"
                      placeholder="e.g. PROB004"
                      value={addProblemCode}
                      onChange={e => { setAddProblemCode(e.target.value.toUpperCase()); setAddError(''); setAddSuccess('') }}
                      onKeyDown={e => e.key === 'Enter' && handleAddProblem()}
                    />
                    <button className="add-problem-btn" onClick={handleAddProblem}>+ Add</button>
                  </div>
                  {addError && <div className="add-feedback add-error">{addError}</div>}
                  {addSuccess && <div className="add-feedback add-success">{addSuccess}</div>}
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  )
}

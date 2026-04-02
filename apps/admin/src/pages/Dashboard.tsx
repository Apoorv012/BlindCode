import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import './Dashboard.css'
import {
  apiGetContest, apiGetParticipants, apiPauseContest,
  apiEndContest, apiAddParticipant, apiAddProblemToContest,
  apiRemoveProblemFromContest
} from '../api'
import { ContestStatusEnum } from '../types'

type ParticipantStatus = 'coding' | 'idle' | 'submitted' | 'offline' | 'online' | 'unjoined'
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
  password?: string
  currentProblemId?: { _id: string; title: string; difficulty: string } | null
  solvedProblemIds?: string[] // Track solved problems for the spheres
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
  online: 'status-online', unjoined: 'status-offline'
}
const statusLabels: Record<ParticipantStatus, string> = {
  coding: '● Coding', idle: '○ Idle', submitted: '✓ Submitted', offline: '✕ Offline',
  online: '● Online', unjoined: '○ Unjoined'
}

export default function Dashboard() {
  const { contestId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const nav = location.state as { name: string; duration: number } | null

  const [contestName, setContestName] = useState(nav?.name || '')
  const [contestDuration, setContestDuration] = useState(nav?.duration || 60)
  const [contestState, setContestState] = useState<ContestStatusEnum>(ContestStatusEnum.running)
  const [contestProblems, setContestProblems] = useState<Problem[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [tab, setTab] = useState<Tab>('participants')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [timer, setTimer] = useState(0)
  const [intendedEndTime, setIntendedEndTime] = useState<string | null>(null)
  const [ending, setEnding] = useState(false)

  const [addProblemCode, setAddProblemCode] = useState('')
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null)


  const [showTeamModal, setShowTeamModal] = useState(false)
  const [teamForm, setTeamForm] = useState({
    name: '', password: '',
    members: [{ name: '', enroll: '' }, { name: '', enroll: '' }]
  })
  const [manualError, setManualError] = useState('')
  const [addParticipantMsg, setAddParticipantMsg] = useState('')
  const [visiblePasswordId, setVisiblePasswordId] = useState<string | null>(null)
  const pollRef = useRef<any>(null)

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let pass = ''
    for (let i = 0; i < 6; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length))
    setTeamForm(prev => ({ ...prev, password: pass }))
  }


  // Fetch contest details
  useEffect(() => {
    if (!contestId) return
    apiGetContest(contestId).then(data => {
      if (!nav?.name) setContestName(data.name)
      if (!nav?.duration) setContestDuration(data.duration)
      setContestState(data.status)
      setContestProblems(data.problemIds || [])
      if (data.intendedEndTime) setIntendedEndTime(data.intendedEndTime)
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

  // Countdown timer — derived from intendedEndTime, survives reload
  useEffect(() => {
    if (contestState !== ContestStatusEnum.running || !intendedEndTime) return
    const tick = () => {
      const msLeft = new Date(intendedEndTime).getTime() - Date.now()
      setTimer(Math.max(0, Math.floor(msLeft / 1000)))
    }
    tick() // immediately set correct value
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [contestState, intendedEndTime])

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const handlePause = async () => {
    try {
      const data = await apiPauseContest(contestId!)
      setContestState(data.status)
      if (data.intendedEndTime) setIntendedEndTime(data.intendedEndTime)
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

  const handleCreateTeam = async () => {
    setManualError('')
    const validMembers = teamForm.members.filter((m: any) => m.name.trim() && m.enroll)
    if (!teamForm.name || validMembers.length === 0 || !teamForm.password) {
      setManualError('Please fill all required fields (Team Name, at least 1 Member Name/Enroll, Password)')
      return
    }
    try {
      const payloadMembers = validMembers.map((m: any) => ({
        name: m.name,
        enroll: Number(m.enroll)
      }))

      await apiAddParticipant(contestId!, {
        name: teamForm.name,
        password: teamForm.password,
        members: payloadMembers
      })
      setShowTeamModal(false)
      setTeamForm({ name: '', password: '', members: [{ name: '', enroll: '' }, { name: '', enroll: '' }] })
      setAddParticipantMsg(`Team ${teamForm.name} added successfully!`)
      setTimeout(() => setAddParticipantMsg(''), 3000)
    } catch (err: any) {
      setManualError(err.message || 'Failed to create team')
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
  const maxPossibleScore = contestProblems.reduce((sum, p) => sum + SCORE_MAP[p.difficulty], 0)

  return (
    <div className={`app ${theme}`}>
      <header className="header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/')}>← Home</button>
          <div className="logo-mark">BC</div>
          <div>
            <div className="logo-title">{contestName || 'Loading...'}</div>
            <div className="logo-sub">#{contestId}</div>
          </div>
        </div>
        <div className="header-center">
          <div className={`contest-badge contest-${contestState}`}>
            {contestState === ContestStatusEnum.running && <span className="pulse-dot" />}
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
                    <th>#</th><th>Name</th><th>Password</th><th>Status</th><th>Current Problem</th>
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
                      <td>
                        <div
                          className="lobby-participant-pass-wrap"
                          onMouseLeave={() => setVisiblePasswordId(null)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                        >
                          <span className="lobby-participant-pass" style={{ fontFamily: 'monospace' }}>
                            {visiblePasswordId === p._id ? p.password : '••••••'}
                          </span>
                          <button
                            className="lobby-pass-eye"
                            onClick={() => setVisiblePasswordId(p._id)}
                            title="Show Password"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}
                          >
                            {visiblePasswordId === p._id ? '👁️' : '🔒'}
                          </button>
                        </div>
                      </td>
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
        )
        }

        {/* Leaderboard Tab */}
        {
          tab === 'leaderboard' && (
            <div className="tab-content">
              <div className="section-header flex-between">
                <div>
                  <h2 className="section-title">Leaderboard</h2>
                  <p className="section-sub">Ranked by score — Easy +100, Medium +200, Hard +300</p>
                </div>
                <div className="last-sync-badge">
                  <span className="sync-dot"></span> Live
                </div>
              </div>

              <div className="leaderboard-container">
                <div
                  className="lb-header"
                  // Removed the 140px width that was for Meta
                  style={{ gridTemplateColumns: `60px minmax(180px, 1fr) 120px 100px repeat(${contestProblems.length}, 80px)` }}
                >
                  <div className="lb-col-center">Rank</div>
                  <div>Name</div>
                  <div className="lb-col-right">Score</div>
                  <div className="lb-col-center">Status</div>
                  {contestProblems.map((prob, i) => (
                    <div key={prob._id} className="lb-col-center" title={prob.title}>
                      Q{i + 1}
                    </div>
                  ))}
                </div>

                <div className="leaderboard">
                  {leaderboard.length === 0 && <div style={{ opacity: 0.5, padding: 24, textAlign: 'center' }}>No participants yet</div>}

                  {leaderboard.map((p, i) => (
                    <div
                      key={p._id}
                      className={`lb-row ${i === 0 ? 'lb-first' : i === 1 ? 'lb-second' : i === 2 ? 'lb-third' : ''}`}
                      // Removed the 140px width that was for Meta
                      style={{ gridTemplateColumns: `60px minmax(180px, 1fr) 120px 100px repeat(${contestProblems.length}, 80px)` }}
                    >
                      <div className="lb-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</div>
                      <div className="lb-name" title={p.name}>{p.name}</div>

                      <div className="lb-score-wrap">
                        <span className="lb-score-obtained">{p.score}</span>
                        <span className="lb-score-total">/ {maxPossibleScore}</span>
                      </div>

                      <div className="lb-col-center">
                        <span className={`status-tag ${statusColors[p.status]}`}>{statusLabels[p.status].split(' ')[0]}</span>
                      </div>

                      {contestProblems.map(prob => {
                        const isSolved = p.solvedProblemIds?.includes(prob._id) || false;
                        const isCurrent = p.currentProblemId?._id === prob._id || p.currentProblemId?.title === prob.title;

                        return (
                          <div key={prob._id} className="lb-col-center">
                            <div className={`prob-sphere ${isSolved ? 'solved' : isCurrent ? 'current' : 'unsolved'}`} />
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        }

        {/* Controls Tab */}
        {
          tab === 'controls' && (
            <div className="tab-content">
              <div className="section-header">
                <h2 className="section-title">Contest Controls</h2>
                <p className="section-sub">Manage the active contest session</p>
              </div>
              <div className="controls-grid">

                <div className="control-card">
                  <div className="control-label">Contest Status</div>
                  <div className={`big-status contest-${contestState}`}>
                    {contestState === ContestStatusEnum.running && <span className="pulse-dot large" />}
                    {contestState.toUpperCase()}
                  </div>
                  <div className="control-actions">
                    <button className={`btn ${contestState === ContestStatusEnum.running ? 'btn-pause' : 'btn-resume'}`} onClick={handlePause}>
                      {contestState === ContestStatusEnum.running ? 'Pause Contest' : 'Resume Contest'}
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
                    <button className="add-problem-btn" onClick={() => setShowTeamModal(true)} style={{ width: '100%' }}>+ Create Team</button>
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
          )
        }

      </main >

      {showTeamModal && (
        <div className="team-modal-overlay" style={{ zIndex: 1000, position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="team-modal" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px', fontSize: '1.5rem', color: '#fff' }}>Create New Team</h3>

            <div className="modal-input-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#858585', marginBottom: '8px' }}>Team Name <span className="req" style={{ color: 'red' }}>*</span></label>
              <input value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} placeholder="e.g. Lambda" style={{ width: '100%', padding: '12px', background: '#1e1e1e', border: '1px solid #3c3c3c', borderRadius: '8px', color: '#fff' }} />
            </div>

            <div className="modal-row" style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div className="modal-input-group" style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#858585', marginBottom: '8px' }}>Member 1 Name <span className="req" style={{ color: 'red' }}>*</span></label>
                <input value={teamForm.members[0].name} onChange={e => {
                  const newMembers = [...teamForm.members]
                  newMembers[0].name = e.target.value
                  setTeamForm({ ...teamForm, members: newMembers })
                }} style={{ width: '100%', padding: '12px', background: '#1e1e1e', border: '1px solid #3c3c3c', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div className="modal-input-group" style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#858585', marginBottom: '8px' }}>Enroll 1 <span className="req" style={{ color: 'red' }}>*</span></label>
                <input type="number" value={teamForm.members[0].enroll} onChange={e => {
                  const newMembers = [...teamForm.members]
                  newMembers[0].enroll = e.target.value
                  setTeamForm({ ...teamForm, members: newMembers })
                }} style={{ width: '100%', padding: '12px', background: '#1e1e1e', border: '1px solid #3c3c3c', borderRadius: '8px', color: '#fff' }} />
              </div>
            </div>

            <div className="modal-row" style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div className="modal-input-group" style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#858585', marginBottom: '8px' }}>Member 2 Name (Opt)</label>
                <input value={teamForm.members[1].name} onChange={e => {
                  const newMembers = [...teamForm.members]
                  newMembers[1].name = e.target.value
                  setTeamForm({ ...teamForm, members: newMembers })
                }} style={{ width: '100%', padding: '12px', background: '#1e1e1e', border: '1px solid #3c3c3c', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div className="modal-input-group" style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#858585', marginBottom: '8px' }}>Enroll 2 (Opt)</label>
                <input type="number" value={teamForm.members[1].enroll} onChange={e => {
                  const newMembers = [...teamForm.members]
                  newMembers[1].enroll = e.target.value
                  setTeamForm({ ...teamForm, members: newMembers })
                }} style={{ width: '100%', padding: '12px', background: '#1e1e1e', border: '1px solid #3c3c3c', borderRadius: '8px', color: '#fff' }} />
              </div>
            </div>

            <div className="modal-input-group row-align" style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '24px' }}>
              <div className="flex-1" style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#858585', marginBottom: '8px' }}>Password <span className="req" style={{ color: 'red' }}>*</span></label>
                <input value={teamForm.password} onChange={e => setTeamForm({ ...teamForm, password: e.target.value })} style={{ width: '100%', padding: '12px', background: '#1e1e1e', border: '1px solid #3c3c3c', borderRadius: '8px', color: '#fff' }} />
              </div>
              <button className="manual-add-btn pass-btn" onClick={generatePassword} style={{ padding: '12px 24px', background: '#2c3e50', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Generate</button>
            </div>

            {manualError && <div className="manual-add-error" style={{ color: '#ef4444', background: '#ef444420', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>{manualError}</div>}

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #3c3c3c', paddingTop: '24px' }}>
              <button className="lobby-back-btn" onClick={() => setShowTeamModal(false)} style={{ padding: '10px 20px', background: 'transparent', color: '#858585', border: '1px solid #3c3c3c', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button className="manual-add-btn" onClick={handleCreateTeam} style={{ padding: '10px 20px', background: '#10b981', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Save Team</button>
            </div>
          </div>
        </div>
      )}
    </div >
  )
}
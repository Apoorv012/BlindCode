import { useState } from 'react'
import './App.css'
import { useNavigate } from 'react-router-dom'

const mockParticipants = [
  { id: 1, name: 'Riya Sharma', status: 'coding', solved: 2, penalties: 1, timeLeft: '34:21', lastActive: '2s ago' },
  { id: 2, name: 'Arjun Mehta', status: 'idle', solved: 1, penalties: 3, timeLeft: '28:10', lastActive: '1m ago' },
  { id: 3, name: 'Sneha Patel', status: 'submitted', solved: 3, penalties: 0, timeLeft: '41:55', lastActive: '10s ago' },
  { id: 4, name: 'Karan Singh', status: 'coding', solved: 1, penalties: 2, timeLeft: '19:44', lastActive: '5s ago' },
  { id: 5, name: 'Priya Nair', status: 'offline', solved: 0, penalties: 5, timeLeft: '12:30', lastActive: '5m ago' },
  { id: 6, name: 'Dev Malhotra', status: 'coding', solved: 2, penalties: 1, timeLeft: '38:02', lastActive: '1s ago' },
  { id: 7, name: 'Ananya Roy', status: 'submitted', solved: 4, penalties: 0, timeLeft: '44:18', lastActive: '30s ago' },
  { id: 8, name: 'Vikram Joshi', status: 'idle', solved: 1, penalties: 4, timeLeft: '22:07', lastActive: '3m ago' },
]

const leaderboard = [...mockParticipants]
  .sort((a, b) => b.solved - a.solved || a.penalties - b.penalties)

type Tab = 'participants' | 'leaderboard' | 'controls'
type ContestState = 'idle' | 'running' | 'paused' | 'ended'

const statusColors: Record<string, string> = {
  coding: 'status-coding',
  idle: 'status-idle',
  submitted: 'status-submitted',
  offline: 'status-offline',
}

const statusLabels: Record<string, string> = {
  coding: '● Coding',
  idle: '○ Idle',
  submitted: '✓ Submitted',
  offline: '✕ Offline',
}

export default function App() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('participants')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [contestState, setContestState] = useState<ContestState>('idle')
  const [contestTime, setContestTime] = useState(90)
  const [selectedProblem, setSelectedProblem] = useState('Two Sum')

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const handleContest = () => {
    if (contestState === 'idle') setContestState('running')
    else if (contestState === 'running') setContestState('paused')
    else if (contestState === 'paused') setContestState('running')
    else if (contestState === 'ended') setContestState('idle')
  }

  const endContest = () => setContestState('ended')

  const contestBtnLabel = {
    idle: 'Start Contest',
    running: 'Pause Contest',
    paused: 'Resume Contest',
    ended: 'Reset',
  }[contestState]

  const contestBtnClass = {
    idle: 'btn-start',
    running: 'btn-pause',
    paused: 'btn-resume',
    ended: 'btn-reset',
  }[contestState]

  return (
    <div className={`app ${theme}`}>
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo-mark">BC</div>
          <button className="new-contest-btn" onClick={() => navigate('/results')}>
            Results
          </button>
          <button className="new-contest-btn" onClick={() => navigate('/contest/new')}>
            + New Contest
          </button>
          <button className="new-contest-btn" onClick={() => navigate('/problems')}>
            Problems
          </button>
          <div>
            <div className="logo-title">BlindCode</div>
            <div className="logo-sub">Admin Console</div>
          </div>
        </div>
        <div className="header-center">
          <div className={`contest-badge contest-${contestState}`}>
            {contestState === 'running' && <span className="pulse-dot" />}
            {contestState.toUpperCase()}
          </div>
        </div>
        <div className="header-right">
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <div className="admin-badge">ADMIN</div>
          <button className="logout-btn" onClick={() => {
            localStorage.removeItem('bc_admin_token')
            window.location.href = '/login'
          }}>
            Sign out
          </button>
        </div>
      </header>

      {/* Nav */}
      <nav className="nav">
        {(['participants', 'leaderboard', 'controls'] as Tab[]).map(t => (
          <button
            key={t}
            className={`nav-btn ${tab === t ? 'nav-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'participants' && '⊞ '}
            {t === 'leaderboard' && '⬡ '}
            {t === 'controls' && '⚙ '}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div className="nav-stats">
          <span className="stat-pill">{mockParticipants.filter(p => p.status === 'coding').length} coding</span>
          <span className="stat-pill submitted">{mockParticipants.filter(p => p.status === 'submitted').length} submitted</span>
          <span className="stat-pill offline">{mockParticipants.filter(p => p.status === 'offline').length} offline</span>
        </div>
      </nav>

      {/* Content */}
      <main className="main">

        {/* Participants Tab */}
        {tab === 'participants' && (
          <div className="tab-content">
            <div className="section-header">
              <h2 className="section-title">Participants <span className="count-badge">{mockParticipants.length}</span></h2>
              <p className="section-sub">Live monitoring — updates every 2s</p>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Solved</th>
                    <th>Penalties</th>
                    <th>Time Left</th>
                    <th>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {mockParticipants.map((p, i) => (
                    <tr key={p.id} className="table-row">
                      <td className="td-num">{i + 1}</td>
                      <td className="td-name">{p.name}</td>
                      <td><span className={`status-tag ${statusColors[p.status]}`}>{statusLabels[p.status]}</span></td>
                      <td className="td-solved">{p.solved}</td>
                      <td className="td-penalty">{p.penalties > 0 ? `−${p.penalties}` : '—'}</td>
                      <td className="td-time">{p.timeLeft}</td>
                      <td className="td-active">{p.lastActive}</td>
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
              <p className="section-sub">Ranked by problems solved, then fewest penalties</p>
            </div>
            <div className="leaderboard">
              {leaderboard.map((p, i) => (
                <div key={p.id} className={`lb-row ${i === 0 ? 'lb-first' : i === 1 ? 'lb-second' : i === 2 ? 'lb-third' : ''}`}>
                  <div className="lb-rank">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>
                  <div className="lb-name">{p.name}</div>
                  <div className="lb-bar-wrap">
                    <div className="lb-bar" style={{ width: `${(p.solved / 4) * 100}%` }} />
                  </div>
                  <div className="lb-solved">{p.solved} solved</div>
                  <div className="lb-penalties">{p.penalties > 0 ? `−${p.penalties} pen` : 'clean'}</div>
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
                  <button className={`btn ${contestBtnClass}`} onClick={handleContest}>
                    {contestBtnLabel}
                  </button>
                  {(contestState === 'running' || contestState === 'paused') && (
                    <button className="btn btn-end" onClick={endContest}>End Contest</button>
                  )}
                </div>
              </div>

              <div className="control-card">
                <div className="control-label">Contest Duration</div>
                <div className="duration-display">{contestTime} min</div>
                <div className="slider-wrap">
                  <input
                    type="range" min={15} max={180} step={15}
                    value={contestTime}
                    onChange={e => setContestTime(Number(e.target.value))}
                    disabled={contestState !== 'idle'}
                    className="slider"
                  />
                  <div className="slider-labels"><span>15m</span><span>180m</span></div>
                </div>
              </div>

              <div className="control-card">
                <div className="control-label">Active Problem</div>
                <div className="problem-display">{selectedProblem}</div>
                <div className="problem-list">
                  {['Two Sum', 'Reverse Linked List', 'Binary Search', 'Valid Parentheses', 'Merge Intervals'].map(prob => (
                    <button
                      key={prob}
                      className={`problem-btn ${selectedProblem === prob ? 'problem-active' : ''}`}
                      onClick={() => setSelectedProblem(prob)}
                      disabled={contestState === 'running'}
                    >
                      {prob}
                    </button>
                  ))}
                </div>
              </div>

              <div className="control-card">
                <div className="control-label">Quick Stats</div>
                <div className="stats-grid">
                  <div className="stat-box"><div className="stat-val">{mockParticipants.length}</div><div className="stat-key">Total</div></div>
                  <div className="stat-box"><div className="stat-val coding">{mockParticipants.filter(p => p.status === 'coding').length}</div><div className="stat-key">Coding</div></div>
                  <div className="stat-box"><div className="stat-val submitted">{mockParticipants.filter(p => p.status === 'submitted').length}</div><div className="stat-key">Submitted</div></div>
                  <div className="stat-box"><div className="stat-val offline">{mockParticipants.filter(p => p.status === 'offline').length}</div><div className="stat-key">Offline</div></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

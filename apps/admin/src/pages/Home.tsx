import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Home.css'
import { apiGetContests } from '../api'

type ContestStatus = 'running' | 'ended' | 'draft' | 'paused'

interface Contest {
  _id: string
  contestCode: string
  name: string
  status: ContestStatus
  duration: number
  createdAt: string
  problemIds: any[]
}

const statusLabel: Record<ContestStatus, string> = {
  running: '● Live',
  paused: '⏸ Paused',
  ended: 'Ended',
  draft: 'Draft',
}

export default function Home() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGetContests()
      .then(data => setContests(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleContestClick = (contest: Contest) => {
    if (contest.status === 'running' || contest.status === 'paused') {
      navigate(`/dashboard/${contest.contestCode}`)
    } else if (contest.status === 'ended') {
      navigate(`/results/${contest.contestCode}`)
    } else {
      navigate(`/contest/lobby/${contest.contestCode}`)
    }
  }

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopiedId(code)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const liveCount = contests.filter(c => c.status === 'running').length
  const endedCount = contests.filter(c => c.status === 'ended').length
  const totalParticipants = 0 // would need a separate aggregate endpoint

  return (
    <div className={`home ${theme}`}>
      <header className="home-header">
        <div className="home-header-left">
          <div className="logo-mark">BC</div>
          <div>
            <div className="logo-title">BlindCode</div>
            <div className="logo-sub">Admin Console</div>
          </div>
        </div>
        <div className="home-header-right">
          <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <div className="admin-badge">ADMIN</div>
          <button className="logout-btn" onClick={() => {
            localStorage.removeItem('bc_admin_token')
            navigate('/login')
          }}>
            Sign out
          </button>
        </div>
      </header>

      <main className="home-main">
        <div className="home-top">
          <div className="home-welcome">
            <h1 className="home-title">Welcome back, Admin</h1>
            <p className="home-subtitle">Manage your contests and problem bank</p>
          </div>
          <div className="home-actions">
            <button className="btn-secondary" onClick={() => navigate('/problems')}>
              Problem Bank
            </button>
            <button className="btn-primary" onClick={() => navigate('/contest/new')}>
              + New Contest
            </button>
          </div>
        </div>

        <div className="home-stats">
          <div className="stat-card">
            <div className="stat-number">{contests.length}</div>
            <div className="stat-label">Total Contests</div>
          </div>
          <div className="stat-card">
            <div className="stat-number running">{liveCount}</div>
            <div className="stat-label">Live Now</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{endedCount}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{totalParticipants}</div>
            <div className="stat-label">Total Participants</div>
          </div>
        </div>

        <div className="contests-section">
          <div className="contests-section-header">
            <h2 className="contests-section-title">Your Contests</h2>
          </div>

          {loading && <div className="empty-state"><div className="empty-text">Loading contests...</div></div>}
          {error && <div className="empty-state"><div className="empty-text" style={{ color: 'red' }}>{error}</div></div>}

          {!loading && !error && contests.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">⊞</div>
              <div className="empty-text">No contests yet</div>
              <div className="empty-sub">Create your first contest to get started</div>
              <button className="btn-primary" onClick={() => navigate('/contest/new')}>+ New Contest</button>
            </div>
          )}

          {!loading && contests.length > 0 && (
            <div className="contests-list">
              {contests.map(contest => (
                <div
                  key={contest._id}
                  className={`contest-card ${contest.status}`}
                  onClick={() => handleContestClick(contest)}
                >
                  <div className="contest-card-left">
                    <div className="contest-card-top">
                      <span className="contest-name">{contest.name}</span>
                      <span className={`contest-status-badge status-${contest.status}`}>
                        {statusLabel[contest.status]}
                      </span>
                    </div>
                    <div className="contest-card-meta">
                      <span className="meta-item">⏱ {contest.duration} min</span>
                      <span className="meta-item">⊞ {contest.problemIds?.length ?? 0} problems</span>
                      <button
                        className={`meta-item contest-code-btn ${copiedId === contest.contestCode ? 'code-copied' : ''}`}
                        onClick={e => handleCopyCode(e, contest.contestCode)}
                        title="Click to copy contest code"
                      >
                        {copiedId === contest.contestCode ? '✓ Copied' : `#${contest.contestCode}`}
                      </button>
                    </div>
                  </div>
                  <div className="contest-card-right">
                    <span className="contest-date">{new Date(contest.createdAt).toLocaleDateString()}</span>
                    {(contest.status === 'running' || contest.status === 'paused') && (
                      <span className="contest-action">View Live →</span>
                    )}
                    {contest.status === 'ended' && <span className="contest-action">View Results →</span>}
                    {contest.status === 'draft' && <span className="contest-action">Open Lobby →</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

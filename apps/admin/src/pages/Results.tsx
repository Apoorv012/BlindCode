import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Results.css'

// API: GET /contests/:id/results
// Returns: { contest: { id, name, duration, problem }, results: [{ rank, participant, solved, penalties, submittedAt, timeTaken }] }

const MOCK_CONTEST = {
  id: 1,
  name: 'Lab Assessment #1',
  problem: 'Two Sum',
  duration: 60,
  endedAt: '2026-03-10 02:30',
  totalParticipants: 8,
}

const MOCK_RESULTS = [
  { rank: 1, name: 'Ananya Roy', email: 'ananya@test.com', solved: 4, penalties: 0, timeTaken: '35:42', submittedAt: '02:05' },
  { rank: 2, name: 'Sneha Patel', email: 'sneha@test.com', solved: 3, penalties: 0, timeTaken: '38:15', submittedAt: '02:08' },
  { rank: 3, name: 'Riya Sharma', email: 'riya@test.com', solved: 2, penalties: 1, timeTaken: '25:38', submittedAt: '02:15' },
  { rank: 4, name: 'Dev Malhotra', email: 'dev@test.com', solved: 2, penalties: 1, timeTaken: '21:58', submittedAt: '02:21' },
  { rank: 5, name: 'Karan Singh', email: 'karan@test.com', solved: 1, penalties: 2, timeTaken: '40:16', submittedAt: '02:10' },
  { rank: 6, name: 'Arjun Mehta', email: 'arjun@test.com', solved: 1, penalties: 3, timeTaken: '31:50', submittedAt: '02:18' },
  { rank: 7, name: 'Vikram Joshi', email: 'vikram@test.com', solved: 1, penalties: 4, timeTaken: '37:53', submittedAt: '02:22' },
  { rank: 8, name: 'Priya Nair', email: 'priya@test.com', solved: 0, penalties: 5, timeTaken: '—', submittedAt: '—' },
]

const medalEmoji = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`

export default function Results() {
  const navigate = useNavigate()
  const [exported, setExported] = useState(false)

  const exportCSV = () => {
    const headers = ['Rank', 'Name', 'Email', 'Solved', 'Penalties', 'Time Taken', 'Submitted At']
    const rows = MOCK_RESULTS.map(r => [r.rank, r.name, r.email, r.solved, r.penalties, r.timeTaken, r.submittedAt])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${MOCK_CONTEST.name.replace(/\s+/g, '_')}_results.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 2000)
  }

  const topThree = MOCK_RESULTS.slice(0, 3)
  // const rest = MOCK_RESULTS.slice(3)

  return (
    <div className="results-page">
      <div className="results-bg"><div className="results-grid" /></div>

      <div className="results-container">
        {/* Header */}
        <div className="results-header">
          <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
          <div className="results-logo-wrap">
            <div className="results-logo-mark">BC</div>
            <div>
              <div className="results-title">Contest Results</div>
              <div className="results-sub">{MOCK_CONTEST.name}</div>
            </div>
          </div>
          <button className={`export-btn ${exported ? 'export-done' : ''}`} onClick={exportCSV}>
            {exported ? '✓ Exported!' : '↓ Export CSV'}
          </button>
        </div>

        {/* Contest summary */}
        <div className="contest-summary">
          <div className="summary-item">
            <div className="summary-label">Problem</div>
            <div className="summary-value">{MOCK_CONTEST.problem}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Duration</div>
            <div className="summary-value">{MOCK_CONTEST.duration} min</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Ended At</div>
            <div className="summary-value">{MOCK_CONTEST.endedAt}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Participants</div>
            <div className="summary-value">{MOCK_CONTEST.totalParticipants}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Submitted</div>
            <div className="summary-value highlight">{MOCK_RESULTS.filter(r => r.solved > 0).length}</div>
          </div>
        </div>

        {/* Podium - top 3 */}
        <div className="podium">
          {/* 2nd place */}
          <div className="podium-item podium-second">
            <div className="podium-medal">🥈</div>
            <div className="podium-name">{topThree[1]?.name}</div>
            <div className="podium-solved">{topThree[1]?.solved} solved</div>
            <div className="podium-bar podium-bar-2" />
          </div>
          {/* 1st place */}
          <div className="podium-item podium-first">
            <div className="podium-crown">👑</div>
            <div className="podium-medal">🥇</div>
            <div className="podium-name">{topThree[0]?.name}</div>
            <div className="podium-solved">{topThree[0]?.solved} solved</div>
            <div className="podium-bar podium-bar-1" />
          </div>
          {/* 3rd place */}
          <div className="podium-item podium-third">
            <div className="podium-medal">🥉</div>
            <div className="podium-name">{topThree[2]?.name}</div>
            <div className="podium-solved">{topThree[2]?.solved} solved</div>
            <div className="podium-bar podium-bar-3" />
          </div>
        </div>

        {/* Full results table */}
        <div className="results-table-wrap">
          <div className="results-table-header">
            <span className="table-section-title">Full Rankings</span>
          </div>
          <table className="results-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Participant</th>
                <th>Solved</th>
                <th>Penalties</th>
                <th>Time Taken</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_RESULTS.map(r => (
                <tr key={r.rank} className={`results-row ${r.rank <= 3 ? 'top-three' : ''}`}>
                  <td className="rank-cell">{medalEmoji(r.rank)}</td>
                  <td className="name-cell">
                    <div className="result-name">{r.name}</div>
                    <div className="result-email">{r.email}</div>
                  </td>
                  <td className="solved-cell">{r.solved > 0 ? <span className="solved-val">{r.solved}</span> : <span className="zero-val">0</span>}</td>
                  <td className="penalty-cell">{r.penalties > 0 ? <span className="penalty-val">−{r.penalties}</span> : <span className="clean-val">clean</span>}</td>
                  <td className="time-cell">{r.timeTaken}</td>
                  <td className="submitted-cell">{r.submittedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

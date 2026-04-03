import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './Results.css'
import { apiGetResults } from '../api'

type Difficulty = 'Easy' | 'Medium' | 'Hard'

const WRONG_PENALTY = 15
const REVEAL_PENALTY = 5
const SCORE_MAP: Record<Difficulty, number> = { Easy: 100, Medium: 200, Hard: 300 }

interface ProblemResult {
  problemId: string
  title: string
  difficulty: Difficulty
  solved: boolean
  reveals: number
  wrongSubmissions: number
  net: number
}

interface Result {
  rank: number
  name: string
  totalScore: number
  totalReveals: number
  totalWrong: number
  status: string
  problemResults: ProblemResult[]
}

interface ContestInfo {
  id: string
  name: string
  duration: number
  endedAt: string
  totalParticipants: number
  problems: { id: string; title: string; difficulty: Difficulty }[]
}

const medalEmoji = (rank: number) =>
  rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`

export default function Results() {
  const { contestId } = useParams()
  const navigate = useNavigate()
  const [contest, setContest] = useState<ContestInfo | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exported, setExported] = useState(false)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  useEffect(() => {
    if (!contestId) return
    apiGetResults(contestId)
      .then(data => {
        setContest(data.contest)
        setResults(data.results)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [contestId])

  const exportCSV = () => {
    if (!contest) return
    const headers = ['Rank', 'Name', 'Total Score', 'Total Reveals', 'Total Wrong']
    const rows = results.map(r => [r.rank, r.name, r.totalScore, r.totalReveals, r.totalWrong])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${contest.name.replace(/\s+/g, '_')}_results.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 2000)
  }

  const topThree = results.slice(0, 3)

  if (loading) return <div className="results-page"><div style={{ padding: 40, textAlign: 'center' }}>Loading results...</div></div>
  if (error) return <div className="results-page"><div style={{ padding: 40, textAlign: 'center', color: 'red' }}>{error}</div></div>

  return (
    <div className="results-page">
      <div className="results-bg"><div className="results-grid" /></div>

      <div className="results-container">
        <div className="results-header">
          <button className="back-btn" onClick={() => navigate('/')}>← Home</button>
          <div className="results-logo-wrap">
            <div className="results-logo-mark">BC</div>
            <div>
              <div className="results-title">Contest Results</div>
              <div className="results-sub">{contest?.name} — #{contestId}</div>
            </div>
          </div>
          <button className={`export-btn ${exported ? 'export-done' : ''}`} onClick={exportCSV}>
            {exported ? '✓ Exported!' : '↓ Export CSV'}
          </button>
        </div>

        {contest && (
          <div className="contest-summary">
            <div className="summary-item">
              <div className="summary-label">Duration</div>
              <div className="summary-value">{contest.duration} min</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Ended At</div>
              <div className="summary-value">
                {contest.endedAt ? new Date(contest.endedAt).toLocaleString() : '—'}
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Participants</div>
              <div className="summary-value">{contest.totalParticipants}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Submitted</div>
              <div className="summary-value highlight">{results.filter(r => r.totalScore > 0).length}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Problems</div>
              <div className="summary-value">{contest.problems.length}</div>
            </div>
          </div>
        )}

        <div className="scoring-legend">
          <span className="legend-label">Scoring:</span>
          <span className="legend-item easy">Easy +100</span>
          <span className="legend-item medium">Medium +200</span>
          <span className="legend-item hard">Hard +300</span>
          <span className="legend-sep">|</span>
          <span className="legend-item penalty">Wrong −15</span>
          <span className="legend-item penalty">Reveal −2</span>
        </div>

        {topThree.length >= 2 && (
          <div className="podium">
            <div className="podium-item podium-second">
              <div className="podium-medal">🥈</div>
              <div className="podium-name">{topThree[1]?.name}</div>
              <div className="podium-score">{topThree[1]?.totalScore} pts</div>
              <div className="podium-bar podium-bar-2" />
            </div>
            <div className="podium-item podium-first">
              <div className="podium-crown">👑</div>
              <div className="podium-medal">🥇</div>
              <div className="podium-name">{topThree[0]?.name}</div>
              <div className="podium-score">{topThree[0]?.totalScore} pts</div>
              <div className="podium-bar podium-bar-1" />
            </div>
            {topThree[2] && (
              <div className="podium-item podium-third">
                <div className="podium-medal">🥉</div>
                <div className="podium-name">{topThree[2]?.name}</div>
                <div className="podium-score">{topThree[2]?.totalScore} pts</div>
                <div className="podium-bar podium-bar-3" />
              </div>
            )}
          </div>
        )}

        <div className="results-table-wrap">
          <div className="results-table-header">
            <span className="table-section-title">Full Rankings</span>
            <span className="table-section-hint">Click a row to see score breakdown</span>
          </div>
          <table className="results-table">
            <thead>
              <tr>
                <th>Rank</th><th>Participant</th><th>Score</th>
                <th>Reveals</th><th>Wrong</th><th>Solved</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', opacity: 0.5 }}>No results yet</td></tr>
              )}
              {results.map(r => (
                <>
                  <tr
                    key={r.rank}
                    className={`results-row ${r.rank <= 3 ? 'top-three' : ''} ${expandedRow === r.rank ? 'row-expanded' : ''}`}
                    onClick={() => setExpandedRow(expandedRow === r.rank ? null : r.rank)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="rank-cell">{medalEmoji(r.rank)}</td>
                    <td className="name-cell">
                      <div className="result-name">{r.name}</div>
                    </td>
                    <td className="score-cell">
                      <span className="score-val">{r.totalScore}</span>
                      <span className="score-unit"> pts</span>
                    </td>
                    <td className="reveal-cell">
                      {r.totalReveals > 0
                        ? <span className="reveal-val">−{r.totalReveals * REVEAL_PENALTY} ({r.totalReveals}×)</span>
                        : <span className="clean-val">—</span>}
                    </td>
                    <td className="penalty-cell">
                      {r.totalWrong > 0
                        ? <span className="penalty-val">−{r.totalWrong * WRONG_PENALTY} ({r.totalWrong}×)</span>
                        : <span className="clean-val">—</span>}
                    </td>
                    <td className="solved-cell">
                      <span className="solved-val">{r.problemResults.filter(p => p.solved).length}</span>
                      <span className="solved-total"> / {contest?.problems.length ?? '?'}</span>
                    </td>
                  </tr>

                  {expandedRow === r.rank && (
                    <tr key={`${r.rank}-bd`} className="breakdown-row">
                      <td colSpan={6}>
                        <div className="breakdown-wrap">
                          <div className="breakdown-title">Score Breakdown</div>
                          <div className="breakdown-problems">
                            {r.problemResults.map(p => (
                              <div key={p.problemId} className="breakdown-problem">
                                <div className="breakdown-problem-name">{p.title}</div>
                                <span className={`breakdown-diff diff-${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                                <div className="breakdown-math">
                                  <span className={p.solved ? 'bd-base' : 'bd-unsolved'}>
                                    {p.solved ? `+${SCORE_MAP[p.difficulty]}` : '0'}
                                  </span>
                                  {p.wrongSubmissions > 0 && <span className="bd-penalty">−{p.wrongSubmissions * WRONG_PENALTY} ({p.wrongSubmissions} wrong)</span>}
                                  {p.reveals > 0 && <span className="bd-reveal">−{p.reveals * REVEAL_PENALTY} ({p.reveals} reveal{p.reveals > 1 ? 's' : ''})</span>}
                                  <span className="bd-net">{p.net} pts</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import './ContestLobby.css'
import { apiGetContest, apiGetParticipants, apiAddParticipant, apiStartContest } from '../api'

interface Participant {
  _id: string
  name: string
  joinedAt: string
}

export default function ContestLobby() {
  const { contestId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // Passed from ContestCreate as a fallback while we fetch from API
  const nav = location.state as { name: string; duration: number; problems: string[] } | null

  const [contest, setContest] = useState({
    name: nav?.name || '',
    duration: nav?.duration || 60,
    problems: nav?.problems || [] as string[],
  })
  const [participants, setParticipants] = useState<Participant[]>([])
  const [copied, setCopied] = useState(false)
  const [starting, setStarting] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualError, setManualError] = useState('')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch contest details if not passed via nav state
  useEffect(() => {
    if (!nav?.name && contestId) {
      apiGetContest(contestId).then(data => {
        setContest({
          name: data.name,
          duration: data.duration,
          problems: data.problemIds?.map((p: any) => p.title || p) || []
        })
      }).catch(console.error)
    }
  }, [contestId])

  // Poll participants every 2s
  useEffect(() => {
    const fetchParticipants = () => {
      if (!contestId) return
      apiGetParticipants(contestId)
        .then(data => setParticipants(data))
        .catch(console.error)
    }

    fetchParticipants() // immediate first fetch
    pollRef.current = setInterval(fetchParticipants, 2000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [contestId])

  const handleCopy = () => {
    navigator.clipboard.writeText(contestId || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleManualAdd = async () => {
    const name = manualName.trim()
    if (!name) return
    setManualError('')
    try {
      await apiAddParticipant(contestId!, name, true)
      setManualName('')
      // Participants will update on next poll
    } catch (err: any) {
      setManualError(err.message || 'Failed to add participant')
    }
  }

  const handleStart = async () => {
    setStarting(true)
    try {
      await apiStartContest(contestId!)
      navigate(`/dashboard/${contestId}`, {
        state: { name: contest.name, duration: contest.duration, problems: contest.problems }
      })
    } catch (err: any) {
      console.error(err)
      setStarting(false)
    }
  }

  const formatJoinedAt = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    return `${Math.floor(diff / 60)}m ago`
  }

  return (
    <div className="lobby-page">
      <header className="lobby-header">
        <div className="lobby-header-left">
          <button className="lobby-back-btn" onClick={() => navigate('/')}>← Home</button>
          <div className="lobby-logo-mark">BC</div>
          <div>
            <div className="lobby-logo-title">{contest.name || 'Loading...'}</div>
            <div className="lobby-logo-sub">Waiting for participants</div>
          </div>
        </div>
        <div className="lobby-header-right">
          <span className="lobby-meta-item">⏱ {contest.duration} min</span>
          <span className="lobby-meta-item">⊞ {contest.problems.length} problems</span>
        </div>
      </header>

      <main className="lobby-main">
        <div className="lobby-layout">

          <div className="lobby-code-panel">
            <div className="lobby-code-label">Contest Code</div>
            <div className="lobby-code">{contestId}</div>
            <div className="lobby-code-sub">
              Participants enter this code on their desktop app to join
            </div>
            <button className="lobby-copy-btn" onClick={handleCopy}>
              {copied ? '✓ Copied!' : 'Copy Code'}
            </button>

            <div className="lobby-divider" />

            <div className="lobby-problems-label">Problems in this contest</div>
            <div className="lobby-problems-list">
              {contest.problems.map((p, i) => (
                <div key={i} className="lobby-problem-item">
                  <span className="lobby-problem-num">{i + 1}</span>
                  <span className="lobby-problem-name">{p}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lobby-participants-panel">
            <div className="lobby-participants-header">
              <div className="lobby-participants-title">Participants Joined</div>
              <div className="lobby-count">
                <span className="lobby-count-num">{participants.length}</span>
                <span className="lobby-count-pulse" />
              </div>
            </div>

            <div className="lobby-participants-list">
              {participants.length === 0 ? (
                <div className="lobby-waiting">
                  <div className="lobby-waiting-dots">
                    <span /><span /><span />
                  </div>
                  <div className="lobby-waiting-text">Waiting for participants to join...</div>
                </div>
              ) : (
                participants.map((p, i) => (
                  <div key={p._id} className="lobby-participant-row lobby-participant-enter">
                    <span className="lobby-participant-num">{i + 1}</span>
                    <span className="lobby-participant-name">{p.name}</span>
                    <span className="lobby-participant-time">{formatJoinedAt(p.joinedAt)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="lobby-start-wrap">
              <div className="manual-add-wrap">
                <input
                  className="manual-add-input"
                  placeholder="Add participant manually..."
                  value={manualName}
                  onChange={e => { setManualName(e.target.value); setManualError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
                />
                <button className="manual-add-btn" onClick={handleManualAdd}>+ Add</button>
              </div>
              {manualError && <div className="manual-add-error">{manualError}</div>}

              <button
                className={`lobby-start-btn ${participants.length === 0 ? 'lobby-start-disabled' : ''}`}
                onClick={handleStart}
                disabled={participants.length === 0 || starting}
              >
                {starting
                  ? <span className="lobby-spinner" />
                  : <>Start Contest <span className="lobby-start-arrow">→</span></>
                }
              </button>
              <div className="lobby-start-hint">
                {participants.length === 0
                  ? 'Waiting for at least one participant'
                  : `${participants.length} participant${participants.length > 1 ? 's' : ''} ready`}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

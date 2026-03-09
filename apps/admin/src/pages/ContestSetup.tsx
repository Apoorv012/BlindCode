import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './ContestSetup.css'

// API: POST /contests
// Body: { name, duration, problemId, participants: [{ name, email }] }
// Returns: { contest: { id, name, duration, problem, participants } }

const MOCK_PROBLEMS = [
  { id: 1, title: 'Two Sum', difficulty: 'Easy', tags: ['Array', 'Hash Map'] },
  { id: 2, title: 'Reverse Linked List', difficulty: 'Easy', tags: ['Linked List'] },
  { id: 3, title: 'Binary Search', difficulty: 'Easy', tags: ['Array', 'Binary Search'] },
  { id: 4, title: 'Valid Parentheses', difficulty: 'Medium', tags: ['Stack', 'String'] },
  { id: 5, title: 'Merge Intervals', difficulty: 'Medium', tags: ['Array', 'Sorting'] },
  { id: 6, title: 'LRU Cache', difficulty: 'Hard', tags: ['Hash Map', 'Linked List'] },
]

type Participant = { id: number; name: string; email: string }
type Problem = typeof MOCK_PROBLEMS[0]

const diffColor: Record<string, string> = {
  Easy: 'diff-easy',
  Medium: 'diff-medium',
  Hard: 'diff-hard',
}

export default function ContestSetup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [contestName, setContestName] = useState('')
  const [duration, setDuration] = useState(60)
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [addError, setAddError] = useState('')
  const [creating, setCreating] = useState(false)

  const addParticipant = () => {
    setAddError('')
    if (!newName.trim()) { setAddError('Name is required'); return }
    if (!newEmail.trim() || !newEmail.includes('@')) { setAddError('Valid email is required'); return }
    if (participants.find(p => p.email === newEmail)) { setAddError('Email already added'); return }
    setParticipants(prev => [...prev, { id: Date.now(), name: newName.trim(), email: newEmail.trim() }])
    setNewName('')
    setNewEmail('')
  }

  const removeParticipant = (id: number) => {
    setParticipants(prev => prev.filter(p => p.id !== id))
  }

  const canProceed = () => {
    if (step === 1) return contestName.trim().length > 0
    if (step === 2) return selectedProblem !== null
    if (step === 3) return participants.length > 0
    return false
  }

  const handleCreate = async () => {
    setCreating(true)
    await new Promise(r => setTimeout(r, 1000))
    // TODO: Replace with real API call
    // await fetch('/api/contests', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('bc_admin_token')}` },
    //   body: JSON.stringify({ name: contestName, duration, problemId: selectedProblem?.id, participants })
    // })
    setCreating(false)
    navigate('/')
  }

  return (
    <div className="setup-page">
      {/* Background */}
      <div className="setup-bg"><div className="setup-grid" /></div>

      <div className="setup-container">
        {/* Header */}
        <div className="setup-header">
          <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
          <div className="setup-logo">
            <div className="setup-logo-mark">BC</div>
            <span className="setup-logo-text">New Contest</span>
          </div>
        </div>

        {/* Stepper */}
        <div className="stepper">
          {['Details', 'Problem', 'Participants', 'Review'].map((label, i) => (
            <div key={label} className="step-item">
              <div className={`step-circle ${step > i + 1 ? 'step-done' : step === i + 1 ? 'step-active' : ''}`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <div className={`step-label ${step === i + 1 ? 'step-label-active' : ''}`}>{label}</div>
              {i < 3 && <div className={`step-line ${step > i + 1 ? 'step-line-done' : ''}`} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="setup-card">

          {/* Step 1: Details */}
          {step === 1 && (
            <div className="step-content">
              <h2 className="step-title">Contest Details</h2>
              <p className="step-sub">Give your contest a name and set the duration</p>

              <div className="field">
                <label className="field-label">Contest Name</label>
                <input
                  className="field-input"
                  placeholder="e.g. Lab Assessment #3"
                  value={contestName}
                  onChange={e => setContestName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="field">
                <label className="field-label">Duration — <span className="field-value">{duration} minutes</span></label>
                <input
                  type="range" min={15} max={180} step={15}
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="setup-slider"
                />
                <div className="slider-ticks">
                  {[15, 30, 45, 60, 90, 120, 150, 180].map(v => (
                    <span key={v} className={duration === v ? 'tick-active' : ''}>{v}m</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Problem */}
          {step === 2 && (
            <div className="step-content">
              <h2 className="step-title">Select Problem</h2>
              <p className="step-sub">Choose one problem for this contest</p>
              <div className="problem-grid">
                {MOCK_PROBLEMS.map(p => (
                  <div
                    key={p.id}
                    className={`problem-card ${selectedProblem?.id === p.id ? 'problem-selected' : ''}`}
                    onClick={() => setSelectedProblem(p)}
                  >
                    <div className="problem-card-top">
                      <span className="problem-card-title">{p.title}</span>
                      <span className={`diff-badge ${diffColor[p.difficulty]}`}>{p.difficulty}</span>
                    </div>
                    <div className="problem-tags">
                      {p.tags.map(t => <span key={t} className="tag">{t}</span>)}
                    </div>
                    {selectedProblem?.id === p.id && <div className="problem-check">✓</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Participants */}
          {step === 3 && (
            <div className="step-content">
              <h2 className="step-title">Add Participants</h2>
              <p className="step-sub">Register participants for this contest</p>

              <div className="add-participant">
                <input
                  className="field-input"
                  placeholder="Full name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addParticipant()}
                />
                <input
                  className="field-input"
                  placeholder="Email address"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addParticipant()}
                />
                <button className="add-btn" onClick={addParticipant}>Add</button>
              </div>
              {addError && <div className="add-error">⚠ {addError}</div>}

              <div className="participants-list">
                {participants.length === 0 && (
                  <div className="empty-state">No participants added yet</div>
                )}
                {participants.map((p, i) => (
                  <div key={p.id} className="participant-row">
                    <div className="p-num">{i + 1}</div>
                    <div className="p-info">
                      <div className="p-name">{p.name}</div>
                      <div className="p-email">{p.email}</div>
                    </div>
                    <button className="remove-btn" onClick={() => removeParticipant(p.id)}>✕</button>
                  </div>
                ))}
              </div>
              {participants.length > 0 && (
                <div className="participant-count">{participants.length} participant{participants.length > 1 ? 's' : ''} added</div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="step-content">
              <h2 className="step-title">Review & Create</h2>
              <p className="step-sub">Confirm everything looks good before creating</p>

              <div className="review-grid">
                <div className="review-item">
                  <div className="review-label">Contest Name</div>
                  <div className="review-value">{contestName}</div>
                </div>
                <div className="review-item">
                  <div className="review-label">Duration</div>
                  <div className="review-value">{duration} minutes</div>
                </div>
                <div className="review-item">
                  <div className="review-label">Problem</div>
                  <div className="review-value">
                    {selectedProblem?.title}
                    <span className={`diff-badge ${diffColor[selectedProblem?.difficulty || 'Easy']}`}>
                      {selectedProblem?.difficulty}
                    </span>
                  </div>
                </div>
                <div className="review-item">
                  <div className="review-label">Participants</div>
                  <div className="review-value">{participants.length} registered</div>
                </div>
              </div>

              <div className="review-participants">
                {participants.map((p, i) => (
                  <div key={p.id} className="review-p-row">
                    <span className="review-p-num">{i + 1}</span>
                    <span className="review-p-name">{p.name}</span>
                    <span className="review-p-email">{p.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="step-nav">
            {step > 1 && (
              <button className="nav-back-btn" onClick={() => setStep(s => s - 1)}>← Back</button>
            )}
            <div style={{ flex: 1 }} />
            {step < 4 ? (
              <button
                className={`nav-next-btn ${!canProceed() ? 'btn-disabled' : ''}`}
                onClick={() => canProceed() && setStep(s => s + 1)}
                disabled={!canProceed()}
              >
                Continue →
              </button>
            ) : (
              <button
                className={`nav-create-btn ${creating ? 'btn-loading' : ''}`}
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? <span className="creating-spinner" /> : '🚀 Create Contest'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

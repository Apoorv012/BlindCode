import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './ContestCreate.css'
import { apiGetProblems, apiCreateContest } from '../api'

type Difficulty = 'Easy' | 'Medium' | 'Hard'

interface Problem {
  _id: string
  code: string
  title: string
  difficulty: Difficulty
  tags: string[]
  createdAt: string
}

const diffColor: Record<Difficulty, string> = {
  Easy: 'diff-easy',
  Medium: 'diff-medium',
  Hard: 'diff-hard',
}

const DURATIONS = [15, 30, 45, 60, 90, 120, 180]
type Step = 1 | 2

export default function ContestCreate() {
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>(1)
  const [name, setName] = useState('')
  const [duration, setDuration] = useState(60)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDiff, setFilterDiff] = useState<string>('All')
  const [creating, setCreating] = useState(false)
  const [problems, setProblems] = useState<Problem[]>([])
  const [loadingProblems, setLoadingProblems] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGetProblems()
      .then(data => setProblems(data))
      .catch(err => setError(err.message))
      .finally(() => setLoadingProblems(false))
  }, [])

  const toggleProblem = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const filtered = problems.filter(p => {
    const matchSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchDiff = filterDiff === 'All' || p.difficulty === filterDiff
    return matchSearch && matchDiff
  })

  const selectedProblems = problems.filter(p => selectedIds.includes(p._id))

  const handleCreate = async () => {
    if (!name.trim() || selectedIds.length === 0) return
    setCreating(true)
    setError('')
    try {
      const contest = await apiCreateContest({
        name,
        duration,
        problemIds: selectedIds
      })
      navigate(`/contest/lobby/${contest.contestCode}`, {
        state: {
          name,
          duration,
          problems: selectedProblems.map(p => p.title)
        }
      })
    } catch (err: any) {
      setError(err.message || 'Failed to create contest')
      setCreating(false)
    }
  }

  const canProceed = name.trim().length > 0
  const canCreate = selectedIds.length > 0

  return (
    <div className="cc-page">
      <header className="cc-header">
        <div className="cc-header-left">
          <button className="cc-back-btn" onClick={() => step === 1 ? navigate('/') : setStep(1)}>
            ← {step === 1 ? 'Home' : 'Back'}
          </button>
          <div className="cc-logo-mark">BC</div>
          <div>
            <div className="cc-logo-title">New Contest</div>
            <div className="cc-logo-sub">Step {step} of 2</div>
          </div>
        </div>

        <div className="cc-steps">
          <div className={`cc-step ${step >= 1 ? 'cc-step-active' : ''}`}>
            <div className="cc-step-num">1</div>
            <div className="cc-step-label">Details</div>
          </div>
          <div className={`cc-step-line ${step >= 2 ? 'cc-step-line-active' : ''}`} />
          <div className={`cc-step ${step >= 2 ? 'cc-step-active' : ''}`}>
            <div className="cc-step-num">2</div>
            <div className="cc-step-label">Problems</div>
          </div>
        </div>

        <div style={{ width: '140px' }} />
      </header>

      <main className="cc-main">
        {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: 12 }}>{error}</div>}

        {step === 1 && (
          <div className="cc-card">
            <div className="cc-card-title">Contest Details</div>
            <div className="cc-card-sub">Name your contest and set the duration</div>

            <div className="cc-field">
              <label className="cc-label">Contest Name *</label>
              <input
                className="cc-input"
                placeholder="e.g. Lab Assessment #3"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="cc-field">
              <label className="cc-label">Duration</label>
              <div className="cc-duration-display">{duration} min</div>
              <div className="cc-duration-pills">
                {DURATIONS.map(d => (
                  <button
                    key={d}
                    className={`cc-duration-pill ${duration === d ? 'cc-duration-active' : ''}`}
                    onClick={() => setDuration(d)}
                  >
                    {d}m
                  </button>
                ))}
              </div>
              <input
                type="range" min={15} max={180} step={15}
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="cc-slider"
              />
              <div className="cc-slider-labels">
                <span>15 min</span><span>180 min</span>
              </div>
            </div>

            <div className="cc-actions">
              <button
                className={`cc-btn-primary ${!canProceed ? 'cc-btn-disabled' : ''}`}
                onClick={() => canProceed && setStep(2)}
                disabled={!canProceed}
              >
                Next: Pick Problems →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="cc-step2-layout">
            <div className="cc-problems-panel">
              <div className="cc-panel-header">
                <div className="cc-panel-title">Problem Bank</div>
                <button className="cc-add-problem-link" onClick={() => navigate('/problems')}>
                  + Add new problem
                </button>
              </div>

              <div className="cc-filters">
                <input
                  className="cc-search"
                  placeholder="Search by title, tag or code..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <div className="cc-diff-filters">
                  {['All', 'Easy', 'Medium', 'Hard'].map(d => (
                    <button
                      key={d}
                      className={`cc-diff-btn ${filterDiff === d ? 'cc-diff-active' : ''}`}
                      onClick={() => setFilterDiff(d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="cc-problem-list">
                {loadingProblems && <div style={{ padding: 16, opacity: 0.5 }}>Loading problems...</div>}
                {!loadingProblems && filtered.length === 0 && (
                  <div style={{ padding: 16, opacity: 0.5 }}>
                    No problems found. <button className="cc-add-problem-link" onClick={() => navigate('/problems')}>Add some first →</button>
                  </div>
                )}
                {filtered.map(p => {
                  const isSelected = selectedIds.includes(p._id)
                  return (
                    <div
                      key={p._id}
                      className={`cc-problem-row ${isSelected ? 'cc-problem-selected' : ''}`}
                      onClick={() => toggleProblem(p._id)}
                    >
                      <div className={`cc-checkbox ${isSelected ? 'cc-checkbox-checked' : ''}`}>
                        {isSelected && '✓'}
                      </div>
                      <div className="cc-problem-info">
                        <div className="cc-problem-title-row">
                          <span className="cc-problem-title">{p.title}</span>
                          <span className="cc-problem-code">{p.code}</span>
                        </div>
                        <div className="cc-problem-tags">
                          {p.tags.map(t => <span key={t} className="cc-tag">{t}</span>)}
                        </div>
                      </div>
                      <span className={`cc-diff-badge ${diffColor[p.difficulty]}`}>
                        {p.difficulty}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="cc-summary-panel">
              <div className="cc-summary-title">Contest Summary</div>

              <div className="cc-summary-field">
                <div className="cc-summary-label">Name</div>
                <div className="cc-summary-val">{name}</div>
              </div>

              <div className="cc-summary-field">
                <div className="cc-summary-label">Duration</div>
                <div className="cc-summary-val">{duration} minutes</div>
              </div>

              <div className="cc-summary-field">
                <div className="cc-summary-label">
                  Problems Selected
                  <span className="cc-summary-count">{selectedIds.length}</span>
                </div>
                <div className="cc-selected-problems">
                  {selectedProblems.length === 0 ? (
                    <div className="cc-no-problems">No problems selected yet</div>
                  ) : (
                    selectedProblems.map((p, i) => (
                      <div key={p._id} className="cc-selected-row">
                        <span className="cc-selected-num">{i + 1}</span>
                        <span className="cc-selected-name">{p.title}</span>
                        <span className={`cc-diff-badge ${diffColor[p.difficulty]}`}>{p.difficulty}</span>
                        <button className="cc-remove-btn" onClick={() => toggleProblem(p._id)}>✕</button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                className={`cc-btn-primary cc-btn-full ${!canCreate || creating ? 'cc-btn-disabled' : ''}`}
                onClick={handleCreate}
                disabled={!canCreate || creating}
              >
                {creating ? <span className="cc-spinner" /> : 'Create Contest →'}
              </button>

              {!canCreate && (
                <div className="cc-hint">Select at least one problem to continue</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

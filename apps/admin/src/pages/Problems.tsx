import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Problems.css'
import { apiGetProblems, apiCreateProblem, apiUpdateProblem, apiDeleteProblem } from '../api'

type TestCase = { input: string; expected: string; explanation: string; hidden: boolean }
type Problem = {
  _id: string
  code: string
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  points?: number
  timeLimit?: number
  tags: string[]
  description: string
  inputFormat: string
  outputFormat: string
  constraints: string
  testCases: TestCase[]
  createdAt: string
}

type FormState = {
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  points: number
  timeLimit: number
  tags: string[]
  description: string
  inputFormat: string
  outputFormat: string
  constraints: string
  testCases: { input: string; expected: string; explanation: string; hidden: boolean }[]
}

const EMPTY_FORM: FormState = {
  title: '', difficulty: 'Easy', points: 100, timeLimit: 300, tags: [],
  description: '', inputFormat: '', outputFormat: '',
  constraints: '', testCases: [{ input: '', expected: '', explanation: '', hidden: false }],
}

const diffColor: Record<string, string> = {
  Easy: 'diff-easy', Medium: 'diff-medium', Hard: 'diff-hard',
}

type View = 'list' | 'add' | 'edit' | 'detail'

export default function Problems() {
  const navigate = useNavigate()
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')
  const [selected, setSelected] = useState<Problem | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [tagInput, setTagInput] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDiff, setFilterDiff] = useState<string>('All')
  const [codeCopied, setCodeCopied] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProblems()
  }, [])

  const fetchProblems = () => {
    setLoading(true)
    apiGetProblems()
      .then(data => setProblems(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, testCases: [{ input: '', expected: '', explanation: '', hidden: false }] })
    setTagInput('')
    setError('')
    setView('add')
  }

  const openEdit = (p: Problem) => {
    setSelected(p)
    setForm({
      title: p.title, difficulty: p.difficulty as 'Easy' | 'Medium' | 'Hard',
      points: p.points ?? 100, timeLimit: p.timeLimit ?? 300, tags: [...p.tags],
      description: p.description, inputFormat: p.inputFormat,
      outputFormat: p.outputFormat, constraints: p.constraints,
      testCases: p.testCases.map(t => ({ ...t }))
    })
    setTagInput('')
    setError('')
    setView('edit')
  }

  const openDetail = (p: Problem) => { setSelected(p); setView('detail') }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] }))
    setTagInput('')
  }
  const removeTag = (tag: string) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))
  const addTestCase = () => setForm(f => ({ ...f, testCases: [...f.testCases, { input: '', expected: '', explanation: '', hidden: false }] }))
  const removeTestCase = (i: number) => {
    const remaining = form.testCases.filter((_, idx) => idx !== i)
    const visibleCount = remaining.filter(tc => !tc.hidden).length
    if (visibleCount === 0) { setError('At least one visible test case is required.'); return }
    setError('')
    setForm(f => ({ ...f, testCases: f.testCases.filter((_, idx) => idx !== i) }))
  }
  const updateTestCase = (i: number, field: keyof TestCase, value: string | boolean) => {
    setForm(f => ({ ...f, testCases: f.testCases.map((tc, idx) => idx === i ? { ...tc, [field]: value } : tc) }))
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    setError('')
    try {
      if (view === 'add') {
        const newP = await apiCreateProblem(form)
        setProblems(p => [...p, newP])
      } else if (view === 'edit' && selected) {
        const updated = await apiUpdateProblem(selected._id, form)
        setProblems(p => p.map(prob => prob._id === selected._id ? updated : prob))
      }
      setView('list')
    } catch (err: any) {
      setError(err.message || 'Failed to save problem')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiDeleteProblem(id)
      setProblems(p => p.filter(prob => prob._id !== id))
      setDeleteConfirm(null)
      if (view === 'detail') setView('list')
    } catch (err: any) {
      setError(err.message || 'Failed to delete problem')
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCodeCopied(code)
    setTimeout(() => setCodeCopied(null), 2000)
  }

  const filtered = problems.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchDiff = filterDiff === 'All' || p.difficulty === filterDiff
    return matchSearch && matchDiff
  })

  const canSave = form.title.trim() && form.description.trim() && form.testCases.length > 0
    && form.testCases.some(tc => !tc.hidden)

  return (
    <div className="problems-page">
      <div className="problems-bg"><div className="problems-grid" /></div>

      <div className="problems-container">
        <div className="problems-header">
          <button className="back-btn" onClick={() => view === 'list' ? navigate(-1) : setView('list')}>
            ← {view === 'list' ? 'Back' : 'All Problems'}
          </button>
          <div className="problems-title-wrap">
            <div className="problems-logo-mark">BC</div>
            <div>
              <div className="problems-title">Problem Bank</div>
              <div className="problems-sub">Manage coding problems</div>
            </div>
          </div>
          {view === 'list' && (
            <button className="add-problem-btn" onClick={openAdd}>+ Add Problem</button>
          )}
        </div>

        {error && <div style={{ color: 'red', textAlign: 'center', margin: '12px 0' }}>{error}</div>}

        {/* LIST VIEW */}
        {view === 'list' && (
          <div className="list-view">
            <div className="list-filters">
              <input
                className="search-input"
                placeholder="Search by title, tag or code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <div className="diff-filters">
                {['All', 'Easy', 'Medium', 'Hard'].map(d => (
                  <button
                    key={d}
                    className={`diff-filter-btn ${filterDiff === d ? 'diff-filter-active' : ''}`}
                    onClick={() => setFilterDiff(d)}
                  >{d}</button>
                ))}
              </div>
            </div>

            <div className="problems-list">
              {loading && <div className="empty-problems">Loading problems...</div>}
              {!loading && filtered.length === 0 && <div className="empty-problems">No problems found</div>}
              {filtered.map((p, i) => (
                <div key={p._id} className="problem-row" onClick={() => openDetail(p)}>
                  <div className="problem-row-num">{i + 1}</div>
                  <div className="problem-row-info">
                    <div className="problem-row-title">{p.title}</div>
                    <div className="problem-row-tags">
                      {p.tags.map(t => <span key={t} className="tag">{t}</span>)}
                    </div>
                  </div>
                  <div className="problem-row-meta">
                    <button
                      className={`problem-code-badge ${codeCopied === p.code ? 'code-copied' : ''}`}
                      onClick={e => { e.stopPropagation(); handleCopyCode(p.code) }}
                      title="Click to copy code"
                    >
                      {codeCopied === p.code ? '✓ Copied' : p.code}
                    </button>
                    <span className={`diff-badge ${diffColor[p.difficulty]}`}>{p.difficulty}</span>
                    <span className="problem-row-date">{new Date(p.createdAt).toLocaleDateString()}</span>
                    <span className="problem-row-cases">{p.testCases.length} test{p.testCases.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="problem-row-actions" onClick={e => e.stopPropagation()}>
                    <button className="action-btn edit-btn" onClick={() => openEdit(p)}>Edit</button>
                    <button className="action-btn del-btn" onClick={() => setDeleteConfirm(p._id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="problems-count">{filtered.length} of {problems.length} problems</div>
          </div>
        )}

        {/* DETAIL VIEW */}
        {view === 'detail' && selected && (
          <div className="detail-view">
            <div className="detail-card">
              <div className="detail-header">
                <div>
                  <div className="detail-title-row">
                    <div className="detail-title">{selected.title}</div>
                    <button
                      className={`problem-code-badge large-code ${codeCopied === selected.code ? 'code-copied' : ''}`}
                      onClick={() => handleCopyCode(selected.code)}
                    >
                      {codeCopied === selected.code ? '✓ Copied!' : selected.code}
                    </button>
                  </div>
                  <div className="detail-meta">
                    <span className={`diff-badge ${diffColor[selected.difficulty]}`}>{selected.difficulty}</span>
                    <span className="tag">POINTS {selected.points ?? 100} pts</span>
                    <span className="tag">⏱️ {selected.timeLimit ?? 300}s</span>
                    {selected.tags.map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                </div>
                <div className="detail-actions">
                  <button className="action-btn edit-btn" onClick={() => openEdit(selected)}>Edit</button>
                  <button className="action-btn del-btn" onClick={() => setDeleteConfirm(selected._id)}>Delete</button>
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-section-label">Description</div>
                <div className="detail-section-text">{selected.description}</div>
              </div>
              <div className="detail-two-col">
                <div className="detail-section">
                  <div className="detail-section-label">Input Format</div>
                  <div className="detail-section-text">{selected.inputFormat}</div>
                </div>
                <div className="detail-section">
                  <div className="detail-section-label">Output Format</div>
                  <div className="detail-section-text">{selected.outputFormat}</div>
                </div>
              </div>
              <div className="detail-section">
                <div className="detail-section-label">Constraints</div>
                <div className="detail-section-text mono">{selected.constraints}</div>
              </div>
              <div className="detail-section">
                <div className="detail-section-label">Test Cases ({selected.testCases.length})</div>
                <div className="test-cases">
                  {selected.testCases.map((tc, i) => (
                    <div key={i} className="test-case">
                      <div className="tc-label">Case {i + 1}</div>
                      <div className="tc-row"><span className="tc-key">Input:</span><code className="tc-val">{tc.input}</code></div>
                      <div className="tc-row"><span className="tc-key">Expected:</span><code className="tc-val">{tc.expected}</code></div>
                      {tc.hidden && <div className="tc-row"><span className="tc-key" style={{ color: '#f97316' }}>🔒 Hidden</span><span className="tc-note">Not shown to contestants</span></div>}
                      {tc.explanation && <div className="tc-row"><span className="tc-key">Note:</span><span className="tc-note">{tc.explanation}</span></div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADD / EDIT FORM */}
        {(view === 'add' || view === 'edit') && (
          <div className="form-view">
            <div className="form-card">
              <div className="form-title-row">
                <h2 className="form-title">{view === 'add' ? 'Add New Problem' : 'Edit Problem'}</h2>
                {view === 'edit' && selected && (
                  <span className="form-code-display">{selected.code}</span>
                )}
              </div>

              <div className="form-grid">
                <div className="form-field full">
                  <label className="form-label">Problem Title *</label>
                  <input className="form-input" placeholder="e.g. Two Sum" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>

                <div className="form-field">
                  <label className="form-label">Difficulty *</label>
                  <div className="diff-select">
                    {(['Easy', 'Medium', 'Hard'] as const).map(d => (
                      <button key={d} className={`diff-opt ${form.difficulty === d ? 'diff-opt-active ' + diffColor[d] : ''}`} onClick={() => setForm(f => ({ ...f, difficulty: d }))}>{d}</button>
                    ))}
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">Points *</label>
                  <input type="number" className="form-input" min="0" value={form.points} onChange={e => setForm(f => ({ ...f, points: parseInt(e.target.value) || 0 }))} />
                </div>

                <div className="form-field">
                  <label className="form-label">Time Limit (sec) *</label>
                  <input type="number" className="form-input" min="1" value={form.timeLimit} onChange={e => setForm(f => ({ ...f, timeLimit: parseInt(e.target.value) || 300 }))} />
                </div>

                <div className="form-field">
                  <label className="form-label">Tags</label>
                  <div className="tag-input-wrap">
                    <input className="form-input" placeholder="Add tag, press Enter" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} />
                    <button className="tag-add-btn" onClick={addTag}>+</button>
                  </div>
                  <div className="tag-list">
                    {form.tags.map(t => (
                      <span key={t} className="tag-removable">{t} <button onClick={() => removeTag(t)}>×</button></span>
                    ))}
                  </div>
                </div>

                <div className="form-field full">
                  <label className="form-label">Description *</label>
                  <textarea className="form-textarea" rows={4} placeholder="Describe the problem clearly..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>

                <div className="form-field">
                  <label className="form-label">Input Format</label>
                  <textarea className="form-textarea" rows={3} value={form.inputFormat} onChange={e => setForm(f => ({ ...f, inputFormat: e.target.value }))} />
                </div>

                <div className="form-field">
                  <label className="form-label">Output Format</label>
                  <textarea className="form-textarea" rows={3} value={form.outputFormat} onChange={e => setForm(f => ({ ...f, outputFormat: e.target.value }))} />
                </div>

                <div className="form-field full">
                  <label className="form-label">Constraints</label>
                  <textarea className="form-textarea" rows={2} value={form.constraints} onChange={e => setForm(f => ({ ...f, constraints: e.target.value }))} />
                </div>

                <div className="form-field full">
                  <div className="tc-header">
                    <label className="form-label">Test Cases *</label>
                    <button className="add-tc-btn" onClick={addTestCase}>+ Add Case</button>
                  </div>
                  <div className="tc-form-list">
                    {form.testCases.map((tc, i) => (
                      <div key={i} className="tc-form">
                        <div className="tc-form-header">
                          <span className="tc-form-label">Case {i + 1}</span>
                          {form.testCases.length > 1 && <button className="remove-tc-btn" onClick={() => removeTestCase(i)}>✕</button>}
                        </div>
                        <div className="tc-form-grid">
                          <div>
                            <div className="tc-mini-label">Input</div>
                            <textarea className="form-textarea mono-input" rows={2} value={tc.input} onChange={e => updateTestCase(i, 'input', e.target.value)} />
                          </div>
                          <div>
                            <div className="tc-mini-label">Expected Output</div>
                            <textarea className="form-textarea mono-input" rows={2} value={tc.expected} onChange={e => updateTestCase(i, 'expected', e.target.value)} />
                          </div>
                          <div className="full-span">
                            <div className="tc-mini-label">Explanation (optional)</div>
                            <input className="form-input" value={tc.explanation} onChange={e => updateTestCase(i, 'explanation', e.target.value)} />
                          </div>
                          <div className="full-span" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <input
                              type="checkbox"
                              id={`tc-hidden-${i}`}
                              checked={tc.hidden}
                              onChange={e => {
                                const willHide = e.target.checked
                                const visibleAfter = form.testCases.filter((t, idx) => idx === i ? !willHide : !t.hidden).length
                                if (visibleAfter === 0) { setError('At least one test case must be visible.'); return }
                                setError('')
                                updateTestCase(i, 'hidden', willHide)
                              }}
                              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#f97316' }}
                            />
                            <label htmlFor={`tc-hidden-${i}`} style={{ color: tc.hidden ? '#f97316' : '#858585', fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
                              🔒 Hidden test case (shown only during submission, not on Run)
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button className="cancel-btn" onClick={() => setView('list')}>Cancel</button>
                <button className={`save-btn ${!canSave ? 'btn-disabled' : ''}`} onClick={handleSave} disabled={!canSave || saving}>
                  {saving ? <span className="save-spinner" /> : view === 'add' ? 'Save Problem' : 'Update Problem'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {deleteConfirm !== null && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Delete Problem?</div>
            <div className="modal-sub">This action cannot be undone.</div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="delete-confirm-btn" onClick={() => handleDelete(deleteConfirm)}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

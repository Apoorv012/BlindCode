import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Problems.css'

// API: GET /problems → returns all problems
// API: POST /problems → create problem
// API: PUT /problems/:id → update problem
// API: DELETE /problems/:id → delete problem

type TestCase = { input: string; output: string; explanation: string }
type Problem = {
  id: number
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  tags: string[]
  description: string
  inputFormat: string
  outputFormat: string
  constraints: string
  testCases: TestCase[]
  createdAt: string
}

const MOCK_PROBLEMS: Problem[] = [
  {
    id: 1, title: 'Two Sum', difficulty: 'Easy', tags: ['Array', 'Hash Map'],
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    inputFormat: 'First line: array of integers\nSecond line: target integer',
    outputFormat: 'Two space-separated integers representing the indices',
    constraints: '2 ≤ nums.length ≤ 10⁴\n-10⁹ ≤ nums[i] ≤ 10⁹',
    testCases: [
      { input: '[2,7,11,15]\n9', output: '[0,1]', explanation: 'nums[0] + nums[1] = 9' },
      { input: '[3,2,4]\n6', output: '[1,2]', explanation: 'nums[1] + nums[2] = 6' },
    ],
    createdAt: '2026-03-01',
  },
  {
    id: 2, title: 'Reverse Linked List', difficulty: 'Easy', tags: ['Linked List'],
    description: 'Given the head of a singly linked list, reverse the list and return the reversed list.',
    inputFormat: 'Space-separated integers representing linked list nodes',
    outputFormat: 'Space-separated integers of the reversed list',
    constraints: '0 ≤ n ≤ 5000\n-5000 ≤ Node.val ≤ 5000',
    testCases: [
      { input: '1 2 3 4 5', output: '5 4 3 2 1', explanation: 'Reverse of [1,2,3,4,5]' },
    ],
    createdAt: '2026-03-02',
  },
  {
    id: 3, title: 'Valid Parentheses', difficulty: 'Medium', tags: ['Stack', 'String'],
    description: 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.',
    inputFormat: 'A string of bracket characters',
    outputFormat: '"true" or "false"',
    constraints: '1 ≤ s.length ≤ 10⁴',
    testCases: [
      { input: '()', output: 'true', explanation: 'Single matching pair' },
      { input: '([)]', output: 'false', explanation: 'Brackets not properly nested' },
    ],
    createdAt: '2026-03-03',
  },
]

const EMPTY_PROBLEM: Omit<Problem, 'id' | 'createdAt'> = {
  title: '', difficulty: 'Easy', tags: [],
  description: '', inputFormat: '', outputFormat: '',
  constraints: '', testCases: [{ input: '', output: '', explanation: '' }],
}

const diffColor: Record<string, string> = {
  Easy: 'diff-easy', Medium: 'diff-medium', Hard: 'diff-hard',
}

type View = 'list' | 'add' | 'edit' | 'detail'

export default function Problems() {
  const navigate = useNavigate()
  const [problems, setProblems] = useState<Problem[]>(MOCK_PROBLEMS)
  const [view, setView] = useState<View>('list')
  const [selected, setSelected] = useState<Problem | null>(null)
  const [form, setForm] = useState({ ...EMPTY_PROBLEM })
  const [tagInput, setTagInput] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDiff, setFilterDiff] = useState<string>('All')

  const openAdd = () => {
    setForm({ ...EMPTY_PROBLEM, testCases: [{ input: '', output: '', explanation: '' }] })
    setTagInput('')
    setView('add')
  }

  const openEdit = (p: Problem) => {
    setSelected(p)
    setForm({ title: p.title, difficulty: p.difficulty, tags: [...p.tags], description: p.description, inputFormat: p.inputFormat, outputFormat: p.outputFormat, constraints: p.constraints, testCases: p.testCases.map(t => ({ ...t })) })
    setTagInput('')
    setView('edit')
  }

  const openDetail = (p: Problem) => { setSelected(p); setView('detail') }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] }))
    setTagInput('')
  }
  const removeTag = (tag: string) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))

  const addTestCase = () => setForm(f => ({ ...f, testCases: [...f.testCases, { input: '', output: '', explanation: '' }] }))
  const removeTestCase = (i: number) => setForm(f => ({ ...f, testCases: f.testCases.filter((_, idx) => idx !== i) }))
  const updateTestCase = (i: number, field: keyof TestCase, value: string) => {
    setForm(f => ({ ...f, testCases: f.testCases.map((tc, idx) => idx === i ? { ...tc, [field]: value } : tc) }))
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 700))
    if (view === 'add') {
      const newP: Problem = { ...form, id: Date.now(), createdAt: new Date().toISOString().split('T')[0] }
      setProblems(p => [...p, newP])
    } else if (view === 'edit' && selected) {
      setProblems(p => p.map(prob => prob.id === selected.id ? { ...prob, ...form } : prob))
    }
    setSaving(false)
    setView('list')
  }

  const handleDelete = (id: number) => {
    setProblems(p => p.filter(prob => prob.id !== id))
    setDeleteConfirm(null)
    if (view === 'detail') setView('list')
  }

  const filtered = problems.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchDiff = filterDiff === 'All' || p.difficulty === filterDiff
    return matchSearch && matchDiff
  })

  const canSave = form.title.trim() && form.description.trim() && form.testCases.length > 0

  return (
    <div className="problems-page">
      <div className="problems-bg"><div className="problems-grid" /></div>

      <div className="problems-container">
        {/* Header */}
        <div className="problems-header">
          <button className="back-btn" onClick={() => view === 'list' ? navigate('/') : setView('list')}>← Back</button>
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

        {/* LIST VIEW */}
        {view === 'list' && (
          <div className="list-view">
            {/* Filters */}
            <div className="list-filters">
              <input
                className="search-input"
                placeholder="Search problems or tags..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <div className="diff-filters">
                {['All', 'Easy', 'Medium', 'Hard'].map(d => (
                  <button
                    key={d}
                    className={`diff-filter-btn ${filterDiff === d ? 'diff-filter-active' : ''} ${d !== 'All' ? diffColor[d] + '-btn' : ''}`}
                    onClick={() => setFilterDiff(d)}
                  >{d}</button>
                ))}
              </div>
            </div>

            {/* Problems list */}
            <div className="problems-list">
              {filtered.length === 0 && (
                <div className="empty-problems">No problems found</div>
              )}
              {filtered.map((p, i) => (
                <div key={p.id} className="problem-row" onClick={() => openDetail(p)}>
                  <div className="problem-row-num">{i + 1}</div>
                  <div className="problem-row-info">
                    <div className="problem-row-title">{p.title}</div>
                    <div className="problem-row-tags">
                      {p.tags.map(t => <span key={t} className="tag">{t}</span>)}
                    </div>
                  </div>
                  <div className="problem-row-meta">
                    <span className={`diff-badge ${diffColor[p.difficulty]}`}>{p.difficulty}</span>
                    <span className="problem-row-date">{p.createdAt}</span>
                    <span className="problem-row-cases">{p.testCases.length} test{p.testCases.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="problem-row-actions" onClick={e => e.stopPropagation()}>
                    <button className="action-btn edit-btn" onClick={() => openEdit(p)}>Edit</button>
                    <button className="action-btn del-btn" onClick={() => setDeleteConfirm(p.id)}>Delete</button>
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
                  <div className="detail-title">{selected.title}</div>
                  <div className="detail-meta">
                    <span className={`diff-badge ${diffColor[selected.difficulty]}`}>{selected.difficulty}</span>
                    {selected.tags.map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                </div>
                <div className="detail-actions">
                  <button className="action-btn edit-btn" onClick={() => openEdit(selected)}>Edit</button>
                  <button className="action-btn del-btn" onClick={() => setDeleteConfirm(selected.id)}>Delete</button>
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
                      <div className="tc-row"><span className="tc-key">Output:</span><code className="tc-val">{tc.output}</code></div>
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
              <h2 className="form-title">{view === 'add' ? 'Add New Problem' : 'Edit Problem'}</h2>

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
                  <textarea className="form-textarea" rows={3} placeholder="Describe input format..." value={form.inputFormat} onChange={e => setForm(f => ({ ...f, inputFormat: e.target.value }))} />
                </div>

                <div className="form-field">
                  <label className="form-label">Output Format</label>
                  <textarea className="form-textarea" rows={3} placeholder="Describe output format..." value={form.outputFormat} onChange={e => setForm(f => ({ ...f, outputFormat: e.target.value }))} />
                </div>

                <div className="form-field full">
                  <label className="form-label">Constraints</label>
                  <textarea className="form-textarea" rows={2} placeholder="e.g. 1 ≤ n ≤ 10⁴" value={form.constraints} onChange={e => setForm(f => ({ ...f, constraints: e.target.value }))} />
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
                          {form.testCases.length > 1 && (
                            <button className="remove-tc-btn" onClick={() => removeTestCase(i)}>✕</button>
                          )}
                        </div>
                        <div className="tc-form-grid">
                          <div>
                            <div className="tc-mini-label">Input</div>
                            <textarea className="form-textarea mono-input" rows={2} value={tc.input} onChange={e => updateTestCase(i, 'input', e.target.value)} placeholder="Input value..." />
                          </div>
                          <div>
                            <div className="tc-mini-label">Expected Output</div>
                            <textarea className="form-textarea mono-input" rows={2} value={tc.output} onChange={e => updateTestCase(i, 'output', e.target.value)} placeholder="Expected output..." />
                          </div>
                          <div className="full-span">
                            <div className="tc-mini-label">Explanation (optional)</div>
                            <input className="form-input" value={tc.explanation} onChange={e => updateTestCase(i, 'explanation', e.target.value)} placeholder="Brief explanation..." />
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

      {/* Delete Confirm Modal */}
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

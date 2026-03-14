// export const API_URL = 'http://localhost:4000'

// export const authHeader = () => ({
//   'Content-Type': 'application/json',
//   'Authorization': `Bearer ${localStorage.getItem('bc_admin_token')}`
// })


export const API_URL = 'http://localhost:4000'

export const authHeader = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('bc_admin_token')}`
})

// ─── Auth ───────────────────────────────────────────────────────────────────

export const apiLogin = async (username: string, password: string) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Login failed')
  return data as { token: string; admin: { id: string; name: string; email: string } }
}

// ─── Contests ───────────────────────────────────────────────────────────────

export const apiGetContests = async () => {
  const res = await fetch(`${API_URL}/contests`, { headers: authHeader() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return data
}

export const apiGetContest = async (contestId: string) => {
  const res = await fetch(`${API_URL}/contests/${contestId}`, { headers: authHeader() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return data
}

export const apiCreateContest = async (body: {
  name: string
  duration: number
  problemIds: string[]
}) => {
  const res = await fetch(`${API_URL}/contests`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return data
}

export const apiStartContest = async (contestId: string) => {
  const res = await fetch(`${API_URL}/contests/${contestId}/start`, {
    method: 'POST',
    headers: authHeader()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return data
}

export const apiPauseContest = async (contestId: string) => {
  const res = await fetch(`${API_URL}/contests/${contestId}/pause`, {
    method: 'POST',
    headers: authHeader()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return data
}

export const apiEndContest = async (contestId: string) => {
  const res = await fetch(`${API_URL}/contests/${contestId}/end`, {
    method: 'POST',
    headers: authHeader()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return data
}

export const apiAddProblemToContest = async (contestId: string, problemCode: string) => {
  const res = await fetch(`${API_URL}/contests/${contestId}/problems`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ problemCode })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return data
}

export const apiRemoveProblemFromContest = async (contestId: string, problemId: string) => {
  const res = await fetch(`${API_URL}/contests/${contestId}/problems/${problemId}`, {
    method: 'DELETE',
    headers: authHeader()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return data
}

// ─── Participants ────────────────────────────────────────────────────────────

export const apiGetParticipants = async (contestId: string) => {
  const res = await fetch(`${API_URL}/contests/${contestId}/participants`, {
    headers: authHeader()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return data
}

export const apiAddParticipant = async (
  contestId: string,
  name: string,
  addedByAdmin = true
) => {
  const res = await fetch(`${API_URL}/contests/${contestId}/join`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ name, addedByAdmin })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return data
}

// ─── Problems ────────────────────────────────────────────────────────────────

export const apiGetProblems = async () => {
  const res = await fetch(`${API_URL}/problems`, { headers: authHeader() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return data
}

export const apiCreateProblem = async (body: object) => {
  const res = await fetch(`${API_URL}/problems`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return data
}

export const apiUpdateProblem = async (id: string, body: object) => {
  const res = await fetch(`${API_URL}/problems/${id}`, {
    method: 'PUT',
    headers: authHeader(),
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return data
}

export const apiDeleteProblem = async (id: string) => {
  const res = await fetch(`${API_URL}/problems/${id}`, {
    method: 'DELETE',
    headers: authHeader()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return data
}

// ─── Results ─────────────────────────────────────────────────────────────────

export const apiGetResults = async (contestId: string) => {
  const res = await fetch(`${API_URL}/contests/${contestId}/results`, {
    headers: authHeader()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return data
}

export const API_URL = 'http://localhost:4000'

// ─── Contest lookup ───────────────────────────────────────────────────────────

export const apiGetContestByCode = async (contestCode: string) => {
  const res = await fetch(`${API_URL}/contests/code/${contestCode}`, {
    headers: { 'Content-Type': 'application/json' }
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Contest not found')
  return data as {
    _id: string
    contestCode: string
    name: string
    duration: number
    status: 'draft' | 'running' | 'paused' | 'ended'
    problemIds: { _id: string; title: string; difficulty: string }[]
  }
}

// ─── Join contest ─────────────────────────────────────────────────────────────

export const apiJoinContest = async (contestCode: string, name: string, password?: string) => {
  const res = await fetch(`${API_URL}/contests/${contestCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to join contest')
  return data
}

// ─── Poll contest status ──────────────────────────────────────────────────────

export const apiGetContestStatus = async (contestCode: string) => {
  const res = await fetch(`${API_URL}/contests/code/${contestCode}`, {
    headers: { 'Content-Type': 'application/json' }
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return data as { status: 'draft' | 'running' | 'paused' | 'ended' }
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export interface ScorePayload {
  name: string
  password?: string
  score: number
  levelScores: { level: number; score: number; timeTaken: number; peeks: number }[]
}

export const apiSubmitScore = async (contestCode: string, payload: ScorePayload) => {
  const res = await fetch(`${API_URL}/contests/${contestCode}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to submit score')
  return data
}

export const apiGetLeaderboard = async (contestCode: string) => {
  const res = await fetch(`${API_URL}/contests/${contestCode}/leaderboard`, {
    headers: { 'Content-Type': 'application/json' }
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return data as {
    rank: number
    name: string
    password?: string
    score: number
    levelScores: { level: number; score: number; timeTaken: number; peeks: number }[]
  }[]
}
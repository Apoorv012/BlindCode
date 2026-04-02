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

export interface SubmitScorePayload {
  passed: boolean;
  timeTaken: number;
  peeks: number;
  difficulty: string;
}

export const apiSubmitScore = async (contestCode: string, participantId: string, payload: SubmitScorePayload) => {
  const res = await fetch(`${API_URL}/contests/${contestCode}/participants/${participantId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to submit score')
  return data
}

export const apiHeartbeat = async (contestCode: string, participantId: string, payload: {
  status: string;
  compiles?: number;
  wrongSubmissions?: number;
  reveals?: number;
  currentProblemId?: string;
}) => {
  const res = await fetch(`${API_URL}/contests/${contestCode}/participants/${participantId}/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const data = await res.json()
  if (!res.ok) console.error('Heartbeat failed:', data.message)
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

// ─── Fetch a single problem (public, no auth) ─────────────────────────────────

import type { Challenge } from '../data/questions'

const STARTER_CODE: Record<string, string> = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    \n    return 0;\n}`,
  python: `# Write your solution here\n`,
  javascript: `// Write your solution here\n`,
}

export const apiGetProblem = async (problemId: string): Promise<Challenge> => {
  const res = await fetch(`${API_URL}/problems/${problemId}/public`, {
    headers: { 'Content-Type': 'application/json' }
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to fetch problem')

  // Map MongoDB Problem → Challenge shape
  return {
    id: 0, // not used when fetching from API
    _id: data._id,
    title: data.title,
    description: data.description || '',
    expectedOutput: '', // deprecated, testCases used instead
    timeLimit: 300, // default 5 minutes; DB doesn't store timeLimit
    difficulty: (data.difficulty?.toLowerCase() ?? 'medium') as Challenge['difficulty'],
    starterCode: STARTER_CODE,
    testCases: (data.testCases ?? []).map((tc: { input: string; expected: string; hidden?: boolean }) => ({
      input: tc.input ?? '',
      expected: tc.expected ?? '',
      hidden: tc.hidden ?? false,
    })),
    inputFormat: data.inputFormat,
    outputFormat: data.outputFormat,
    constraints: data.constraints,
  }
}
const ENV = import.meta.env.VITE_TAURI_ENV;
export const API_URL = ENV === "CLOUD" ? import.meta.env.VITE_TAURI_BACKEND_URL_CLOUD : import.meta.env.VITE_TAURI_BACKEND_URL_LOCAL;

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
  peeks?: number; // Deprecated — backend tracks via socket. Kept for backwards compat.
  difficulty: string;
  problemId?: string;
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
  java: `public class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n        \n    }\n}`,
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
    timeLimit: data.timeLimit || 300,
    points: data.points || 100,
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

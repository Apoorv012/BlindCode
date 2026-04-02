import express from 'express'
import Contest from '../models/Contest'
import { protect, AuthRequest } from '../middleware/auth'

const router = express.Router({ mergeParams: true })

const SCORE_MAP: Record<string, number> = {
  Easy: 100,
  Medium: 200,
  Hard: 300
}
const WRONG_PENALTY = 50
const REVEAL_PENALTY = 20

// GET /contests/:contestId/results
router.get('/results', protect, async (req: AuthRequest & express.Request, res) => {
  try {
    const contest = await Contest.findOne({
      contestCode: req.params.contestId,
      adminId: req.adminId
    }).populate('problemIds')

    if (!contest) {
      res.status(404).json({ message: 'Contest not found' })
      return
    }

    const participants = contest.participants || []
    const problems = contest.problemIds as any[]

    const results = participants.map((p: any) => {
      const problemResults = problems.map((prob, idx) => {
        const isCurrentProblem = p.currentProblemId?.toString() === prob._id.toString()

        const reveals = isCurrentProblem ? p.reveals : 0
        const wrongSubmissions = isCurrentProblem ? p.wrongSubmissions : 0

        const base = SCORE_MAP[prob.difficulty] || 0
        const solved = (p.score || 0) >= base

        const net = solved
          ? Math.max(0, base - wrongSubmissions * WRONG_PENALTY - reveals * REVEAL_PENALTY)
          : 0

        return {
          problemId: prob._id,
          title: prob.title,
          difficulty: prob.difficulty,
          solved,
          reveals,
          wrongSubmissions,
          net
        }
      })

      return {
        name: p.name,
        totalScore: Math.max(0, p.score || 0),
        totalReveals: p.reveals,
        totalWrong: p.wrongSubmissions,
        status: p.status,
        lastActive: p.lastActive,
        problemResults
      }
    })

    results.sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        const timeA = a.lastActive ? new Date(a.lastActive).getTime() : 0;
        const timeB = b.lastActive ? new Date(b.lastActive).getTime() : 0;
        return timeA - timeB;
    });
    const ranked = results.map((r, i) => ({ ...r, rank: i + 1 }))

    res.json({
      contest: {
        id: contest.contestCode,
        name: contest.name,
        duration: contest.duration,
        endedAt: contest.endedAt,
        totalParticipants: participants.length,
        problems: problems.map(p => ({
          id: p._id,
          title: p.title,
          difficulty: p.difficulty
        }))
      },
      results: ranked
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router

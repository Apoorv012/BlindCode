// import express from 'express'
// import Contest from '../models/Contest'
// import Participant from '../models/Participant'
// import { protect, AuthRequest } from '../middleware/auth'

// const router = express.Router({ mergeParams: true })

// interface ContestParams {
//   contestId: string
// }

// const SCORE_MAP: Record<string, number> = {
//   Easy: 100,
//   Medium: 200,
//   Hard: 300
// }
// const WRONG_PENALTY = 50
// const REVEAL_PENALTY = 20

// // GET /contests/:contestId/results
// router.get('/results', protect, async (req: AuthRequest & express.Request<ContestParams>, res) => {
//   try {
//     const contest = await Contest.findOne({
//       contestCode: req.params.contestId,
//       adminId: req.adminId
//     }).populate('problemIds')

//     if (!contest) {
//       res.status(404).json({ message: 'Contest not found' })
//       return
//     }

//     const participants = await Participant.find({ contestId: contest._id })
//     const problems = contest.problemIds as any[]

//     const results = participants.map(p => {
//       const problemResults = problems.map(prob => {
//         const base = SCORE_MAP[prob.difficulty] || 0
//         const deductions =
//           (p.wrongSubmissions * WRONG_PENALTY) +
//           (p.reveals * REVEAL_PENALTY)
//         const net = Math.max(0, base - deductions)
//         return {
//           problemId: prob._id,
//           title: prob.title,
//           difficulty: prob.difficulty,
//           reveals: p.reveals,
//           wrongSubmissions: p.wrongSubmissions,
//           net
//         }
//       })

//       return {
//         name: p.name,
//         totalScore: Math.max(0, p.score),
//         totalReveals: p.reveals,
//         totalWrong: p.wrongSubmissions,
//         problemResults
//       }
//     })

//     results.sort((a, b) => b.totalScore - a.totalScore)
//     const ranked = results.map((r, i) => ({ ...r, rank: i + 1 }))

//     res.json({
//       contest: {
//         name: contest.name,
//         duration: contest.duration,
//         endedAt: contest.endedAt,
//         totalParticipants: participants.length,
//         problems: problems.map(p => ({
//           id: p._id,
//           title: p.title,
//           difficulty: p.difficulty
//         }))
//       },
//       results: ranked
//     })
//   } catch (error) {
//     console.error(error)
//     res.status(500).json({ message: 'Server error' })
//   }
// })

// export default router


import express from 'express'
import Contest from '../models/Contest'
import Participant from '../models/Participant'
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

    const participants = await Participant.find({ contestId: contest._id })
    const problems = contest.problemIds as any[]

    // NOTE: The current Participant model stores aggregate reveals/compiles/wrongSubmissions
    // across the whole contest (not per-problem). This is the schema we have.
    // Per-problem breakdown uses the participant's global stats distributed across problems.
    // When the desktop client is built, it should send per-problem stats for accurate breakdown.
    const results = participants.map(p => {
      // Build per-problem results using the participant's global stats
      // For now, we attribute the stats to whichever problem they were last on
      const problemResults = problems.map((prob, idx) => {
        // Only the current/last problem gets the penalty stats attributed to it
        const isCurrentProblem = p.currentProblemId?.toString() === prob._id.toString()

        const reveals = isCurrentProblem ? p.reveals : 0
        const wrongSubmissions = isCurrentProblem ? p.wrongSubmissions : 0

        // A participant has "solved" a problem if their score >= the problem's base score
        const base = SCORE_MAP[prob.difficulty] || 0
        const solved = p.score >= base

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
        totalScore: Math.max(0, p.score),
        totalReveals: p.reveals,
        totalWrong: p.wrongSubmissions,
        status: p.status,
        problemResults
      }
    })

    results.sort((a, b) => b.totalScore - a.totalScore)
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

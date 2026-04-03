import express from 'express'
import Contest from '../models/Contest'
import { protect, AuthRequest } from '../middleware/auth'

const router = express.Router({ mergeParams: true })

const SCORE_MAP: Record<string, number> = {
  Easy: 100,
  Medium: 200,
  Hard: 300
}
const WRONG_PENALTY = 15
const REVEAL_PENALTY = 5

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
      const problemResults = problems.map((prob: any) => {
        // Specific problem ka data DB array se nikalo
        const pStat = p.problemStats?.find((ps: any) => ps.problemId.toString() === prob._id.toString());

        const reveals = pStat ? pStat.reveals : 0;
        const wrongSubmissions = pStat ? pStat.wrongSubmissions : 0;
        const base = prob.points || SCORE_MAP[prob.difficulty] || 0;

        const solved = p.solvedProblemIds?.some((id: any) => id.toString() === prob._id.toString()) || false;

        // ✨ FIX: Penalties ka calculation ab exact hai.
        const penalties = (wrongSubmissions * WRONG_PENALTY) + (reveals * REVEAL_PENALTY);

        // Agar question solve nahi hua toh admin ko negative points dikhenge 
        // taaki pata chale ki yahan kitne points loose hue hain
        const net = solved ? (base - penalties) : -penalties;

        return {
          problemId: prob._id,
          title: prob.title,
          difficulty: prob.difficulty,
          solved,
          reveals,
          wrongSubmissions,
          net
        };
      });

      // 👇 YEH RETURN MISSING YA GALAT HONE SE 'VOID' ERROR AATA HAI
      return {
        name: p.name,
        totalScore: Math.max(0, p.score || 0),
        totalReveals: p.reveals,
        totalWrong: p.wrongSubmissions,
        status: p.status,
        lastActive: p.lastActive,
        problemResults
      };
    });

    // Explicitly (a: any, b: any) define kar diya taaki TS roye na
    results.sort((a: any, b: any) => {
      // 1. Score-based ranking
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;

      // 2. Time-based ranking
      const timeA = a.lastSubmitTime ? new Date(a.lastSubmitTime).getTime() : Number.MAX_SAFE_INTEGER;
      const timeB = b.lastSubmitTime ? new Date(b.lastSubmitTime).getTime() : Number.MAX_SAFE_INTEGER;
      if (timeA !== timeB) return timeA - timeB;

      // 3. Absolute fallback
      const nameA = a.name ? a.name.toLowerCase() : "";
      const nameB = b.name ? b.name.toLowerCase() : "";
      return nameA.localeCompare(nameB);
    });

    const ranked = results.map((r: any, i: number) => ({ ...r, rank: i + 1 }));

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

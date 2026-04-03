import express from 'express'
import Contest, { ContestStatusEnum } from '../models/Contest'
import Problem from '../models/Problem'
import { protect, AuthRequest } from '../middleware/auth'
import { getIo } from '../socket'

const router = express.Router({ mergeParams: true })

type ContestParams = { contestId: string }

// GET /contests/:contestId/participants
// Protected — admin only
router.get('/participants', protect, async (req: AuthRequest, res) => {
  try {
    const { contestId } = req.params as ContestParams
    const contest = await Contest.findOne({
      contestCode: contestId,
      adminId: req.adminId
    }).populate('participants.currentProblemId', 'title difficulty')

    if (!contest) {
      res.status(404).json({ message: 'Contest not found' })
      return
    }

    res.json(contest.participants)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /contests/:contestId/leaderboard
// PUBLIC — For Desktop App Live Rankings
router.get('/leaderboard', async (req: express.Request<ContestParams>, res) => {
  try {
    const { contestId } = req.params

    const contest = await Contest.findOne({ contestCode: contestId })

    if (!contest) {
      res.status(404).json({ message: 'Contest not found' })
      return
    }

    // Extract participants and map them to remove sensitive data (passwords, enrollments)
    const safeLeaderboard = contest.participants
      .map((p: any) => ({
        _id: p._id,
        name: p.name,
        score: p.score || 0,
        status: p.status || 'idle',
        reveals: p.reveals || 0,
        wrongSubmissions: p.wrongSubmissions || 0,
        lastActive: p.lastActive,
        currentProblemId: p.currentProblemId,
        solvedProblemIds: p.solvedProblemIds || [] // Ensures the UI spheres work
      }))
      .sort((a: any, b: any) => {
        // 1. Score-based ranking (Highest first)
        if (b.score !== a.score) return b.score - a.score;

        // 2. Time-based ranking (Lowest/Earliest first)
        const timeA = a.lastSubmitTime ? new Date(a.lastSubmitTime).getTime() : Number.MAX_SAFE_INTEGER;
        const timeB = b.lastSubmitTime ? new Date(b.lastSubmitTime).getTime() : Number.MAX_SAFE_INTEGER;
        if (timeA !== timeB) return timeA - timeB;

        // 3. Absolute fallback (Alphabetical order so ranks NEVER clash)
        const nameA = a.name ? a.name.toLowerCase() : "";
        const nameB = b.name ? b.name.toLowerCase() : "";
        return nameA.localeCompare(nameB);
      })

    res.status(200).json(safeLeaderboard)
  } catch (error) {
    console.error("Leaderboard fetch error:", error)
    res.status(500).json({ message: 'Server error while fetching leaderboard' })
  }
})

// POST /join (Public User Login)
router.post('/join', async (req: express.Request<ContestParams>, res) => {
  try {
    const { contestId } = req.params
    const { name, password } = req.body

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Team name is required' })
      return
    }

    const contest = await Contest.findOne({ contestCode: contestId })
    if (!contest) {
      res.status(404).json({ message: 'Contest not found' })
      return
    }

    if (contest.status === ContestStatusEnum.ended) {
      res.status(400).json({ message: 'Contest has already ended' })
      return
    }

    const teamName = name.trim().toLowerCase()

    // Check for duplicate team name in same contest (case-insensitive)
    const existing = contest.participants.find((p: any) => p.name.toLowerCase() === teamName)

    if (!existing) {
      res.status(400).json({ message: 'Team not found in this contest. Make sure your instructor added you and check for typos.' })
      return
    }

    if (existing.password !== password) {
      res.status(401).json({ message: 'Invalid password' })
      return
    }

    // Update status to online
    await Contest.updateOne(
      { contestCode: contestId, 'participants._id': existing._id },
      { $set: { 'participants.$.status': 'online' } }
    )

    res.status(200).json({
      participantId: existing._id,
      name: existing.name,
      joinedAt: existing.joinedAt,
      score: existing.score || 0,
      solvedProblemIds: existing.solvedProblemIds || []
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST / (Admin add single team)
router.post('/', protect, async (req: AuthRequest & express.Request<ContestParams>, res) => {
  try {
    const { contestId } = req.params
    const { name, password, members } = req.body

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Team name is required' })
      return
    }

    const contest = await Contest.findOne({ contestCode: contestId, adminId: req.adminId })
    if (!contest) {
      res.status(404).json({ message: 'Contest not found' })
      return
    }

    const teamName = name.trim().toLowerCase()
    const existing = contest.participants.find((p: any) => p.name.toLowerCase() === teamName)

    if (existing) {
      res.status(400).json({ message: 'Team already exists' })
      return
    }

    const newParticipant = {
      name: name.trim(),
      password: password,
      members: members || [],
      status: 'unjoined',
      solvedProblemIds: []
    }

    const updatedContest = await Contest.findOneAndUpdate(
      { contestCode: contestId },
      { $push: { participants: newParticipant } },
      { returnDocument: 'after' }
    )

    const newlyAdded = updatedContest!.participants[updatedContest!.participants.length - 1]

    res.status(201).json({
      participantId: newlyAdded._id,
      name: newlyAdded.name,
      joinedAt: newlyAdded.joinedAt
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /bulk — Admin batch import
router.post('/bulk', protect, async (req: AuthRequest & express.Request<ContestParams>, res) => {
  try {
    const { contestId } = req.params
    const teams = req.body.teams || []

    if (!Array.isArray(teams)) {
      res.status(400).json({ message: 'Invalid payload expected teams array' })
      return
    }

    const contest = await Contest.findOne({
      contestCode: contestId,
      adminId: req.adminId
    })

    if (!contest) {
      res.status(404).json({ message: 'Contest not found' })
      return
    }

    const created: any[] = []
    const success: { team: string }[] = []
    const failed: { team: string; reason: string }[] = []

    for (const t of teams) {
      if (!t.name || !t.password || !t.members || t.members.length === 0) {
        failed.push({ team: String(t.name || 'Unknown'), reason: 'Missing required fields' })
        continue
      }

      const teamName = String(t.name).trim()
      const existing = contest.participants.find((p: any) => p.name.toLowerCase() === teamName.toLowerCase())

      if (existing) {
        failed.push({ team: teamName, reason: 'Team already exists' })
        continue
      }

      const newParticipant = {
        name: teamName,
        password: t.password,
        members: t.members,
        status: 'unjoined',
        solvedProblemIds: []
      }

      created.push(newParticipant)
      contest.participants.push(newParticipant as any) // update local ref
      success.push({ team: teamName })
    }

    if (created.length > 0) {
      await Contest.updateOne(
        { contestCode: contestId },
        { $push: { participants: { $each: created } } }
      )
    }

    res.status(201).json({ success, failed })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /participants/:participantId/heartbeat
router.post('/participants/:participantId/heartbeat', async (req: express.Request<{ contestId: string; participantId: string }>, res) => {
  try {
    const { contestId, participantId } = req.params;
    const { status, compiles, wrongSubmissions, reveals, currentProblemId } = req.body;

    const contest = await Contest.findOne({ contestCode: contestId });
    if (!contest) {
      res.status(404).json({ message: 'Contest not found' });
      return;
    }

    const participant = contest.participants.id(participantId);
    if (!participant) {
      res.status(404).json({ message: 'Participant not found' });
      return;
    }

    if (status) participant.status = status;
    if (typeof compiles === 'number') participant.compiles = compiles;
    if (typeof wrongSubmissions === 'number') participant.wrongSubmissions = wrongSubmissions;
    if (typeof reveals === 'number') participant.reveals = reveals;
    if (currentProblemId) participant.currentProblemId = currentProblemId;

    participant.lastActive = new Date();

    await contest.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// POST /participants/:participantId/submit
router.post('/participants/:participantId/submit', async (req: express.Request<{ contestId: string; participantId: string }>, res) => {
  try {
    const { contestId, participantId } = req.params;
    const { passed, timeTaken, peeks, difficulty, problemId } = req.body;

    const contest = await Contest.findOne({ contestCode: contestId });
    if (!contest) return res.status(404).json({ message: 'Contest not found' });

    const participant = contest.participants.id(participantId);
    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    // Ensure we have a valid problem ID
    const targetProblemId = problemId || participant.currentProblemId;
    if (!targetProblemId) return res.status(400).json({ message: 'No problem context found' });

    // 1. Problem Stats Track Karo (Penalties ke liye)
    let pStat = participant.problemStats?.find((ps: any) => ps.problemId.toString() === targetProblemId.toString());
    if (!pStat) {
      participant.problemStats.push({ problemId: targetProblemId, reveals: 0, wrongSubmissions: 0 });
      pStat = participant.problemStats[participant.problemStats.length - 1];
    }

    // Safeguard reveals count
    if (peeks > pStat.reveals) {
      pStat.reveals = peeks;
    }

    // 2. Mark Solved / Update Wrong Submissions
    if (!passed) {
      participant.wrongSubmissions += 1;
      pStat.wrongSubmissions += 1;
    } else {
      if (!participant.solvedProblemIds) participant.solvedProblemIds = [];
      const problemIdStr = targetProblemId.toString();
      const alreadySolved = participant.solvedProblemIds.some((id: any) => id.toString() === problemIdStr);

      if (!alreadySolved) {
        participant.solvedProblemIds.push(targetProblemId);
      }
    }

    // ✨ THE BULLETPROOF SCORE ENGINE
    // Har submit par zero se refresh karo taaki koi legacy error na rahe
    let totalCalculatedScore = 0;

    // A. Har solved problem ke points add karo
    for (const solvedId of participant.solvedProblemIds) {
      const prob = await Problem.findById(solvedId);
      if (prob) {
        // Model uses 'Easy', 'Medium', 'Hard'. Using fallback math just in case points is missing.
        const d = String(prob.difficulty);
        const fallbackPoints = d === 'Easy' ? 100 : d === 'Medium' ? 200 : 300;
        totalCalculatedScore += (prob.points || fallbackPoints);
      }
    }

    // B. Saare problems ki penalties minus karo (Wrong -15, Reveal -5)
    for (const stat of participant.problemStats) {
      totalCalculatedScore -= (stat.wrongSubmissions * 15);
      totalCalculatedScore -= (stat.reveals * 5);
    }

    // C. Save final data
    participant.score = Math.max(0, totalCalculatedScore); // Score negative nahi jana chahiye
    participant.status = passed ? 'submitted' : 'coding';
    participant.lastActive = new Date();
    if (passed) participant.lastSubmitTime = new Date();

    contest.markModified('participants');
    await contest.save();

    // Trigger UI updates
    try {
      getIo().to(`admin_${contest.contestCode}`).emit('participant_update');
      getIo().to(`contest_${contest.contestCode}`).emit('participant_update');
    } catch (e) { }

    // 3. Response Dailog
    // Hum Frontend ko updated 'score' bhej rahe hain taaki wo local setScore(res.score) kar sake.
    // Isse inconsistency 0% ho jayegi.
    res.json({
      success: true,
      passed: passed,
      scoreEarned: participant.score, // Updated Total Score
      isAccepted: passed
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
export default router
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
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score // Sort by score descending
        
        // Tie-breaker: earlier lastActive is better (meaning they finished first)
        const timeA = a.lastActive ? new Date(a.lastActive).getTime() : 0;
        const timeB = b.lastActive ? new Date(b.lastActive).getTime() : 0;
        return timeA - timeB;
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
      { new: true }
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
    if (!contest) {
      res.status(404).json({ message: 'Contest not found' });
      return;
    }

    const participant = contest.participants.id(participantId);
    if (!participant) {
      res.status(404).json({ message: 'Participant not found' });
      return;
    }

    if (!passed) {
      participant.wrongSubmissions += 1;
      await contest.save();
      
      try {
        getIo().to(`admin_${contest.contestCode}`).emit('participant_update');
        getIo().to(`contest_${contest.contestCode}`).emit('participant_update');
      } catch (e) { }

      res.json({ success: true, passed: false });
      return;
    }

    // Fetch the actual problem to get explicit points and timeLimit
    const targetProblemId = problemId || participant.currentProblemId;
    let baseScore = 100;
    let timeLimit = 300;
    
    if (targetProblemId) {
      const actualProblem = await Problem.findById(targetProblemId);
      if (actualProblem) {
        baseScore = actualProblem.points || 100;
        timeLimit = actualProblem.timeLimit || 300;
      }
    } else {
      const diffLower = String(difficulty).toLowerCase();
      baseScore = diffLower === "easy" ? 100 : diffLower === "medium" ? 200 : 300;
    }

    // Remove time bonus to ensure points exactly match the question configuration
    // const timeBonus = Math.max(0, Math.floor((timeLimit - timeTaken) * 0.5));
    const peekPenalty = peeks * 20;
    // Don't let penalties reduce score below 0 for a correct submission
    const levelScore = Math.max(0, baseScore - peekPenalty);

    participant.score += levelScore;
    participant.status = 'submitted';
    participant.lastActive = new Date();

    // NAYA LOGIC: Add problem to solvedProblemIds array if not already present
    if (targetProblemId) {
      if (!participant.solvedProblemIds) {
        participant.solvedProblemIds = [];
      }
      // Check if it's already in the array to avoid duplicates
      const problemIdStr = targetProblemId.toString();
      const alreadySolved = participant.solvedProblemIds.some((id: any) => id.toString() === problemIdStr);

      if (!alreadySolved) {
        participant.solvedProblemIds.push(targetProblemId);
      }
    }

    contest.markModified('participants');
    await contest.save();

    try {
      getIo().to(`admin_${contest.contestCode}`).emit('participant_update');
      getIo().to(`contest_${contest.contestCode}`).emit('participant_update');
    } catch (e) { }

    res.json({ success: true, passed: true, scoreEarned: levelScore });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router
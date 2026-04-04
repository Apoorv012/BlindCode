import express from 'express'
import Contest, { ContestStatusEnum } from '../models/Contest'
import { protect, AuthRequest } from '../middleware/auth'
import { getIo } from '../socket'
import { recalculateScore } from '../scoreEngine'

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
// Lightweight — only syncs status, compiles, currentProblemId.
// Penalties (reveals, wrongSubmissions) are handled via socket 'apply_penalty'.
router.post('/participants/:participantId/heartbeat', async (req: express.Request<{ contestId: string; participantId: string }>, res) => {
  try {
    const { contestId, participantId } = req.params;
    const { status, compiles, currentProblemId } = req.body;

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
    const { passed, problemId } = req.body;

    // Step 1: If wrong submission, atomically increment the counter
    if (!passed) {
      await Contest.updateOne(
        { contestCode: contestId, 'participants._id': participantId },
        {
          $inc: { 'participants.$.wrongSubmissions': 1 },
          $set: {
            'participants.$.status': 'coding',
            'participants.$.lastActive': new Date()
          }
        }
      );
    }

    // Step 2: If passed, mark as solved
    if (passed) {
      const contest = await Contest.findOne({ contestCode: contestId });
      if (!contest) return res.status(404).json({ message: 'Contest not found' });

      const participant = contest.participants.id(participantId);
      if (!participant) return res.status(404).json({ message: 'Participant not found' });

      const targetProblemId = problemId || participant.currentProblemId;
      if (!targetProblemId) return res.status(400).json({ message: 'No problem context found' });

      if (!participant.solvedProblemIds) participant.solvedProblemIds = [];
      const alreadySolved = participant.solvedProblemIds.some(
        (id: any) => id.toString() === targetProblemId.toString()
      );

      if (!alreadySolved) {
        participant.solvedProblemIds.push(targetProblemId);
      }

      participant.status = 'submitted';
      participant.lastActive = new Date();
      participant.lastSubmitTime = new Date();

      contest.markModified('participants');
      await contest.save();
    }

    // Step 3: Read FRESH data and recalculate score
    const freshContest = await Contest.findOne({ contestCode: contestId });
    if (!freshContest) return res.status(404).json({ message: 'Contest not found' });

    const freshParticipant = freshContest.participants.id(participantId);
    if (!freshParticipant) return res.status(404).json({ message: 'Participant not found' });

    const newScore = await recalculateScore(freshParticipant);

    // Step 4: Atomic score update
    await Contest.updateOne(
      { contestCode: contestId, 'participants._id': participantId },
      { $set: { 'participants.$.score': newScore } }
    );

    // Step 5: Trigger UI updates
    try {
      getIo().to(`admin_${freshContest.contestCode}`).emit('participant_update');
      getIo().to(`contest_${freshContest.contestCode}`).emit('participant_update');
    } catch (e) { }

    // Step 6: Send backend score as source of truth
    res.json({
      success: true,
      passed: passed,
      scoreEarned: newScore,
      isAccepted: passed
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
export default router
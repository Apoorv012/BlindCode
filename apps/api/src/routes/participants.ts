import express from 'express'
import Contest, { ContestStatusEnum } from '../models/Contest'
import { protect, AuthRequest } from '../middleware/auth'

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

// POST /join (Public or Admin)
router.post('/join', async (req: express.Request<ContestParams>, res) => {
  try {
    const { contestId } = req.params
    const { name, password, members, addedByAdmin } = req.body

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
    
    // If it's an existing participant joining the lobby, check credentials
    if (existing && !addedByAdmin) {
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
        joinedAt: existing.joinedAt
      })
      return
    }

    if (existing && addedByAdmin) {
      res.status(400).json({ message: 'Team already exists' })
      return
    }

    // New Team registration by Admin
    if (!addedByAdmin) {
       res.status(400).json({ message: 'Only admin can create teams.' })
       return
    }

    const newParticipant = {
      name: name.trim(),
      password: password,
      members: members || [],
      addedByAdmin: true,
      status: 'unjoined'
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
        addedByAdmin: true,
        status: 'unjoined'
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

export default router

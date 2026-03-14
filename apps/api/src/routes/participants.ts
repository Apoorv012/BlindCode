// import express from 'express'
// import Participant from '../models/Participant'
// import Contest from '../models/Contest'

// const router = express.Router({ mergeParams: true })

// interface ContestParams {
//   contestId: string
// }

// // GET /contests/:contestId/participants
// router.get('/participants', async (req: express.Request<ContestParams>, res) => {
//   try {
//     const contest = await Contest.findOne({ contestCode: req.params.contestId })
//     if (!contest) {
//       res.status(404).json({ message: 'Contest not found' })
//       return
//     }
//     const participants = await Participant.find({ contestId: contest._id })
//       .populate('currentProblemId', 'title difficulty')
//     res.json(participants)
//   } catch {
//     res.status(500).json({ message: 'Server error' })
//   }
// })

// // POST /contests/:contestId/join
// router.post('/join', async (req: express.Request<ContestParams>, res) => {
//   try {
//     const { name, addedByAdmin } = req.body

//     const contest = await Contest.findOne({ contestCode: req.params.contestId })
//     if (!contest) {
//       res.status(404).json({ message: 'Contest not found' })
//       return
//     }

//     // Check duplicate name in same contest
//     const existing = await Participant.findOne({
//       contestId: contest._id,
//       name: { $regex: new RegExp(`^${name}$`, 'i') }
//     })
//     if (existing) {
//       res.status(400).json({ message: 'Participant already joined' })
//       return
//     }

//     const participant = await Participant.create({
//       contestId: contest._id,
//       name,
//       addedByAdmin: addedByAdmin || false,
//       status: 'idle'
//     })

//     res.status(201).json({
//       participantId: participant._id,
//       name: participant.name
//     })
//   } catch {
//     res.status(500).json({ message: 'Server error' })
//   }
// })

// export default router

import express from 'express'
import Participant from '../models/Participant'
import Contest from '../models/Contest'
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
    })
    if (!contest) {
      res.status(404).json({ message: 'Contest not found' })
      return
    }

    const participants = await Participant.find({ contestId: contest._id })
      .populate('currentProblemId', 'title difficulty')
      .sort({ joinedAt: 1 })

    res.json(participants)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /contests/:contestId/join
// Public — desktop client uses this (no admin token needed)
// Admin can also call this with { addedByAdmin: true }
router.post('/join', async (req: express.Request<ContestParams>, res) => {
  try {
    const { contestId } = req.params
    const { name, addedByAdmin } = req.body

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Name is required' })
      return
    }

    const contest = await Contest.findOne({ contestCode: contestId })
    if (!contest) {
      res.status(404).json({ message: 'Contest not found' })
      return
    }

    if (contest.status === 'ended') {
      res.status(400).json({ message: 'Contest has already ended' })
      return
    }

    // Check for duplicate name in same contest (case-insensitive)
    const existing = await Participant.findOne({
      contestId: contest._id,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    })
    if (existing) {
      res.status(400).json({ message: 'Participant already joined' })
      return
    }

    const participant = await Participant.create({
      contestId: contest._id,
      name: name.trim(),
      addedByAdmin: addedByAdmin || false,
      status: 'idle'
    })

    res.status(201).json({
      participantId: participant._id,
      name: participant.name,
      joinedAt: participant.joinedAt
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router

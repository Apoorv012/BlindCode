import express from 'express'
import Contest from '../models/Contest'
import Problem from '../models/Problem'
import { protect, AuthRequest } from '../middleware/auth'

const router = express.Router()

// Generate contest code e.g. BC4521
const generateContestCode = (): string => {
  return 'BC' + Math.floor(1000 + Math.random() * 9000)
}

// GET /contests — get all contests for this admin
router.get('/', protect, async (req: AuthRequest, res) => {
  try {
    const contests = await Contest.find({ adminId: req.adminId })
      .populate('problemIds')
      .sort({ createdAt: -1 })
    res.json(contests)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /contests — create contest
router.post('/', protect, async (req: AuthRequest, res) => {
  try {
    const contestCode = generateContestCode()
    const contest = await Contest.create({
      ...req.body,
      adminId: req.adminId,
      contestCode,
      status: 'draft'
    })
    res.status(201).json(contest)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /contests/:contestId — get single contest
router.get('/:contestId', protect, async (req: AuthRequest, res) => {
  try {
    const contest = await Contest.findOne({
      contestCode: req.params.contestId,
      adminId: req.adminId
    }).populate('problemIds')
    if (!contest) {
      res.status(404).json({ message: 'Contest not found' })
      return
    }
    res.json(contest)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /contests/:contestId/start
router.post('/:contestId/start', protect, async (req: AuthRequest, res) => {
  try {
    const contest = await Contest.findOneAndUpdate(
      { contestCode: req.params.contestId, adminId: req.adminId },
      { status: 'running', startedAt: new Date() },
      { new: true }
    )
    if (!contest) {
      res.status(404).json({ message: 'Contest not found' })
      return
    }
    res.json({ success: true, contest })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /contests/:contestId/pause
router.post('/:contestId/pause', protect, async (req: AuthRequest, res) => {
  try {
    const contest = await Contest.findOne({
      contestCode: req.params.contestId,
      adminId: req.adminId
    })
    if (!contest) {
      res.status(404).json({ message: 'Contest not found' })
      return
    }
    const newStatus = contest.status === 'running' ? 'paused' : 'running'
    contest.status = newStatus
    await contest.save()
    res.json({ status: newStatus })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /contests/:contestId/end
router.post('/:contestId/end', protect, async (req: AuthRequest, res) => {
  try {
    const contest = await Contest.findOneAndUpdate(
      { contestCode: req.params.contestId, adminId: req.adminId },
      { status: 'ended', endedAt: new Date() },
      { new: true }
    )
    if (!contest) {
      res.status(404).json({ message: 'Contest not found' })
      return
    }
    res.json({ success: true })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /contests/:contestId/problems — add problem to contest
router.post('/:contestId/problems', protect, async (req: AuthRequest, res) => {
  try {
    const { problemCode } = req.body
    const problem = await Problem.findOne({
      code: problemCode,
      adminId: req.adminId
    })
    if (!problem) {
      res.status(404).json({ message: 'Problem not found' })
      return
    }
    const contest = await Contest.findOneAndUpdate(
      { contestCode: req.params.contestId, adminId: req.adminId },
      { $addToSet: { problemIds: problem._id } },
      { new: true }
    ).populate('problemIds')
    res.json(contest)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE /contests/:contestId/problems/:problemId — remove problem
router.delete('/:contestId/problems/:problemId', protect, async (req: AuthRequest, res) => {
  try {
    const contest = await Contest.findOneAndUpdate(
      { contestCode: req.params.contestId, adminId: req.adminId },
      { $pull: { problemIds: req.params.problemId } },
      { new: true }
    ).populate('problemIds')
    res.json(contest)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
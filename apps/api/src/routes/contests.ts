import express from 'express'
import Contest, { ContestStatusEnum } from '../models/Contest'
import Problem from '../models/Problem'
import { protect, AuthRequest } from '../middleware/auth'
import mongoose from 'mongoose'
import { getIo } from '../socket'

const router = express.Router()

// Generate contest code e.g. BC4521
const generateContestCode = (): string => {
  return 'BC' + Math.floor(1000 + Math.random() * 9000)
}

// ─── Public routes (no auth — for desktop user app) ──────────────────────────

// GET /contests/code/:contestCode — look up contest by code (used by user app)
router.get('/code/:contestCode', async (req, res) => {
  try {
    const contest = await Contest.findOne({
      contestCode: req.params.contestCode.toUpperCase()
    }).populate('problemIds', 'title difficulty')
    if (!contest) {
      res.status(404).json({ message: 'Invalid contest code. Please check and try again.' })
      return
    }
    if (contest.status === ContestStatusEnum.ended) {
      res.status(400).json({ message: 'This contest has already ended.' })
      return
    }
    res.json(contest)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── Admin protected routes ───────────────────────────────────────────────────

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
      status: ContestStatusEnum.draft
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

// POST /contests/:contestId/start — sets status to 'running' (user app polls for this)
router.post('/:contestId/start', protect, async (req: AuthRequest, res) => {
  try {
    const contestDoc = await Contest.findOne({ contestCode: req.params.contestId, adminId: req.adminId })
    if (!contestDoc) {
      res.status(404).json({ message: 'Contest not found' })
      return
    }

    const now = new Date()
    // intendedEndTime = startedAt + duration (in minutes)
    const intendedEndTime = new Date(now.getTime() + contestDoc.duration * 60 * 1000)

    contestDoc.status = ContestStatusEnum.running
    contestDoc.startedAt = now
    contestDoc.intendedEndTime = intendedEndTime

    await contestDoc.save()

    // Notify all clients (admin + participants) about the updated contest timing
    try {
      const io = getIo();
      io.to(`admin_${contestDoc.contestCode}`).emit('contest_update');
      io.to(`contest_${contestDoc.contestCode}`).emit('contest_update');
    } catch {}

    res.json({ success: true, contest: contestDoc })
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

    const now = new Date()

    if (contest.status === ContestStatusEnum.running) {
      // Pausing: record when we paused
      contest.status = ContestStatusEnum.paused
      contest.pausedAt = now
    } else if (contest.status === ContestStatusEnum.paused && contest.pausedAt) {
      // Resuming: shift intendedEndTime by however long we were paused
      const pauseDurationMs = now.getTime() - contest.pausedAt.getTime()
      if (contest.intendedEndTime) {
        contest.intendedEndTime = new Date(contest.intendedEndTime.getTime() + pauseDurationMs)
      }
      contest.status = ContestStatusEnum.running
      contest.pausedAt = undefined
    }

    await contest.save()

    // Notify all clients (admin + participants) so they pick up the new status + intendedEndTime
    try {
      const io = getIo();
      io.to(`admin_${contest.contestCode}`).emit('contest_update');
      io.to(`contest_${contest.contestCode}`).emit('contest_update');
    } catch {}

    res.json({ status: contest.status, intendedEndTime: contest.intendedEndTime })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /contests/:contestId/end
router.post('/:contestId/end', protect, async (req: AuthRequest, res) => {
  try {
    const contest = await Contest.findOneAndUpdate(
      { contestCode: req.params.contestId, adminId: req.adminId },
      { status: ContestStatusEnum.ended, endedAt: new Date() },
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
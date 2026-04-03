import express from 'express'
import Problem from '../models/Problem'
import { protect, AuthRequest } from '../middleware/auth'

const router = express.Router()

// Generate next problem code e.g. PROB001
const generateCode = async (): Promise<string> => {
  const lastProblem = await Problem.findOne({}, { code: 1 }).sort({ code: -1 })
  if (!lastProblem || !lastProblem.code) {
    return 'PROB001'
  }
  const lastCode = lastProblem.code
  const numPart = lastCode.replace('PROB', '')
  const nextNum = (parseInt(numPart) || 0) + 1
  return `PROB${String(nextNum).padStart(3, '0')}`
}

// GET /problems/:id/public — fetch full problem for desktop app (no auth required)
router.get('/:id/public', async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id)
    if (!problem) {
      res.status(404).json({ message: 'Problem not found' })
      return
    }
    res.json(problem)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error', error: err })
  }
})

// GET /problems — get all problems for this admin
router.get('/', protect, async (req: AuthRequest, res) => {
  try {
    const problems = await Problem.find({ adminId: req.adminId })
    res.json(problems)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error', error: err })

  }
})

// POST /problems — create problem
router.post('/', protect, async (req: AuthRequest, res) => {
  try {
    const code = await generateCode()
    const problem = await Problem.create({
      ...req.body,
      adminId: req.adminId,
      code
    })
    res.status(201).json(problem)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error', error: err })
  }
})

// PUT /problems/:id — update problem
router.put('/:id', protect, async (req: AuthRequest, res) => {
  try {
    const problem = await Problem.findOneAndUpdate(
      { _id: req.params.id, adminId: req.adminId },
      req.body,
      { returnDocument: 'after' }
    )
    if (!problem) {
      res.status(404).json({ message: 'Problem not found' })
      return
    }
    res.json(problem)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error', error: err })
  }
})

// DELETE /problems/:id — delete problem
router.delete('/:id', protect, async (req: AuthRequest, res) => {
  try {
    const problem = await Problem.findOneAndDelete({
      _id: req.params.id,
      adminId: req.adminId
    })
    if (!problem) {
      res.status(404).json({ message: 'Problem not found' })
      return
    }
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error', error: err })
  }
})

export default router

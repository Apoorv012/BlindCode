import express from 'express'
import Problem from '../models/Problem'
import { protect, AuthRequest } from '../middleware/auth'

const router = express.Router()

// Generate next problem code e.g. PROB001
const generateCode = async (): Promise<string> => {
  const count = await Problem.countDocuments()
  return `PROB${String(count + 1).padStart(3, '0')}`
}

// GET /problems — get all problems for this admin
router.get('/', protect, async (req: AuthRequest, res) => {
  try {
    const problems = await Problem.find({ adminId: req.adminId })
    res.json(problems)
  } catch {
    res.status(500).json({ message: 'Server error' })
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
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /problems/:id — update problem
router.put('/:id', protect, async (req: AuthRequest, res) => {
  try {
    const problem = await Problem.findOneAndUpdate(
      { _id: req.params.id, adminId: req.adminId },
      req.body,
      { new: true }
    )
    if (!problem) {
      res.status(404).json({ message: 'Problem not found' })
      return
    }
    res.json(problem)
  } catch {
    res.status(500).json({ message: 'Server error' })
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
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
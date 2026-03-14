import mongoose from 'mongoose'

const contestSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  contestCode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  duration: { type: Number, required: true },
  problemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Problem' }],
  status: { type: String, enum: ['draft', 'running', 'paused', 'ended'], default: 'draft' },
  createdAt: { type: Date, default: Date.now },
  startedAt: Date,
  endedAt: Date
})

export default mongoose.model('Contest', contestSchema)
import mongoose from 'mongoose'

const participantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  addedByAdmin: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now }
})

const contestSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  contestCode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  duration: { type: Number, required: true },
  problemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Problem' }],
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'ended'],
    default: 'draft'
  },
  participants: [participantSchema],
  createdAt: { type: Date, default: Date.now },
  startedAt: Date,
  endedAt: Date
})

export default mongoose.model('Contest', contestSchema)
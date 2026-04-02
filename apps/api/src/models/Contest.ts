import mongoose from 'mongoose'

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  enroll: { type: Number, required: true }
}, { _id: false })

const participantSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  members: [memberSchema],
  joinedAt: { type: Date, default: Date.now },
  addedByAdmin: { type: Boolean, default: false },
  status: { type: String, enum: ['online', 'offline', 'unjoined'], default: 'unjoined' },
  currentProblemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
  reveals: { type: Number, default: 0 },
  compiles: { type: Number, default: 0 },
  wrongSubmissions: { type: Number, default: 0 },
  lastActive: { type: Date }
})

const contestSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  contestCode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  duration: { type: Number, required: true },
  problemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Problem' }],
  participants: [participantSchema],
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'ended'],
    default: 'draft'
  },
  createdAt: { type: Date, default: Date.now },
  startedAt: Date,
  endedAt: Date
})

export default mongoose.model('Contest', contestSchema)
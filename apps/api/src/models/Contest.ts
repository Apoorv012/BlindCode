import mongoose from 'mongoose'

export enum ContestStatusEnum {
  running = 'running',
  ended = 'ended',
  draft = 'draft',
  paused = 'paused'
}

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  enroll: { type: Number, required: true }
}, { _id: false })

const participantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  password: { type: String, required: true },
  members: [memberSchema],
  joinedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['online', 'offline', 'unjoined', 'coding', 'idle', 'submitted'], default: 'unjoined' },
  currentProblemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
  reveals: { type: Number, default: 0 },
  compiles: { type: Number, default: 0 },
  wrongSubmissions: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
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
    enum: Object.values(ContestStatusEnum),
    default: ContestStatusEnum.draft
  },
  createdAt: { type: Date, default: Date.now },
  startedAt: Date,
  endedAt: Date,
  intendedEndTime: Date
})

export default mongoose.model('Contest', contestSchema)
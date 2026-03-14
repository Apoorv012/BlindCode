import mongoose from 'mongoose'

const participantSchema = new mongoose.Schema({
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: true },
  name: { type: String, required: true },
  joinedAt: { type: Date, default: Date.now },
  addedByAdmin: { type: Boolean, default: false },
  status: { type: String, enum: ['coding', 'idle', 'submitted', 'offline'], default: 'idle' },
  currentProblemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
  reveals: { type: Number, default: 0 },
  compiles: { type: Number, default: 0 },
  wrongSubmissions: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now }
})

export default mongoose.model('Participant', participantSchema)
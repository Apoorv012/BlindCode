import mongoose from 'mongoose'

const problemSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  code: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  tags: [String],
  description: String,
  inputFormat: String,
  outputFormat: String,
  constraints: String,
  testCases: [{
    input: String,
    output: String,
    explanation: String
  }],
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.model('Problem', problemSchema)
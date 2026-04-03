import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { connectDB } from './db'
import authRoutes from './routes/auth'
import problemRoutes from './routes/problems'
import contestRoutes from './routes/contests'
import participantRoutes from './routes/participants'
import resultRoutes from './routes/results'

import http from 'http'
import { initSocket } from './socket'

dotenv.config()

const app = express()
const server = http.createServer(app)
initSocket(server)

app.use(
  cors({
    origin: ['*'],
    credentials: true
  })
)
app.use(express.json())

app.get('/', (req, res) => {
  res.send('BlindCode API running')
})

app.get('/health', (req, res) => {
  res.status(200).send('OK')
})

app.use('/auth', authRoutes)
app.use('/problems', problemRoutes)
app.use('/contests', contestRoutes)
app.use('/contests/:contestId', participantRoutes)
app.use('/contests/:contestId', resultRoutes)

const PORT = process.env.PORT || 4000

// Start server ONLY after DB is connected
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('DB connection failed:', err)
    process.exit(1)
  })

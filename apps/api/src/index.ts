// import express from "express";
// import cors from 'cors'
// import dotenv from 'dotenv'
// import { connectDB } from './db'
// import authRoutes from './routes/auth'
// import problemRoutes from './routes/problems'
// import contestRoutes from './routes/contests'
// import participantRoutes from './routes/participants'
// import resultRoutes from './routes/results'

// dotenv.config()

// const app = express();

// app.use(cors())
// app.use(express.json())

// app.get("/", (req, res) => {
//   res.send("BlindCode API running");
// });

// // Routes
// app.use('/auth', authRoutes)
// app.use('/problems', problemRoutes)
// app.use('/contests', contestRoutes)
// app.use('/contests/:contestId', participantRoutes)
// app.use('/contests/:contestId', resultRoutes)


// const PORT = process.env.PORT || 4000

// // connectDB().then(() => {
// //   app.listen(PORT, () => {
// //     console.log(`Server running on port ${PORT}`)
// //   })
// // })
// connectDB()

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`)
// })
// // app.listen(4000, () => {
// //   console.log("API running on port 4000");
// // });


import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { connectDB } from './db'
import authRoutes from './routes/auth'
import problemRoutes from './routes/problems'
import contestRoutes from './routes/contests'
import participantRoutes from './routes/participants'
import resultRoutes from './routes/results'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('BlindCode API running')
})

app.use('/auth', authRoutes)
app.use('/problems', problemRoutes)
app.use('/contests', contestRoutes)
app.use('/contests/:contestId', participantRoutes)
app.use('/contests/:contestId', resultRoutes)

const PORT = process.env.PORT || 4000

// Start server ONLY after DB is connected
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
})

// import mongoose from 'mongoose'
// import dotenv from 'dotenv'

// dotenv.config()

// export const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGODB_URI!)
//     console.log('MongoDB connected!')
//   } catch (error) {
//     console.error('MongoDB connection failed:', error)
//     // process.exit(1)
//   }
// }



import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

export const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGODB_URI
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in .env')
    }
    await mongoose.connect(uri)
    console.log('MongoDB connected!')
  } catch (error) {
    console.error('MongoDB connection failed:', error)
    process.exit(1)
  }
}

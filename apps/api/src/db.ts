import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

export const connectDB = async (): Promise<void> => {
  try {
    const ENV = process.env.ENV;
    const uri = ENV === "LOCAL" ? process.env.MONGODB_URI_LOCAL : process.env.MONGODB_URI_CLOUD;

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

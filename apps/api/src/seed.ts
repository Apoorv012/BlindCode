/**
 * Seed script — creates your first admin account
 * Run once: npx ts-node apps/api/src/seed.ts
 *
 * Or with tsx: npx tsx apps/api/src/seed.ts
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function seed() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI not set in .env')
    process.exit(1)
  }

  await mongoose.connect(uri)
  console.log('Connected to MongoDB')

  // Import model after connecting
  const Admin = (await import('./models/Admin')).default

  const name = 'admin'
  const email = 'admin@blindcode.local'
  const password = 'blindcode123'

  const existing = await Admin.findOne({ $or: [{ email }, { name }] })
  if (existing) {
    console.log('Admin already exists:', existing.email)
    await mongoose.disconnect()
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const admin = await Admin.create({ name, email, passwordHash })

  console.log('✅ Admin created!')
  console.log('   Name:    ', admin.name)
  console.log('   Email:   ', admin.email)
  console.log('   Password:', password)
  console.log('')
  console.log('Login at http://localhost:5173/login')
  console.log('Username: admin')
  console.log('Password: blindcode123')

  await mongoose.disconnect()
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})

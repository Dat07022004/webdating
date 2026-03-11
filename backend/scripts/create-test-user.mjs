import dotenv from 'dotenv'


import mongoose from 'mongoose'
import { User } from '../src/models/user.model.js'

dotenv.config()

const run = async () => {
  await mongoose.connect(process.env.DATABASE_URL)

  const suffix = Date.now().toString().slice(-6)
  const payload = {
    email: `user${suffix}@example.com`,
    name: `User ${suffix}`,
    clerkId: `local_test_${suffix}`,
    age: 24,
    gender: 'other',
    region: 'Ha Noi',
    interests: ['music', 'coffee'],
    onboardingCompleted: true,
  }

  const exists = await User.findOne({ email: payload.email })
  const user = exists || (await User.create(payload))

  console.log(
    JSON.stringify(
      {
        created: !exists,
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        clerkId: user.clerkId,
      },
      null,
      2,
    ),
  )

  await mongoose.disconnect()
}

run().catch(async (error) => {
  console.error(error.message)
  try {
    await mongoose.disconnect()
  } catch {
    // ignore disconnect error on failure path
  }
  process.exit(1)
})

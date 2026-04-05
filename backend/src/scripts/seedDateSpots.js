import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { Location } from '../models/appointments.model.js';

const seedData = [
  {
    name: 'The Cozy Bean Cafe',
    address: 'District 1, Ho Chi Minh City',
    category: 'cafe',
    averagePrice: 120000,
    openingHours: { open: '08:00', close: '22:00' },
  },
  {
    name: 'Riverside Italian Bistro',
    address: 'District 2, Ho Chi Minh City',
    category: 'restaurant',
    averagePrice: 320000,
    openingHours: { open: '10:00', close: '23:00' },
  },
  {
    name: 'Moonlight Cinema',
    address: 'District 7, Ho Chi Minh City',
    category: 'cinema',
    averagePrice: 180000,
    openingHours: { open: '09:00', close: '23:30' },
  },
  {
    name: 'Green Lake Park',
    address: 'Thu Duc City',
    category: 'park',
    averagePrice: 50000,
    openingHours: { open: '05:30', close: '21:00' },
  },
];

async function seed() {
  try {
    await connectDB();

    for (const item of seedData) {
      await Location.updateOne(
        { name: item.name, address: item.address },
        { $set: item },
        { upsert: true }
      );
    }

    console.log(`Seeded ${seedData.length} date spots into ${ENV.MONGODB_URI}`);
  } catch (err) {
    console.error('Failed to seed date spots:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

seed();

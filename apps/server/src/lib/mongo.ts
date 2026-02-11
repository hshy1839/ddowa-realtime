import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable not set');
}

const MONGODB_URI_SAFE: string = MONGODB_URI;

let connected = false;

export async function connectMongo() {
  if (connected) return mongoose;

  await mongoose.connect(MONGODB_URI_SAFE, {
    dbName: process.env.MONGODB_DB || undefined,
  });

  connected = true;
  return mongoose;
}

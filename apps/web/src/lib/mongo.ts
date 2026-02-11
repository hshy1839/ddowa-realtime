import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable not set');
}

const MONGODB_URI_SAFE: string = MONGODB_URI;

// Global cache to prevent creating multiple connections in dev/hot-reload
declare global {
  // eslint-disable-next-line no-var
  var __mongooseConn: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

const cached = global.__mongooseConn || (global.__mongooseConn = { conn: null, promise: null });

export async function connectMongo(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI_SAFE, {
        dbName: process.env.MONGODB_DB || undefined,
      })
      .then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

import mongoose from 'mongoose';

type MongoCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __tmsMongoCache: MongoCache | undefined;
}

const MONGODB_URI = (process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();

const cached = global.__tmsMongoCache || { conn: null, promise: null };
if (!global.__tmsMongoCache) {
  global.__tmsMongoCache = cached;
}

export async function connectMongo() {
  if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI (or MONGO_URI) for test subdomain.');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 20,
      minPoolSize: 3,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}


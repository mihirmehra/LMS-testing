// lib/mongodb.ts
import { MongoClient, Db } from 'mongodb';

// Ensure MONGODB_URI is defined
if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;

// Set the connection pool size
const options = {
  // It is recommended to let the native driver manage its connection pool
  // based on its defaults, but keeping your explicit options below.
  maxPoolSize: 5, // Change this number to your desired maximum pool size
  minPoolSize: 1, // Optional: The minimum number of connections to maintain
};

// Extend the global object to hold the cached connection promise.
// This is necessary to prevent multiple connections during Next.js hot-reloads (dev)
// and across serverless function instances (prod).
let globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Use a single pattern that works for both development and production.
if (!globalWithMongo._mongoClientPromise) {
  // Create a new client and connection promise only if one does not exist
  client = new MongoClient(uri, options);
  globalWithMongo._mongoClientPromise = client.connect();
}

// Store the client promise (either the newly created one or the cached one)
clientPromise = globalWithMongo._mongoClientPromise;

/**
 * Returns a promise that resolves to the database instance.
 * You should call this function in your API routes/components to get a connected DB instance.
 */
export async function getDatabase(): Promise<Db> {
  try {
    const client = await clientPromise;
    // NOTE: You might want to get the database name from an environment variable (e.g., MONGODB_DB_NAME)
    // instead of hardcoding 'realestate_crm'.
    return client.db('realestate_crm');
  } catch (error) {
    // In a production environment on platforms like Vercel, a failed
    // connection should often be allowed to throw to get a 500 error.
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export default clientPromise;
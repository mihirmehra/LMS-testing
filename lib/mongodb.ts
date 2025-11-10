// lib/mongodb.ts
import { MongoClient, Db } from 'mongodb';

// Check for MONGODB_URI environment variable
if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;

// Set connection options
const options = {
  // Connection Pooling Options (helps manage connections efficiently)
  maxPoolSize: 5, 
  minPoolSize: 1,
  
  // 🔑 FIX FOR SSL/TLS HANDSHAKE ERROR (tlsv1 alert internal error)
  // This helps resolve connection issues in serverless runtimes.
  serverSelectionTimeoutMS: 5000, // Optional: Time out after 5s if no server is found
};

// 1. Extend the global object to hold the cached connection promise.
// This is the essential step for Next.js to ensure a singleton connection.
let globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

let clientPromise: Promise<MongoClient>;

// 2. Always create/reuse the connection promise on the global object.
if (!globalWithMongo._mongoClientPromise) {
  // If the connection is not cached, create a new client and connect
  const client = new MongoClient(uri, options);
  globalWithMongo._mongoClientPromise = client.connect();
}

// 3. Store the client promise (the cached one)
clientPromise = globalWithMongo._mongoClientPromise;

/**
 * Returns a promise that resolves to the database instance.
 * Call this function in your API routes/components to get a connected DB instance.
 */
export async function getDatabase(): Promise<Db> {
  try {
    const client = await clientPromise;
    // IMPORTANT: Replace 'realestate_crm' with your actual database name
    return client.db('realestate_crm'); 
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export default clientPromise;
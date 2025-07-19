// lib/dev-db/push-devices.ts (updated for MongoDB)

import { getDatabase } from '@/lib/mongodb';
import { Collection, ObjectId } from 'mongodb';

const COLLECTION_NAME = 'deviceRegistrations';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Update the DeviceRegistration interface to reflect how it's stored in MongoDB
// 'id' will now explicitly be your client-generated UUID.
// MongoDB's internal _id will be separate, but we'll map it to 'mongoId' when retrieving.
export interface DeviceRegistration {
  id: string; // This will be your client-generated UUID (from uuidv4)
  mongoId?: string; // Optional: To expose MongoDB's _id as a string when retrieved
  userId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  pushSubscription: PushSubscription;
  registeredAt: Date;
  lastUsed: Date;
  isActive: boolean;
}

// Define the MongoDB document structure including the internal _id and your UUID
interface DeviceDocument {
  _id: ObjectId;
  id: string; // Your client-generated UUID
  userId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  pushSubscription: PushSubscription;
  registeredAt: Date;
  lastUsed: Date;
  isActive: boolean;
}

// Helper function to get the MongoDB collection
async function getDeviceCollection(): Promise<Collection<Omit<DeviceDocument, '_id'>>> {
  const db = await getDatabase();
  return db.collection<Omit<DeviceDocument, '_id'>>(COLLECTION_NAME);
}

// --- CRUD Operations ---

export const getDeviceRegistrations = async (): Promise<DeviceRegistration[]> => {
  try {
    const collection = await getDeviceCollection();
    const devices = await collection.find({}).toArray();
    // Map MongoDB document to your DeviceRegistration interface
    return devices.map(d => ({
      id: d.id, // This is your client-generated UUID
      mongoId: d._id.toHexString(), // Expose MongoDB's internal _id if needed
      userId: d.userId,
      deviceName: d.deviceName,
      deviceType: d.deviceType,
      pushSubscription: d.pushSubscription,
      registeredAt: d.registeredAt,
      lastUsed: d.lastUsed,
      isActive: d.isActive,
    }));
  } catch (error) {
    console.error('Error getting device registrations from DB:', error);
    return [];
  }
};

// addDeviceRegistration now accepts a payload without the _id,
// and we'll ensure Dates are proper Date objects for MongoDB
export const addDeviceRegistration = async (newDevice: DeviceRegistration): Promise<DeviceRegistration> => {
  try {
    const collection = await getDeviceCollection();
    // Create the document for MongoDB. MongoDB will auto-generate _id.
    const documentToInsert: Omit<DeviceDocument, '_id'> = {
      id: newDevice.id, // Use the client-generated UUID here
      userId: newDevice.userId,
      deviceName: newDevice.deviceName,
      deviceType: newDevice.deviceType,
      pushSubscription: newDevice.pushSubscription,
      // Ensure these are Date objects, not strings, for MongoDB
      registeredAt: new Date(newDevice.registeredAt),
      lastUsed: new Date(newDevice.lastUsed),
      isActive: newDevice.isActive,
    };

    const result = await collection.insertOne(documentToInsert);

    // Return the new device with the MongoDB-generated _id as mongoId for clarity
    return {
      ...newDevice,
      mongoId: result.insertedId.toHexString(), // Map MongoDB's _id to mongoId
    };
  } catch (error) {
    console.error('Error adding device registration to DB:', error);
    throw error;
  }
};

export const updateDeviceRegistration = async (updatedDevice: DeviceRegistration): Promise<boolean> => {
  try {
    const collection = await getDeviceCollection();
    // Query by your client-generated 'id' (UUID), not MongoDB's _id if you're using UUIDs for lookups
    // If you prefer to use MongoDB's _id for updates, then updatedDevice must contain mongoId.
    // Assuming 'id' (UUID) is your primary lookup key now.
    const { id, mongoId, ...updates } = updatedDevice; // Destructure mongoId if it exists

    const result = await collection.updateOne(
      { id: id }, // Query by your client-generated UUID
      { $set: { ...updates, lastUsed: new Date(updates.lastUsed), registeredAt: new Date(updates.registeredAt) } } // Ensure dates are updated as Date objects
    );
    return result.matchedCount > 0;
  } catch (error) {
    console.error('Error updating device registration in DB:', error);
    throw error;
  }
};

export const deleteDeviceRegistration = async (id: string): Promise<boolean> => {
  try {
    const collection = await getDeviceCollection();
    // Query by your client-generated 'id' (UUID)
    const result = await collection.deleteOne({ id: id });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting device registration from DB:', error);
    throw error;
  }
};

export const findDeviceByEndpoint = async (endpoint: string): Promise<DeviceRegistration | undefined> => {
  try {
    const collection = await getDeviceCollection();
    const device = await collection.findOne({ 'pushSubscription.endpoint': endpoint });
    if (device) {
      // Map MongoDB document to your DeviceRegistration interface
      return {
        id: device.id, // Your client-generated UUID
        mongoId: device._id.toHexString(), // Expose MongoDB's internal _id
        userId: device.userId,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        pushSubscription: device.pushSubscription,
        registeredAt: device.registeredAt,
        lastUsed: device.lastUsed,
        isActive: device.isActive,
      };
    }
    return undefined;
  } catch (error) {
    console.error('Error finding device by endpoint in DB:', error);
    return undefined;
  }
};
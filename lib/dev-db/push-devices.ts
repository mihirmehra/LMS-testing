// lib/dev-db/push-devices.ts
// This file provides database operations for device registrations using MongoDB.

import { Collection, ObjectId, Document } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { DeviceRegistration, PushSubscription } from '@/types/device';

const COLLECTION_NAME = 'device_registrations';

async function getDeviceCollection(): Promise<Collection<Document>> {
  const db = await getDatabase();
  return db.collection<Document>(COLLECTION_NAME);
}

function mapToDeviceRegistration(doc: Document | null): DeviceRegistration {
  if (!doc) {
    throw new Error("Cannot map a null document to DeviceRegistration.");
  }
  if (!doc._id || !(doc._id instanceof ObjectId)) {
    throw new Error("Document missing valid _id for mapping.");
  }

  const mappedDoc: DeviceRegistration = {
    ...(doc as any),
    id: doc._id.toHexString(),
    mongoId: doc._id.toHexString(),
    createdAt: (doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt) as string,
    updatedAt: (doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt) as string,
  };
  delete (mappedDoc as any)._id;
  return mappedDoc;
}

/**
 * Adds a new device registration or updates an existing one if the endpoint already exists for the user.
 * This function handles idempotency for device registration.
 *
 * @param deviceData - The partial device registration data to add or update.
 * @returns A Promise that resolves to an object containing the DeviceRegistration and a boolean
 * indicating if a new device was created (`created: true`) or an existing one was updated (`created: false`).
 * @throws Error if subscription endpoint is missing or if database operations fail.
 */
export async function addOrUpdateDeviceRegistration(
  deviceData: Omit<DeviceRegistration, 'id' | 'mongoId' | '_id' | 'createdAt' | 'updatedAt'>
): Promise<{ device: DeviceRegistration; created: boolean }> { // <--- MODIFIED RETURN TYPE
  const collection = await getDeviceCollection();
  const now = new Date();

  if (!deviceData.subscription || !deviceData.subscription.endpoint) {
    throw new Error('Device subscription endpoint is required for registration.');
  }

  const existingDevice = await collection.findOne({
    userId: deviceData.userId,
    'subscription.endpoint': deviceData.subscription.endpoint,
  });

  let finalRawDoc: Document | null = null;
  let wasCreated = false; // Flag to indicate if a new device was created

  if (existingDevice) {
    console.log(`Found existing device for user ${deviceData.userId} with endpoint ${deviceData.subscription.endpoint}. Updating...`);
    await collection.updateOne(
      { _id: existingDevice._id },
      {
        $set: {
          deviceName: deviceData.deviceName,
          deviceType: deviceData.deviceType,
          subscription: deviceData.subscription,
          isActive: true,
          updatedAt: now,
        },
      }
    );
    finalRawDoc = await collection.findOne({ _id: existingDevice._id });
    if (!finalRawDoc) {
      console.error(`Failed to retrieve updated device document for _id: ${existingDevice._id.toHexString()}`);
      throw new Error('Failed to retrieve updated device document after update operation.');
    }
    console.log(`Updated device registration: ${mapToDeviceRegistration(finalRawDoc).id}`);
    wasCreated = false; // It was an update
  } else {
    console.log(`No existing device found for user ${deviceData.userId} with endpoint ${deviceData.subscription.endpoint}. Adding new...`);
    const docToInsert: Document = {
      ...deviceData,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    const insertResult = await collection.insertOne(docToInsert);

    if (!insertResult.acknowledged) {
      throw new Error('Failed to acknowledge insertion of new device registration.');
    }
    finalRawDoc = await collection.findOne({ _id: insertResult.insertedId });
    if (!finalRawDoc) {
      console.error(`Failed to retrieve inserted device document for _id: ${insertResult.insertedId.toHexString()}`);
      throw new Error('Failed to retrieve newly inserted device document after insertion.');
    }
    console.log(`Added new device registration: ${mapToDeviceRegistration(finalRawDoc).id}`);
    wasCreated = true; // It was a new creation
  }

  return {
    device: mapToDeviceRegistration(finalRawDoc),
    created: wasCreated,
  };
}

// Keep all other functions (getDeviceRegistrationsByUserId, getDeviceRegistrationById, updateDeviceRegistration, deleteDeviceRegistration, findDeviceByEndpoint) as they were in the previous complete file.
// I'm omitting them here for brevity, but they should remain in your push-devices.ts file.

// lib/dev-db/push-devices.ts (Continuation of previous functions)
/**
 * Retrieves all active device registrations for a specific user.
 * @param userId - The ID of the user whose devices to retrieve.
 * @returns A Promise that resolves to an array of DeviceRegistration objects.
 */
export async function getDeviceRegistrationsByUserId(userId: string): Promise<DeviceRegistration[]> {
  const collection = await getDeviceCollection();
  const rawDevices = await collection.find({ userId: userId, isActive: true }).toArray();
  return rawDevices.map(mapToDeviceRegistration);
}

/**
 * Retrieves a single device registration by its stringified MongoDB _id.
 * @param deviceId - The stringified MongoDB _id of the device.
 * @returns A Promise that resolves to the DeviceRegistration object if found, otherwise null.
 */
export async function getDeviceRegistrationById(deviceId: string): Promise<DeviceRegistration | null> {
  const collection = await getDeviceCollection();
  if (!ObjectId.isValid(deviceId)) {
    console.warn(`Attempted to retrieve with invalid ObjectId string: ${deviceId}`);
    return null;
  }
  const rawDoc = await collection.findOne({ _id: new ObjectId(deviceId) });
  if (rawDoc) {
    return mapToDeviceRegistration(rawDoc);
  }
  return null;
}

/**
 * Updates an existing device registration in the database based on its stringified MongoDB _id.
 * @param device - The DeviceRegistration object containing the fields to update and the identifier.
 * @returns A Promise that resolves to true if the device was modified, false otherwise.
 */
export async function updateDeviceRegistration(device: DeviceRegistration): Promise<boolean> {
  const collection = await getDeviceCollection();
  if (!device.mongoId && !device.id) {
    throw new Error('Device must have mongoId or id for update operation.');
  }
  const queryId = device.mongoId || device.id;
  if (typeof queryId !== 'string' || !ObjectId.isValid(queryId)) {
    console.warn(`Attempted to update with an invalid ObjectId string: ${queryId}. Update aborted.`);
    return false;
  }
  const result = await collection.updateOne(
    { _id: new ObjectId(queryId) },
    {
      $set: {
        userId: device.userId,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        subscription: device.subscription,
        isActive: device.isActive,
        updatedAt: new Date(),
      }
    }
  );
  return result.modifiedCount > 0;
}

/**
 * Deletes a device registration from the database based on its stringified MongoDB _id.
 * @param deviceId - The stringified MongoDB _id of the device to delete.
 * @returns A Promise that resolves to true if the device was deleted, false otherwise.
 */
export async function deleteDeviceRegistration(deviceId: string): Promise<boolean> {
  const collection = await getDeviceCollection();
  if (!ObjectId.isValid(deviceId)) {
    console.warn(`Attempted to delete with an invalid ObjectId string: ${deviceId}. Delete aborted.`);
    return false;
  }
  const result = await collection.deleteOne({ _id: new ObjectId(deviceId) });
  return result.deletedCount > 0;
}

/**
 * Finds a device registration by its push subscription endpoint.
 * @param endpoint - The unique endpoint URL of the push subscription.
 * @returns A Promise that resolves to the DeviceRegistration object if found, otherwise null.
 */
export async function findDeviceByEndpoint(endpoint: string): Promise<DeviceRegistration | null> {
  const collection = await getDeviceCollection();
  const rawDoc = await collection.findOne({ 'subscription.endpoint': endpoint });
  if (rawDoc) {
    return mapToDeviceRegistration(rawDoc);
  }
  return null;
}
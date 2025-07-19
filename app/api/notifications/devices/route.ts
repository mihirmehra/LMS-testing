// app/api/notifications/devices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/server-utils'; // Centralized auth
import {
  getDeviceRegistrations,
  addDeviceRegistration,
  updateDeviceRegistration,
  findDeviceByEndpoint
} from '@/lib/dev-db/push-devices'; // Now uses MongoDB
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

export async function GET(request: NextRequest) {
  try {
    const decoded = verifyAuth(request); // Authentication check
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId'); // This userId *should* match decoded.userId for security

    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Security check: ensure requested userId matches authenticated user
    if (userId !== decoded.userId) {
      return NextResponse.json(
        { message: 'Unauthorized: User ID mismatch' },
        { status: 403 }
      );
    }

    // FIX 1: Await getDeviceRegistrations() as it is now async
    const allDevices = await getDeviceRegistrations(); // <--- AWAIT THIS CALL
    // Filter devices for the specific user
    const userDevices = allDevices.filter(device => device.userId === userId);

    return NextResponse.json(userDevices);
  } catch (error) {
    console.error('Get devices error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Authentication required') || error.message.includes('Invalid or expired token')) {
        return NextResponse.json({ message: error.message }, { status: 401 });
      }
      if (error.message.includes('Unauthorized: User ID mismatch')) {
        return NextResponse.json({ message: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = verifyAuth(request); // Authentication check
    const deviceData = await request.json();

    // Validate device data
    if (!deviceData.userId || !deviceData.deviceName || !deviceData.pushSubscription || !deviceData.deviceType) {
      return NextResponse.json(
        { message: 'Missing required device information (userId, deviceName, pushSubscription, deviceType)' },
        { status: 400 }
      );
    }

    // Security check: ensure posted userId matches authenticated user
    if (deviceData.userId !== decoded.userId) {
      return NextResponse.json(
        { message: 'Unauthorized: User ID mismatch in payload' },
        { status: 403 }
      );
    }

    // Check if device already exists by endpoint (endpoint is unique per subscription)
    // FIX 2: Await findDeviceByEndpoint() as it is now async
    const existingDevice = await findDeviceByEndpoint(deviceData.pushSubscription.endpoint); // <--- AWAIT THIS CALL

    if (existingDevice) {
      // Update existing device
      existingDevice.lastUsed = new Date();
      existingDevice.isActive = true;
      existingDevice.deviceName = deviceData.deviceName; // Allow updating name
      existingDevice.deviceType = deviceData.deviceType; // Allow updating type
      // FIX 3: Await updateDeviceRegistration() as it is now async
      await updateDeviceRegistration(existingDevice); // <--- AWAIT THIS CALL
      return NextResponse.json(existingDevice);
    }

    // Add new device
    const newDevice = {
      id: uuidv4(), // Generate unique ID for the device
      ...deviceData,
      registeredAt: new Date(),
      lastUsed: new Date(),
      isActive: true, // Mark as active when registered
    };

    // FIX 4: Await addDeviceRegistration() as it is now async
    await addDeviceRegistration(newDevice); // <--- AWAIT THIS CALL

    return NextResponse.json(newDevice, { status: 201 });
  } catch (error) {
    console.error('Register device error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Authentication required') || error.message.includes('Invalid or expired token')) {
        return NextResponse.json({ message: error.message }, { status: 401 });
      }
      if (error.message.includes('Unauthorized: User ID mismatch')) {
        return NextResponse.json({ message: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
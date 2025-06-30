import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// In-memory storage for demo (use database in production)
let deviceRegistrations: any[] = [];

// Verify user authentication
function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required');
  }

  const token = authHeader.substring(7);
  const decoded = jwt.verify(token, JWT_SECRET) as any;
  
  return decoded;
}

export async function GET(request: NextRequest) {
  try {
    const decoded = verifyAuth(request);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Filter devices for the specific user
    const userDevices = deviceRegistrations.filter(device => device.userId === userId);
    
    return NextResponse.json(userDevices);
  } catch (error) {
    console.error('Get devices error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication required')) {
        return NextResponse.json({ message: error.message }, { status: 401 });
      }
    }
    
    return NextResponse.json(
      { message: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = verifyAuth(request);
    const deviceData = await request.json();
    
    // Validate device data
    if (!deviceData.userId || !deviceData.deviceName || !deviceData.pushSubscription) {
      return NextResponse.json(
        { message: 'Missing required device information' },
        { status: 400 }
      );
    }
    
    // Check if device already exists
    const existingDevice = deviceRegistrations.find(
      device => device.pushSubscription.endpoint === deviceData.pushSubscription.endpoint
    );
    
    if (existingDevice) {
      // Update existing device
      existingDevice.lastUsed = new Date();
      existingDevice.isActive = true;
      return NextResponse.json(existingDevice);
    }
    
    // Add new device
    const newDevice = {
      ...deviceData,
      registeredAt: new Date(),
      lastUsed: new Date(),
    };
    
    deviceRegistrations.push(newDevice);
    
    return NextResponse.json(newDevice, { status: 201 });
  } catch (error) {
    console.error('Register device error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication required')) {
        return NextResponse.json({ message: error.message }, { status: 401 });
      }
    }
    
    return NextResponse.json(
      { message: 'Failed to register device' },
      { status: 500 }
    );
  }
}
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = verifyAuth(request);
    
    const deviceIndex = deviceRegistrations.findIndex(device => device.id === params.id);
    
    if (deviceIndex === -1) {
      return NextResponse.json(
        { message: 'Device not found' },
        { status: 404 }
      );
    }
    
    // Remove device
    deviceRegistrations.splice(deviceIndex, 1);
    
    return NextResponse.json({ message: 'Device unregistered successfully' });
  } catch (error) {
    console.error('Unregister device error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication required')) {
        return NextResponse.json({ message: error.message }, { status: 401 });
      }
    }
    
    return NextResponse.json(
      { message: 'Failed to unregister device' },
      { status: 500 }
    );
  }
}
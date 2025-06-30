import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { NotificationsAPI } from '@/lib/api/notifications';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
    
    const notifications = await NotificationsAPI.getUserNotifications(decoded.userId);
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication required')) {
        return NextResponse.json({ message: error.message }, { status: 401 });
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
    const decoded = verifyAuth(request);
    const notificationData = await request.json();
    
    const notification = await NotificationsAPI.createNotification({
      ...notificationData,
      userId: decoded.userId,
    });
    
    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('Create notification error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication required')) {
        return NextResponse.json({ message: error.message }, { status: 401 });
      }
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
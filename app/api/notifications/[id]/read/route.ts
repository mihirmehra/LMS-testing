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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = verifyAuth(request);
    
    const success = await NotificationsAPI.markAsRead(params.id, decoded.userId);
    
    if (!success) {
      return NextResponse.json(
        { message: 'Notification not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    
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
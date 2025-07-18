import { NextRequest, NextResponse } from 'next/server';
// import jwt from 'jsonwebtoken';
import { NotificationsAPI } from '@/lib/api/notifications';
import { verifyAuth } from '@/lib/auth/server-utils'; // <--- NEW IMPORT

// const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Verify user authentication
// function verifyAuth(request: NextRequest) {
//   const authHeader = request.headers.get('authorization');
  
//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     throw new Error('Authentication required');
//   }

//   const token = authHeader.substring(7);
//   const decoded = jwt.verify(token, JWT_SECRET) as any;
  
//   return decoded;
// }

export async function PUT(request: NextRequest) {
  try {
    const decoded = verifyAuth(request);
    
    const count = await NotificationsAPI.markAllAsRead(decoded.userId);
    
    return NextResponse.json({ 
      message: `${count} notifications marked as read`,
      count 
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    
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
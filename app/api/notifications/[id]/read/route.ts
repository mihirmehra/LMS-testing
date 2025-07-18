import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { NotificationsAPI } from '@/lib/api/notifications'; // Ensure this path and API exist

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to verify user authentication from JWT
function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required');
  }

  const token = authHeader.substring(7);
  // Decode and verify the JWT token
  const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, [key: string]: any }; // Assert decoded type
  
  return decoded;
}

/**
 * Handles PUT requests to mark a specific notification as read.
 * This endpoint expects the notification ID in the URL parameters.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify user authentication and get user ID from the token
    const decoded = verifyAuth(request); 
    
    // Call the NotificationsAPI to mark the notification as read for the specific user
    const success = await NotificationsAPI.markAsRead(params.id, decoded.userId); 
    
    if (!success) {
      // If notification not found or not owned by the user
      return NextResponse.json(
        { message: 'Notification not found or access denied' }, // More specific message
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    
    if (error instanceof Error) {
      // Handle authentication errors (e.g., missing or invalid token)
      if (error.message.includes('Authentication required') || error instanceof jwt.JsonWebTokenError) {
        return NextResponse.json({ message: 'Unauthorized: ' + error.message }, { status: 401 }); // Provide more context
      }
    }
    
    // Catch-all for other server errors
    return NextResponse.json(
      { message: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}
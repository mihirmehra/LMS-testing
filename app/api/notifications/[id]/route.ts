// api/notifications/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { NotificationsAPI } from '@/lib/api/notifications'; // Assuming this path is correct

// Define a type for your decoded JWT payload
interface JwtPayload {
  userId: string; // Assuming 'userId' is the key in your JWT payload
  // Add other properties you expect in the payload, e.g., 'email', 'role'
}

const JWT_SECRET = process.env.JWT_SECRET;

// Centralized function to verify user authentication and extract payload
function verifyAuth(request: NextRequest): JwtPayload {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }

  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required: Missing or invalid Authorization header.');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    // Basic validation to ensure userId exists in the decoded token
    if (!decoded || !decoded.userId) {
      throw new Error('Invalid token payload: userId missing.');
    }
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      // Specific JWT errors (e.g., TokenExpiredError, NotBeforeError, JsonWebTokenError)
      throw new Error(`Invalid or expired token: ${error.message}`);
    }
    // Generic error
    throw new Error('Authentication failed: Could not verify token.');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } } // `id` will be the notification ID
) {
  try {
    const { id } = params; // Extract notification ID from params

    // Verify authentication and get the userId from the token
    const decoded = verifyAuth(request);
    const userId = decoded.userId;

    // Call the NotificationsAPI to delete the notification
    // It's crucial that deleteNotification checks if the notification belongs to the userId
    const success = await NotificationsAPI.deleteNotification(id, userId);

    if (!success) {
      // If deleteNotification returns false, it means the notification was not found
      // or the user was not authorized to delete it (if handled within the API method)
      return NextResponse.json(
        { message: 'Notification not found or not authorized to delete.' },
        { status: 404 }
      );
    }

    // Return success response
    return NextResponse.json({ message: 'Notification deleted successfully' });

  } catch (error) {
    console.error('DELETE /api/notifications/[id] error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Authentication required') || error.message.includes('Authentication failed') || error.message.includes('Invalid token')) {
        return NextResponse.json({ message: error.message }, { status: 401 }); // Unauthorized
      }
      // You can add more specific error handling here if NotificationsAPI.deleteNotification throws custom errors
    }

    // Fallback for unexpected errors
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
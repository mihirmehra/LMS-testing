// api/notifications/[id]/read/route.ts

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { NotificationsAPI } from '@/lib/api/notifications'; // Ensure this path and API exist

// Define a type for your decoded JWT payload
interface JwtPayload {
  userId: string; // Assuming 'userId' is the key in your JWT payload
  // Add other properties you expect in the payload, e.g., 'email', 'role'
}

const JWT_SECRET = process.env.JWT_SECRET;

// Centralized function to verify user authentication and extract payload
function verifyAuth(request: NextRequest): JwtPayload {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables. Server configuration error.');
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
      throw new Error('Invalid token payload: userId missing. Authentication failed.');
    }
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      // Specific JWT errors (e.g., TokenExpiredError, NotBeforeError, JsonWebTokenError)
      throw new Error(`Authentication failed: Invalid or expired token. Details: ${error.message}`);
    }
    // Generic error
    throw new Error('Authentication failed: Could not verify token.');
  }
}

/**
 * Handles PATCH requests to mark a specific notification as read.
 * This endpoint expects the notification ID in the URL parameters.
 * Changed from PUT to PATCH to match frontend's common use for partial updates.
 */
export async function PATCH( // Changed to PATCH
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params; // Extract notification ID from params

    // Verify user authentication and get the userId from the token
    const decoded = verifyAuth(request);
    const userId = decoded.userId;

    // Call the NotificationsAPI to mark the notification as read for the specific user
    // It's crucial that markAsRead checks if the notification belongs to the userId
    const success = await NotificationsAPI.markAsRead(id, userId);

    if (!success) {
      // If markAsRead returns false, it means the notification was not found
      // or the user was not authorized to mark it as read (if handled within the API method)
      return NextResponse.json(
        { message: 'Notification not found or access denied for this user.' },
        { status: 404 }
      );
    }

    // Return success response
    return NextResponse.json({ message: 'Notification marked as read successfully.' });

  } catch (error) {
    console.error('PATCH /api/notifications/[id]/read error:', error); // Log with method and path

    // Handle specific error types
    if (error instanceof Error) {
      // Catch authentication/token errors thrown by verifyAuth
      if (error.message.includes('Authentication required') || error.message.includes('Authentication failed') || error.message.includes('Invalid token')) {
        return NextResponse.json({ message: error.message }, { status: 401 }); // Unauthorized
      }
      // You can add more specific error handling here if NotificationsAPI.markAsRead throws custom errors
    }

    // Fallback for unexpected internal server errors
    return NextResponse.json(
      { message: 'Internal server error. Could not process request.' },
      { status: 500 }
    );
  }
}
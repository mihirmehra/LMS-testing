// api/notifications/[id]/read/route.ts

import { NextRequest, NextResponse } from 'next/server';
// Removed direct 'jwt' import
import { verifyAuth } from '@/lib/auth/server-utils'; // Centralized authentication utility
import { NotificationsAPI } from '@/lib/api/notifications'; // Ensure this path and API exist

// Removed JwtPayload interface and local verifyAuth function
// as they are now imported from '@/lib/auth/server-utils'

/**
 * Handles PATCH requests to mark a specific notification as read.
 * This endpoint expects the notification ID in the URL parameters.
 */
export async function PATCH( // Changed to PATCH
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params; // Extract notification ID from params

    // Verify user authentication and get the userId from the token using the centralized utility
    const decoded = verifyAuth(request);
    // Ensure the decoded token has a userId (though verifyAuth should already ensure this)
    if (!decoded || !decoded.userId) {
      throw new Error('Authentication token invalid or missing userId.');
    }
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

    // Handle specific error types from the centralized verifyAuth utility
    if (error instanceof Error) {
      // Catch authentication/token errors thrown by verifyAuth
      if (error.message.includes('Authentication required') || error.message.includes('Invalid or expired token')) {
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
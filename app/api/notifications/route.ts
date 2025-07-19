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
  let notificationData; // Declare here so it's accessible for logging
  try {
    const decoded = verifyAuth(request);

    try {
        notificationData = await request.json(); // Attempt to parse JSON
        console.log('Received notificationData:', notificationData); // Log received data
    } catch (jsonParseError: any) {
        console.error('Error parsing request JSON body:', jsonParseError);
        // If JSON parsing fails, return a specific error to the client
        return NextResponse.json(
            { message: 'Invalid JSON in request body', error: jsonParseError.message },
            { status: 400 } // Bad Request
        );
    }
    
    const notification = await NotificationsAPI.createNotification({
      ...notificationData,
      userId: decoded.userId,
    });
    
    console.log('Notification created successfully:', notification); // Log success
    return NextResponse.json(notification, { status: 201 });
  } catch (error: any) { // Catch all errors, ensure 'any' type for broad error handling
    console.error('Create notification error (server-side):', error); // More specific log
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication required')) {
        return NextResponse.json({ message: error.message }, { status: 401 });
      }
      // Add more specific error handling if you have custom errors from NotificationsAPI
      // For example, if NotificationsAPI.createNotification throws an error with a specific message:
      // if (error.message.includes('Validation Failed')) {
      //   return NextResponse.json({ message: error.message }, { status: 422 });
      // }
    }
    
    // This is the fallback if other errors aren't specifically handled.
    // It already returns JSON, so the client-side 'json' parsing error
    // *shouldn't* come from this specific line, but rather if the server
    // fails to send *anything* or sends malformed data *before* this line executes,
    // or if the process crashes and Next.js sends a default non-JSON error page.
    return NextResponse.json(
      { message: 'Internal server error', details: error.message || 'No details available' },
      { status: 500 }
    );
  }
}
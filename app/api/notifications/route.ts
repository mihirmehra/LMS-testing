// app/api/notifications/route.ts or pages/api/notifications.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
// Assuming '@/lib/api/notifications' correctly interfaces with your database/backend
import { NotificationsAPI } from '@/lib/api/notifications';

// It's a good practice to define the shape of your decoded token
interface DecodedToken {
  userId: string;
  // Add other properties that might be in your JWT payload, e.g., role, email
}

const JWT_SECRET = process.env.JWT_SECRET; // Read directly, Next.js handles .env files
if (!JWT_SECRET) {
  // This check ensures the secret is available at runtime
  console.error('JWT_SECRET environment variable is not defined.');
  // In a real application, you might throw an error or exit here.
  // For Vercel/Next.js, this should be set in environment variables.
}

// Verify user authentication
function verifyAuth(request: NextRequest): DecodedToken {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required: No Bearer token found in Authorization header.');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  if (!JWT_SECRET) {
    // Should be caught earlier, but a defensive check
    throw new Error('Server configuration error: JWT_SECRET is not set.');
  }

  try {
    // Cast to DecodedToken for type safety
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Authentication required: Token expired.');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Authentication required: Invalid token.');
    }
    throw new Error('Authentication required: Could not verify token.');
  }
}

// --- GET Request Handler ---
export async function GET(request: NextRequest) {
  try {
    const decoded = verifyAuth(request); // Verifies token and gets user ID
    
    // Fetch notifications for the authenticated user
    const notifications = await NotificationsAPI.getUserNotifications(decoded.userId);
    
    // Return the notifications array directly.
    // The client-side component (NotificationsPage) will then calculate stats.
    return NextResponse.json(notifications, { status: 200 });
  } catch (error: any) { // Use 'any' for the catch block to cover all potential errors
    console.error('API GET /notifications error:', error.message);
    
    if (error.message.includes('Authentication required')) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    // Generic fallback for any other unexpected errors
    return NextResponse.json(
      { message: 'Internal server error', details: error.message || 'An unknown error occurred' },
      { status: 500 }
    );
  }
}

// --- POST Request Handler ---
export async function POST(request: NextRequest) {
  let notificationData: any; // Use 'any' or define a specific interface for incoming notification data
  try {
    const decoded = verifyAuth(request); // Authenticate the user

    try {
        notificationData = await request.json(); // Parse the request body as JSON
        // console.log('Received notificationData for creation:', notificationData); // For debugging
    } catch (jsonParseError: any) {
        console.error('Error parsing request JSON body for POST /notifications:', jsonParseError.message);
        return NextResponse.json(
            { message: 'Invalid JSON in request body.', error: jsonParseError.message },
            { status: 400 } // Bad Request
        );
    }
    
    // Ensure notificationData contains expected properties, e.g., title, message, type, priority
    // You might want to add validation here, e.g., with a schema validator like Zod
    if (!notificationData || !notificationData.title || !notificationData.message || !notificationData.type) {
        return NextResponse.json({ message: 'Missing required notification fields.' }, { status: 400 });
    }

    // Create the notification using the API
    const notification = await NotificationsAPI.createNotification({
      ...notificationData, // Spread the incoming data
      userId: decoded.userId, // Add the authenticated user's ID
      // You might want to ensure 'read' is false by default or set explicitly
      read: false, 
      createdAt: new Date().toISOString(), // Set creation time on the server
    });
    
    // console.log('Notification created successfully:', notification); // For debugging
    return NextResponse.json(notification, { status: 201 }); // 201 Created
  } catch (error: any) {
    console.error('API POST /notifications error:', error.message);
    
    if (error.message.includes('Authentication required')) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error.message.includes('Missing required')) { // Catch our custom validation error
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    // If NotificationsAPI.createNotification throws specific errors, you can catch them here
    // e.g., if (error.message.includes('Invalid data provided')) return NextResponse.json({ message: error.message }, { status: 422 });

    return NextResponse.json(
      { message: 'Internal server error', details: error.message || 'An unknown error occurred during notification creation' },
      { status: 500 }
    );
  }
}
// app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { NotificationsAPI } from '@/lib/api/notifications';
import { getDeviceRegistrationsByUserId } from '@/lib/dev-db/push-devices'; // NEW: Import to get device tokens
import { sendFCMNotifications } from '@/lib/server/pushNotifications'; // NEW: Import FCM sender

interface DecodedToken {
  userId: string;
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('JWT_SECRET environment variable is not defined.');
}

function verifyAuth(request: NextRequest): DecodedToken {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required: No Bearer token found in Authorization header.');
  }

  const token = authHeader.substring(7);

  if (!JWT_SECRET) {
    throw new Error('Server configuration error: JWT_SECRET is not set.');
  }

  try {
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

export async function GET(request: NextRequest) {
  try {
    const decoded = verifyAuth(request);
    const notifications = await NotificationsAPI.getUserNotifications(decoded.userId);
    return NextResponse.json(notifications, { status: 200 });
  } catch (error: any) {
    console.error('API GET /notifications error:', error.message);
    
    if (error.message.includes('Authentication required')) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { message: 'Internal server error', details: error.message || 'An unknown error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let notificationData: any; 
  try {
    const decoded = verifyAuth(request);

    try {
        notificationData = await request.json();
    } catch (jsonParseError: any) {
        console.error('Error parsing request JSON body for POST /notifications:', jsonParseError.message);
        return NextResponse.json(
            { message: 'Invalid JSON in request body.', error: jsonParseError.message },
            { status: 400 }
        );
    }
    
    if (!notificationData || !notificationData.title || !notificationData.message || !notificationData.type) {
        return NextResponse.json({ message: 'Missing required notification fields.' }, { status: 400 });
    }

    // Create the notification using the API
    const notification = await NotificationsAPI.createNotification({
      ...notificationData, 
      userId: decoded.userId, 
      read: false, 
      createdAt: new Date().toISOString(), 
    });
    
    // NEW: Attempt to send a push notification via FCM after creating the in-app notification
    try {
      // Fetch the user's active device registrations
      const userDevices = await getDeviceRegistrationsByUserId(decoded.userId);
      const fcmTokens = userDevices
        .filter(device => device.isActive && device.fcmToken)
        .map(device => device.fcmToken);

      if (fcmTokens.length > 0) {
        const notificationPayload = {
          title: notification.title,
          body: notification.message,
          // You can add imageUrl based on notification.data if available
          // imageUrl: notification.data?.imageUrl || undefined, 
        };
        const dataPayload = {
          notificationId: notification.id,
          type: notification.type,
          actionUrl: notification.actionUrl || '',
          actionLabel: notification.actionLabel || '',
          // Ensure all values are strings for FCM data payload
          ...(Object.fromEntries(
            Object.entries(notification.data || {}).map(([key, value]) => [key, String(value)])
          ) as { [key: string]: string }),
        };

        // Send FCM notifications to all active devices
        await sendFCMNotifications(fcmTokens, notificationPayload, dataPayload);
        console.log(`FCM push initiated for new notification to ${fcmTokens.length} devices.`);
      } else {
        console.log('No active FCM devices found for user, skipping push notification for new in-app notification.');
      }
    } catch (pushError) {
      console.error('Error sending FCM push notification for new in-app notification:', pushError);
      // IMPORTANT: Do NOT rethrow pushError here. The primary task (creating in-app notification)
      // has succeeded. Push notification is a secondary, best-effort action.
    }

    return NextResponse.json(notification, { status: 201 });
  } catch (error: any) {
    console.error('API POST /notifications error:', error.message);
    
    if (error.message.includes('Authentication required')) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error.message.includes('Missing required')) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: 'Internal server error', details: error.message || 'An unknown error occurred during notification creation' },
      { status: 500 }
    );
  }
}
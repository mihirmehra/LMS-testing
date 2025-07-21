// app/api/notifications/push/route.ts
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { verifyAuth } from '@/lib/auth/server-utils'; // Assuming this provides { userId: string }
import {
  getDeviceRegistrationsByUserId, // <--- UPDATED IMPORT
  updateDeviceRegistration,
  // deleteDeviceRegistration // Only if you plan to delete subscriptions directly here
} from '@/lib/dev-db/push-devices';
import { DeviceRegistration } from '@/types/device'; // Ensure DeviceRegistration is imported for typing

// Load VAPID keys and subject from environment variables
// IMPORTANT: For these to be available on the server, they should be in .env.local
// VAPID_PUBLIC_KEY can be NEXT_PUBLIC_VAPID_PUBLIC_KEY on client-side, but VAPID_PRIVATE_KEY should NOT be NEXT_PUBLIC_
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY; // Client-side also uses this
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY; // Server-side private key, MUST NOT be NEXT_PUBLIC_
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@countryroof.com'; // Default or load from env

// Configure web-push with VAPID details when the module loads
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn('VAPID keys are not set. Push notifications will not work until they are configured correctly.');
} else {
  try {
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    console.log('web-push VAPID details successfully set.');
  } catch (err) {
    console.error('Error setting web-push VAPID details:', err);
    // In production, you might want to consider crashing the server if VAPID keys are critical
    // process.exit(1);
  }
}

// GET handler (Optional, for fetching a list of user's *notifications*, not devices)
// If this endpoint is solely for sending push notifications, you might not need a GET here.
// If it's intended to fetch notification *records*, ensure NotificationsAPI exists and is imported.
// I'll keep it as is from your original, assuming it serves a different purpose than device management.
// You likely have a separate API route for getting notification records.
// import { NotificationsAPI } from '@/lib/api/notifications'; // Uncomment if needed for GET
/*
export async function GET(request: NextRequest) {
  try {
    const decoded = verifyAuth(request); // Authentication check
    // This assumes NotificationsAPI exists and getUserNotifications is implemented.
    // If not, remove this GET handler or replace with appropriate logic.
    const notifications = await NotificationsAPI.getUserNotifications(decoded.userId);
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Authentication required') || error.message.includes('Invalid or expired token')) {
        return NextResponse.json({ message: error.message }, { status: 401 });
      }
    }
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
*/

export async function POST(request: NextRequest) {
  let requestBody: { userId: string; title: string; message: string; url?: string; icon?: string; tag?: string; data?: { [key: string]: any } };
  try {
    // Runtime check for VAPID keys: crucial before attempting to send notifications
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error('Attempted to send push notification but VAPID keys are not configured on the server.');
      return NextResponse.json(
        { message: 'Server is not configured for push notifications (VAPID keys missing).' },
        { status: 500 } // Changed to 500 as this is a server configuration error
      );
    }

    const decoded = verifyAuth(request); // Authenticate the request
    // Ensure the decoded token has a userId
    if (!decoded || !decoded.userId) {
        throw new Error('Authentication token invalid or missing userId.');
    }

    try {
      requestBody = await request.json(); // Parse the request body
    } catch (jsonParseError: any) {
      console.error('Error parsing request JSON body:', jsonParseError);
      return NextResponse.json(
        { message: 'Invalid JSON in request body', error: jsonParseError.message },
        { status: 400 } // Bad Request for invalid JSON
      );
    }

    const { userId, title, message, url, icon, tag, data } = requestBody;

    // Validate required fields from the request body
    if (!userId || !title || !message) {
      return NextResponse.json(
        { message: 'Missing required notification information: userId, title, or message' },
        { status: 400 }
      );
    }

    // Security check: ensure the requested userId matches the authenticated user's ID
    if (userId !== decoded.userId) {
      return NextResponse.json(
        { message: 'Unauthorized: Attempt to send notification for a different user ID.' },
        { status: 403 } // Forbidden
      );
    }

    // --- Fetch active devices for the authenticated user ---
    // Use the optimized function to get devices directly by userId
    const userDevices: DeviceRegistration[] = await getDeviceRegistrationsByUserId(userId);

    if (userDevices.length === 0) {
      console.log(`No active devices found for user ${userId}. Skipping push notification.`);
      return NextResponse.json(
        { message: 'No active devices registered for this user to send push notifications to.' },
        { status: 200 } // Or 404 if you strictly consider it "not found"
      );
    }

    let sentCount = 0;
    const sendPromises = userDevices.map(async (device) => {
      try {
        if (!device.subscription || !device.subscription.endpoint) {
          console.warn(`Device ${device.id} for user ${userId} has no valid push subscription. Skipping.`);
          return; // Skip this device if the subscription is incomplete
        }

        // --- Construct the notification payload for the service worker ---
        // This structure is designed to be consumed by your service worker's `push` event listener.
        const notificationPayload = JSON.stringify({
          type: 'PUSH_NOTIFICATION', // Custom type for your service worker to identify message source
          notification: { // Standard Web Notification API properties
            title: title,
            body: message,
            icon: icon || '/icons/icon-192x192.png', // Fallback icon
            tag: tag || 'default-notification', // Helps group/replace notifications
            // actions: [], // Add notification action buttons if your service worker handles them
          },
          data: { // Custom data accessible in service worker (e.g., for click actions)
            url: url || '/', // URL to open when notification is clicked
            // Include any additional data passed from the client
            ...(data || {}), // Ensure data exists before spreading
            userId: userId, // Example: pass userId for context
            // Add other relevant data for your app's logic here
          },
        });

        // Send the push notification using web-push
        await webpush.sendNotification(device.subscription, notificationPayload);
        sentCount++;
        console.log(`Successfully sent notification to device: ${device.id} (${device.deviceName}) for user ${userId}`);

      } catch (error: any) {
        console.error(`Failed to send push notification to device ${device.id} (User: ${userId}):`, error);

        // Handle common web-push errors, especially expired/invalid subscriptions
        if (error.statusCode === 404 || error.statusCode === 410) {
          // 404 Not Found / 410 Gone: Subscription is no longer valid or has expired.
          // Mark the device as inactive in your database so future pushes don't target it.
          console.log(`Subscription for device ${device.id} (user ${userId}) is no longer valid (Status ${error.statusCode}). Deactivating.`);
          // Create a partial DeviceRegistration object to update
          const deviceToUpdate: DeviceRegistration = {
              ...device, // Spread existing device data
              isActive: false, // Mark as inactive
              // Ensure other required fields are present if updateDeviceRegistration needs them,
              // or modify updateDeviceRegistration to accept a partial update.
              // For robustness, ensure id and mongoId are present for the update call.
              id: device.id,
              mongoId: device.mongoId,
          };
          await updateDeviceRegistration(deviceToUpdate);
          // Optional: If you want to completely remove from DB instead of just deactivating:
          // await deleteDeviceRegistration(device.id);
        } else if (error.statusCode === 429) {
          console.warn(`Too many requests for device ${device.id}. Implement rate-limiting or back-off strategies.`);
        } else {
          console.error(`Generic error sending notification: ${error.message}`);
        }
        // Do not rethrow the error here, allow other pushes to proceed.
      }
    });

    // Wait for all push attempts to complete (either resolved or rejected)
    await Promise.allSettled(sendPromises);

    return NextResponse.json({
      success: true,
      message: `${sentCount} push notifications initiated successfully out of ${userDevices.length} active devices.`,
      sentToCount: sentCount,
      totalActiveDevices: userDevices.length,
    });

  } catch (error) {
    console.error('Push notification API internal error (caught in main try-catch block):', error);

    if (error instanceof Error) {
      if (error.message.includes('Authentication required') || error.message.includes('Invalid or expired token')) {
        return NextResponse.json({ message: error.message }, { status: 401 });
      }
      // Add more specific error handling if you have custom errors from your utilities
      // e.g., if verifyAuth throws specific errors.
    }

    // Generic fallback for any unhandled server-side errors
    return NextResponse.json(
      { message: 'Failed to send push notification due to an unexpected server error.', details: (error as Error).message || 'No specific details available.' },
      { status: 500 }
    );
  }
}
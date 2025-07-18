// app/api/notifications/push/route.ts
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { verifyAuth } from '@/lib/auth/server-utils';
import { getDeviceRegistrations, updateDeviceRegistration, deleteDeviceRegistration } from '@/lib/dev-db/push-devices'; // Import your persistent mock DB functions

// VAPID keys from environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

// Your contact email for web-push (e.g., your admin email)
const VAPID_SUBJECT = 'mailto:your_email@example.com'; // IMPORTANT: Change this to your actual email

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn('VAPID keys are not set. Push notifications will not work.');
} else {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export async function POST(request: NextRequest) {
  try {
    const decoded = verifyAuth(request); // Authentication check
    const { userId, title, message, url, icon, tag, data } = await request.json();

    if (!userId || !title || !message) {
      return NextResponse.json(
        { message: 'Missing required notification information (userId, title, message)' },
        { status: 400 }
      );
    }

    // In a real application, you might want to check if the authenticated user
    // (decoded.userId) has permission to send notifications to the target userId.
    // For now, we'll assume the sender is authorized.

    // Get all registered devices for the target userId from your persistent mock DB
    const userDevices = getDeviceRegistrations().filter(device => device.userId === userId && device.isActive);

    if (userDevices.length === 0) {
      console.log(`No active devices registered for user ${userId}.`);
      return NextResponse.json({
        success: false,
        message: 'No active devices registered for this user.',
        sentTo: 0,
      }, { status: 200 }); // Return 200 as it's not an error, just no devices to send to.
    }

    const payload = JSON.stringify({
      title,
      options: {
        body: message,
        icon: icon || '/icons/notification-icon.png', // Default icon
        badge: '/icons/badge-icon.png', // Badge icon for Android
        vibrate: [200, 100, 200],
        data: {
          url: url || '/', // URL to open when notification is clicked
          ...data, // Additional custom data
        },
        actions: [
          { action: 'open_url', title: 'View', icon: '/icons/check-icon.png' },
        ],
        tag: tag || 'default-notification', // Group notifications with the same tag
        renotify: true, // Show notification again if one with the same tag exists
      },
    });

    let sentCount = 0;
    const sendPromises = userDevices.map(async (device) => {
      try {
        await webpush.sendNotification(device.pushSubscription, payload);
        sentCount++;
        // Optionally update lastUsed for the device
        device.lastUsed = new Date();
        updateDeviceRegistration(device);
        console.log(`Push notification sent to device ${device.id} for user ${userId}.`);
      } catch (error: any) {
        console.error(`Failed to send push notification to device ${device.id} for user ${userId}:`, error);

        // Handle common web-push errors
        if (error.statusCode === 404 || error.statusCode === 410) {
          // Subscription no longer exists or has expired
          console.log(`Subscription for device ${device.id} (user ${userId}) is no longer valid. Deactivating/deleting.`);
          // Invalidate the subscription in your DB, or remove it
          // For persistent mock, we'll mark as inactive and eventually delete if not used
          device.isActive = false;
          updateDeviceRegistration(device);
          // If you want to immediately delete:
          // deleteDeviceRegistration(device.id);
        } else {
          // Other errors
          console.error(`Error sending notification: ${error.message}`);
        }
      }
    });

    await Promise.allSettled(sendPromises); // Wait for all send operations to complete

    return NextResponse.json({
      success: true,
      message: `${sentCount} push notifications initiated.`,
      sentTo: sentCount,
      totalDevices: userDevices.length,
    });
  } catch (error) {
    console.error('Push notification API error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Authentication required') || error.message.includes('Invalid or expired token')) {
        return NextResponse.json({ message: error.message }, { status: 401 });
      }
    }

    return NextResponse.json(
      { message: 'Failed to send push notification due to server error' },
      { status: 500 }
    );
  }
}
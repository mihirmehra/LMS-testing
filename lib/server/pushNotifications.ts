// lib/server/pushNotifications.ts (Server-side)
// This file handles sending push notifications using Firebase Admin SDK.

import * as admin from 'firebase-admin';

// Define a type for a generic Firebase-like error, including common properties.
interface FirebaseErrorLike {
  code?: string;
  message: string;
  stack?: string;
  [key: string]: any;
}

// Define a type for the response of a single message send for consistency.
interface SingleMessageSendResponse {
  successCount: number;
  failureCount: number;
  results: { messageId?: string; error?: FirebaseErrorLike }[];
}

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    console.error("Please ensure FIREBASE_SERVICE_ACCOUNT_KEY environment variable is correctly set.");
  }
}

/**
 * Sends a push notification to a specific device or a list of devices.
 * @param token The FCM registration token of the device. Can be a single token or an array of tokens.
 * @param notification The notification payload (title, body, etc.).
 * @param data Optional data payload.
 * @returns A Promise resolving to admin.messaging.BatchResponse for multiple tokens,
 * or SingleMessageSendResponse for a single token (custom defined).
 */
export async function sendPushNotification(
  token: string | string[],
  notification: { title: string; body: string; imageUrl?: string },
  data?: { [key: string]: string },
): Promise<admin.messaging.BatchResponse | SingleMessageSendResponse> {

  const notificationPayload = {
    title: notification.title,
    body: notification.body,
    imageUrl: notification.imageUrl,
  };

  try {
    if (Array.isArray(token)) {
      // When sending to an array of tokens, construct a MulticastMessage directly.
      // This type explicitly includes the 'tokens' property.
      const message: admin.messaging.MulticastMessage = {
        notification: notificationPayload,
        data: data,
        tokens: token, // 'tokens' is a valid property on MulticastMessage
      };
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log('Successfully sent message to multiple devices:', response.successCount, 'successful,', response.failureCount, 'failed.');
      return response;
    } else {
      // When sending to a single token, construct a TokenMessage directly.
      // This type explicitly includes the 'token' property.
      const message: admin.messaging.TokenMessage = {
        notification: notificationPayload,
        data: data,
        token: token, // 'token' is a valid property on TokenMessage
      };
      const messageId = await admin.messaging().send(message);
      console.log('Successfully sent message to single device:', messageId);
      return {
        successCount: 1,
        failureCount: 0,
        results: [{ messageId: messageId }]
      };
    }
  } catch (error: any) {
    console.error('Error sending message:', error);
    const formattedError: FirebaseErrorLike = {
      code: error.code || 'unknown',
      message: error.message || 'An unknown error occurred.',
      ...(error.stack && { stack: error.stack }),
      ...error
    };
    return {
      successCount: 0,
      failureCount: 1,
      results: [{ error: formattedError }]
    };
  }
}
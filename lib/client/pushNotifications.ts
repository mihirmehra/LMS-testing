// lib/client/pushNotifications.ts
import { DeviceRegistration, PushSubscription } from '@/types/device';

// Helper function to convert Uint8Array to base64 string for VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Define the expected structure of the payload sent from the Service Worker to the client
// This should directly mirror what your /api/notifications/push endpoint sends to web-push,
// which then gets forwarded by the service worker if the app is in the foreground.
export interface ForegroundMessagePayload {
  type: 'PUSH_NOTIFICATION'; // Custom type to identify the message source/kind
  notification?: {
    title?: string;
    body?: string;
    icon?: string;
    tag?: string;
    // Add other standard notification properties if used (e.g., actions)
  };
  data?: {
    url?: string; // e.g., URL to navigate to on click
    [key: string]: any; // Allow other custom data, can be more specific if desired
  };
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private VAPID_PUBLIC_KEY: string | undefined;
  // Store the bound message handler for proper cleanup
  private boundMessageHandler: ((event: MessageEvent) => void) | null = null;

  private constructor() {
    // Ensure NEXT_PUBLIC_VAPID_PUBLIC_KEY is correctly set in your .env.local
    this.VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!this.VAPID_PUBLIC_KEY) {
      console.warn("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set. Push notifications may not function correctly on the client-side.");
    }
  }

  // Implements the Singleton pattern to ensure only one instance
  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  // Checks if push notifications are supported by the current browser
  public isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  /**
   * Registers a service worker, requests notification permission,
   * subscribes to push notifications, and registers/updates the device with your backend.
   * This method ensures idempotency by relying on the backend's `addOrUpdateDeviceRegistration`.
   * @param userId The ID of the user.
   * @param deviceName A friendly name for the device.
   * @returns The registered DeviceRegistration object from the server.
   * @throws Error if prerequisites are not met or backend registration fails.
   */
  public async subscribeToPush(userId: string, deviceName: string): Promise<DeviceRegistration | null> {
    if (!this.isSupported()) {
      console.warn('Push notifications are not supported in this browser.');
      return null;
    }
    if (!this.VAPID_PUBLIC_KEY) {
      throw new Error('VAPID Public Key is not configured in client environment variables.');
    }

    // 1. Request notification permission from the user
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied by the user.');
    }

    // 2. Register the service worker
    // Ensures service worker is registered and active before proceeding
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    await navigator.serviceWorker.ready; // Wait for the service worker to be active

    console.log('Service Worker registered and ready:', registration);

    // 3. Get or create the push subscription
    let pushSubscription = await registration.pushManager.getSubscription();

    // If no existing subscription, create a new one
    if (!pushSubscription) {
      const subscribeOptions = {
        userVisibleOnly: true, // Required by web-push, ensures visible notification is shown
        applicationServerKey: urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY), // Your VAPID public key
      };
      pushSubscription = await registration.pushManager.subscribe(subscribeOptions);
      console.log('New push subscription created:', pushSubscription);
    } else {
      console.log('Existing push subscription found:', pushSubscription);
    }

    if (!pushSubscription) {
      throw new Error('Failed to obtain a push subscription from the browser.');
    }

    // Convert PushSubscription to a plain JSON object which is suitable for sending to backend.
    // .toJSON() is the standard method for this.
    const subscriptionData: PushSubscription = pushSubscription.toJSON() as PushSubscription;

    // 4. Send the subscription details to your backend API for registration or update
    // The backend's /api/notifications/devices POST endpoint now handles the upsert logic.
    const response = await fetch('/api/notifications/devices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`, // Assuming auth token is stored in localStorage
      },
      body: JSON.stringify({
        userId,
        deviceName,
        deviceType: this.getDeviceType(), // Determine device type (desktop, mobile, tablet)
        subscription: subscriptionData, // The actual push subscription object
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to register/update device with the server.');
    }

    const device: DeviceRegistration = await response.json();
    console.log('Device registered/updated successfully with backend:', device);
    return device; // Return the DeviceRegistration object received from the backend
  }

  /**
   * Checks if there's an active push subscription in the browser.
   * This is a client-side check, not a check against the backend.
   * @returns True if an active subscription exists in the browser, false otherwise.
   */
  public async hasActiveSubscription(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      console.error('Error checking for active subscription:', error);
      return false;
    }
  }

  /**
   * Sets up a listener for messages coming from the service worker.
   * These messages are typically sent when a push notification is received
   * while the application is in the foreground.
   * @param callback A function to call when a foreground message is received, receiving the parsed payload.
   * @returns A cleanup function to unsubscribe the listener.
   */
  public onForegroundMessage(callback: (payload: ForegroundMessagePayload) => void): () => void {
    // Define the message handler, binding 'this' to the class instance
    this.boundMessageHandler = (event: MessageEvent) => {
      // Ensure the message has the expected structure from our service worker
      // which should mirror the payload sent from the backend.
      if (event.data && typeof event.data === 'object' && event.data.type === 'PUSH_NOTIFICATION') {
        // Cast the event.data directly to ForegroundMessagePayload
        // because the 'notification' and 'data' are top-level properties.
        callback(event.data as ForegroundMessagePayload);
      }
    };

    // Add the listener to the service worker container
    navigator.serviceWorker.addEventListener('message', this.boundMessageHandler);

    // Return a cleanup function to be called when the component unmounts
    return () => {
      if (this.boundMessageHandler) {
        navigator.serviceWorker.removeEventListener('message', this.boundMessageHandler);
        this.boundMessageHandler = null; // Clear the reference
      }
    };
  }

  /**
   * Unsubscribes from push notifications at the browser level and deregisters the device from the backend.
   * @param deviceId The ID of the device registration to delete from the backend.
   * @returns True if successfully unregistered from backend, false otherwise.
   * @throws Error if the backend deregistration fails.
   */
  public async unsubscribeFromPush(deviceId: string): Promise<boolean> {
    // Attempt browser-side unsubscribe first
    try {
      if (this.isSupported()) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          const success = await subscription.unsubscribe(); // Unsubscribe from the browser's push service
          if (success) {
            console.log('Browser-side push subscription unsubscribed successfully.');
          } else {
            console.warn('Browser-side unsubscribe returned false. Subscription might already be inactive or failed silently.');
          }
        } else {
          console.log('No active browser-side subscription found to unsubscribe.');
        }
      } else {
        console.warn('Push notifications not supported in this browser, skipping browser-side unsubscribe.');
      }
    } catch (browserError) {
      console.error('Error during browser-side unsubscribe, proceeding with server-side deletion:', browserError);
      // Continue to server-side deletion even if browser-side fails, to ensure DB consistency
    }

    // Delete the device registration from your backend API
    const response = await fetch(`/api/notifications/devices/${deviceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to unregister device from the server.');
    }

    console.log('Device unregistered successfully from backend.');
    return true; // Successfully unregistered from backend
  }

  /**
   * Fetches all registered devices for a specific user from the backend.
   * @param userId The ID of the user whose devices to fetch.
   * @returns An array of DeviceRegistration objects.
   * @throws Error if fetching devices from backend fails.
   */
  public async getUserDevices(userId: string): Promise<DeviceRegistration[]> {
    const response = await fetch(`/api/notifications/devices?userId=${userId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch user devices.');
    }

    const devices: DeviceRegistration[] = await response.json();
    console.log('Fetched user devices:', devices);
    return devices;
  }

  /**
   * Sends a test push notification to the user's registered devices via the backend API.
   * @param userId The ID of the user to send the test notification to.
   * @throws Error if sending the test notification fails.
   */
  public async testPushNotification(userId: string): Promise<void> {
    const response = await fetch('/api/notifications/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify({
        userId,
        title: 'Test Notification from Frontend',
        message: 'This is a test push notification initiated from your app!',
        url: window.location.origin, // Optional: URL to open when notification is clicked
        icon: '/icons/icon-192x192.png', // Optional: Icon for the notification
        tag: 'test-notification', // Optional: Tag to group notifications
        data: {
          source: 'frontend_test',
          timestamp: Date.now(),
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send test notification.');
    }
    console.log('Test push notification request sent successfully.');
  }

  /**
   * Helper to determine the device type based on user agent string.
   * @returns The determined device type ('desktop', 'mobile', or 'tablet').
   */
  public getDeviceType(): DeviceRegistration['deviceType'] {
    const userAgent = navigator.userAgent;
    if (/Mobi|Android|iPhone|iPod/i.test(userAgent)) { // More comprehensive mobile check
      return 'mobile';
    }
    if (/Tablet|iPad/i.test(userAgent) && !/Mobi/i.test(userAgent)) { // Check for tablet, exclude phones
      return 'tablet';
    }
    return 'desktop';
  }
}
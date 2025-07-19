'use client';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// UPDATED: Added mongoId as an optional field to reflect what the server returns
export interface DeviceRegistration {
  id: string; // Your client-generated unique ID (e.g., 'device-1700000000')
  mongoId?: string; // MongoDB's internal _id, returned by the server
  userId: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  pushSubscription: PushSubscription;
  isActive: boolean;
  registeredAt: Date;
  lastUsed: Date;
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  constructor() {
    if (!this.vapidPublicKey) {
      console.error('Error: NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set!');
      // You might want to throw an error or handle gracefully here
    }
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  // Check if push notifications are supported
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported in this browser');
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!this.isSupported()) {
      throw new Error('Service workers are not supported');
    }

    console.log('registerServiceWorker: Starting checks...');

    // Get existing registration or register a new one
    console.log('registerServiceWorker: Attempting to get existing registration...');
    let registration = await navigator.serviceWorker.getRegistration('/sw.js');

    if (!registration) {
      console.log('registerServiceWorker: No existing SW found. Registering new service worker...');
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('registerServiceWorker: New SW registration call completed.');
    } else {
      console.log('registerServiceWorker: Service Worker already registered:', registration);
    }

    // At this point, 'registration' is guaranteed to be a ServiceWorkerRegistration object.
    if (registration.active && navigator.serviceWorker.controller === registration.active) {
      console.log('registerServiceWorker: SW is already active and controlling. Resolving directly.');
      return registration;
    } else {
      console.log('registerServiceWorker: SW not yet active or not controlling. Setting up statechange listener...');
      return new Promise((resolve) => {
        const checkAndResolve = () => {
          console.log(`registerServiceWorker: State change detected or immediate check. Current SW state: ${registration!.active?.state}, Controller: ${navigator.serviceWorker.controller ? 'present' : 'absent'}`);

          if (registration!.active && navigator.serviceWorker.controller === registration!.active) {
            console.log('registerServiceWorker: SW activated and now controlling. Resolving registration promise.');
            registration!.removeEventListener('statechange', checkAndResolve);
            resolve(registration!);
          }
          else if (registration!.active && !navigator.serviceWorker.controller) {
            console.warn('registerServiceWorker: SW activated, but not controlling. Reloading page to establish control...');
            window.location.reload();
          }
        };

        registration!.addEventListener('updatefound', () => {
          const newWorker = registration!.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', checkAndResolve);
          }
        });

        registration!.addEventListener('statechange', checkAndResolve); // Crucial for initial activation

        checkAndResolve(); // Also check immediately
      });
    }
  }


  // Subscribe to push notifications
  async subscribeToPush(userId: string, deviceName: string): Promise<DeviceRegistration> {
    try {
      // Request permission first
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      console.log('permission')
      console.log(permission)

      // Register service worker
      const registration = await this.registerServiceWorker();

      console.log('registration')
      console.log(registration)

      // Subscribe to push notifications
      if (!this.vapidPublicKey) {
        throw new Error('VAPID public key is not set');
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey),
      });

      // Detect device type
      const deviceType = this.detectDeviceType();

      console.log('device')
      console.log(deviceType)

      // Create device registration object
      const deviceRegistration: DeviceRegistration = {
        id: `device-${Date.now()}`, // Client-generated ID (will be stored as 'id' in MongoDB)
        userId,
        deviceName: deviceName || `${deviceType} Device`,
        deviceType,
        pushSubscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
          },
        },
        isActive: true,
        registeredAt: new Date(),
        lastUsed: new Date(),
      };

      // Save to server
      const savedDevice = await this.saveDeviceRegistration(deviceRegistration);

      return savedDevice; // Return the device object including mongoId from the server response
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribeFromPush(deviceId: string): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Remove from server
      await this.removeDeviceRegistration(deviceId);
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }

  // Send push notification
  async sendPushNotification(
    userId: string,
    title: string,
    message: string,
    data?: any
  ): Promise<void> {
    try {
      const response = await fetch('/api/notifications/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          userId,
          title,
          message,
          data,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send push notification');
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  // Get user's registered devices
  async getUserDevices(userId: string): Promise<DeviceRegistration[]> {
    try {
      const response = await fetch(`/api/notifications/devices?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Error fetching user devices:', error);
      return [];
    }
  }

  // Test push notification
  async testPushNotification(userId: string): Promise<void> {
    await this.sendPushNotification(
      userId,
      'Test Notification',
      'This is a test push notification from RealEstate CRM',
      { type: 'test' }
    );
  }

  // Private helper methods
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private detectDeviceType(): 'mobile' | 'desktop' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
      return 'mobile';
    } else if (/tablet|ipad/i.test(userAgent)) {
      return 'tablet';
    }
    return 'desktop';
  }

  // UPDATED: Remove local storage fallback
  private async saveDeviceRegistration(device: DeviceRegistration): Promise<DeviceRegistration> {
    try {
      const response = await fetch('/api/notifications/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(device),
      });

      if (!response.ok) {
        // Attempt to parse error message from server if available
        const errorData = await response.json().catch(() => ({ message: 'Unknown server error' }));
        throw new Error(`Failed to save device registration: ${errorData.message || response.statusText}`);
      }
      
      // Return the saved device data from the server, which includes mongoId
      return await response.json();

    } catch (error) {
      console.error('Error saving device registration:', error);
      // Re-throw the error to be handled by subscribeToPush
      throw error;
    }
  }

  // UPDATED: Remove local storage fallback
  private async removeDeviceRegistration(deviceId: string): Promise<void> {
    try {
      const response = await fetch(`/api/notifications/devices/${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        // Attempt to parse error message from server if available
        const errorData = await response.json().catch(() => ({ message: 'Unknown server error' }));
        throw new Error(`Failed to remove device registration: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error removing device registration:', error);
      throw error; // Re-throw the error
    }
  }
}
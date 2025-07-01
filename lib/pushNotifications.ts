'use client';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface DeviceRegistration {
  id: string;
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
  private vapidPublicKey = 'BLOewXy_CrdUjxFlR_G1wwo2vItf3NgGs3ylT_9YKa7i1r54okXcK1v5C6Ns4SF-mlnRKbpptlxRRYGPcGgrD3I'; // Demo key

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

  // Inside PushNotificationService class
  async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!this.isSupported()) {
      throw new Error('Service workers are not supported');
    }

    console.log('registerServiceWorker: Starting checks...');

    // Get existing registration or register a new one
    console.log('registerServiceWorker: Attempting to get existing registration...');
    let registration = await navigator.serviceWorker.getRegistration('/sw.js'); // Check for existing
    
    if (!registration) {
      console.log('registerServiceWorker: No existing SW found. Registering new service worker...');
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('registerServiceWorker: New SW registration call completed.');
    } else {
      console.log('registerServiceWorker: Service Worker already registered:', registration);
    }

    // Ensure the service worker is active and controlling the page
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
            registration!.removeEventListener('statechange', checkAndResolve); // Clean up listener
            resolve(registration!);
          } else if (registration!.active && !navigator.serviceWorker.controller) {
            // SW is active, but not controlling (common on first load). Force reload.
            console.warn('registerServiceWorker: SW activated, but not controlling. Reloading page to establish control...');
            window.location.reload(); 
            // Note: The promise will not resolve until after the reload,
            // but the subsequent page load will hit this check again and resolve immediately.
          }
        };

        // Attach listener for state changes
        registration!.addEventListener('statechange', checkAndResolve);

        // Also check immediately in case it's already active but just not controlling
        checkAndResolve();
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
        id: `device-${Date.now()}`,
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
      await this.saveDeviceRegistration(deviceRegistration);

      return deviceRegistration;
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

  private async saveDeviceRegistration(device: DeviceRegistration): Promise<void> {
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
        throw new Error('Failed to save device registration');
      }
    } catch (error) {
      console.error('Error saving device registration:', error);
      // Store locally as fallback
      const devices = JSON.parse(localStorage.getItem('push_devices') || '[]');
      devices.push(device);
      localStorage.setItem('push_devices', JSON.stringify(devices));
    }
  }

  private async removeDeviceRegistration(deviceId: string): Promise<void> {
    try {
      const response = await fetch(`/api/notifications/devices/${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove device registration');
      }
    } catch (error) {
      console.error('Error removing device registration:', error);
      // Remove from local storage as fallback
      const devices = JSON.parse(localStorage.getItem('push_devices') || '[]');
      const updatedDevices = devices.filter((d: DeviceRegistration) => d.id !== deviceId);
      localStorage.setItem('push_devices', JSON.stringify(updatedDevices));
    }
  }
}
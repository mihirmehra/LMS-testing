// components/layout/ClientLayout.tsx

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { toast as showToast } from '@/hooks/use-toast'; // Correctly imports the exported toast function
import { Toaster } from '@/components/ui/toaster';
import { Loader2 } from 'lucide-react';
// Updated imports: import functions directly instead of a PushNotificationService class
import {
  subscribeToPush,
  onPushMessageReceived,
} from '@/lib/client/pushNotifications';
import { ToastAction } from '@/components/ui/toast'; // IMPORTANT: Import ToastAction component
import { ForegroundMessagePayload } from '@/lib/client/pushNotifications'; // Import the payload type
// --- FIX: Alias Notification from types/notification to avoid conflict with browser's Notification API ---
import { Notification as AppNotificationType } from '@/types/notification';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // Destructure notifications, fetchNotifications, and markAsRead from the hook
  const { notifications, fetchNotifications, markAsRead } = useNotifications();

  // Ref to keep track of notification IDs that have already been shown as a toast
  const toastedNotificationIds = useRef<Set<string>>(new Set());

  // Define public routes
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Redirect unauthenticated users from private routes
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicRoute) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, isPublicRoute, router]);

  // Handle foreground push messages
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // Ensure the client-side push notification library is initialized and listening
      onPushMessageReceived((payload: ForegroundMessagePayload) => {
        console.log('Foreground message received:', payload);

        // Extract necessary data from payload
        const notificationTitle = payload.notification?.title || 'New Notification';
        const notificationBody = payload.notification?.body || 'You have a new message.';
        const notificationId = payload.data?.notificationId; // Assuming you send notificationId in data payload
        const actionUrl = payload.data?.actionUrl; // Optional action URL from data

        showToast({
          title: notificationTitle,
          description: notificationBody,
          variant: 'default', // You might want to derive this from payload.data or payload.notification type
          duration: 9000, // Toast will auto-dismiss after 9 seconds
          // Conditionally add an action button if actionUrl is present
          action: actionUrl ? (
            <ToastAction
              altText="View"
              onClick={() => {
                if (actionUrl) router.push(actionUrl);
              }}
            >
              View
            </ToastAction>
          ) : undefined,
        });

        // Optionally, fetch latest notifications after receiving a push message
        if (user?.id) {
          fetchNotifications(user.id);
        }
      });
    }
  }, [isAuthenticated, user?.id, fetchNotifications, router]);


  // Effect for fetching notifications and showing toasts for new ones
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchNotifications(user.id); // Fetch all notifications on load/auth status change

      // Subscribe to push notifications for the user
      subscribeToPush(user.id)
        .then(token => {
          // --- FIX: 'token' is now correctly typed as 'string | null' from subscribeToPush ---
          if (token) { // This truthiness check is now valid
            console.log("FCM Token (ClientLayout):", token);
            // You might want to send this token to your backend if you haven't already in subscribeToPush
          } else {
            console.warn("Failed to get FCM token or permission not granted.");
          }
        })
        .catch(error => {
          console.error("Failed to subscribe to push notifications (ClientLayout):", error);
          showToast({
            title: "Push Notification Error",
            description: "Could not subscribe to real-time notifications.",
            variant: "destructive",
          });
        });
    }
  }, [isAuthenticated, user?.id, fetchNotifications]);


  // Effect to show toasts for new, unread notifications fetched from API
  useEffect(() => {
    if (isAuthenticated && notifications.length > 0 && user?.id) {
      notifications.forEach((n: AppNotificationType) => { // --- FIX: Explicitly type n as AppNotificationType ---
        // Only show toast for unread notifications that haven't been toasted before
        if (!n.read && !toastedNotificationIds.current.has(n.id)) {
          showToast({
            title: n.title,
            description: n.message,
            // --- FIX: 'n.type' now includes 'error' from types/notification.ts ---
            variant: n.type === 'error' ? 'destructive' : 'default',
            duration: 9000, // Toasts auto-dismiss after 9 seconds
            action: n.actionUrl ? (
              <ToastAction
                altText={n.actionLabel || 'View'}
                onClick={() => {
                  if (n.actionUrl) {
                    router.push(n.actionUrl);
                    markAsRead(n.id); // Mark as read when action is clicked
                  }
                }}
              >
                {n.actionLabel || 'View'}
              </ToastAction>
            ) : undefined,
          });
          // Add the notification ID to the ref to prevent it from being toasted again
          toastedNotificationIds.current.add(n.id);
        }
      });
    }
  }, [notifications, user?.id, isAuthenticated, markAsRead, router]);


  // Show a loading spinner while the authentication status is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  // Render content for public routes (e.g., login, register) without the sidebar
  if (isPublicRoute) {
    return (
      <>
        {children}
        <Toaster /> {/* Toaster should be available for public routes too */}
      </>
    );
  }

  // If not authenticated and not a public route, return null (handled by router.push in useEffect)
  if (!isAuthenticated) {
    return null;
  }

  // Render the main authenticated layout with sidebar and content
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto"> 
        <div className="p-6">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
}
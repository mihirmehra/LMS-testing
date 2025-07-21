// components/layout/ClientLayout.tsx

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { toast as showToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Loader2 } from 'lucide-react';
import { PushNotificationService } from '@/lib/client/pushNotifications';
import { ToastAction } from '@/components/ui/toast'; // IMPORTANT: Import ToastAction component

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

  // Initialize PushNotificationService as a ref to ensure it's a stable, single instance
  const pushService = useRef<PushNotificationService | null>(null);
  if (!pushService.current) {
    pushService.current = PushNotificationService.getInstance();
  }

  const publicRoutes = ['/login', '/register', '/unauthorized'];
  const isPublicRoute = publicRoutes.includes(pathname ?? '');

  // Effect for handling authentication and redirection
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicRoute) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router, isPublicRoute]);

  // Callback to set up push notifications for a specific user
  const setupPushNotifications = useCallback(async (userId: string) => {
    // Check if push notifications are supported in the current browser/environment
    if (!pushService.current?.isSupported()) {
      console.warn('Push notifications not supported in this environment.');
      return;
    }
    try {
      // Subscribe the user's device to push notifications
      const deviceRegistration = await pushService.current.subscribeToPush(
        userId,
        navigator.userAgent
      );
      console.log('Push notification subscribed and device registered:', deviceRegistration);
    } catch (error) {
      console.error('Error setting up push notifications:', error);
    }
  }, []); // This callback does not depend on any changing values, so it's stable

  // Effect to listen for foreground push messages and display them as toasts
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    if (pushService.current) {
      // Set up a listener for messages received while the app is in the foreground
      const returnedUnsubscribe = pushService.current.onForegroundMessage((payload) => {
        console.log('Foreground message received. ', payload);
        showToast({
          title: payload.notification?.title || 'New Notification',
          description: payload.notification?.body,
          // Conditionally render ToastAction if an action URL is provided
          action: payload.data?.actionUrl ? (
            <ToastAction
              altText={payload.data.actionLabel || "View notification"} // Accessibility text for the button
              onClick={() => {
                if (payload.data?.actionUrl) {
                  window.location.href = payload.data.actionUrl; // Navigate to the action URL
                }
              }}
            >
              {payload.data.actionLabel || 'View'} {/* Label text for the action button */}
            </ToastAction>
          ) : undefined, // No action if no URL
          variant: 'default', // Default toast style
          duration: 7000, // Toast display duration
        });
      });
      if (returnedUnsubscribe) {
        unsubscribe = returnedUnsubscribe;
      }
    }

    // Cleanup function to unsubscribe from foreground messages when the component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []); // No dependencies as pushService.current is a stable ref

  // Effect for initial notification fetching and setting up polling
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isAuthenticated && user?.id) {
      // 1. Setup push notifications for the authenticated user
      setupPushNotifications(user.id);
      // 2. Perform an immediate initial fetch of notifications
      fetchNotifications(user.id);

      // 3. Set up polling to fetch notifications every 15 seconds
      interval = setInterval(() => {
        fetchNotifications(user.id);
      }, 15000); // Poll every 15 seconds

    }

    // Cleanup function to clear the interval when the component unmounts or dependencies change
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isAuthenticated, user?.id, fetchNotifications, setupPushNotifications]); // Dependencies for re-running this effect


  // Effect to display toasts for newly fetched, unread notifications
  useEffect(() => {
    if (isAuthenticated && notifications.length > 0) {
      notifications.forEach(n => {
        // Check if the notification belongs to the current user, is unread, and hasn't been toasted yet
        if (n.userId === user?.id && !n.read && !toastedNotificationIds.current.has(n.id)) {
          showToast({
            title: n.title,
            description: n.message,
            action: n.actionUrl ? (
              <ToastAction
                altText={n.actionLabel || "View notification"}
                onClick={() => {
                  if (n.actionUrl) {
                    window.location.href = n.actionUrl;
                  }
                  markAsRead(n.id); // Mark as read when the action button is clicked
                }}
              >
                {n.actionLabel || 'View'}
              </ToastAction>
            ) : undefined,
            // Customize toast variant based on notification priority
            variant: n.priority === 'high' ? 'destructive' : 'default',
            duration: 7000,
            onOpenChange: (open) => {
              // Mark as read when the toast is dismissed, but only if it was unread
              if (!open && !n.read) {
                markAsRead(n.id);
              }
            }
          });
          // Add the notification ID to the ref to prevent it from being toasted again
          toastedNotificationIds.current.add(n.id);
        }
      });
    }
  }, [notifications, user?.id, isAuthenticated, markAsRead]); // Dependencies for re-running this effect


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
      {/* Changed overflow-y-auto to overflow-auto for more general scrolling control */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <Toaster /> {/* Toaster for authenticated sections of the app */}
    </div>
  );
}
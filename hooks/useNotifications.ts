// hooks/useNotifications.ts

import { useState, useCallback, useEffect } from 'react';
import { Notification } from '@/types/notification'; // Make sure this path is correct

interface CreateNotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: Notification['type'];
  priority: Notification['priority'];
  actionUrl?: string;
  actionLabel?: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- NEW: Derive unreadCount ---
  const unreadCount = notifications.filter(n => !n.read).length;

  // Function to fetch notifications for the current user
  const fetchNotifications = useCallback(async (userId?: string) => {
    setLoading(true);
    setError(null);
    try {
      // If userId is provided, fetch for that user, otherwise assume current logged-in user (backend handles it)
      const url = userId ? `/api/notifications?userId=${userId}` : '/api/notifications';
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`, // Assuming auth token is used
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch notifications');
      }

      const fetchedNotifications: Notification[] = await response.json();
      setNotifications(fetchedNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())); // Sort by newest first
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'An unexpected error occurred while fetching notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // --- NEW: Fetch notifications on initial mount ---
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Function to create a new notification
  const createNotification = useCallback(
    async (payload: CreateNotificationPayload) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/notifications/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create notification');
        }

        const newNotification: Notification = await response.json();
        setNotifications(prev => [newNotification, ...prev].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        return newNotification;
      } catch (err: any) {
        console.error('Error creating notification:', err);
        setError(err.message || 'An unexpected error occurred during creation');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Function to mark a single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark notification as read');
      }

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      setError(err.message || 'An unexpected error occurred while marking as read');
    }
  }, []);

  // --- NEW: Function to mark all notifications as read ---
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark all notifications as read');
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
      setError(err.message || 'An unexpected error occurred while marking all as read');
    }
  }, []);

  // --- NEW: Function to delete a notification ---
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete notification');
      }

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err: any) {
      console.error('Error deleting notification:', err);
      setError(err.message || 'An unexpected error occurred while deleting');
    }
  }, []);


  return {
    notifications,
    unreadCount, // <--- EXPOSED
    loading,
    error,
    createNotification,
    fetchNotifications,
    markAsRead,
    markAllAsRead, // <--- EXPOSED
    deleteNotification, // <--- EXPOSED
  };
}
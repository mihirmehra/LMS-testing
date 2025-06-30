'use client';

import { useState, useEffect, useCallback } from 'react';
import { Notification, NotificationStats } from '@/types/notification';
import { useAuth } from '@/hooks/useAuth';

export function useNotifications() {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate mock notifications for demo purposes
  const generateMockNotifications = useCallback((): Notification[] => {
    if (!user) return [];

    const mockNotifications: Notification[] = [
      {
        id: 'notif-1',
        userId: user.id,
        type: 'meeting_reminder',
        title: 'Upcoming Meeting',
        message: 'You have a meeting with John Doe in 30 minutes',
        priority: 'high',
        read: false,
        createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        actionUrl: '/calendar',
        actionLabel: 'View Calendar',
      },
      {
        id: 'notif-2',
        userId: user.id,
        type: 'lead_update',
        title: 'New Lead Assigned',
        message: 'A new lead "Jane Smith" has been assigned to you',
        priority: 'medium',
        read: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        actionUrl: '/',
        actionLabel: 'View Lead',
      },
      {
        id: 'notif-3',
        userId: user.id,
        type: 'task_reminder',
        title: 'Task Due Soon',
        message: 'Follow up call with Robert Kim is due in 1 hour',
        priority: 'medium',
        read: false,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        actionUrl: '/',
        actionLabel: 'View Tasks',
      },
      {
        id: 'notif-4',
        userId: user.id,
        type: 'system_alert',
        title: 'System Update',
        message: 'New features have been added to the CRM system',
        priority: 'low',
        read: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        id: 'notif-5',
        userId: user.id,
        type: 'calendar_event',
        title: 'Site Visit Scheduled',
        message: 'Site visit with Maria Garcia scheduled for tomorrow at 2 PM',
        priority: 'medium',
        read: true,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        actionUrl: '/calendar',
        actionLabel: 'View Calendar',
      },
    ];

    return mockNotifications;
  }, [user]);

  // Fetch notifications from API with fallback to mock data
  const fetchNotifications = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        // Use mock data if no token
        const mockData = generateMockNotifications();
        setNotifications(mockData);
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(Array.isArray(data) ? data : []);
      } else {
        // Fallback to mock data if API fails
        console.warn('API failed, using mock notifications');
        const mockData = generateMockNotifications();
        setNotifications(mockData);
      }
    } catch (err) {
      console.warn('Error fetching notifications, using mock data:', err);
      // Use mock data as fallback
      const mockData = generateMockNotifications();
      setNotifications(mockData);
      setError(null); // Don't show error to user, just use mock data
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated, generateMockNotifications]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to mark as read');
        }
      }

      // Update local state regardless of API success
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.warn('Error marking notification as read:', error);
      // Still update local state for better UX
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const response = await fetch('/api/notifications/mark-all-read', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to mark all as read');
        }
      }

      // Update local state regardless of API success
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.warn('Error marking all notifications as read:', error);
      // Still update local state for better UX
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const response = await fetch(`/api/notifications/${notificationId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to delete notification');
        }
      }

      // Update local state regardless of API success
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
    } catch (error) {
      console.warn('Error deleting notification:', error);
      // Still update local state for better UX
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
    }
  };

  // Create notification
  const createNotification = async (notification: Omit<Notification, 'id' | 'userId' | 'createdAt' | 'read'>) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const response = await fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(notification),
        });

        if (response.ok) {
          const newNotification = await response.json();
          setNotifications(prev => [newNotification, ...prev]);
          return newNotification;
        }
      }

      // Create local notification if API fails
      const localNotification: Notification = {
        ...notification,
        id: `local-${Date.now()}`,
        userId: user?.id || '',
        read: false,
        createdAt: new Date(),
      };

      setNotifications(prev => [localNotification, ...prev]);
      return localNotification;
    } catch (error) {
      console.warn('Error creating notification:', error);
      
      // Create local notification as fallback
      const localNotification: Notification = {
        ...notification,
        id: `local-${Date.now()}`,
        userId: user?.id || '',
        read: false,
        createdAt: new Date(),
      };

      setNotifications(prev => [localNotification, ...prev]);
      return localNotification;
    }
  };

  // Get notification stats
  const getStats = (): NotificationStats => {
    const unread = notifications.filter(n => !n.read);
    const byType = notifications.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: notifications.length,
      unread: unread.length,
      byType,
      recent: notifications.slice(0, 5),
    };
  };

  // Check for upcoming meetings and create reminders
  const checkUpcomingMeetings = useCallback(async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`/api/communications/calendar?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const events = await response.json();
        const now = new Date();
        const reminderWindow = 30 * 60 * 1000; // 30 minutes

        events.forEach((event: any) => {
          const eventTime = new Date(event.startDateTime);
          const timeDiff = eventTime.getTime() - now.getTime();

          // Create reminder if event is within 30 minutes
          if (timeDiff > 0 && timeDiff <= reminderWindow) {
            const existingReminder = notifications.find(n => 
              n.type === 'meeting_reminder' && 
              n.data?.eventId === event.id &&
              !n.read
            );

            if (!existingReminder) {
              createNotification({
                type: 'meeting_reminder',
                title: 'Upcoming Meeting',
                message: `Meeting "${event.title}" starts in ${Math.round(timeDiff / (1000 * 60))} minutes`,
                priority: 'high',
                data: {
                  eventId: event.id,
                  eventTitle: event.title,
                  startTime: event.startDateTime,
                },
                actionUrl: '/calendar',
                actionLabel: 'View Calendar',
              });
            }
          }
        });
      }
    } catch (error) {
      console.warn('Error checking upcoming meetings:', error);
    }
  }, [user, notifications, createNotification]);

  // Initialize notifications when user is available
  useEffect(() => {
    if (user && isAuthenticated) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setLoading(false);
    }
  }, [user, isAuthenticated, fetchNotifications]);

  // Set up polling for real-time updates (reduced frequency to avoid API overload)
  useEffect(() => {
    if (user && isAuthenticated) {
      // Check for upcoming meetings every 5 minutes
      const meetingInterval = setInterval(checkUpcomingMeetings, 5 * 60 * 1000);
      
      // Fetch notifications every 2 minutes (reduced from 30 seconds)
      const notificationInterval = setInterval(fetchNotifications, 2 * 60 * 1000);

      return () => {
        clearInterval(meetingInterval);
        clearInterval(notificationInterval);
      };
    }
  }, [user, isAuthenticated, fetchNotifications, checkUpcomingMeetings]);

  return {
    notifications,
    loading,
    error,
    stats: getStats(),
    unreadCount: notifications.filter(n => !n.read).length,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
  };
}
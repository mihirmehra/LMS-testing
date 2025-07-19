export interface Notification {
  id: string;
  userId: string;
  type: 'meeting_reminder' | 'reminder' | 'lead_update' | 'task_reminder' | 'system_alert' | 'calendar_event' | 'lead_assignment';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  scheduledFor?: Date;
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  meetingReminders: boolean;
  leadUpdates: boolean;
  taskReminders: boolean;
  systemAlerts: boolean;
  reminderTiming: number; // minutes before event
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  recent: Notification[];
}
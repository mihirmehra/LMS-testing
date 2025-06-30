import { getDatabase } from '@/lib/mongodb';
import { Notification } from '@/types/notification';
import { ObjectId } from 'mongodb';

export class NotificationsAPI {
  private static async getCollection() {
    const db = await getDatabase();
    return db.collection('notifications');
  }

  static async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      const collection = await this.getCollection();
      const notifications = await collection
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      
      return notifications.map(notification => {
        const { _id, ...rest } = notification;
        return {
          ...rest,
          id: _id.toString(),
          createdAt: new Date(notification.createdAt),
          scheduledFor: notification.scheduledFor ? new Date(notification.scheduledFor) : undefined,
        };
      }) as Notification[];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  static async createNotification(notificationData: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification> {
    try {
      const collection = await this.getCollection();
      const now = new Date();
      
      const newNotification = {
        ...notificationData,
        read: false,
        createdAt: now,
      };

      const result = await collection.insertOne(newNotification);
      
      return {
        ...newNotification,
        id: result.insertedId.toString(),
      } as Notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      if (!ObjectId.isValid(notificationId)) {
        return false;
      }
      
      const collection = await this.getCollection();
      const result = await collection.updateOne(
        { 
          _id: new ObjectId(notificationId),
          userId: userId 
        },
        { 
          $set: { read: true } 
        }
      );
      
      return result.modifiedCount === 1;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  static async markAllAsRead(userId: string): Promise<number> {
    try {
      const collection = await this.getCollection();
      const result = await collection.updateMany(
        { 
          userId: userId,
          read: false 
        },
        { 
          $set: { read: true } 
        }
      );
      
      return result.modifiedCount;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return 0;
    }
  }

  static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      if (!ObjectId.isValid(notificationId)) {
        return false;
      }
      
      const collection = await this.getCollection();
      const result = await collection.deleteOne({
        _id: new ObjectId(notificationId),
        userId: userId
      });
      
      return result.deletedCount === 1;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  static async createMeetingReminder(
    userId: string, 
    eventId: string, 
    eventTitle: string, 
    startTime: Date,
    reminderMinutes: number = 30
  ): Promise<Notification | null> {
    try {
      const reminderTime = new Date(startTime.getTime() - reminderMinutes * 60 * 1000);
      
      // Don't create reminder if it's in the past
      if (reminderTime <= new Date()) {
        return null;
      }

      return await this.createNotification({
        userId,
        type: 'task_reminder',
        title: 'Upcoming Meeting',
        message: `Meeting "${eventTitle}" starts in ${reminderMinutes} minutes`,
        priority: 'high',
        data: {
          eventId,
          eventTitle,
          startTime: startTime.toISOString(),
          reminderMinutes,
        },
        scheduledFor: reminderTime,
        actionUrl: '/calendar',
        actionLabel: 'View Calendar',
      });
    } catch (error) {
      console.error('Error creating meeting reminder:', error);
      return null;
    }
  }

  static async createLeadUpdateNotification(
    userId: string,
    leadId: string,
    leadName: string,
    updateType: string,
    message: string
  ): Promise<Notification | null> {
    try {
      return await this.createNotification({
        userId,
        type: 'lead_update',
        title: 'Lead Update',
        message: `${leadName}: ${message}`,
        priority: 'medium',
        data: {
          leadId,
          leadName,
          updateType,
        },
        actionUrl: `/leads/${leadId}`,
        actionLabel: 'View Lead',
      });
    } catch (error) {
      console.error('Error creating lead update notification:', error);
      return null;
    }
  }

  static async createTaskReminder(
    userId: string,
    taskId: string,
    taskTitle: string,
    dueDate: Date
  ): Promise<Notification | null> {
    try {
      const now = new Date();
      const timeDiff = dueDate.getTime() - now.getTime();
      const hoursUntilDue = Math.floor(timeDiff / (1000 * 60 * 60));

      let priority: Notification['priority'] = 'low';
      let message = `Task "${taskTitle}" is due`;

      if (hoursUntilDue <= 1) {
        priority = 'high';
        message = `Task "${taskTitle}" is due in ${Math.max(0, hoursUntilDue)} hour(s)`;
      } else if (hoursUntilDue <= 24) {
        priority = 'medium';
        message = `Task "${taskTitle}" is due in ${hoursUntilDue} hours`;
      }

      return await this.createNotification({
        userId,
        type: 'task_reminder',
        title: 'Task Reminder',
        message,
        priority,
        data: {
          taskId,
          taskTitle,
          dueDate: dueDate.toISOString(),
        },
        actionUrl: '/tasks',
        actionLabel: 'View Tasks',
      });
    } catch (error) {
      console.error('Error creating task reminder:', error);
      return null;
    }
  }
}
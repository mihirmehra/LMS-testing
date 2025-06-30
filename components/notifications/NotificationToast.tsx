'use client';

import { ForwardRefExoticComponent, RefAttributes, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { Notification } from '@/types/notification';
import { Bell, X, Calendar, Clock, User, Settings, CheckCircle2, LucideProps } from 'lucide-react';

export function NotificationToast() {
  const { notifications } = useNotifications();
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Show only high priority unread notifications as toasts
    const highPriorityUnread = notifications.filter(
      n => !n.read && n.priority === 'high' && 
      !visibleNotifications.find(v => v.id === n.id)
    );

    if (highPriorityUnread.length > 0) {
      setVisibleNotifications(prev => [...prev, ...highPriorityUnread.slice(0, 3)]);
    }
  }, [notifications, visibleNotifications]);

  const dismissNotification = (id: string) => {
    setVisibleNotifications(prev => prev.filter(n => n.id !== id));
  };

  type NotificationType = 'meeting' | 'reminder' | 'lead_update' | 'task' | 'system' | 'calendar';

  interface Icons {
    [key: string]: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
  }

  const icons: Icons = {
    meeting: Calendar,
    reminder: Clock,
    lead_update: User,
    task: CheckCircle2,
    system: Settings,
    calendar: Calendar,
  };

  const getNotificationIcon = (type: string) => {
    const Icon = icons[type] || Bell; // Now it accepts any string
    return <Icon className="h-4 w-4" />;
  };

 
  if (visibleNotifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {visibleNotifications.map((notification) => (
        <Card key={notification.id} className="w-80 bg-white shadow-lg border-l-4 border-l-red-500 animate-in slide-in-from-right">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="flex-shrink-0 mt-1 text-red-600">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </h4>
                    <Badge variant="destructive" className="text-xs">
                      {notification.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    {notification.message}
                  </p>
                  {notification.actionUrl && notification.actionLabel && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.location.href = notification.actionUrl!;
                        dismissNotification(notification.id);
                      }}
                      className="text-xs"
                    >
                      {notification.actionLabel}
                    </Button>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissNotification(notification.id)}
                className="p-1 h-6 w-6 ml-2"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
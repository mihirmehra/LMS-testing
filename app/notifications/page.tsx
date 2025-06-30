'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PushNotificationSettings } from '@/components/notifications/PushNotificationSettings';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { 
  Bell, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  User, 
  Settings,
  Check,
  ExternalLink,
  Filter,
  Loader2,
  Smartphone
} from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function NotificationsPage() {
  const { user } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    loading 
  } = useNotifications();
  
  const [filter, setFilter] = useState<'all' | 'unread' | 'meetings' | 'tasks' | 'system'>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  // Notification preferences state
  const [preferences, setPreferences] = useState({
    emailNotifications: user?.preferences?.notifications?.email || true,
    pushNotifications: user?.preferences?.notifications?.push || true,
    leadUpdates: user?.preferences?.notifications?.leadUpdates || true,
    taskReminders: user?.preferences?.notifications?.taskReminders || true,
    meetingReminders: true,
    systemAlerts: true,
  });

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'meetings':
        return notification.type === 'meeting_reminder' || notification.type === 'calendar_event';
      case 'tasks':
        return notification.type === 'task_reminder';
      case 'system':
        return notification.type === 'system_alert';
      default:
        return true;
    }
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'meeting_reminder':
      case 'calendar_event':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'task_reminder':
        return <Clock className="h-5 w-5 text-amber-600" />;
      case 'lead_update':
        return <User className="h-5 w-5 text-green-600" />;
      case 'system_alert':
        return <Settings className="h-5 w-5 text-red-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diff = now.getTime() - notificationDate.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return notificationDate.toLocaleDateString();
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const handleSelectNotification = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  const handleBulkDelete = () => {
    selectedNotifications.forEach(id => deleteNotification(id));
    setSelectedNotifications([]);
  };

  const handleBulkMarkAsRead = () => {
    selectedNotifications.forEach(id => {
      const notification = notifications.find(n => n.id === id);
      if (notification && !notification.read) {
        markAsRead(id);
      }
    });
    setSelectedNotifications([]);
  };

  const notificationStats = {
    total: notifications.length,
    unread: unreadCount,
    meetings: notifications.filter(n => n.type === 'meeting_reminder' || n.type === 'calendar_event').length,
    tasks: notifications.filter(n => n.type === 'task_reminder').length,
    system: notifications.filter(n => n.type === 'system_alert').length,
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                <p className="text-gray-600">Manage your notifications and push notification settings</p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Check className="h-4 w-4 mr-2" />
                Mark All Read ({unreadCount})
              </Button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold">{notificationStats.total}</p>
                  </div>
                  <Bell className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Unread</p>
                    <p className="text-2xl font-bold text-blue-600">{notificationStats.unread}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Meetings</p>
                    <p className="text-2xl font-bold text-green-600">{notificationStats.meetings}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tasks</p>
                    <p className="text-2xl font-bold text-amber-600">{notificationStats.tasks}</p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">System</p>
                    <p className="text-2xl font-bold text-red-600">{notificationStats.system}</p>
                  </div>
                  <Settings className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="notifications" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="push-settings">
                <Smartphone className="h-4 w-4 mr-2" />
                Push Notifications
              </TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            <TabsContent value="notifications" className="space-y-6">
              {/* Filters and Actions */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Filter className="h-5 w-5 text-blue-600" />
                    <span>Filter & Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Notifications</SelectItem>
                          <SelectItem value="unread">Unread Only</SelectItem>
                          <SelectItem value="meetings">Meetings</SelectItem>
                          <SelectItem value="tasks">Tasks & Reminders</SelectItem>
                          <SelectItem value="system">System Alerts</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                      >
                        {selectedNotifications.length === filteredNotifications.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                    
                    {selectedNotifications.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {selectedNotifications.length} selected
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleBulkMarkAsRead}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Mark Read
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleBulkDelete}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Notifications List */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle>
                    {filter === 'all' ? 'All Notifications' : 
                     filter === 'unread' ? 'Unread Notifications' :
                     filter === 'meetings' ? 'Meeting Notifications' :
                     filter === 'tasks' ? 'Task Notifications' :
                     'System Notifications'}
                  </CardTitle>
                  <CardDescription>
                    Showing {filteredNotifications.length} of {notifications.length} notifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : filteredNotifications.length > 0 ? (
                    <div className="space-y-4">
                      {filteredNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                            !notification.read ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
                          } ${selectedNotifications.includes(notification.id) ? 'ring-2 ring-blue-500' : ''}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start space-x-4">
                            <input
                              type="checkbox"
                              checked={selectedNotifications.includes(notification.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectNotification(notification.id);
                              }}
                              className="mt-1"
                            />
                            
                            <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border">
                              {getNotificationIcon(notification.type)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-medium text-gray-900">
                                  {notification.title}
                                </h3>
                                <div className="flex items-center space-x-2">
                                  {!notification.read && (
                                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                  )}
                                  <span className="text-sm text-gray-500">
                                    {formatTime(notification.createdAt)}
                                  </span>
                                </div>
                              </div>
                              
                              <p className="text-gray-600 mb-3">
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Badge 
                                    variant="outline" 
                                    className={getPriorityColor(notification.priority)}
                                  >
                                    {notification.priority} priority
                                  </Badge>
                                  <Badge variant="outline">
                                    {notification.type.replace('_', ' ')}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  {!notification.read && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(notification.id);
                                      }}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Mark Read
                                    </Button>
                                  )}
                                  
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification(notification.id);
                                    }}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                  
                                  {notification.actionUrl && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.location.href = notification.actionUrl!;
                                      }}
                                    >
                                      <ExternalLink className="h-4 w-4 mr-1" />
                                      View
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                      <p className="text-gray-600">
                        {filter === 'unread' 
                          ? "You're all caught up! No unread notifications."
                          : "You don't have any notifications yet."}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="push-settings" className="space-y-6">
              <PushNotificationSettings />
            </TabsContent>

            <TabsContent value="preferences" className="space-y-6">
              <div className="space-y-6">
                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Bell className="h-5 w-5" />
                      <span>Notification Preferences</span>
                    </CardTitle>
                    <CardDescription>
                      Choose how you want to be notified about updates
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-gray-600">Receive notifications via email</p>
                      </div>
                      <Switch
                        checked={preferences.emailNotifications}
                        onCheckedChange={(checked) => 
                          setPreferences(prev => ({
                            ...prev,
                            emailNotifications: checked
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Lead Updates</Label>
                        <p className="text-sm text-gray-600">Get notified when leads are updated</p>
                      </div>
                      <Switch
                        checked={preferences.leadUpdates}
                        onCheckedChange={(checked) => 
                          setPreferences(prev => ({
                            ...prev,
                            leadUpdates: checked
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Task Reminders</Label>
                        <p className="text-sm text-gray-600">Receive reminders for upcoming tasks</p>
                      </div>
                      <Switch
                        checked={preferences.taskReminders}
                        onCheckedChange={(checked) => 
                          setPreferences(prev => ({
                            ...prev,
                            taskReminders: checked
                          }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle>Dashboard Preferences</CardTitle>
                    <CardDescription>
                      Customize your dashboard experience
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="leadsPerPage">Leads per page</Label>
                      <Input
                        id="leadsPerPage"
                        type="number"
                        min="5"
                        max="50"
                        defaultValue="10"
                        className="w-24"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}
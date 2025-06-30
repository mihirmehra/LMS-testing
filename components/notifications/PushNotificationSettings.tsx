'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { PushNotificationService, DeviceRegistration } from '@/lib/pushNotifications';
import { 
  Smartphone, 
  Monitor, 
  Tablet, 
  Bell, 
  BellOff, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  TestTube
} from 'lucide-react';

export function PushNotificationSettings() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<DeviceRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  const pushService = PushNotificationService.getInstance();

  useEffect(() => {
    if (user) {
      loadDevices();
      checkPushSupport();
    }
  }, [user]);

  const loadDevices = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userDevices = await pushService.getUserDevices(user.id);
      setDevices(userDevices);
      setPushEnabled(userDevices.some(d => d.isActive));
    } catch (error) {
      console.error('Error loading devices:', error);
      // Load from localStorage as fallback
      const localDevices = JSON.parse(localStorage.getItem('push_devices') || '[]');
      const userDevices = localDevices.filter((d: DeviceRegistration) => d.userId === user.id);
      setDevices(userDevices);
      setPushEnabled(userDevices.some(d => d.isActive));
    } finally {
      setLoading(false);
    }
  };

  const checkPushSupport = () => {
    if (!pushService.isSupported()) {
      setMessage({
        type: 'error',
        text: 'Push notifications are not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.',
      });
    }
  };

  const handleRegisterDevice = async () => {
    if (!user || !deviceName.trim()) return;

    try {
      setIsRegistering(true);
      setMessage(null);

      const device = await pushService.subscribeToPush(user.id, deviceName.trim());
      setDevices(prev => [...prev, device]);
      setPushEnabled(true);
      setIsAddDeviceModalOpen(false);
      setDeviceName('');
      
      setMessage({
        type: 'success',
        text: 'Device registered successfully! You will now receive push notifications.',
      });
    } catch (error) {
      console.error('Error registering device:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to register device for notifications',
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUnregisterDevice = async (deviceId: string) => {
    try {
      await pushService.unsubscribeFromPush(deviceId);
      setDevices(prev => prev.filter(d => d.id !== deviceId));
      
      if (devices.length === 1) {
        setPushEnabled(false);
      }
      
      setMessage({
        type: 'success',
        text: 'Device unregistered successfully.',
      });
    } catch (error) {
      console.error('Error unregistering device:', error);
      setMessage({
        type: 'error',
        text: 'Failed to unregister device',
      });
    }
  };

  const handleTestNotification = async () => {
    if (!user) return;

    try {
      setIsTesting(true);
      await pushService.testPushNotification(user.id);
      setMessage({
        type: 'success',
        text: 'Test notification sent! Check your device.',
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      setMessage({
        type: 'error',
        text: 'Failed to send test notification',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const getDeviceTypeLabel = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return 'Mobile Device';
      case 'tablet':
        return 'Tablet';
      default:
        return 'Desktop';
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <span>Push Notification Settings</span>
          </CardTitle>
          <CardDescription>
            Manage your devices and notification preferences for real-time alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Push Notifications Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {pushEnabled ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <BellOff className="h-6 w-6 text-gray-400" />
              )}
              <div>
                <h3 className="font-medium">
                  Push Notifications {pushEnabled ? 'Enabled' : 'Disabled'}
                </h3>
                <p className="text-sm text-gray-600">
                  {pushEnabled 
                    ? `You have ${devices.length} device(s) registered for notifications`
                    : 'Register a device to receive push notifications'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {pushEnabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestNotification}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Test
                </Button>
              )}
              <Button
                onClick={() => setIsAddDeviceModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!pushService.isSupported()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Device
              </Button>
            </div>
          </div>

          {/* Registered Devices */}
          <div>
            <h3 className="font-medium mb-4">Registered Devices ({devices.length})</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : devices.length > 0 ? (
              <div className="space-y-3">
                {devices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="text-blue-600">
                        {getDeviceIcon(device.deviceType)}
                      </div>
                      <div>
                        <h4 className="font-medium">{device.deviceName}</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>{getDeviceTypeLabel(device.deviceType)}</span>
                          <span>•</span>
                          <span>Registered {new Date(device.registeredAt).toLocaleDateString()}</span>
                          {device.isActive && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-green-600 border-green-200">
                                Active
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnregisterDevice(device.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No devices registered</p>
                <p className="text-sm mt-1">Add a device to start receiving push notifications</p>
              </div>
            )}
          </div>

          {/* Notification Types */}
          <div>
            <h3 className="font-medium mb-4">Notification Types</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Meeting Reminders</Label>
                  <p className="text-sm text-gray-600">Get notified before scheduled meetings</p>
                </div>
                <Switch checked={true} disabled />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Lead Updates</Label>
                  <p className="text-sm text-gray-600">Notifications when leads are assigned or updated</p>
                </div>
                <Switch checked={true} disabled />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Task Reminders</Label>
                  <p className="text-sm text-gray-600">Reminders for upcoming tasks and follow-ups</p>
                </div>
                <Switch checked={true} disabled />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>System Alerts</Label>
                  <p className="text-sm text-gray-600">Important system notifications and updates</p>
                </div>
                <Switch checked={true} disabled />
              </div>
            </div>
          </div>

          {/* Browser Support Info */}
          {!pushService.isSupported() && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Push notifications are not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari to enable push notifications.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Add Device Modal */}
      <Dialog open={isAddDeviceModalOpen} onOpenChange={setIsAddDeviceModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Device for Notifications</DialogTitle>
            <DialogDescription>
              Give your device a name to identify it in your notification settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deviceName">Device Name</Label>
              <Input
                id="deviceName"
                placeholder="e.g., My iPhone, Work Laptop"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="mt-1"
              />
            </div>
            <Alert>
              <Bell className="h-4 w-4" />
              <AlertDescription>
                Your browser will ask for permission to send notifications. Please allow notifications to receive real-time alerts.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDeviceModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRegisterDevice}
              disabled={!deviceName.trim() || isRegistering}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Register Device
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
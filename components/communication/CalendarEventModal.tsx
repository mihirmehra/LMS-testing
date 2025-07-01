'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarEvent } from '@/types/communication';
import { Lead } from '@/types/lead';
import { GoogleCalendarService } from '@/lib/googleCalendar';
import { Calendar, Clock, Users, Bell, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CalendarEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead;
  event?: CalendarEvent;
  onEventCreated?: (event: CalendarEvent) => void;
  onEventUpdated?: (event: CalendarEvent) => void;
}

export function CalendarEventModal({ 
  open, 
  onOpenChange, 
  lead, 
  event, 
  onEventCreated, 
  onEventUpdated 
}: CalendarEventModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    attendees: [] as string[],
    reminders: [10] as number[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState('');

  const calendarService = GoogleCalendarService.getInstance();

  useEffect(() => {
    if (event) {
      const startDate = new Date(event.startDateTime);
      const endDate = new Date(event.endDateTime);
      
      setFormData({
        title: event.title,
        description: event.description || '',
        date: startDate.toISOString().split('T')[0],
        startTime: startDate.toTimeString().slice(0, 5),
        endTime: endDate.toTimeString().slice(0, 5),
        location: '',
        attendees: event.attendees || [],
        reminders: event.reminders || [10],
      });
    } else if (lead) {
      setFormData(prev => ({
        ...prev,
        title: `Follow-up with ${lead.name}`,
        attendees: [lead.primaryEmail],
      }));
    }
  }, [event, lead]);

  useEffect(() => {
    if (open) {
      checkGoogleConnection();
    }
  }, [open]);

  const checkGoogleConnection = async () => {
    try {
      setConnectionStatus('checking');
      setErrorMessage('');
      
      await calendarService.initializeGoogleAPI();
      const hasPermissions = await calendarService.checkPermissions();
      
      if (hasPermissions) {
        setIsGoogleConnected(true);
        setConnectionStatus('connected');
      } else {
        setIsGoogleConnected(false);
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Failed to check Google connection:', error);
      setIsGoogleConnected(false);
      setConnectionStatus('error');
      setErrorMessage('Failed to initialize Google Calendar. Please check your internet connection.');
    }
  };

  const handleGoogleConnect = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      const success = await calendarService.signIn();
      
      if (success) {
        setIsGoogleConnected(true);
        setConnectionStatus('connected');
      } else {
        setErrorMessage('Failed to connect to Google Calendar. Please try again.');
      }
    } catch (error) {
      console.error('Failed to connect to Google Calendar:', error);
      setErrorMessage('Failed to connect to Google Calendar. Please ensure you grant the necessary permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isGoogleConnected) {
      await handleGoogleConnect();
      return;
    }

    if (!formData.title.trim() || !formData.date || !formData.startTime || !formData.endTime) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      if (endDateTime <= startDateTime) {
        setErrorMessage('End time must be after start time.');
        setIsLoading(false);
        return;
      }

      const eventData = {
        summary: formData.title,
        description: formData.description,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        attendees: formData.attendees.map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: formData.reminders.map(minutes => ({
            method: 'popup',
            minutes,
          })),
        },
        location: formData.location,
      };

      let result;
      if (event?.googleEventId) {
        result = await calendarService.updateEvent(event.googleEventId, eventData);
      } else {
        result = await calendarService.createEvent(eventData);
      }

      const newEvent: CalendarEvent = {
        id: event?.id || `event-${Date.now()}`,
        title: formData.title,
        description: formData.description,
        startDateTime,
        endDateTime,
        attendees: formData.attendees,
        reminders: formData.reminders,
        leadId: lead?.id,
        googleEventId: result.id,
        createdBy: 'current-user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (event) {
        onEventUpdated?.(newEvent);
      } else {
        onEventCreated?.(newEvent);
      }

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create/update event:', error);
      setErrorMessage('Failed to save event to Google Calendar. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      startTime: '',
      endTime: '',
      location: '',
      attendees: [],
      reminders: [10],
    });
    setErrorMessage('');
  };

  const addAttendee = () => {
    const email = prompt('Enter attendee email:');
    if (email && email.includes('@') && !formData.attendees.includes(email)) {
      setFormData(prev => ({
        ...prev,
        attendees: [...prev.attendees, email],
      }));
    }
  };

  const removeAttendee = (email: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.filter(a => a !== email),
    }));
  };

  const toggleReminder = (minutes: number) => {
    setFormData(prev => ({
      ...prev,
      reminders: prev.reminders.includes(minutes)
        ? prev.reminders.filter(r => r !== minutes)
        : [...prev.reminders, minutes],
    }));
  };

  const getConnectionStatusAlert = () => {
    switch (connectionStatus) {
      case 'checking':
        return (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Checking Google Calendar connection...
            </AlertDescription>
          </Alert>
        );
      case 'connected':
        return (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-green-700">
              Connected to Google Calendar. You can create and sync events.
            </AlertDescription>
          </Alert>
        );
      case 'disconnected':
        return (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Not connected to Google Calendar. Click Connect Google Calendar to enable event creation.
            </AlertDescription>
          </Alert>
        );
      case 'error':
        return (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage || 'Error connecting to Google Calendar. Please try again.'}
            </AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span>{event ? 'Edit Event' : 'Schedule New Event'}</span>
          </DialogTitle>
          <DialogDescription>
            {lead ? `Create a calendar event for ${lead.name}` : 'Create a new calendar event'}
          </DialogDescription>
        </DialogHeader>

        {/* Connection Status */}
        <div className="mb-4">
          {getConnectionStatusAlert()}
        </div>

        {/* Error Message */}
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                placeholder="e.g., Property viewing with John"
              />
            </div>

            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., 123 Main St, Property Office"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add event details, agenda, or notes..."
                rows={3}
              />
            </div>
          </div>

          {/* Attendees */}
          <div>
            <Label className="flex items-center space-x-2 mb-2">
              <Users className="h-4 w-4" />
              <span>Attendees</span>
            </Label>
            <div className="space-y-2">
              {formData.attendees.map((email, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-sm">{email}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttendee(email)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAttendee}
                className="w-full"
              >
                Add Attendee
              </Button>
            </div>
          </div>

          {/* Reminders */}
          <div>
            <Label className="flex items-center space-x-2 mb-2">
              <Bell className="h-4 w-4" />
              <span>Reminders</span>
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[5, 10, 15, 30, 60].map(minutes => (
                <div key={minutes} className="flex items-center space-x-2">
                  <Checkbox
                    id={`reminder-${minutes}`}
                    checked={formData.reminders.includes(minutes)}
                    onCheckedChange={() => toggleReminder(minutes)}
                  />
                  <Label htmlFor={`reminder-${minutes}`} className="text-sm">
                    {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`} before
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {!isGoogleConnected ? (
              <Button
                type="button"
                onClick={handleGoogleConnect}
                disabled={isLoading || connectionStatus === 'checking'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? 'Connecting...' : 'Connect Google Calendar'}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
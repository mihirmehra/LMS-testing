'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Lead, Activity } from '@/types/lead';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Plus, Clock, User, Tag } from 'lucide-react';

interface LeadNotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onAddNote: (note: Activity) => void;
}

export function LeadNotesModal({ open, onOpenChange, lead, onAddNote }: LeadNotesModalProps) {
  const { user } = useAuth();
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<Activity['type']>('Note');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');

  const noteTypes: Activity['type'][] = ['Note', 'Call', 'Email', 'Meeting', 'Status Change', 'Property Shown'];

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    const note: Activity = {
      id: `note-${Date.now()}`,
      type: noteType,
      description: newNote,
      date: new Date(),
      agent: user?.name || 'Current User',
      metadata: {
        priority,
        addedBy: user?.id,
      },
    };

    onAddNote(note);
    setNewNote('');
    setNoteType('Note');
    setPriority('Medium');
  };

  const getActivityIcon = (type: Activity['type']) => {
    const icons = {
      'Call': '📞',
      'Email': '📧',
      'Meeting': '🤝',
      'Note': '📝',
      'Status Change': '🔄',
      'Property Shown': '🏠',
    };
    return icons[type] || '📝';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'High': 'bg-red-100 text-red-800',
      'Medium': 'bg-amber-100 text-amber-800',
      'Low': 'bg-green-100 text-green-800',
    };
    return colors[priority as keyof typeof colors] || colors.Medium;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  // Sort activities by date (newest first)
  const sortedActivities = [...lead.activities].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span>Notes & Activities - {lead.name}</span>
          </DialogTitle>
          <DialogDescription>
            View all notes and activities for this lead
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add New Note */}
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-4 flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add New Note</span>
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Activity Type</Label>
                    <Select value={noteType} onValueChange={(value: Activity['type']) => setNoteType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {noteTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            <span className="flex items-center space-x-2">
                              <span>{getActivityIcon(type)}</span>
                              <span>{type}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={(value: 'Low' | 'Medium' | 'High') => setPriority(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Note Content</Label>
                  <Textarea
                    placeholder="Add your note here..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <Button 
                  onClick={handleAddNote} 
                  disabled={!newNote.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>
            </div>

            {/* Lead Summary */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Lead Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant="outline">{lead.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Property Type:</span>
                  <span>{lead.propertyType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Budget:</span>
                  <span>{lead.budgetRange}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Source:</span>
                  <span>{lead.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Activities:</span>
                  <span className="font-medium">{lead.activities.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activities Timeline */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Activity Timeline ({sortedActivities.length})</span>
            </h3>
            
            <div className="max-h-96 overflow-y-auto space-y-3">
              {sortedActivities.length > 0 ? sortedActivities.map((activity) => (
                <div key={activity.id} className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getActivityIcon(activity.type)}</span>
                      <Badge variant="outline" className="text-xs">
                        {activity.type}
                      </Badge>
                      {activity.metadata?.priority && (
                        <Badge className={`text-xs ${getPriorityColor(activity.metadata.priority)}`}>
                          {activity.metadata.priority}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(activity.date)}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-900 mb-2">{activity.description}</p>
                  
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <User className="h-3 w-3" />
                    <span>by {activity.agent}</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No activities recorded yet</p>
                  <p className="text-sm mt-1">Add your first note to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
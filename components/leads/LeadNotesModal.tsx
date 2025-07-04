// components/leads/LeadNotesModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dispatch, SetStateAction, useState, useEffect } from 'react'; // Added useEffect
import { Lead } from '@/types/lead'; // Make sure you import your Lead type
import { ScrollArea } from '@/components/ui/scroll-area'; // For scrollable notes list
import { Clock, FileText } from 'lucide-react'; // Icons for notes

// Define the props interface for LeadNotesModal
interface LeadNotesModalProps {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  lead: Lead; // Add the lead prop
  onAddNote: (noteContent: string) => Promise<void>; // Add the onAddNote prop
}

export function LeadNotesModal({ open, onOpenChange, lead, onAddNote }: LeadNotesModalProps) {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset note content when modal opens or lead changes
  useEffect(() => {
    if (open) {
      setNewNoteContent(''); // Clear text area when modal opens
    }
  }, [open]);

  const handleSaveNote = async () => {
    if (!newNoteContent.trim()) return;

    setIsSaving(true);
    try {
      await onAddNote(newNoteContent); // Call the prop function
      setNewNoteContent(''); // Clear input after successful save
      // You might want to keep the modal open or close based on UX needs.
      // If you close it, ensure data is refreshed in the parent view.
      // For now, let's just close it.
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add note in modal:', error);
      // Display a toast/error message if add fails
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  // Filter for actual notes, not other activities
  const notes = lead.activities?.filter(activity => activity.type === 'Note')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Notes for {lead.name}</DialogTitle>
          <DialogDescription>
            Add new notes or review existing ones for this lead.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* New Note Input */}
          <div className="space-y-2">
            <label htmlFor="new-note" className="text-sm font-medium text-gray-700">Add New Note</label>
            <Textarea
              id="new-note"
              placeholder="Type your note here..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={4}
            />
            <Button
              onClick={handleSaveNote}
              disabled={!newNoteContent.trim() || isSaving}
              className="w-full"
            >
              {isSaving ? 'Adding Note...' : 'Add Note'}
            </Button>
          </div>

          {/* Existing Notes */}
          <div className="space-y-2 pt-4 border-t">
            <h3 className="text-sm font-medium text-gray-700">Existing Notes</h3>
            <ScrollArea className="h-60 rounded-md border p-4">
              {notes && notes.length > 0 ? (
                <div className="space-y-4">
                  {notes.map((note, index) => (
                    <div key={note.id || index} className="border-b pb-3 last:border-b-0 last:pb-0">
                      <p className="text-sm text-gray-900">{note.description}</p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(note.date)}</span>
                        <span>by {note.agent || 'System'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">No notes added yet for this lead.</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
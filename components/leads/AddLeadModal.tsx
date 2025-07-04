// components/leads/AddLeadModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Lead } from '@/types/lead'; // Ensure Lead type is correctly imported
import { useAuth } from '@/hooks/useAuth';
import { PermissionService } from '@/lib/permissions';
import { budgetRanges, locations } from '@/lib/mockData';
import { NewLeadData } from '@/hooks/useLeads'; // Import the NewLeadData type from useLeads

interface AddLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Updated: onAddLead now correctly expects an async function returning Promise<Lead>
  onAddLead: (lead: NewLeadData) => Promise<Lead>;
}

export function AddLeadModal({ open, onOpenChange, onAddLead }: AddLeadModalProps) {
  const { user } = useAuth();
  const permissionService = PermissionService.getInstance();
  const [agents, setAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize formData with ALL required Lead properties, even if empty/default
  const initialFormData = {
    name: '',
    primaryPhone: '',
    secondaryPhone: '',
    primaryEmail: '',
    secondaryEmail: '',
    propertyType: 'Residential' as Lead['propertyType'],
    budgetRange: '',
    preferredLocations: [] as string[],
    source: 'Website' as Lead['source'],
    status: 'New' as Lead['status'],
    assignedAgent: '',
    notes: '',
    leadScore: 'Medium' as Lead['leadScore'],
    attachments: [] as string[],
    activities: [],
    leadType: 'Lead' as Lead['leadType'], // ADDED: Default to 'Lead'
  };

  const [formData, setFormData] = useState<NewLeadData>(initialFormData);

  useEffect(() => {
    if (open) {
      fetchAgents();
      setFormData({
        ...initialFormData,
        createdBy: user?.id || 'system',
      });
    }
  }, [open, user?.id]);

  const fetchAgents = async () => {
    try {
      setLoadingAgents(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null; // Safely access localStorage
      const response = await fetch('/api/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const users = await response.json();
        const agentUsers = users.filter((u: any) => u.role === 'agent' && u.isActive);
        setAgents(agentUsers);
      } else {
        console.error('Failed to fetch agents:', response.status, await response.json().catch(() => ''));
        setAgents([]);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      setAgents([]);
    } finally {
      setLoadingAgents(false);
    }
  };

  const availableAgents = permissionService.filterAgentsForUser(agents, user);

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');

    if (digits.startsWith('91')) {
      return `+${digits}`;
    }
    if (digits.length === 10) {
      return `+91${digits}`;
    }
    if (digits.length > 0 && digits.length < 10) {
      return `+91${digits}`;
    }
    return digits.length > 0 ? `+${digits}` : '';
  };

  const handlePhoneChange = (field: 'primaryPhone' | 'secondaryPhone', value: string) => {
    const formattedPhone = formatPhoneNumber(value);
    setFormData(prev => ({ ...prev, [field]: formattedPhone }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.primaryPhone || !formData.primaryEmail) {
      alert('Please fill in all required fields: Full Name, Primary Phone, Primary Email.');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalAssignedAgent = formData.assignedAgent;

      if (user?.role === 'agent' && !canAssignLeads) {
        finalAssignedAgent = user.id;
      } else if (formData.assignedAgent === 'unassigned' || formData.assignedAgent === '') {
        finalAssignedAgent = '';
      }

      const leadToSubmit: NewLeadData = {
        ...formData,
        assignedAgent: finalAssignedAgent,
        createdBy: user?.id || 'system',
      };

      await onAddLead(leadToSubmit);
      onOpenChange(false);
      // Removed window.location.reload(); from here.
      // It's better to let the parent component manage re-fetching data
      // after a successful add, typically by calling fetchLeads in the parent.
      // This allows for more granular UI updates without a full page refresh.
    } catch (error) {
      console.error('Failed to add lead:', error);
      alert('Failed to add lead. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationChange = (location: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        preferredLocations: [...prev.preferredLocations, location]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        preferredLocations: prev.preferredLocations.filter(l => l !== location)
      }));
    }
  };

  const canAssignLeads = permissionService.canAssignLeads(user);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Create a new lead record with all the essential information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="primaryPhone">Primary Phone *</Label>
                <Input
                  id="primaryPhone"
                  type="tel"
                  value={formData.primaryPhone}
                  onChange={(e) => handlePhoneChange('primaryPhone', e.target.value)}
                  placeholder="+91XXXXXXXXXX"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Format: +91XXXXXXXXXX</p>
              </div>

              <div>
                <Label htmlFor="secondaryPhone">Secondary Phone</Label>
                <Input
                  id="secondaryPhone"
                  type="tel"
                  value={formData.secondaryPhone}
                  onChange={(e) => handlePhoneChange('secondaryPhone', e.target.value)}
                  placeholder="+91XXXXXXXXXX"
                />
              </div>

              <div>
                <Label htmlFor="primaryEmail">Primary Email *</Label>
                <Input
                  id="primaryEmail"
                  type="email"
                  value={formData.primaryEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryEmail: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="secondaryEmail">Secondary Email</Label>
                <Input
                  id="secondaryEmail"
                  type="email"
                  value={formData.secondaryEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondaryEmail: e.target.value }))}
                />
              </div>
            </div>

            {/* Property & Assignment Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="propertyType">Property Type</Label>
                <Select
                  value={formData.propertyType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, propertyType: value as Lead['propertyType'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Residential">Residential</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Land">Land</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="budgetRange">Budget Range (INR)</Label>
                <Select
                  value={formData.budgetRange}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, budgetRange: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select budget range</SelectItem>
                    {budgetRanges.map(range => (
                      <SelectItem key={range} value={range}>{range}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="source">Lead Source</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, source: value as Lead['source'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                    <SelectItem value="Walk-in">Walk-in</SelectItem>
                    <SelectItem value="Advertisement">Advertisement</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* NEW: Lead Type Selection */}
              <div>
                <Label htmlFor="leadType">Lead Type *</Label>
                <Select
                  value={formData.leadType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, leadType: value as Lead['leadType'] }))}
                  required // Make this field required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lead type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lead">Lead</SelectItem>
                    <SelectItem value="Cold-Lead">Cold Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>


              {/* Agent assignment - different behavior for admins vs agents */}
              {canAssignLeads && (
                <div>
                  <Label htmlFor="assignedAgent">Assigned Agent</Label>
                  <Select
                    value={formData.assignedAgent || 'unassigned'}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assignedAgent: value === 'unassigned' ? '' : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {loadingAgents ? (
                        <SelectItem value="loading" disabled>Loading agents...</SelectItem>
                      ) : (
                        availableAgents.map(agent => (
                          <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {loadingAgents ? 'Loading...' : `${availableAgents.length} agent(s) available from database`}
                  </p>
                </div>
              )}

              {/* For agents, show info that lead will be auto-assigned to them */}
              {user?.role === 'agent' && !canAssignLeads && (
                <div>
                  <Label>Assignment</Label>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      This lead will be automatically assigned to you.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="leadScore">Lead Priority</Label>
                <Select
                  value={formData.leadScore}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, leadScore: value as Lead['leadScore'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High Priority</SelectItem>
                    <SelectItem value="Medium">Medium Priority</SelectItem>
                    <SelectItem value="Low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Preferred Locations */}
          <div>
            <Label className="text-sm font-medium">Preferred Locations</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {locations.map(location => (
                <div key={location} className="flex items-center space-x-2">
                  <Checkbox
                    id={`location-${location}`}
                    checked={formData.preferredLocations.includes(location)}
                    onCheckedChange={(checked) => handleLocationChange(location, checked as boolean)}
                  />
                  <Label htmlFor={`location-${location}`} className="text-sm">
                    {location}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes about this lead..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
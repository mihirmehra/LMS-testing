'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lead } from '@/types/lead'; // Ensure Lead type is correctly imported
import { Phone, Mail, MapPin, DollarSign, User, FileText, CheckSquare, X, Save } from 'lucide-react';
import { useAgents } from '@/hooks/useAgents';
import { PermissionService } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface LeadListItemProps {
  lead: Lead;
  onViewDetails: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  // Use Lead['status'] for the newStatus type
  onStatusChange: (leadId: string, newStatus: Lead['status']) => Promise<void>;
}

// Define the exact status options available for a lead
// Use 'as const' to make it a tuple of literal strings, and then assert its type
const LEAD_STATUS_OPTIONS = [
  'New', 'Contacted', 'Qualified', 'Nurturing', 'RNR', 'Busy', 'Disconnected', 'Not Interested', 'Not Interested (project)', 'Low Potential',
  'Site Visit Scheduled', 'Site Visited', 'Negotiation', 'Converted', 'Lost', 'Hold'
] as const satisfies readonly Lead['status'][]; // Using 'satisfies' for type safety without widening

export function LeadListItem({ lead, onViewDetails, onEditLead, onStatusChange }: LeadListItemProps) {
  const { agents } = useAgents();
  const { user } = useAuth();
  const permissionService = PermissionService.getInstance();

  // Initialize localStatus with the correct type
  const [localStatus, setLocalStatus] = useState<Lead['status']>(lead.status);
  const [isSaving, setIsSaving] = useState(false);
  const [hasStatusChanged, setHasStatusChanged] = useState(false);

  useEffect(() => {
    // Reset local status if the lead prop changes (e.g., parent refreshes the list)
    setLocalStatus(lead.status);
    setHasStatusChanged(false); // Reset change detection
  }, [lead.status]);

  const getStatusColor = (status: string) => {
    const colors = {
      'New': 'bg-blue-100 text-blue-800 border-blue-200',
      'Contacted': 'bg-purple-100 text-purple-800 border-purple-200',
      'Qualified': 'bg-green-100 text-green-800 border-green-200',
      'Nurturing': 'bg-amber-100 text-amber-800 border-amber-200',
      'RNR': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Busy': 'bg-rose-100 text-rose-800 border-rose-200',
      'Disconnected': 'bg-slate-100 text-slate-800 border-slate-200',
      'Not Interested': 'bg-red-100 text-red-800 border-red-200',
      'Not Interested (project)': 'bg-red-200 text-red-900 border-red-300',
      'Low Potential': 'bg-gray-200 text-gray-800 border-gray-300',
      'Site Visit Scheduled': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Site Visited': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'Negotiation': 'bg-orange-100 text-orange-800 border-orange-200',
      'Converted': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Lost': 'bg-zinc-100 text-zinc-800 border-zinc-200',
      'Hold': 'bg-neutral-100 text-neutral-800 border-neutral-200',
    };
    // Cast 'status' to Lead['status'] here to match the keys of 'colors'
    return colors[status as Lead['status']] || colors['New'];
  };

  const getScoreColor = (score: string) => {
    const colors = {
      'High': 'text-red-600 bg-red-50',
      'Medium': 'text-amber-600 bg-amber-50',
      'Low': 'text-green-600 bg-green-50',
    };
    return colors[score as keyof typeof colors] || colors['Medium'];
  };

  const getLeadTypeColor = (type: 'Lead' | 'Cold-Lead') => {
    switch (type) {
      case 'Lead':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Cold-Lead':
        return 'bg-gray-200 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const assignedAgent = agents.find(agent => agent.id === lead.assignedAgent);
  // Using `new Date()` and `getTime()` directly on Date objects from Lead interface
  const daysSinceCreated = Math.floor((Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24));

  // Ensure value is cast to Lead['status'] when setting local state
  const handleLocalStatusChange = useCallback((value: string) => {
    // We can confidently cast 'value' to Lead['status'] because it comes from LEAD_STATUS_OPTIONS
    setLocalStatus(value as Lead['status']);
    setHasStatusChanged(value !== lead.status);
  }, [lead.status]);

  const handleSaveStatus = async () => {
    if (localStatus === lead.status) {
      toast.info("No status change detected.");
      setHasStatusChanged(false);
      return;
    }

    if (!permissionService.canEditLead(user, lead.assignedAgent, lead.createdBy)) {
      toast.error("You don't have permission to change the status of this lead.");
      // Revert local status if permission is denied
      setLocalStatus(lead.status);
      setHasStatusChanged(false);
      return;
    }

    setIsSaving(true);
    try {
      await onStatusChange(lead.id, localStatus); // localStatus is already typed as Lead['status']
      toast.success(`Status updated for ${lead.name}`);
      setHasStatusChanged(false); // Mark as saved
    } catch (error) {
      console.error('Failed to save status:', error);
      toast.error('Failed to update status.');
      setLocalStatus(lead.status); // Revert on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelStatusChange = () => {
    setLocalStatus(lead.status);
    setHasStatusChanged(false);
  };

  return (
    <Card className="flex items-center p-4 shadow-sm hover:shadow-md transition-shadow duration-200 border-b border-gray-200 rounded-lg">
      <CardContent className="flex-grow grid grid-cols-1 md:grid-cols-5 lg:grid-cols-7 gap-4 items-center p-0">
        {/* Name and Basic Badges */}
        <div className="flex items-center space-x-3 col-span-2 md:col-span-1 lg:col-span-2">
          <Badge className={`text-xs font-medium ${getLeadTypeColor(lead.leadType)} hidden md:block`}>
            {lead.leadType.replace('-', ' ')}
          </Badge>
          <div className="font-semibold text-base text-gray-900 truncate">
            {lead.name}
          </div>
          <Badge variant="outline" className={`text-xs font-medium ${getScoreColor(lead.leadScore)} hidden md:block`}>
            {lead.leadScore} Priority
          </Badge>
        </div>

        {/* Contact Info (Primary) */}
        <div className="hidden md:flex flex-col space-y-1 col-span-1 text-sm text-gray-600">
          <div className="flex items-center space-x-1 truncate">
            <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="truncate">{lead.primaryPhone}</span>
          </div>
          <div className="flex items-center space-x-1 truncate">
            <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="truncate">{lead.primaryEmail}</span>
          </div>
        </div>

        {/* Location & Budget */}
        <div className="hidden lg:flex flex-col space-y-1 col-span-1 text-sm text-gray-600">
          <div className="flex items-center space-x-1 truncate">
            <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="truncate">{lead.preferredLocations && Array.isArray(lead.preferredLocations) && lead.preferredLocations.length > 0 ? lead.preferredLocations.join(', ') : 'N/A'} {/* Or an empty string '' if you prefer nothing */}</span>
          </div>
          <div className="flex items-center space-x-1 truncate">
            <DollarSign className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="truncate">{lead.budgetRange}</span>
          </div>
        </div>

        {/* Assigned Agent & Created At */}
        <div className="hidden lg:flex flex-col space-y-1 col-span-1 text-sm text-gray-600">
          <div className="flex items-center space-x-1 truncate">
            <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="truncate">
              {assignedAgent ? assignedAgent.name : 'Unassigned'}
            </span>
          </div>
          <div className="flex items-center space-x-1 truncate">
            <Badge variant="outline" className="text-xs">
              {lead.propertyType}
            </Badge>
            <span className="text-xs text-gray-500 ml-auto">({daysSinceCreated}d ago)</span>
          </div>
        </div>

        {/* Status Change Select and Buttons */}
        <div className="flex items-center space-x-2 col-span-2 md:col-span-2 lg:col-span-2 ml-auto">
          {permissionService.canEditLead(user, lead.assignedAgent, lead.createdBy) ? (
            <>
              <Select value={localStatus} onValueChange={handleLocalStatusChange} disabled={isSaving}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Change Status" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasStatusChanged && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCancelStatusChange}
                    disabled={isSaving}
                    className="h-9 w-9 text-gray-500 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    onClick={handleSaveStatus}
                    disabled={isSaving}
                    className="h-9 w-9 bg-blue-600 hover:bg-blue-700"
                  >
                    {isSaving ? <Save className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
                  </Button>
                </>
              )}
            </>
          ) : (
            <Badge className={`text-sm font-medium ${getStatusColor(lead.status)}`}>
              {lead.status}
            </Badge>
          )}

          {/* Quick Action Buttons for Mobile/Compact view */}
          <Button
            size="sm"
            onClick={() => onViewDetails(lead)}
            className="ml-2 bg-blue-600 hover:bg-blue-700 h-9"
          >
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
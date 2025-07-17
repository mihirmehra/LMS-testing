// components/leads/LeadCard.tsx
'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Lead } from '@/types/lead';
import { Phone, Mail, MapPin, DollarSign, Calendar, User } from 'lucide-react';
import { useAgents } from '@/hooks/useAgents';

interface LeadCardProps {
  lead: Lead;
  onViewDetails: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
}

export function LeadCard({ lead, onViewDetails, onEditLead }: LeadCardProps) {
  const { agents } = useAgents();

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
    return colors[status as keyof typeof colors] || colors['New'];
  };

  const getScoreColor = (score: string) => {
    const colors = {
      'High': 'text-red-600 bg-red-50',
      'Medium': 'text-amber-600 bg-amber-50',
      'Low': 'text-green-600 bg-green-50',
    };
    return colors[score as keyof typeof colors] || colors['Medium'];
  };

  // New: Determine color for Lead Type Badge
  const getLeadTypeColor = (type: 'Lead' | 'Cold-Lead') => {
    switch (type) {
      case 'Lead':
        return 'bg-blue-50 text-blue-700 border-blue-200'; // A distinct color for "Lead"
      case 'Cold-Lead':
        return 'bg-gray-200 text-gray-700 border-gray-300'; // A distinct color for "Cold-Lead"
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const assignedAgent = agents.find(agent => agent.id === lead.assignedAgent);
  const daysSinceCreated = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-medium">
                {lead.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{lead.name}</h3>
              <div className="flex items-center space-x-2 mt-1">
                {/* Display Lead Type Badge */}
                <Badge className={`text-xs font-medium ${getLeadTypeColor(lead.leadType)}`}>
                  {lead.leadType.replace('-', ' ')} {/* Display "Cold Lead" instead of "Cold-Lead" */}
                </Badge>
                <Badge className={`text-xs font-medium ${getStatusColor(lead.status)}`}>
                  {lead.status}
                </Badge>
                <Badge variant="outline" className={`text-xs font-medium ${getScoreColor(lead.leadScore)}`}>
                  {lead.leadScore} Priority
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>{daysSinceCreated}d ago</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center space-x-2 text-gray-600">
              <Phone className="h-4 w-4 text-gray-400" />
              <span>{lead.primaryPhone}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="truncate">{lead.primaryEmail}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span>{lead.preferredLocations.join(', ')}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span>{lead.budgetRange}</span>
            </div>
          </div>

          {assignedAgent && (
            <div className="flex items-center space-x-2 text-sm text-gray-600 pt-2 border-t">
              <User className="h-4 w-4 text-gray-400" />
              <span>Assigned to {assignedAgent.name}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3">
            <Badge variant="outline" className="text-xs">
              {lead.propertyType}
            </Badge>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditLead(lead)}
                className="text-xs"
              >
                Edit
              </Button>
              <Button
                size="sm"
                onClick={() => onViewDetails(lead)}
                className="text-xs bg-blue-600 hover:bg-blue-700"
              >
                View Details
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}







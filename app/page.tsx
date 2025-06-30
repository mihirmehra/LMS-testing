'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics';
import { LeadCard } from '@/components/leads/LeadCard';
import { LeadFilters } from '@/components/leads/LeadFilters';
import { LeadProfile } from '@/components/leads/LeadProfile';
import { AddLeadModal } from '@/components/leads/AddLeadModal';
import { LeadImportModal } from '@/components/leads/LeadImportModal';
import { LeadExportModal } from '@/components/leads/LeadExportModal';
import { LeadNotesModal } from '@/components/leads/LeadNotesModal';
import { LeadTasksModal } from '@/components/leads/LeadTasksModal';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Lead, LeadFilters as Filters } from '@/types/lead';
import { useLeads } from '@/hooks/useLeads';
import { useAgents } from '@/hooks/useAgents';
import { useAuth } from '@/hooks/useAuth';
import { PermissionService } from '@/lib/permissions';
import { Plus, Building2, Filter, Loader2, Database, Upload, Download, FileText, CheckSquare, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type SortOption = 'created-desc' | 'created-asc' | 'name-asc' | 'name-desc' | 'score-high' | 'score-low';

export default function Home() {
  const { user } = useAuth();
  const { leads, loading, error, createLead, updateLead } = useLeads();
  const { agents } = useAgents();
  const [filters, setFilters] = useState<Filters>({});
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('created-desc');

  const permissionService = PermissionService.getInstance();

  // Filter leads based on user permissions
  const userFilteredLeads = useMemo(() => {
    return permissionService.filterLeadsForUser(leads, user);
  }, [leads, user]);

  // Listen for custom event to open add lead modal
  useEffect(() => {
    const handleOpenAddLeadModal = () => {
      if (permissionService.hasPermission(user, 'leads', 'create')) {
        setIsAddModalOpen(true);
      }
    };

    window.addEventListener('openAddLeadModal', handleOpenAddLeadModal);
    return () => {
      window.removeEventListener('openAddLeadModal', handleOpenAddLeadModal);
    };
  }, [user]);

  // Filter and sort leads
  const filteredAndSortedLeads = useMemo(() => {
    let filtered = userFilteredLeads.filter(lead => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const searchableText = `${lead.name} ${lead.primaryEmail} ${lead.primaryPhone}`.toLowerCase();
        if (!searchableText.includes(searchTerm)) return false;
      }

      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(lead.status)) return false;
      }

      // Agent filter
      if (filters.assignedAgent && lead.assignedAgent !== filters.assignedAgent) {
        return false;
      }

      // Source filter
      if (filters.source && filters.source.length > 0) {
        if (!filters.source.includes(lead.source)) return false;
      }

      // Property type filter
      if (filters.propertyType && filters.propertyType.length > 0) {
        if (!filters.propertyType.includes(lead.propertyType)) return false;
      }

      // Budget range filter
      if (filters.budgetRange && lead.budgetRange !== filters.budgetRange) {
        return false;
      }

      // Lead score filter
      if (filters.leadScore && filters.leadScore.length > 0) {
        if (!filters.leadScore.includes(lead.leadScore)) return false;
      }

      return true;
    });

    type LeadScore = 'High' | 'Medium' | 'Low';

    const scoreOrder: Record<LeadScore, number> = {
      High: 3,
      Medium: 2,
      Low: 1,
    };

    // Sort leads
    filtered.sort((a, b) => {
      const scoreA = a.leadScore as LeadScore; // Ensure leadScore is of type LeadScore
      const scoreB = b.leadScore as LeadScore;
      switch (sortBy) {
        case 'created-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'created-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'score-high':
          return scoreOrder[scoreB] - scoreOrder[scoreA];
        case 'score-low':
          return scoreOrder[scoreA] - scoreOrder[scoreB];
        default:
          return 0;
      }
    });

    return filtered;
  }, [userFilteredLeads, filters, sortBy]);

  // Calculate lead counts for status badges
  const leadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    userFilteredLeads.forEach(lead => {
      counts[lead.status] = (counts[lead.status] || 0) + 1;
    });
    return counts;
  }, [userFilteredLeads]);

  const handleAddLead = async (newLeadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'activities'>) => {
    try {
      await createLead(newLeadData);
    } catch (error) {
      console.error('Failed to create lead:', error);
    }
  };

  const handleUpdateLead = async (updatedLead: Lead) => {
    try {
      await updateLead(updatedLead.id, updatedLead);
      setSelectedLead(updatedLead);
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  };

  const handleViewDetails = (lead: Lead) => {
    if (permissionService.canAccessLead(user, lead.assignedAgent)) {
      setSelectedLead(lead);
    }
  };

  const handleEditLead = (lead: Lead) => {
    if (permissionService.hasPermission(user, 'leads', 'update') && 
        permissionService.canAccessLead(user, lead.assignedAgent)) {
      setSelectedLead(lead);
    }
  };

  const handleLeadAction = (lead: Lead, action: string) => {
    switch (action) {
      case 'notes':
        setSelectedLead(lead);
        setIsNotesModalOpen(true);
        break;
      case 'tasks':
        setSelectedLead(lead);
        setIsTasksModalOpen(true);
        break;
      case 'edit':
        handleEditLead(lead);
        break;
    }
  };

  const handleImportComplete = (importedCount: number) => {
    // Refresh leads after import
    window.location.reload();
  };

  const handleAddNote = async (note: any) => {
    if (!selectedLead) return;
    
    const updatedLead = {
      ...selectedLead,
      activities: [note, ...selectedLead.activities],
      updatedAt: new Date(),
    };
    
    await handleUpdateLead(updatedLead);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-gray-600">Loading leads from database...</span>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="border-0 shadow-md max-w-md">
            <CardContent className="text-center py-8">
              <Database className="h-16 w-16 mx-auto mb-4 text-red-300" />
              <div className="text-red-600 mb-4">Database Connection Error</div>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  if (selectedLead && !isNotesModalOpen && !isTasksModalOpen) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <LeadProfile
              lead={selectedLead}
              onBack={() => setSelectedLead(null)}
              onUpdateLead={handleUpdateLead}
            />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {user?.role === 'agent' ? 'My Leads' : 'Leads Management'}
                </h1>
                <p className="text-gray-600">
                  {user?.role === 'agent' 
                    ? 'Manage your assigned leads and track conversions'
                    : 'Manage your real estate leads and track conversions'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Import/Export Actions */}
              {permissionService.hasPermission(user, 'leads', 'create') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="font-medium">
                      <MoreHorizontal className="h-4 w-4 mr-2" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsImportModalOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Leads
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsExportModalOpen(true)}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Leads
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {permissionService.hasPermission(user, 'leads', 'create') && (
                <Button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Lead
                </Button>
              )}
            </div>
          </div>

          {/* Dashboard Metrics */}
          <DashboardMetrics />

          {/* Filters */}
          <LeadFilters
            filters={filters}
            onFiltersChange={setFilters}
            leadCounts={leadCounts}
          />

          {/* Sort and Results */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              Showing {filteredAndSortedLeads.length} of {userFilteredLeads.length} leads
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created-desc">Newest First</SelectItem>
                  <SelectItem value="created-asc">Oldest First</SelectItem>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="score-high">High Priority First</SelectItem>
                  <SelectItem value="score-low">Low Priority First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Leads Grid */}
          {filteredAndSortedLeads.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedLeads.map(lead => (
                <div key={lead.id} className="relative group">
                  <LeadCard
                    lead={lead}
                    onViewDetails={handleViewDetails}
                    onEditLead={handleEditLead}
                  />
                  
                  {/* Quick Actions Overlay */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-white shadow-md">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleLeadAction(lead, 'notes')}>
                          <FileText className="h-4 w-4 mr-2" />
                          View Notes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleLeadAction(lead, 'tasks')}>
                          <CheckSquare className="h-4 w-4 mr-2" />
                          Manage Tasks
                        </DropdownMenuItem>
                        {permissionService.canEditLead(user, lead.assignedAgent, lead.createdBy) && (
                          <DropdownMenuItem onClick={() => handleLeadAction(lead, 'edit')}>
                            <Building2 className="h-4 w-4 mr-2" />
                            Edit Lead
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-md">
              <CardContent className="text-center py-12">
                <Database className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {userFilteredLeads.length === 0 ? 'No leads in database' : 'No leads found'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {userFilteredLeads.length === 0
                    ? user?.role === 'agent' 
                      ? "You don't have any leads assigned to you yet. Contact your admin or start adding leads."
                      : "Your database is empty. Start by adding your first lead to begin managing your real estate prospects."
                    : Object.keys(filters).length > 0 || filters.search
                    ? "Try adjusting your filters to find leads."
                    : "No leads match your current criteria."}
                </p>
                {permissionService.hasPermission(user, 'leads', 'create') && (
                  <div className="flex items-center justify-center space-x-3">
                    <Button
                      onClick={() => setIsAddModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {userFilteredLeads.length === 0 ? 'Add Your First Lead' : 'Add New Lead'}
                    </Button>
                    {userFilteredLeads.length === 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setIsImportModalOpen(true)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Import Leads
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Modals */}
          {permissionService.hasPermission(user, 'leads', 'create') && (
            <>
              <AddLeadModal
                open={isAddModalOpen}
                onOpenChange={setIsAddModalOpen}
                onAddLead={handleAddLead}
              />
              
              <LeadImportModal
                open={isImportModalOpen}
                onOpenChange={setIsImportModalOpen}
                onImportComplete={handleImportComplete}
              />
              
              <LeadExportModal
                open={isExportModalOpen}
                onOpenChange={setIsExportModalOpen}
                leads={userFilteredLeads}
              />
            </>
          )}

          {selectedLead && (
            <>
              <LeadNotesModal
                open={isNotesModalOpen}
                onOpenChange={setIsNotesModalOpen}
                lead={selectedLead}
                onAddNote={handleAddNote}
              />
              
              <LeadTasksModal
                open={isTasksModalOpen}
                onOpenChange={setIsTasksModalOpen}
                lead={selectedLead}
              />
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
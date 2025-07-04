// pages/cold-leads/index.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLeads, NewLeadData } from '@/hooks/useLeads';
import { Lead, LeadFilters as Filters } from '@/types/lead';
import { LeadCard } from '@/components/leads/LeadCard';
import { LeadFilters } from '@/components/leads/LeadFilters';
import { AddLeadModal } from '@/components/leads/AddLeadModal';
import { LeadExportModal } from '@/components/leads/LeadExportModal';
import { LeadImportModal } from '@/components/leads/LeadImportModal';
import { LeadNotesModal } from '@/components/leads/LeadNotesModal'; // New import
import { LeadTasksModal } from '@/components/leads/LeadTasksModal'; // New import
import { LeadProfile } from '@/components/leads/LeadProfile';
import { Button } from '@/components/ui/button';
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics'; // New import
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // For sorting
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'; // For quick actions
import { Card, CardContent } from '@/components/ui/card'; // For no leads found card
import { Plus, Upload, Download, Filter as FilterIcon, Building2, Loader2, Database, MoreHorizontal, FileText, CheckSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth'; // New import for permissions
import { PermissionService } from '@/lib/permissions'; // New import for permissions
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'; // New import for protection


type SortOption = 'created-desc' | 'created-asc' | 'name-asc' | 'name-desc' | 'score-high' | 'score-low';

export default function ColdLeadsPage() {
  const { user } = useAuth(); // Get user for permissions
  const { leads, loading, error, fetchLeads, createLead, updateLead } = useLeads();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false); // New state
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false); // New state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('created-desc'); // New state for sorting
  const [filters, setFilters] = useState<Filters>({});

  const permissionService = PermissionService.getInstance(); // Initialize permission service

  useEffect(() => {
    fetchLeads('Cold-Lead'); // Fetch leads of type 'Cold-Lead' on mount
  }, [fetchLeads]);

  // Filter leads based on user permissions
  const userFilteredLeads = useMemo(() => {
    return permissionService.filterLeadsForUser(leads, user);
  }, [leads, user]);

  const filteredAndSortedLeads = useMemo(() => {
    let filtered = userFilteredLeads.filter(lead => {
      // IMPORTANT: Ensure only 'Cold-Lead' types are displayed
      if (lead.leadType !== 'Cold-Lead') {
        return false;
      }

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
      const scoreA = a.leadScore as LeadScore;
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

  // Calculate lead counts for status badges (used by LeadFilters)
  const leadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    userFilteredLeads.forEach(lead => {
      if (lead.leadType === 'Cold-Lead') { // Only count cold leads
        counts[lead.status] = (counts[lead.status] || 0) + 1;
      }
    });
    return counts;
  }, [userFilteredLeads]);

  const handleAddLead = async (newLeadData: NewLeadData): Promise<Lead> => {
    try {
      const createdLead = await createLead({ ...newLeadData, leadType: 'Cold-Lead' }); // Ensure leadType is 'Cold-Lead'
      console.log('Cold Lead created successfully:', createdLead);
      fetchLeads('Cold-Lead'); // Re-fetch cold leads to include the new one
      return createdLead;
    } catch (error) {
      console.error('Failed to create cold lead:', error);
      throw error;
    }
  };

  const handleUpdateLead = async (updatedLead: Lead) => {
    try {
      await updateLead(updatedLead.id, updatedLead);
      setSelectedLead(updatedLead);
      fetchLeads('Cold-Lead'); // Re-fetch cold leads after updating to ensure data consistency
    } catch (error) {
      console.error('Failed to update cold lead:', error);
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
    setSelectedLead(lead); // Set selected lead for modals
    switch (action) {
      case 'notes':
        setIsNotesModalOpen(true);
        break;
      case 'tasks':
        setIsTasksModalOpen(true);
        break;
      case 'edit':
        handleEditLead(lead);
        break;
    }
  };

  const handleImportComplete = (importedCount: number) => {
    // Refresh leads after import
    fetchLeads('Cold-Lead'); // Re-fetch cold leads after import
    setIsImportModalOpen(false); // Close the modal after import
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
            <span className="text-gray-600">Loading cold leads from database...</span>
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
              <Button onClick={() => fetchLeads('Cold-Lead')}>
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
                <h1 className="text-3xl font-bold text-gray-900">Cold Leads</h1>
                <p className="text-gray-600">Manage your cold real estate prospects</p>
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
                  Add New Cold Lead
                </Button>
              )}
            </div>
          </div>

          {/* Dashboard Metrics */}
          <DashboardMetrics leadTypeFilter="Cold-Lead" />

          {/* Filters */}
          <LeadFilters
            filters={filters}
            onFiltersChange={setFilters}
            leadCounts={leadCounts}
          />

          {/* Sort and Results */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              Showing {filteredAndSortedLeads.length} of {userFilteredLeads.filter(lead => lead.leadType === 'Cold-Lead').length} cold leads
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
                  {userFilteredLeads.filter(lead => lead.leadType === 'Cold-Lead').length === 0 ? 'No cold leads in database' : 'No cold leads found'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {userFilteredLeads.filter(lead => lead.leadType === 'Cold-Lead').length === 0
                    ? user?.role === 'agent'
                      ? "You don't have any cold leads assigned to you yet. Contact your admin or start adding leads."
                      : "Your cold leads database is empty. Start by adding your first cold lead to begin managing your real estate prospects."
                    : Object.keys(filters).length > 0 || filters.search
                      ? "Try adjusting your filters to find cold leads."
                      : "No cold leads match your current criteria."}
                </p>
                {permissionService.hasPermission(user, 'leads', 'create') && (
                  <div className="flex items-center justify-center space-x-3">
                    <Button
                      onClick={() => setIsAddModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {userFilteredLeads.filter(lead => lead.leadType === 'Cold-Lead').length === 0 ? 'Add Your First Cold Lead' : 'Add New Cold Lead'}
                    </Button>
                    {userFilteredLeads.filter(lead => lead.leadType === 'Cold-Lead').length === 0 && (
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
                leads={filteredAndSortedLeads} // Export only currently filtered/sorted cold leads
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
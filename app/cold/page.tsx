// app/cold-leads/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react'; // Added useCallback
import { useRouter } from 'next/navigation'; // Import useRouter
import { useLeads, NewLeadData } from '@/hooks/useLeads';
import { Lead, LeadFilters as Filters } from '@/types/lead';
import { LeadCard } from '@/components/leads/LeadCard';
import { LeadFilters } from '@/components/leads/LeadFilters';
import { AddLeadModal } from '@/components/leads/AddLeadModal';
import { LeadExportModal } from '@/components/leads/LeadExportModal';
import { LeadImportModal } from '@/components/leads/LeadImportModal';
import { LeadNotesModal } from '@/components/leads/LeadNotesModal';
import { LeadTasksModal } from '@/components/leads/LeadTasksModal';
// Removed LeadProfile import as it will now be rendered on a separate page
import { Button } from '@/components/ui/button';
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Upload, Download, Filter as FilterIcon, Building2, Loader2, Database, MoreHorizontal, FileText, CheckSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PermissionService } from '@/lib/permissions';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { toast } from 'sonner'; // Ensure toast is imported for notifications


type SortOption = 'created-desc' | 'created-asc' | 'name-asc' | 'name-desc' | 'score-high' | 'score-low';

// IMPORTANT: Renamed from ColdLeadsPage to follow Next.js app router convention if this is truly the page file
export default function ColdLeadsPage() { // Assuming this file is at app/cold-leads/page.tsx or similar
  const router = useRouter(); // Initialize useRouter for navigation
  const { user } = useAuth();
  const { leads, loading, error, fetchLeads, createLead, updateLead } = useLeads();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [selectedLeadForModal, setSelectedLeadForModal] = useState<Lead | null>(null); // Renamed to avoid confusion with detail page 'selectedLead'
  const [sortBy, setSortBy] = useState<SortOption>('created-desc');
  const [filters, setFilters] = useState<Filters>({});

  const permissionService = PermissionService.getInstance();

  // Use useCallback for fetchLeads to prevent unnecessary re-renders of effects depending on it
  const memoizedFetchLeads = useCallback(() => {
    fetchLeads('Cold-Lead');
  }, [fetchLeads]);

  useEffect(() => {
    memoizedFetchLeads(); // Fetch leads of type 'Cold-Lead' on mount
  }, [memoizedFetchLeads]);

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
      const createdLead = await createLead({ ...newLeadData, leadType: 'Cold-Lead' });
      toast.success('Cold Lead created successfully!');
      memoizedFetchLeads(); // Re-fetch cold leads to include the new one
      return createdLead;
    } catch (error) {
      console.error('Failed to create cold lead:', error);
      toast.error('Failed to create cold lead.');
      throw error;
    }
  };

  // This function is still needed for modals that might update a lead, but not for direct detail view
  const handleUpdateLead = async (leadId: string, updatedLeadData: Partial<Lead>) => {
    try {
      await updateLead(leadId, updatedLeadData);
      toast.success('Cold Lead updated successfully!');
      memoizedFetchLeads(); // Re-fetch cold leads after updating to ensure data consistency
      // If a modal is open with selectedLeadForModal, update it
      if (selectedLeadForModal && selectedLeadForModal.id === leadId) {
        setSelectedLeadForModal(prev => prev ? { ...prev, ...updatedLeadData } : null);
      }
    } catch (error) {
      console.error('Failed to update cold lead:', error);
      toast.error('Failed to update cold lead.');
    }
  };


  // --- IMPORTANT CHANGE HERE ---
  const handleViewDetails = (lead: Lead) => {
    if (permissionService.canAccessLead(user, lead.assignedAgent)) {
      // Redirect to the dedicated lead profile page
      router.push(`/leads/${lead.id}`);
    } else {
      toast.error('You do not have permission to view this lead.');
    }
  };

  // handleEditLead will also redirect to the detail page, as edits happen there
  const handleEditLead = (lead: Lead) => {
    if (permissionService.canEditLead(user, lead.assignedAgent, lead.createdBy)) {
      router.push(`/leads/${lead.id}`); // Navigate to the detail page for editing
    } else {
      toast.error('You do not have permission to edit this lead.');
    }
  };
  // --- END IMPORTANT CHANGE ---

  const handleLeadAction = (lead: Lead, action: string) => {
    setSelectedLeadForModal(lead); // Set selected lead for modals
    switch (action) {
      case 'notes':
        setIsNotesModalOpen(true);
        break;
      case 'tasks':
        setIsTasksModalOpen(true);
        break;
      case 'edit':
        // The 'edit' action for the dropdown should still open the detail page for editing
        handleEditLead(lead);
        break;
    }
  };

  const handleImportComplete = (importedCount: number) => {
    toast.success(`${importedCount} cold leads imported successfully!`);
    memoizedFetchLeads(); // Refresh leads after import
    setIsImportModalOpen(false); // Close the modal after import
  };

  const handleAddNote = async (noteContent: string) => { // Changed type to string for clarity
    if (!selectedLeadForModal) return;

    // Construct the new activity object with a unique ID
    const newActivity = {
      id: `${selectedLeadForModal.id}-note-${Date.now()}`,
      type: 'Note' as Lead['activities'][0]['type'], // Cast to the correct Activity type
      description: noteContent,
      date: new Date(),
      agent: user?.name || 'Unknown User', // Use current user's name
    };

    const updatedActivities = [newActivity, ...(selectedLeadForModal.activities || [])];

    try {
      await handleUpdateLead(selectedLeadForModal.id, { activities: updatedActivities });
      // The `handleUpdateLead` already calls `memoizedFetchLeads()`, which should sync data.
      // If the modal needs to reflect the new note immediately without full re-fetch,
      // you could update `selectedLeadForModal` here:
      setSelectedLeadForModal(prev => prev ? { ...prev, activities: updatedActivities } : null);
      toast.success("Note added successfully to cold lead!");
    } catch (error) {
      console.error("Failed to add note:", error);
      toast.error("Failed to add note.");
    }
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
              <Button onClick={() => memoizedFetchLeads()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  // Removed the conditional rendering of LeadProfile component
  // as it is now handled by the separate /leads/[id] route.
  // The logic for displaying selectedLead and hiding the list view is no longer needed here.

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
                    onViewDetails={handleViewDetails} // This now redirects
                    onEditLead={handleEditLead} // This now redirects
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

          {selectedLeadForModal && ( // Use selectedLeadForModal for modals
            <>
              <LeadNotesModal
                open={isNotesModalOpen}
                onOpenChange={setIsNotesModalOpen}
                lead={selectedLeadForModal}
                onAddNote={handleAddNote}
              />

              {/* <LeadTasksModal
                open={isTasksModalOpen}
                onOpenChange={setIsTasksModalOpen}
                lead={selectedLeadForModal}
                // Assuming LeadTasksModal might need to update the lead
                // pass handleUpdateLead as a prop if it needs to save tasks to the lead object
                onUpdateLead={(leadId, updatedData) => handleUpdateLead(leadId, updatedData)}
              /> */}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
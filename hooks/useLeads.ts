// hooks/useLeads.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lead, Activity } from '@/types/lead'; // Ensure Activity is imported here too

// Define the shape of data required for adding a new lead (without backend-generated fields)
export type NewLeadData = Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'activities' | 'lastContacted' | 'attachments'> & {
  activities?: Activity[]; // Ensure activities can be included when creating, even if empty
  attachments?: string[]; // Ensure attachments can be included
};

// Define the shape of data required for updating an existing lead
export type UpdateLeadData = Partial<Omit<Lead, 'createdAt' | 'updatedAt'>>; // Make sure it's partial and omits backend-generated fields

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to get authorization headers
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/leads', {
        method: 'GET',
        headers: getAuthHeaders(), // Use the helper for headers
      });

      if (response.ok) {
        const data = await response.json();
        setLeads(Array.isArray(data) ? data : []);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch leads' }));
        throw new Error(errorData.message || 'Failed to fetch leads');
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
      setLeads([]); // Clear leads on fetch error
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Type for lead creation: omit fields handled by the backend
  const createLead = useCallback(async (
    leadData: NewLeadData // Use the exported type
  ): Promise<Lead> => {
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: getAuthHeaders(), // Use the helper for headers
        body: JSON.stringify(leadData),
      });

      if (response.ok) {
        const newLead = await response.json();
        setLeads(prev => [newLead, ...prev]); // Add new lead to the top
        return newLead;
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create lead' }));
        console.error('Create failed:', response.status, errorData);
        throw new Error(errorData.message || 'Failed to create lead');
      }
    } catch (err) {
      console.error('Error creating lead:', err);
      throw err; // Re-throw for component to handle
    }
  }, [getAuthHeaders]);


  const updateLead = useCallback(async (id: string, updateData: UpdateLeadData): Promise<Lead> => {
    try {
      console.log('Attempting to update lead with ID:', id, 'Data being sent:', updateData);

      const response = await fetch(`/api/leads/${id}`, {
        method: 'POST',
        headers: getAuthHeaders(), // Use the helper for headers
        body: JSON.stringify(updateData),
      });

      console.log('Update API response status:', response.status);

      if (response.ok) {
        const updatedLead = await response.json();
        setLeads(prev => prev.map(lead => (lead.id === id ? updatedLead : lead)));
        console.log('Lead updated successfully, received data:', updatedLead);
        return updatedLead;
      } else {
        // If response is not OK, try to get the error message from the body
        let errorDetails: string = 'Unknown error';
        try {
          const errorData = await response.json();
          errorDetails = errorData.message || JSON.stringify(errorData);
        } catch (jsonError) {
          // This catches cases where the response body is NOT valid JSON
          errorDetails = `Server responded with status ${response.status}, but body was not valid JSON. Response text: ${await response.text()}`;
          console.error('Failed to parse error response JSON:', jsonError);
        }

        console.error('Update failed. Status:', response.status, 'Details:', errorDetails);
        throw new Error(`Failed to update lead: ${errorDetails}`);
      }
    } catch (err) {
      // This catch block will now receive the re-thrown error from the 'else' block,
      // or actual network errors (e.g., no internet, CORS issues).
      console.error('Error caught in updateLead hook:', err);
      // Ensure the error message is user-friendly if needed
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred during lead update.';
      throw new Error(errorMessage); // Re-throw for component to handle
    }
  }, [getAuthHeaders]); // Ensure getAuthHeaders is stable and correct

// ... (rest of the useLeads hook)

  const deleteLead = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(), // Use the helper for headers
      });

      if (response.ok) {
        setLeads(prev => prev.filter(lead => lead.id !== id));
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to delete lead' }));
        console.error('Delete failed:', response.status, errorData);
        throw new Error(errorData.message || 'Failed to delete lead');
      }
    } catch (err) {
      console.error('Error deleting lead:', err);
      throw err; // Re-throw for component to handle
    }
  }, [getAuthHeaders]);

  // Type for activity creation: omit 'id' (backend generates) and allow 'date' as Date or string
  const addActivity = useCallback(async (
    leadId: string,
    activityData: Omit<Activity, 'id'> & { date?: Date | string } // date can be optional or string/Date
  ): Promise<Lead> => {
    try {
      const response = await fetch(`/api/leads/${leadId}/activities`, {
        method: 'POST',
        headers: getAuthHeaders(), // Use the helper for headers
        body: JSON.stringify(activityData),
      });

      if (response.ok) {
        const updatedLead = await response.json();
        setLeads(prev => prev.map(lead => (lead.id === leadId ? updatedLead : lead)));
        return updatedLead;
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to add activity' }));
        console.error('Add activity failed:', response.status, errorData);
        throw new Error(errorData.message || 'Failed to add activity');
      }
    } catch (err) {
      console.error('Error adding activity:', err);
      throw err; // Re-throw for component to handle
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]); // fetchLeads is now wrapped in useCallback, so this is correct.

  return {
    leads,
    loading,
    error,
    fetchLeads, // Expose fetchLeads for manual re-fetching if needed
    createLead,
    updateLead,
    deleteLead,
    addActivity,
  };
}
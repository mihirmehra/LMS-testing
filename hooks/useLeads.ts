// hooks/useLeads.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lead, Activity } from '@/types/lead';

// Define the shape of data required for adding a new lead (without backend-generated fields)
export type NewLeadData = Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'activities' | 'lastContacted' | 'attachments'> & {
  activities?: Activity[]; // Ensure activities can be included when creating, even if empty
  attachments?: string[]; // Ensure attachments can be included
};

// Define the shape of data required for updating an existing lead
export type UpdateLeadData = Partial<Omit<Lead, 'createdAt' | 'updatedAt'>>; // Make sure it's partial and omits backend-generated fields

// Extend the hook return type to include the typed fetch function
interface UseLeadsReturn {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  fetchLeads: (leadType?: 'Lead' | 'Cold-Lead') => Promise<void>; // Updated signature
  createLead: (leadData: NewLeadData) => Promise<Lead>;
  updateLead: (id: string, updateData: UpdateLeadData) => Promise<Lead>;
  deleteLead: (id: string) => Promise<void>;
  addActivity: (leadId: string, activityData: Omit<Activity, 'id'> & { date?: Date | string }) => Promise<Lead>;
  getLeadById: (id: string) => Promise<Lead | null>; // Added getLeadById
}

export function useLeads(): UseLeadsReturn { // Apply the extended return type
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to get authorization headers
  const getAuthHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null; // Safely access localStorage
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }, []);

  const fetchLeads = useCallback(async (leadType?: 'Lead' | 'Cold-Lead') => {
    try {
      setLoading(true);
      setError(null);

      const url = leadType ? `/api/leads?leadType=${leadType}` : '/api/leads';
      console.log('Fetching leads from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched leads data:', data);
        setLeads(Array.isArray(data) ? data : []);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch leads' }));
        console.error('Fetch error:', errorData);
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

  // New function to get a single lead by ID
  const getLeadById = useCallback(async (id: string): Promise<Lead | null> => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const lead = await response.json();
        return lead;
      } else if (response.status === 404) {
        return null; // Lead not found
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch lead by ID' }));
        console.error(`Failed to fetch lead ${id}:`, response.status, errorData);
        throw new Error(errorData.message || 'Failed to fetch lead');
      }
    } catch (err) {
      console.error(`Error fetching lead ${id}:`, err);
      throw err; // Re-throw to be handled by the calling component
    }
  }, [getAuthHeaders]);


  const createLead = useCallback(async (
    leadData: NewLeadData
  ): Promise<Lead> => {
    // Ensure leadType is explicitly set when creating a new lead from the frontend
    // You might want to make leadType non-optional in NewLeadData if it's always required at creation.
    // For now, assuming it's part of the passed leadData.
    if (!leadData.leadType) { // Basic check, consider making it a mandatory field in NewLeadData
      throw new Error("leadType is required to create a new lead.");
    }

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(leadData),
      });

      if (response.ok) {
        const newLead = await response.json();
        setLeads(prev => [newLead, ...prev]);
        return newLead;
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create lead' }));
        console.error('Create failed:', response.status, errorData);
        throw new Error(errorData.message || 'Failed to create lead');
      }
    } catch (err) {
      console.error('Error creating lead:', err);
      throw err;
    }
  }, [getAuthHeaders]);


  const updateLead = useCallback(async (id: string, updateData: UpdateLeadData): Promise<Lead> => {
    try {
      console.log('Attempting to update lead with ID:', id, 'Data being sent:', updateData);

      const response = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData),
      });

      console.log('Update API response status:', response.status);

      if (response.ok) {
        const updatedLead = await response.json();
        setLeads(prev => prev.map(lead => (lead.id === id ? updatedLead : lead)));
        console.log('Lead updated successfully, received data:', updatedLead);
        return updatedLead;
      } else {
        let errorDetails: string = 'Unknown error';
        try {
          const errorData = await response.json();
          errorDetails = errorData.message || JSON.stringify(errorData);
        } catch (jsonError) {
          errorDetails = `Server responded with status ${response.status}, but body was not valid JSON. Response text: ${await response.text()}`;
          console.error('Failed to parse error response JSON:', jsonError);
        }

        console.error('Update failed. Status:', response.status, 'Details:', errorDetails);
        throw new Error(`Failed to update lead: ${errorDetails}`);
      }
    } catch (err) {
      console.error('Error caught in updateLead hook:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred during lead update.';
      throw new Error(errorMessage);
    }
  }, [getAuthHeaders]);

  const deleteLead = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
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
      throw err;
    }
  }, [getAuthHeaders]);

  const addActivity = useCallback(async (
    leadId: string,
    activityData: Omit<Activity, 'id'> & { date?: Date | string }
  ): Promise<Lead> => {
    try {
      const response = await fetch(`/api/leads/${leadId}/activities`, {
        method: 'POST',
        headers: getAuthHeaders(),
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
      throw err;
    }
  }, [getAuthHeaders]);

  return {
    leads,
    loading,
    error,
    fetchLeads,
    createLead,
    updateLead,
    deleteLead,
    addActivity,
    getLeadById, // Now exposed
  };
}
// useLeads.ts
'use client';

import { useState, useEffect } from 'react';
import { Lead, Activity } from '@/types/lead'; // Ensure Activity is imported here too

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/leads', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
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
  };

  // Type for lead creation: omit fields handled by the backend
  const createLead = async (
    leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'> // Activities, notes, attachments are part of the payload
  ): Promise<Lead> => {
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData), // Send the leadData as is, backend handles default activities/notes
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
  };

  const updateLead = async (id: string, updateData: Partial<Lead>): Promise<Lead> => {
    try {
      console.log('Updating lead with ID:', id, 'Data:', updateData);

      const response = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      console.log('Update API response status:', response.status);

      if (response.ok) {
        const updatedLead = await response.json();
        setLeads(prev => prev.map(lead => (lead.id === id ? updatedLead : lead)));
        return updatedLead;
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update lead' }));
        console.error('Update failed:', response.status, errorData);
        throw new Error(errorData.message || 'Failed to update lead');
      }
    } catch (err) {
      console.error('Error updating lead:', err);
      throw err; // Re-throw for component to handle
    }
  };

  const deleteLead = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
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
  };

  // Type for activity creation: omit 'id' (backend generates) and allow 'date' as Date or string
  const addActivity = async (
    leadId: string,
    activityData: Omit<Activity, 'id'> & { date: Date | string }
  ): Promise<Lead> => {
    try {
      const response = await fetch(`/api/leads/${leadId}/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData), // Send the activity data
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
  };

  useEffect(() => {
    fetchLeads();
  }, []); // Empty dependency array means this runs once on mount

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
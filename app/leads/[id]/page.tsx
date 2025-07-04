// app/leads/[id]/page.tsx
'use client'; // This component needs to be a client component to use hooks like useRouter, useState, useEffect

import { useRouter } from 'next/navigation'; // Correct import for Next.js 13+ App Router navigation
import { LeadProfile } from '@/components/leads/LeadProfile'; // Adjust path if necessary
import { useState, useEffect } from 'react';
import { Lead } from '@/types/lead'; // Ensure your Lead type is correctly defined here
import { Skeleton } from '@/components/ui/skeleton'; // Assuming you have a skeleton component for loading state
import { Button } from '@/components/ui/button'; // Assuming you have a button component
import { toast } from 'sonner'; // For toasts/notifications

interface LeadDetailPageProps {
  params: {
    id: string; // The dynamic part of the URL, e.g., '123' for /leads/123
  };
}

export default function LeadDetailPage({ params }: LeadDetailPageProps) {
  const router = useRouter();
  const { id } = params;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to fetch lead details from your API route
  const fetchLead = async () => {
    try {
      setLoading(true);
      // Calls your new API route at /api/leads/[id]
      const response = await fetch(`/api/leads/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`, // Ensure token is sent
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch lead: ${response.statusText}`);
      }
      const data: Lead = await response.json();
      setLead(data);
    } catch (error) {
      console.error('Error fetching lead:', error);
      toast.error('Failed to load lead details.');
      setLead(null); // Clear lead state on error
    } finally {
      setLoading(false);
    }
  };

  // Function to update lead details via your API route
  const handleUpdateLead = async (updatedLead: Lead) => {
    try {
      // Calls your new API route at /api/leads/[id] with a PUT request
      const response = await fetch(`/api/leads/${updatedLead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(updatedLead),
      });
      if (!response.ok) {
        throw new Error(`Failed to update lead: ${response.statusText}`);
      }
      const data: Lead = await response.json();
      setLead(data); // Update local state with the latest data from the server
      toast.success('Lead updated successfully!');
      // No need for onLeadRefresh() here if the API returns the updated lead and you set it
      // However, if your API updates async or other parts of lead might change,
      // you could still call fetchLead() here for complete re-sync.
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead.');
      // Consider re-fetching the lead to revert to server state if update fails badly
      // fetchLead();
    }
  };

  // Define the onBack function to navigate to /leads/home
  const handleBack = () => {
    router.push('/leads'); // Redirect to the specified path
  };

  // Fetch lead data when the component mounts or ID changes
  useEffect(() => {
    if (id) {
      fetchLead();
    }
  }, [id]); // Dependency array includes 'id' to refetch if the ID changes

  // Loading state UI
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" /> {/* Placeholder for title/header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-40 w-full" /> {/* Placeholder for contact info */}
            <Skeleton className="h-40 w-full" /> {/* Placeholder for property preferences */}
            <Skeleton className="h-60 w-full" /> {/* Placeholder for activities/notes */}
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-[500px] w-full" /> {/* Placeholder for communication panel */}
          </div>
        </div>
      </div>
    );
  }

  // Handle case where lead is not found after loading
  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-gray-500">
        <h2 className="text-2xl font-semibold mb-4">Lead Not Found</h2>
        <p className="mb-6">The lead you are looking for does not exist or you do not have access.</p>
        <Button onClick={handleBack}>Go to Leads List</Button> {/* Button to go back */}
      </div>
    );
  }

  // Render LeadProfile component when lead data is available
  return (
    <div className="p-6">
      <LeadProfile
        lead={lead}
        onBack={handleBack} // Pass the navigation function
        onUpdateLead={handleUpdateLead} // Pass the update function
        onLeadRefresh={fetchLead} // Pass the fetch function for refreshing
      />
    </div>
  );
}
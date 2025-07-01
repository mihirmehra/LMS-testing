// api/leads.ts
import { getDatabase } from '@/lib/mongodb';
import { Lead, Activity } from '@/types/lead'; // Ensure Activity is imported from your types file
import { ObjectId } from 'mongodb';

export class LeadsAPI {
  private static async getCollection() {
    const db = await getDatabase();
    return db.collection('leads');
  }

  static async getAllLeads(): Promise<Lead[]> {
    try {
      const collection = await this.getCollection();
      const leads = await collection.find({}).sort({ createdAt: -1 }).toArray();

      return leads.map(lead => {
        const {
          _id,
          createdAt,
          updatedAt,
          lastContacted,
          activities,
          ...rest // captures all other properties
        } = lead;

        return {
          ...rest,
          id: _id.toString(),
          createdAt: new Date(createdAt),
          updatedAt: new Date(updatedAt),
          lastContacted: lastContacted ? new Date(lastContacted) : undefined, // Ensure consistent Date or undefined
          activities: activities?.map((activity: any) => ({ // Cast from `any` to `Activity` for safety
            ...activity,
            date: new Date(activity.date)
          }) as Activity) || [], // Ensure it's an empty array if null/undefined
        } as Lead; // Final cast to Lead
      });
    } catch (error) {
      console.error('Error fetching leads:', error);
      throw new Error('Failed to fetch leads from database');
    }
  }

  static async getLeadById(id: string): Promise<Lead | null> {
    try {
      if (!ObjectId.isValid(id)) {
        console.warn(`Attempted to fetch lead with invalid ID format: ${id}`);
        return null;
      }

      const collection = await this.getCollection();
      const lead = await collection.findOne({ _id: new ObjectId(id) });

      if (!lead) return null;

      const { _id, ...rest } = lead;
      return {
        ...rest,
        id: _id.toString(),
        createdAt: new Date(lead.createdAt),
        updatedAt: new Date(lead.updatedAt),
        lastContacted: lead.lastContacted ? new Date(lead.lastContacted) : undefined,
        activities: lead.activities?.map((activity: any) => ({ // Cast from `any` to `Activity`
          ...activity,
          date: new Date(activity.date)
        }) as Activity) || []
      } as Lead;
    } catch (error) {
      console.error('Error fetching lead:', error);
      return null;
    }
  }

  static async createLead(leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'lastContacted' | 'activities' | 'attachments'> & { activities?: any[], attachments?: string[] }): Promise<Lead> {
    try {
      const collection = await this.getCollection();
      const now = new Date();

      const newLeadDocument = {
        ...leadData,
        notes: leadData.notes || '',
        activities: leadData.activities || [], // Ensure activities is an array
        attachments: leadData.attachments || [], // Ensure attachments is an array
        createdAt: now,
        updatedAt: now,
        lastContacted: undefined, // New leads typically don't have a lastContacted date initially
      };

      const result = await collection.insertOne(newLeadDocument);

      if (!result.acknowledged) {
        throw new Error('Failed to acknowledge lead creation');
      }

      // Return the created lead in the expected format
      const createdLead = {
        ...newLeadDocument,
        id: result.insertedId.toString(),
      } as Lead;

      // Ensure dates are correctly typed for the returned Lead object
      createdLead.createdAt = new Date(createdLead.createdAt);
      createdLead.updatedAt = new Date(createdLead.updatedAt);
      if (createdLead.lastContacted) {
          createdLead.lastContacted = new Date(createdLead.lastContacted);
      }
      createdLead.activities = createdLead.activities?.map((activity: any) => ({
          ...activity,
          date: new Date(activity.date)
      }) as Activity) || [];

      return createdLead;
    } catch (error) {
      console.error('Error creating lead:', error);
      throw new Error('Failed to create lead');
    }
  }

  static async updateLead(id: string, updateData: Partial<Lead>): Promise<Lead> {
    try {
      if (!ObjectId.isValid(id)) {
        throw new Error('Invalid lead ID format');
      }

      const collection = await this.getCollection();
      const now = new Date();

      // Destructure to remove 'id' from updateData payload, as _id is handled by query
      // Also remove backend-managed fields like createdAt, activities, attachments if sent
      const {
        id: _,
        createdAt, // Remove createdAt if sent by frontend
        activities, // Activities are updated via addActivity, not directly here
        attachments, // Attachments might be updated directly or via a separate endpoint
        ...dataToUpdate // This will contain all other fields
      } = updateData;

      // Handle updating specific fields that might be Date objects or arrays
      const finalUpdatePayload: any = {
          ...dataToUpdate,
          updatedAt: now // Always update `updatedAt` on modifications
      };

      // If lastContacted is provided in updateData, ensure it's a Date object
      if (updateData.lastContacted !== undefined) {
          finalUpdatePayload.lastContacted = updateData.lastContacted ? new Date(updateData.lastContacted) : undefined;
      }
      // Handle array updates if they are part of the `dataToUpdate`
      if (updateData.preferredLocations !== undefined) {
          finalUpdatePayload.preferredLocations = updateData.preferredLocations;
      }
      // Ensure 'notes' is handled if it can be empty string but not null/undefined
      if (updateData.notes !== undefined) {
          finalUpdatePayload.notes = updateData.notes;
      }


      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) }, // Query for the document by its MongoDB _id
        { $set: finalUpdatePayload }, // Use $set for partial updates
        { returnDocument: 'after' } // Return the document AFTER the update has been applied
      );

      if (!result?.value) {
        throw new Error('Lead not found');
      }

      const { _id, ...rest } = result.value;
      return {
        ...rest,
        id: _id.toString(),
        createdAt: new Date(result.value.createdAt),
        updatedAt: new Date(result.value.updatedAt),
        lastContacted: result.value.lastContacted ? new Date(result.value.lastContacted) : undefined,
        activities: result.value.activities?.map((activity: any) => ({
          ...activity,
          date: new Date(activity.date)
        }) as Activity) || []
      } as Lead;

    } catch (error) {
      console.error('Error updating lead with ID:', id, error);
      if (error instanceof Error && (error.message === 'Invalid lead ID format' || error.message === 'Lead not found')) {
        throw error;
      }
      throw new Error('Failed to update lead due to an internal error');
    }
  }

  static async deleteLead(id: string): Promise<boolean> {
    try {
      if (!ObjectId.isValid(id)) {
        console.warn(`Attempted to delete lead with invalid ID format: ${id}`);
        return false;
      }

      const collection = await this.getCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount === 1;
    } catch (error) {
      console.error('Error deleting lead:', error);
      return false;
    }
  }

  static async addActivity(leadId: string, activityData: Omit<Activity, 'id'> & { date?: Date | string }): Promise<Lead> {
    try {
      if (!ObjectId.isValid(leadId)) {
        throw new Error('Invalid lead ID format');
      }

      const collection = await this.getCollection();
      const now = new Date();

      const newActivity: Activity = {
        id: new ObjectId().toString(), // Generate unique ID for the activity
        date: activityData.date ? new Date(activityData.date) : now,
        type: activityData.type,
        description: activityData.description,
        agent: activityData.agent,
        metadata: activityData.metadata,
      };

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(leadId) },
        {
          $push: { activities: newActivity as any }, // Use $push to add to the array
          $set: { updatedAt: now, lastContacted: now } // Update timestamps
        },
        { returnDocument: 'after' }
      );

      if (!result?.value) {
        throw new Error('Lead not found');
      }

      const { _id, ...rest } = result.value;
      return {
        ...rest,
        id: _id.toString(),
        createdAt: new Date(result.value.createdAt),
        updatedAt: new Date(result.value.updatedAt),
        lastContacted: result.value.lastContacted ? new Date(result.value.lastContacted) : undefined,
        activities: result.value.activities?.map((activity: any) => ({
          ...activity,
          date: new Date(activity.date)
        }) as Activity) || []
      } as Lead;
    } catch (error) {
      console.error('Error adding activity:', error);
      if (error instanceof Error && (error.message === 'Invalid lead ID format' || error.message === 'Lead not found')) {
        throw error;
      }
      throw new Error('Failed to add activity to lead');
    }
  }
}
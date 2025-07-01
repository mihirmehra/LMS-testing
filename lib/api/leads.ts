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
          ...rest
        } = lead;

        return {
          ...rest,
          id: _id.toString(),
          createdAt: new Date(createdAt),
          updatedAt: new Date(updatedAt),
          lastContacted: lastContacted ? new Date(lastContacted) : undefined,
          activities: activities?.map((activity: Activity) => ({ // Cast to Activity
            ...activity,
            date: new Date(activity.date)
          })) || []
        } as Lead;
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
        // For 'get' operations, returning null for invalid IDs is often more graceful
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
        activities: lead.activities?.map((activity: Activity) => ({ // Cast to Activity
          ...activity,
          date: new Date(activity.date)
        })) || []
      } as Lead;
    } catch (error) {
      console.error('Error fetching lead:', error);
      // Return null on any database error for this specific method
      return null;
    }
  }

  static async createLead(leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> {
    try {
      const collection = await this.getCollection();
      const now = new Date();

      // Ensure required fields like 'notes' and 'activities' are present,
      // even if empty, based on your Lead interface.
      const newLeadDocument = {
        ...leadData,
        notes: leadData.notes || '', // Default notes to empty string if not provided
        activities: leadData.activities || [], // Ensure activities is an array
        createdAt: now,
        updatedAt: now,
      };

      const result = await collection.insertOne(newLeadDocument);

      if (!result.acknowledged) {
        throw new Error('Failed to acknowledge lead creation');
      }

      return {
        ...newLeadDocument,
        id: result.insertedId.toString()
      } as Lead;
    } catch (error) {
      console.error('Error creating lead:', error);
      throw new Error('Failed to create lead');
    }
  }

  static async updateLead(id: string, updateData: Partial<Lead>): Promise<Lead> {
    try {
      if (!ObjectId.isValid(id)) {
        // Throw a specific error for invalid ID format
        throw new Error('Invalid lead ID format');
      }

      const collection = await this.getCollection();
      const now = new Date();

      // Destructure to remove 'id' from updateData payload, as _id is handled by query
      const { id: _, ...dataToUpdate } = updateData;

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) }, // Query for the document by its MongoDB _id
        {
          $set: {
            ...dataToUpdate,
            updatedAt: now // Always update `updatedAt` on modifications
          }
        },
        { returnDocument: 'after' } // Return the document AFTER the update has been applied
      );

      // `result.value` will be null if no document matched the query criteria
      if (!result?.value) {
        throw new Error('Lead not found'); // Specific error if lead doesn't exist
      }

      // Map MongoDB's _id back to 'id' for the Lead type
      const { _id, ...rest } = result.value;
      return {
        ...rest,
        id: _id.toString(),
        createdAt: new Date(result.value.createdAt),
        updatedAt: new Date(result.value.updatedAt),
        lastContacted: result.value.lastContacted ? new Date(result.value.lastContacted) : undefined,
        activities: result.value.activities?.map((activity: Activity) => ({ // Cast to Activity
          ...activity,
          date: new Date(activity.date)
        })) || []
      } as Lead;

    } catch (error) {
      console.error('Error updating lead with ID:', id, error);
      // Re-throw specific errors for client-side distinction
      if (error instanceof Error && (error.message === 'Invalid lead ID format' || error.message === 'Lead not found')) {
        throw error; // Re-throw the specific error
      }
      throw new Error('Failed to update lead due to an internal error'); // Generic fallback
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
      return result.deletedCount === 1; // Returns true if one document was deleted
    } catch (error) {
      console.error('Error deleting lead:', error);
      return false; // Return false on any deletion error
    }
  }

  // Updated addActivity method to strictly adhere to your Activity interface
  static async addActivity(leadId: string, activityData: Omit<Activity, 'id'> & { date?: Date | string }): Promise<Lead> {
    try {
      if (!ObjectId.isValid(leadId)) {
        throw new Error('Invalid lead ID format');
      }

      const collection = await this.getCollection();
      const now = new Date();

      // Construct the new activity object, ensuring all required fields are present
      const newActivity: Activity = {
        // Generate a unique ID for the activity within the array
        id: new ObjectId().toString(),
        // Ensure date is a Date object, defaulting to now if not provided or invalid
        date: activityData.date ? new Date(activityData.date) : now,
        type: activityData.type, // Required by Activity interface
        description: activityData.description, // Required by Activity interface
        agent: activityData.agent, // Required by Activity interface
        metadata: activityData.metadata, // Optional field
      };

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(leadId) },
        {
          $push: { activities: newActivity as any }, // Add the new activity to the array
          $set: { updatedAt: now, lastContacted: now } // Update timestamps
        },
        { returnDocument: 'after' } // Get the updated document
      );

      // Check `result.value` to see if a lead was found and updated
      if (!result?.value) {
        throw new Error('Lead not found');
      }

      // Map MongoDB's _id back to 'id' for the Lead type and convert dates
      const { _id, ...rest } = result.value;
      return {
        ...rest,
        id: _id.toString(),
        createdAt: new Date(result.value.createdAt),
        updatedAt: new Date(result.value.updatedAt),
        lastContacted: result.value.lastContacted ? new Date(result.value.lastContacted) : undefined,
        activities: result.value.activities?.map((activity: Activity) => ({ // Explicitly type `activity` as `Activity`
          ...activity,
          date: new Date(activity.date) // Ensure activity date is a Date object
        })) || []
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
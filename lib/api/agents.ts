import { getDatabase } from '@/lib/mongodb';
import { Agent } from '@/types/lead';
import { ObjectId } from 'mongodb';

export class AgentsAPI {
  private static async getCollection() {
    const db = await getDatabase();
    return db.collection('agents');
  }

  static async getAllAgents(): Promise<Agent[]> {
    try {
      const collection = await this.getCollection();
      const agents = await collection.find({ active: true }).sort({ name: 1 }).toArray();
      
      return agents.map(agent => {
        const { _id, ...rest } = agent; // Destructure to omit _id
        return {
          ...rest,
          id: _id.toString() // Assign id from _id
        } as Agent; // Ensure the returned object matches the Agent type
      });
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw new Error('Failed to fetch agents from database');
    }
  }

  static async createAgent(agentData: Omit<Agent, 'id'>): Promise<Agent> {
    try {
      const collection = await this.getCollection();
      
      // Format phone number to Indian format
      let formattedPhone = agentData.phone;
      if (formattedPhone && !formattedPhone.startsWith('+91')) {
        const digits = formattedPhone.replace(/\D/g, '');
        if (digits.length === 10) {
          formattedPhone = `+91-${digits}`;
        }
      }
      
      const result = await collection.insertOne({
        ...agentData,
        phone: formattedPhone,
        active: agentData.active !== false
      });
      
      return {
        ...agentData,
        phone: formattedPhone,
        id: result.insertedId.toString()
      } as Agent;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw new Error('Failed to create agent');
    }
  }

  static async updateAgent(id: string, updateData: Partial<Agent>): Promise<Agent> {
    try {
      if (!ObjectId.isValid(id)) {
        throw new Error('Invalid agent ID');
      }
      
      const collection = await this.getCollection();
      const { id: _, ...dataToUpdate } = updateData;
      
      // Format phone number if provided
      if (dataToUpdate.phone && !dataToUpdate.phone.startsWith('+91')) {
        const digits = dataToUpdate.phone.replace(/\D/g, '');
        if (digits.length === 10) {
          dataToUpdate.phone = `+91-${digits}`;
        }
      }
      
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: dataToUpdate },
        { returnDocument: 'after' }
      );

      if (!result) {
        throw new Error('Agent not found');
      }

      // Return the updated agent object
      const updatedAgent = {
        ...result.value,
        id: result.value._id.toString(), // Convert _id to string for id
      };

      // Omit _id from the returned object
      const { _id, ...agentWithoutId } = updatedAgent;

      return agentWithoutId as Agent; // Ensure the returned object matches the Agent type
      
    } catch (error) {
      console.error('Error updating agent:', error);
      throw new Error('Failed to update agent');
    }
  }

  static async deleteAgent(id: string): Promise<boolean> {
    try {
      if (!ObjectId.isValid(id)) {
        return false;
      }
      
      const collection = await this.getCollection();
      // Soft delete by setting active to false
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { active: false } }
      );
      return result.modifiedCount === 1;
    } catch (error) {
      console.error('Error deleting agent:', error);
      return false;
    }
  }
}
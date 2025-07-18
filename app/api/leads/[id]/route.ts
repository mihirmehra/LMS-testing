// app/api/leads/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb'; // Assuming this path is correct for your MongoDB connection

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid Lead ID format' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const leadsCollection = db.collection('leads');

    const lead = await leadsCollection.findOne({ _id: new ObjectId(id) });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Convert _id to string 'id' for consistent client-side usage
    const { _id, ...restOfLead } = lead;
    const formattedLead = { id: _id.toString(), ...restOfLead };

    return NextResponse.json(formattedLead);
  } catch (error) {
    console.error('API Error (GET lead by ID):', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const updateData = await request.json();

    console.log(`[API PUT] Attempting to update lead ID: ${id}`);
    console.log(`[API PUT] Received update data:`, updateData);

    if (!id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid Lead ID format' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const leadsCollection = db.collection('leads');

    const { _id, ...dataToUpdate } = updateData; // Remove _id from updateData if present
    dataToUpdate.updatedAt = new Date(); // Ensure updatedAt is set/updated

    const result = await leadsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: dataToUpdate },
      { returnDocument: 'after' } // Return the updated document
    );

    console.log(`[API PUT] Raw result from findOneAndUpdate:`, result);

    // FIX: Check if 'result' itself is null/undefined, not 'result.value'
    if (!result) {
      console.warn(`[API PUT] Lead not found for update, returning 404 for ID: ${id}. FindOneAndUpdate returned null/undefined.`);
      return NextResponse.json(
        { error: 'Lead not found for update' },
        { status: 404 }
      );
    }

    // FIX: Access the document directly from 'result'
    const { _id: updatedDocId, ...restOfUpdatedLead } = result;
    const updatedLead = { id: updatedDocId.toString(), ...restOfUpdatedLead };

    console.log(`[API PUT] Successfully updated lead ID: ${id}, returning 200.`);
    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error('API Error (PUT lead by ID):', error);
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    );
  }
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid Lead ID format' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const leadsCollection = db.collection('leads');

    const result = await leadsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Lead not found for deletion' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('API Error (DELETE lead by ID):', error);
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    );
  }
}
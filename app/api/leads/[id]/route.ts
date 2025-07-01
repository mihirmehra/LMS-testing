// pages/api/leads/[id].ts

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';

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

    // FIX: Use destructuring to exclude _id
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

    // Remove _id from updateData if present, as _id cannot be updated
    // FIX: Use destructuring for `_id` removal from `updateData`
    const { _id, ...dataToUpdate } = updateData;

    dataToUpdate.updatedAt = new Date(); // Update the timestamp

    const result = await leadsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: dataToUpdate },
      { returnDocument: 'after' }
    );

    if (!result?.value) {
      return NextResponse.json(
        { error: 'Lead not found for update' },
        { status: 404 }
      );
    }

    // FIX: Use destructuring to exclude _id from the returned value
    const { _id: updatedDocId, ...restOfUpdatedLead } = result.value;
    const updatedLead = { id: updatedDocId.toString(), ...restOfUpdatedLead };

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
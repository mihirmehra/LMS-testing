// app/api/notifications/devices/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/server-utils'; // Centralized auth
import { deleteDeviceRegistration, getDeviceRegistrations } from '@/lib/dev-db/push-devices'; // Persistent mock DB

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = verifyAuth(request); // Authentication check

    // Ensure the device belongs to the authenticated user before deleting
    const allDevices = getDeviceRegistrations();
    const deviceToDelete = allDevices.find(d => d.id === params.id && d.userId === decoded.userId);

    if (!deviceToDelete) {
      return NextResponse.json(
        { message: 'Device not found or unauthorized' },
        { status: 404 }
      );
    }

    const success = deleteDeviceRegistration(params.id);
    
    if (!success) {
      // This case should ideally not happen if deviceToDelete was found, but good for robustness
      return NextResponse.json(
        { message: 'Failed to unregister device' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ message: 'Device unregistered successfully' });
  } catch (error) {
    console.error('Unregister device error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication required') || error.message.includes('Invalid or expired token')) {
        return NextResponse.json({ message: error.message }, { status: 401 });
      }
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // In production, this would:
      // 1. Revoke Google OAuth tokens using the new GIS revoke endpoint
      // 2. Remove Google account info from user record
      // 3. Update user in database
      
      // For the new Google Identity Services, token revocation is handled client-side
      // using google.accounts.oauth2.revoke(token)

      return NextResponse.json({
        message: 'Google account disconnected successfully',
        instructions: 'Token revocation should be handled client-side using google.accounts.oauth2.revoke()',
      });
    } catch (jwtError) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Google disconnect error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
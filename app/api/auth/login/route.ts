import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UsersAPI } from '@/lib/api/users';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user in database
    const user = await UsersAPI.getUserByEmail(email);
    
    if (!user) {
      console.warn(`Login attempt failed: User not found for email ${email}`);
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user has password field
    if (!user.password) {
      console.error(`Login attempt failed: User ${email} has no password hash in database`);
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    console.log(`Attempting password verification for ${email}`);
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.warn(`Login attempt failed: Invalid password for email ${email}`);
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      console.warn(`Login attempt failed: User ${email} is not active`);
      return NextResponse.json(
        { message: 'Your account has been deactivated. Please contact support.' },
        { status: 401 }
      );
    }

    // Update last login
    await UsersAPI.updateLastLogin(user.id);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data (without password) and token
    const { password: _, ...userWithoutPassword } = user;
    
    console.log(`Login successful for ${email}`);
    return NextResponse.json({
      user: {
        ...userWithoutPassword,
        lastLogin: new Date(),
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
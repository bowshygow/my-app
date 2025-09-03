import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { comparePassword } from './utils';

export interface JWTPayload {
  userId: string;
  email: string;
  name?: string;
}

/**
 * Generate JWT token
 */
export function generateToken(payload: JWTPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  return jwt.sign(payload, secret, { expiresIn: '24h' });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  try {
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

/**
 * Extract token from request headers
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7);
}

/**
 * Authenticate user from request
 */
export async function authenticateUser(request: NextRequest): Promise<JWTPayload | null> {
  try {
    const token = extractToken(request);
    if (!token) {
      return null;
    }
    
    const payload = verifyToken(token);
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Login user with email and password
 */
export async function loginUser(email: string, password: string): Promise<{ user: any; token: string } | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
      },
    });

    if (!user) {
      return null;
    }

    const isValidPassword = comparePassword(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      name: user.name || undefined,
    };

    const token = generateToken(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

/**
 * Create new user
 */
export async function createUser(email: string, password: string, name?: string): Promise<{ user: any; token: string } | null> {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return null;
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      name: user.name || undefined,
    };

    const token = generateToken(payload);

    return {
      user,
      token,
    };
  } catch (error) {
    console.error('User creation error:', error);
    return null;
  }
}

/**
 * Middleware to protect API routes
 */
export function withAuth(handler: Function) {
  return async (request: NextRequest, context?: { params?: Promise<any> }) => {
    try {
      const user = await authenticateUser(request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Add user to request context
      (request as any).user = user;
      
      // Pass both request and context (which includes params Promise) to the handler
      return handler(request, context);
    } catch (error) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
  };
}

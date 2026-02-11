import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';

// Simple in-memory auth store (in production, use a real backend)
const users: Map<string, { email: string; passwordHash: string; workspaceId: string }> = new Map();
const workspaces: Map<string, any> = new Map();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken(userId: string, email: string, workspaceId: string): string {
  // Simple JWT-like token (in production, use jsonwebtoken library)
  const payload = { userId, email, workspaceId, iat: Date.now() };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password, action } = body;

  if (action === 'signup') {
    if (users.has(email)) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const workspaceId = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    users.set(email, { email, passwordHash, workspaceId });

    // Create default workspace
    workspaces.set(workspaceId, {
      _id: workspaceId,
      name: 'My Workspace',
      slug: email.split('@')[0],
      timezone: 'UTC',
    });

    const token = generateToken(crypto.randomUUID(), email, workspaceId);
    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return NextResponse.json({
      token,
      user: { email, workspaceId },
    });
  } else if (action === 'login') {
    const user = users.get(email);
    if (!user || user.passwordHash !== hashPassword(password)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateToken(crypto.randomUUID(), email, user.workspaceId);
    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
    });

    return NextResponse.json({
      token,
      user: { email, workspaceId: user.workspaceId },
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { connectMongo } from '@/lib/mongo';
import { User, Workspace } from '@/models';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function signToken(userId: string, email: string, workspaceId: string): string {
  return jwt.sign({ userId, email, workspaceId }, JWT_SECRET, { expiresIn: '7d' });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password, action, rememberMe } = body as {
    email?: string;
    password?: string;
    action?: 'signup' | 'login';
    rememberMe?: boolean;
  };

  if (!email || !password || !action) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  await connectMongo();

  if (action === 'signup') {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const slugBase = email.split('@')[0].toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const slug = slugBase || `ws-${Date.now()}`;

    const workspace = await Workspace.create({
      name: 'My Workspace',
      slug,
      timezone: 'UTC',
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role: 'admin',
      workspaceId: workspace._id,
    });

    const token = signToken(user._id.toString(), user.email, workspace._id.toString());

    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return NextResponse.json({
      token,
      user: { id: user._id.toString(), email: user.email, workspaceId: workspace._id.toString() },
    });
  }

  if (action === 'login') {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signToken(user._id.toString(), user.email, user.workspaceId.toString());

    const cookieStore = await cookies();
    const loginRememberMe = rememberMe !== false;
    cookieStore.set('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      ...(loginRememberMe ? { maxAge: 7 * 24 * 60 * 60 } : {}),
      path: '/',
    });

    return NextResponse.json({
      token,
      user: { id: user._id.toString(), email: user.email, workspaceId: user.workspaceId.toString() },
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

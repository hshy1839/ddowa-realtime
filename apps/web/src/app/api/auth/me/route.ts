import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Simple token verification (in production, verify JWT with a real backend)
async function verifyToken(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const tokenData = await verifyToken(request);

  if (!tokenData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: tokenData.userId,
      email: tokenData.email,
      workspaceId: tokenData.workspaceId,
    },
  });
}

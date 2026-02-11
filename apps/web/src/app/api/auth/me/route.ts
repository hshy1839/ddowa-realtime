import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const token = await requireAuth();
    return NextResponse.json({
      user: {
        id: token.userId,
        email: token.email,
        workspaceId: token.workspaceId,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

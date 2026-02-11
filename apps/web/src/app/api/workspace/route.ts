import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import { requireAuth } from '@/lib/auth';
import { Workspace } from '@/models';

export async function GET(_request: NextRequest) {
  try {
    const token = await requireAuth();
    await connectMongo();

    const workspace = await Workspace.findById(token.workspaceId).lean();
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    return NextResponse.json({ workspace });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

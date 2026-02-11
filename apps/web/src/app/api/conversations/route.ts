import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import { requireAuth } from '@/lib/auth';
import { Conversation } from '@/models';

export async function GET(_request: NextRequest) {
  try {
    const token = await requireAuth();
    await connectMongo();

    const conversations = await Conversation.find({ workspaceId: token.workspaceId })
      .sort({ startedAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ conversations });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

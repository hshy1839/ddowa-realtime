import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import { requireAuth } from '@/lib/auth';
import { AgentConfig } from '@/models';

export async function GET(_request: NextRequest) {
  try {
    const token = await requireAuth();
    await connectMongo();

    const config = await AgentConfig.findOne({ workspaceId: token.workspaceId }).lean();

    return NextResponse.json({
      config: config || {
        tone: 'professional',
        rules: ['Be polite', 'Be helpful'],
        forbidden: [],
        fallback: 'I cannot help with that',
        toolsEnabled: ['getBusinessInfo', 'listAvailability', 'createBooking', 'getPaymentLink'],
      },
    });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = await requireAuth();
    await connectMongo();

    const body = await request.json();

    const config = await AgentConfig.findOneAndUpdate(
      { workspaceId: token.workspaceId },
      { ...body, workspaceId: token.workspaceId },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ config });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

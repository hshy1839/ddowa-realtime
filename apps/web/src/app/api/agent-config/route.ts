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
        rules: ['친절하고 정확하게 답변하세요'],
        forbidden: [],
        fallback: '죄송합니다. 해당 내용은 확인 후 다시 안내드릴게요.',
        toolsEnabled: ['getBusinessInfo', 'listAvailability', 'createBooking', 'getPaymentLink'],
        agentGender: 'neutral',
        agentPersonality: 'professional',
        companyName: '',
        companyDescription: '',
        companyPhone: '',
        companyWebsite: '',
        speechRate: 1.0,
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

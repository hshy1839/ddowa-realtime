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
        twilioPhoneNumber: '',
        speechRate: 1.0,
        micInputGain: 1.0,
        micNoiseGate: 0.0,
        micSelfMonitor: false,
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

    const body = (await request.json()) || {};
    const {
      _id,
      __v,
      createdAt,
      updatedAt,
      workspaceId: _workspaceId,
      ...rest
    } = body;

    const payload = {
      tone: rest.tone,
      rules: Array.isArray(rest.rules) ? rest.rules : [],
      forbidden: Array.isArray(rest.forbidden) ? rest.forbidden : [],
      fallback: rest.fallback,
      toolsEnabled: Array.isArray(rest.toolsEnabled) ? rest.toolsEnabled : [],
      agentGender: rest.agentGender,
      agentPersonality: rest.agentPersonality,
      companyName: rest.companyName,
      companyDescription: rest.companyDescription,
      companyPhone: rest.companyPhone,
      companyWebsite: rest.companyWebsite,
      twilioPhoneNumber: rest.twilioPhoneNumber,
      speechRate: rest.speechRate,
      micInputGain: rest.micInputGain,
      micNoiseGate: rest.micNoiseGate,
      micSelfMonitor: rest.micSelfMonitor,
      workspaceId: token.workspaceId,
    };

    const config = await AgentConfig.findOneAndUpdate(
      { workspaceId: token.workspaceId },
      payload,
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ config });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

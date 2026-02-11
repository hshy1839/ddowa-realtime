import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import { requireAuth } from '@/lib/auth';
import { Contact } from '@/models';

export async function GET(_request: NextRequest) {
  try {
    const token = await requireAuth();
    await connectMongo();

    const contacts = await Contact.find({ workspaceId: token.workspaceId })
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({ contacts });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await requireAuth();
    await connectMongo();

    const body = await request.json();
    const { name, email, phone, tags } = body || {};

    const contact = await Contact.create({
      workspaceId: token.workspaceId,
      name,
      email: email?.toLowerCase(),
      phone,
      tags: Array.isArray(tags) ? tags : [],
      lastSeenAt: new Date(),
    });

    return NextResponse.json({ contact });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

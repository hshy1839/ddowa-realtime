import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import { requireAuth } from '@/lib/auth';
import { Contact } from '@/models';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await requireAuth();
    await connectMongo();

    const { id } = await params;
    const contact = await Contact.findOne({ _id: id, workspaceId: token.workspaceId }).lean();
    if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ contact });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await requireAuth();
    await connectMongo();

    const { id } = await params;
    const body = await request.json();

    const contact = await Contact.findOneAndUpdate(
      { _id: id, workspaceId: token.workspaceId },
      {
        ...body,
        email: body?.email ? String(body.email).toLowerCase() : undefined,
      },
      { new: true }
    ).lean();

    if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ contact });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await requireAuth();
    await connectMongo();

    const { id } = await params;
    const res = await Contact.deleteOne({ _id: id, workspaceId: token.workspaceId });
    return NextResponse.json({ success: res.deletedCount === 1 });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

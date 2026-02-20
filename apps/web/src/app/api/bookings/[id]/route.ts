import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import { requireAuth } from '@/lib/auth';
import { Booking, Contact } from '@/models';

function normalizePhone(input?: string) {
  return (input || '').replace(/\D/g, '');
}

async function findOrCreateContact(workspaceId: string, phoneRaw?: string) {
  const phone = normalizePhone(phoneRaw);
  if (!phone) return null;

  let contact = await Contact.findOne({ workspaceId, phone: new RegExp(`${phone.slice(-8)}$`) });
  if (!contact) {
    contact = await Contact.create({
      workspaceId,
      phone,
      name: '고객',
      lastSeenAt: new Date(),
    });
  }
  return contact;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await requireAuth();
    await connectMongo();

    const { id } = await params;
    const body = await request.json();
    const { startAt, endAt, serviceName, memo, status, phone } = body || {};

    const contact = await findOrCreateContact(token.workspaceId, phone);

    const booking = await Booking.findOneAndUpdate(
      { _id: id, workspaceId: token.workspaceId },
      {
        ...(startAt ? { startAt: new Date(startAt) } : {}),
        ...((startAt || endAt) ? { endAt: new Date(endAt || startAt) } : {}),
        ...(serviceName !== undefined ? { serviceName } : {}),
        ...(memo !== undefined ? { memo } : {}),
        ...(status ? { status } : {}),
        ...(phone !== undefined ? { contactId: contact?._id || undefined } : {}),
      },
      { new: true }
    ).lean();

    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ booking });
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
    const res = await Booking.deleteOne({ _id: id, workspaceId: token.workspaceId });
    return NextResponse.json({ success: res.deletedCount === 1 });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

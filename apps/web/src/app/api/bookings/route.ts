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

export async function GET(_request: NextRequest) {
  try {
    const token = await requireAuth();
    await connectMongo();

    const raw = await Booking.find({ workspaceId: token.workspaceId })
      .populate('contactId', 'phone name')
      .sort({ startAt: -1 })
      .limit(200)
      .lean();

    const bookings = raw.map((b: any) => ({
      ...b,
      phone: b?.contactId?.phone || '',
      contactName: b?.contactId?.name || '',
    }));

    return NextResponse.json({ bookings });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await requireAuth();
    await connectMongo();

    const body = await request.json();
    const { startAt, endAt, serviceName, memo, status, phone } = body || {};

    const contact = await findOrCreateContact(token.workspaceId, phone);

    const start = new Date(startAt);
    const booking = await Booking.create({
      workspaceId: token.workspaceId,
      contactId: contact?._id,
      startAt: start,
      endAt: endAt ? new Date(endAt) : start,
      serviceName,
      memo,
      status,
    });

    return NextResponse.json({ booking });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import { requireAuth } from '@/lib/auth';
import { Booking } from '@/models';

export async function GET(_request: NextRequest) {
  try {
    const token = await requireAuth();
    await connectMongo();

    const bookings = await Booking.find({ workspaceId: token.workspaceId })
      .sort({ startAt: -1 })
      .limit(200)
      .lean();

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
    const { startAt, endAt, serviceName, memo, status } = body || {};

    const booking = await Booking.create({
      workspaceId: token.workspaceId,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
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

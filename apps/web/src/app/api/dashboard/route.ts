import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import { requireAuth } from '@/lib/auth';
import { Booking, Contact, Conversation } from '@/models';

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function GET(_request: NextRequest) {
  try {
    const token = await requireAuth();
    await connectMongo();

    const [conversations, contactsCount, completedBookings] = await Promise.all([
      Conversation.find({ workspaceId: token.workspaceId }).sort({ startedAt: -1 }).lean(),
      Contact.countDocuments({ workspaceId: token.workspaceId }),
      Booking.countDocuments({ workspaceId: token.workspaceId, status: { $in: ['confirmed', 'completed'] } }),
    ]);

    const totalConsultations = conversations.length;
    const ratings = conversations
      .map((c: any) => Number(c?.meta?.rating))
      .filter((v: number) => Number.isFinite(v) && v > 0);
    const avgRating = ratings.length
      ? Number((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1))
      : null;

    const now = new Date();
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const trend = days.map((d) => {
      const key = ymd(d);
      const count = conversations.filter((c: any) => c.startedAt && ymd(new Date(c.startedAt)) === key).length;
      return { date: key, label: `${d.getMonth() + 1}/${d.getDate()}`, count };
    });

    const recentActivities = conversations.slice(0, 5).map((c: any) => ({
      id: String(c._id),
      text: `${c.intent || '상담'} · ${c.durationSec || 0}초`,
      at: c.startedAt,
    }));

    return NextResponse.json({
      stats: {
        totalConsultations,
        totalContacts: contactsCount,
        completedBookings,
        avgRating,
      },
      trend,
      recentActivities,
    });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

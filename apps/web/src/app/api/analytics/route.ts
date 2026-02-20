import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import { requireAuth } from '@/lib/auth';
import { Booking, Conversation } from '@/models';

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

    const conversations = await Conversation.find({ workspaceId: token.workspaceId }).lean();
    const bookings = await Booking.find({ workspaceId: token.workspaceId }).lean();

    const totalConversations = conversations.length;
    const totalDurationSec = conversations.reduce((acc: number, c: any) => acc + (Number(c.durationSec) || 0), 0);
    const totalMinutes = Math.round(totalDurationSec / 60);

    const avgCallSec = totalConversations ? Math.round(totalDurationSec / totalConversations) : 0;

    const completedBookings = bookings.filter((b: any) => ['confirmed', 'completed'].includes(String(b.status))).length;
    const completionRate = totalConversations ? Math.round((completedBookings / totalConversations) * 100) : 0;

    const ratings = conversations
      .map((c: any) => Number(c?.meta?.rating))
      .filter((v: number) => Number.isFinite(v) && v > 0);
    const avgRating = ratings.length ? Number((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1)) : null;

    const now = new Date();
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const dayCounts = days.map((d) => {
      const key = ymd(d);
      const count = conversations.filter((c: any) => c.startedAt && ymd(new Date(c.startedAt)) === key).length;
      return {
        date: key,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        count,
      };
    });

    const intentCounter = new Map<string, number>();
    for (const conv of conversations as any[]) {
      const intent = (conv.intent || '미분류').toString();
      intentCounter.set(intent, (intentCounter.get(intent) || 0) + 1);
    }

    const intentBreakdown = Array.from(intentCounter.entries())
      .map(([intent, count]) => ({
        intent,
        count,
        percent: totalConversations ? Math.round((count / totalConversations) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return NextResponse.json({
      metrics: {
        totalMinutes,
        avgRating,
        completionRate,
        avgCallSec,
        totalConversations,
      },
      dayCounts,
      intentBreakdown,
    });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

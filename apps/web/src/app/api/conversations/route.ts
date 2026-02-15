import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import { requireAuth } from '@/lib/auth';
import { Conversation, Message } from '@/models';

export async function GET(_request: NextRequest) {
  try {
    const token = await requireAuth();
    await connectMongo();

    const conversations = await Conversation.find({ workspaceId: token.workspaceId })
      .sort({ startedAt: -1 })
      .limit(100)
      .lean();

    const conversationIds = conversations.map((c: any) => c._id);

    const messages = conversationIds.length
      ? await Message.find({ conversationId: { $in: conversationIds } })
          .sort({ createdAt: 1 })
          .lean()
      : [];

    const messageMap = new Map<string, any[]>();
    for (const msg of messages as any[]) {
      const key = String(msg.conversationId);
      if (!messageMap.has(key)) messageMap.set(key, []);
      messageMap.get(key)!.push(msg);
    }

    const withMessages = conversations.map((conv: any) => ({
      ...conv,
      messages: messageMap.get(String(conv._id)) || [],
    }));

    return NextResponse.json({ conversations: withMessages });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = await requireAuth();
    await connectMongo();

    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    const target = await Conversation.findOne({ _id: conversationId, workspaceId: token.workspaceId }).lean();
    if (!target) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    await Message.deleteMany({ conversationId });
    const res = await Conversation.deleteOne({ _id: conversationId, workspaceId: token.workspaceId });

    return NextResponse.json({ success: res.deletedCount === 1 });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

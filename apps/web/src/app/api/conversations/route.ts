import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Return demo conversations/inbox
  return NextResponse.json({
    conversations: [
      {
        _id: '507f1f77bcf86cd799439015',
        contactId: '507f1f77bcf86cd799439013',
        status: 'completed',
        startedAt: new Date('2024-01-15'),
        endedAt: new Date('2024-01-15'),
        durationSec: 300,
        summary: 'Customer inquiry about service pricing',
        intent: 'information_request',
      },
    ],
  });
}

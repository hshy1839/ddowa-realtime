import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Return demo contacts
  return NextResponse.json({
    contacts: [
      {
        _id: '507f1f77bcf86cd799439013',
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        tags: ['premium', 'vip'],
        lastSeenAt: new Date(),
      },
    ],
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // In production, save to MongoDB
  return NextResponse.json({
    contact: { ...body, _id: '507f1f77bcf86cd799439014' },
  });
}

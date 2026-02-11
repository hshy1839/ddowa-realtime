import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Return demo agent config
  return NextResponse.json({
    config: {
      _id: '507f1f77bcf86cd799439012',
      tone: 'professional',
      rules: ['Be polite', 'Be helpful'],
      forbidden: [],
      fallback: 'I cannot help with that',
      toolsEnabled: ['getBusinessInfo', 'listAvailability', 'createBooking'],
    },
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  // In production, save to MongoDB
  return NextResponse.json({
    config: body,
  });
}

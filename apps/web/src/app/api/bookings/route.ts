import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Return demo bookings/availability
  return NextResponse.json({
    bookings: [
      {
        _id: '507f1f77bcf86cd799439016',
        startAt: new Date('2024-02-20'),
        endAt: new Date('2024-02-20'),
        serviceName: 'Consultation',
        status: 'confirmed',
      },
    ],
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // In production, create booking in MongoDB
  return NextResponse.json({
    booking: { ...body, _id: '507f1f77bcf86cd799439017' },
  });
}

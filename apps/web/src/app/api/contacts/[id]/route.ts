import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // In production, fetch from MongoDB by ID
  return NextResponse.json({
    contact: {
      _id: id,
      name: 'John Doe',
      phone: '+1234567890',
      email: 'john@example.com',
    },
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  // In production, update in MongoDB
  return NextResponse.json({
    contact: { ...body, _id: id },
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // In production, delete from MongoDB
  return NextResponse.json({ success: true });
}

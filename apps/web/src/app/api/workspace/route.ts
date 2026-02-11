import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Return a demo workspace for now
  // In production, fetch from MongoDB based on user's workspaceId
  return NextResponse.json({
    workspace: {
      _id: '507f1f77bcf86cd799439011',
      name: 'Demo Workspace',
      slug: 'demo',
      timezone: 'UTC',
    },
  });
}

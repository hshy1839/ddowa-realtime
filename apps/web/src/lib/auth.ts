import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export interface AuthToken {
  userId: string;
  email: string;
  workspaceId: string;
  iat: number;
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function requireAuth(): Promise<AuthToken> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) throw new Error('UNAUTHORIZED');

  try {
    return jwt.verify(token, JWT_SECRET) as AuthToken;
  } catch {
    throw new Error('UNAUTHORIZED');
  }
}

export async function getAuthOrNull(): Promise<AuthToken | null> {
  try {
    return await requireAuth();
  } catch {
    return null;
  }
}

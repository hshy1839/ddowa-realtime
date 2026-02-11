import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface IParsedToken {
  userId: string;
  email: string;
  workspaceId: string;
  iat: number;
}

export function verifyToken(token: string): IParsedToken | null {
  try {
    // Try JWT verification first
    const decoded = jwt.verify(token, JWT_SECRET) as IParsedToken;
    return decoded;
  } catch {
    // Fallback to simple base64 decoding (for Next.js cookie tokens)
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      if (decoded.userId && decoded.email && decoded.workspaceId) {
        return decoded;
      }
    } catch {
      // Ignore
    }
    return null;
  }
}

export function generateToken(userId: string, email: string, workspaceId: string): string {
  return jwt.sign({ userId, email, workspaceId }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

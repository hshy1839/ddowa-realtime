import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // List of public paths
  const publicPaths = ['/', '/login', '/signup', '/call'];

  // Check if path is public
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(path + '/'));

  if (isPublic) {
    return NextResponse.next();
  }

  // Check if user is authenticated (has token cookie)
  const token = request.cookies.get('token');

  if (!token && pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|static|favicon.ico).*)'],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth disabled for demo
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};

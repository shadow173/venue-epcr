// src/middleware.ts
import { withAuth } from '@betterauth/nextjs/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default withAuth(
  function middleware(request: NextRequest) {
    // Set security headers for HIPAA compliance
    const response = NextResponse.next();
    
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.amazonaws.com; font-src 'self';");
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    return response;
  },
  {
    pages: {
      signIn: '/auth/signin',
    },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Protect dashboard routes and API routes
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
    '/((?!api/auth|auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
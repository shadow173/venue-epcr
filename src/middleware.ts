// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname;
  
  // Public paths that don't require authentication
  const publicPaths = ['/auth/signin', '/auth/error'];
  
  // Check if the path is public
  const isPublicPath = publicPaths.some((prefix) => 
    path.startsWith(prefix) || path.startsWith('/_next') || path.startsWith('/api/auth')
  );
  
  // Get the user session
  const session = await auth();
  
  // If path requires auth and no session, redirect to login
  if (!isPublicPath && !session) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
  
  // Admin-only paths check
  const adminOnlyPaths = ['/admin', '/api/admin'];
  
  if (session && 
      adminOnlyPaths.some(prefix => path.startsWith(prefix)) && 
      session.user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Set security headers for HIPAA compliance
  const response = NextResponse.next();
  
  // Set HIPAA-related security headers
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.amazonaws.com");
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files, images, or other assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};
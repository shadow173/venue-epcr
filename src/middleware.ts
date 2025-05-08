// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname;
  
  // Public paths that don't require authentication
  const publicPaths = ['/auth/signin', '/auth/error', '/api/auth'];
  
  // Check if the path is public
  const isPublicPath = publicPaths.some((prefix) => 
    path.startsWith(prefix) || path.startsWith('/_next') || path.startsWith('/favicon.ico')
  );
  
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // Get the token directly using getToken
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  // If path requires auth and no token, redirect to login
  if (!token) {
    const url = new URL('/auth/signin', request.url);
    url.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(url);
  }
  
  // Admin-only paths check
  const adminOnlyPaths = ['/admin', '/api/admin'];
  
  if (adminOnlyPaths.some(prefix => path.startsWith(prefix)) && 
      token.role !== 'ADMIN') {
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
    '/((?!_next/static|_next/image|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
  runtime: 'nodejs', // Use Node.js runtime
};
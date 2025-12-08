import { NextResponse } from 'next/server';
import { verifySession } from './lib/session';

// Define public routes that don't require authentication
const publicRoutes = ['/login', '/register'];

// Define admin-only routes
const adminRoutes = ['/admin', '/dashboard/admin'];

export async function middleware(request) {
  const path = request.nextUrl.pathname;

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route));
  
  // Check if the route is admin-only
  const isAdminRoute = adminRoutes.some(route => path.startsWith(route));

  // Verify session
  const session = await verifySession();

  // Redirect to login if accessing protected route without session
  if (!isPublicRoute && !session.isAuth) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to dashboard if accessing login/register with active session
  if (isPublicRoute && session.isAuth) {
    const redirectUrl = session.role === 'admin' ? '/dashboard/admin' : '/dashboard';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Check admin access
  if (isAdminRoute && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api/auth/* (authentication endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};

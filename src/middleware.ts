import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

const PROTECTED_ROUTES = [
    '/dashboard',
    '/pos',
    '/shift',
    '/admin',
    '/reports',
    '/inventory',
    '/events',
    '/invoices',
    '/settings',
];
const PUBLIC_ROUTES = ['/login', '/'];

export async function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;
    const isProtectedRoute = PROTECTED_ROUTES.some((route) => path.startsWith(route));
    const isPublicRoute = PUBLIC_ROUTES.includes(path);

    // Early return for routes that don't need auth checks
    if (!isProtectedRoute && !isPublicRoute) {
        return NextResponse.next();
    }

    const cookie = req.cookies.get('session')?.value;

    // Skip expensive decrypt if no cookie and not protected
    if (!cookie && !isProtectedRoute) {
        return NextResponse.next();
    }

    const session = cookie ? await decrypt(cookie) : null;

    if (isProtectedRoute && !session?.userId) {
        return NextResponse.redirect(new URL('/login', req.nextUrl));
    }

    if (isPublicRoute && session?.userId) {
        // Redirect based on role
        if (session.role === 'CASHIER') {
            return NextResponse.redirect(new URL('/shift', req.nextUrl)); // Cashier goes to Shift first
        }
        return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
    }

    // Specific Role checks
    if (path.startsWith('/admin') && session?.role === 'CASHIER') {
        return NextResponse.redirect(new URL('/shift', req.nextUrl));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff|woff2|ttf|eot)$).*)',
    ],
};

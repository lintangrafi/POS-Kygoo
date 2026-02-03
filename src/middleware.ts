import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

const PROTECTED_ROUTES = ['/dashboard', '/pos', '/shift', '/admin'];
const PUBLIC_ROUTES = ['/login', '/'];

export async function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;
    const isProtectedRoute = PROTECTED_ROUTES.some((route) => path.startsWith(route));
    const isPublicRoute = PUBLIC_ROUTES.includes(path);

    const cookie = req.cookies.get('session')?.value;
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
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

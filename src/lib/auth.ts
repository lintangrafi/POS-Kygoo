import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

const KEY = new TextEncoder().encode(process.env.AUTH_SECRET || 'secret-key-generic');

export type SessionPayload = {
    userId: number;
    name: string;
    role: 'CASHIER' | 'ADMIN' | 'SUPERADMIN';
    eventId?: number | null;
    expires: Date;
};

export async function encrypt(payload: SessionPayload) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h') // 24 hours session
        .sign(KEY);
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(input, KEY, {
            algorithms: ['HS256'],
        });
        return payload as unknown as SessionPayload;
    } catch (error) {
        return null;
    }
}

/**
 * getSession is cached per-request using React.cache().
 * No matter how many server components/actions call it within a single request,
 * the cookie read + JWT decrypt happens only ONCE.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return null;
    return await decrypt(session);
});

/**
 * verifySession is cached per-request.
 * Safe to call from layout, page, and multiple server actions within one request
 * without redundant JWT decryption.
 */
export const verifySession = cache(async () => {
    const session = await getSession();
    if (!session?.userId) {
        redirect('/login');
    }
    return session;
});

export async function createSession(payload: Omit<SessionPayload, 'expires'>) {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
    const session = await encrypt({ ...payload, expires });

    const cookieStore = await cookies();
    cookieStore.set('session', session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expires,
        sameSite: 'lax',
        path: '/',
    });
}

export async function updateSession() {
    const session = await cookies().then((c) => c.get('session')?.value);
    const payload = await decrypt(session!);

    if (!session || !payload) {
        return null;
    }

    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // extension
    const cookieStore = await cookies();
    cookieStore.set('session', session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expires,
        sameSite: 'lax',
        path: '/',
    });
}

export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete('session');
}

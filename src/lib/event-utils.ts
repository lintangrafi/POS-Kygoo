'use server';

import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cache } from 'react';

/**
 * Get current user's event_id (if any).
 * Cached per-request using React.cache() — so even if called from
 * layout + page + multiple server actions in one request, the DB query
 * only executes ONCE.
 * 
 * Also checks if eventId is already in the JWT session payload (new sessions
 * store it there to avoid DB calls entirely).
 */
export const getCurrentUserEventId = cache(async (): Promise<number | null> => {
    const session = await verifySession();
    
    // If eventId is stored in the JWT payload (new sessions), use it directly
    if (session.eventId !== undefined) {
        return session.eventId ?? null;
    }

    // Fallback: fetch from DB for old sessions that don't have eventId in JWT
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        columns: {
            eventId: true,
        },
    });

    return user?.eventId || null;
});

/**
 * Get current user's full record (for permission checks).
 * Cached per-request.
 */
export const getCurrentUser = cache(async () => {
    const session = await verifySession();
    
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
    });

    return user;
});

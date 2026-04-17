'use server';

import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Get current user's event_id (if any)
 * Returns null if user has no event assigned
 */
export async function getCurrentUserEventId(): Promise<number | null> {
    const session = await verifySession();
    
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        columns: {
            eventId: true,
        },
    });

    return user?.eventId || null;
}

/**
 * Get current user's full record (for permission checks)
 */
export async function getCurrentUser() {
    const session = await verifySession();
    
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
    });

    return user;
}

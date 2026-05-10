'use server';

import { verifySession } from '@/lib/auth';
import { getCurrentUserEventId } from '@/lib/event-utils';
import { cache } from 'react';

/**
 * Get the current user's scope (role, eventId, permissions).
 * Cached per-request — no matter how many actions call this in one request,
 * the computation only happens once.
 * 
 * Uses getCurrentUserEventId (also cached) so there's only ONE DB query
 * for eventId per request total.
 */
export const getUserScope = cache(async () => {
    const session = await verifySession();
    const userEventId = await getCurrentUserEventId();

    const isEventScopedAdmin = session.role === 'ADMIN' && !!userEventId;
    const isStudioAdmin = session.role === 'SUPERADMIN' || (session.role === 'ADMIN' && !userEventId);

    return {
        session,
        userEventId,
        isEventScopedAdmin,
        isStudioAdmin,
    };
});

export async function requireStudioAdmin() {
    const scope = await getUserScope();
    if (!scope.isStudioAdmin) {
        throw new Error('Not authorized');
    }
    return scope;
}

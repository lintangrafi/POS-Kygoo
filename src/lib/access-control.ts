'use server';

import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function getUserScope() {
    const session = await verifySession();
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        columns: { eventId: true },
    });

    const userEventId = user?.eventId ?? null;
    const isEventScopedAdmin = session.role === 'ADMIN' && !!userEventId;
    const isStudioAdmin = session.role === 'SUPERADMIN' || (session.role === 'ADMIN' && !userEventId);

    return {
        session,
        userEventId,
        isEventScopedAdmin,
        isStudioAdmin,
    };
}

export async function requireStudioAdmin() {
    const scope = await getUserScope();
    if (!scope.isStudioAdmin) {
        throw new Error('Not authorized');
    }
    return scope;
}

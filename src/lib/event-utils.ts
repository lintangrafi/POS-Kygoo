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

/**
 * Calculate revenue sharing based on event configuration
 */
export function calculateRevenueShare(total: number, eventConfig: {
    revenueShareType?: string | null;
    organizerSharePercent?: number | { valueOf(): number } | null;
    studioSharePercent?: number | { valueOf(): number } | null;
    organizerShareFixed?: number | { valueOf(): number } | null;
    studioShareFixed?: number | { valueOf(): number } | null;
}) {
    const shareType = eventConfig.revenueShareType || 'PERCENTAGE';
    
    if (shareType === 'PERCENTAGE') {
        const organizerPercent = Number(eventConfig.organizerSharePercent || 0);
        const studioPercent = Number(eventConfig.studioSharePercent || 0);
        
        const organizerShare = (total * organizerPercent) / 100;
        const studioShare = (total * studioPercent) / 100;
        
        return {
            total,
            organizerShare: Math.round(organizerShare * 100) / 100,
            studioShare: Math.round(studioShare * 100) / 100,
            organizerPercent,
            studioPercent,
            type: 'PERCENTAGE' as const,
        };
    } else {
        const organizerFixed = Number(eventConfig.organizerShareFixed || 0);
        const studioFixed = Number(eventConfig.studioShareFixed || 0);
        
        return {
            total,
            organizerShare: organizerFixed,
            studioShare: studioFixed,
            type: 'FIXED' as const,
        };
    }
}

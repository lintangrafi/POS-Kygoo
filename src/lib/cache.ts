import { unstable_cache } from 'next/cache';
import { db } from '@/db';
import { events } from '@/db/schema';
import { desc, eq, gte, lte, and } from 'drizzle-orm';

/**
 * Cached version of getEventOptions for use in pages that don't mutate events.
 * Revalidates every 60 seconds or when events are modified.
 */
export const getCachedEventOptions = unstable_cache(
    async () => {
        try {
            const rows = await db.query.events.findMany({
                orderBy: [desc(events.isActive), desc(events.startDate), desc(events.id)],
                columns: {
                    id: true,
                    name: true,
                    startDate: true,
                    endDate: true,
                    revenueShareType: true,
                    organizerSharePercent: true,
                    studioSharePercent: true,
                    organizerShareFixed: true,
                    studioShareFixed: true,
                },
            });

            return rows.map((row) => ({
                id: row.id,
                name: row.name,
                startDate: row.startDate,
                endDate: row.endDate,
                revenueShareType: row.revenueShareType,
                organizerSharePercent: row.organizerSharePercent ? Number(row.organizerSharePercent) : null,
                studioSharePercent: row.studioSharePercent ? Number(row.studioSharePercent) : null,
                organizerShareFixed: row.organizerShareFixed ? Number(row.organizerShareFixed) : null,
                studioShareFixed: row.studioShareFixed ? Number(row.studioShareFixed) : null,
            }));
        } catch {
            return [];
        }
    },
    ['event-options'],
    { revalidate: 60 } // Cache for 60 seconds
);

/**
 * Cached version of getActiveEvent.
 * Revalidates every 60 seconds.
 */
export const getCachedActiveEvent = unstable_cache(
    async () => {
        const ref = new Date();
        try {
            const active = await db.query.events.findFirst({
                where: and(
                    eq(events.isActive, true),
                    lte(events.startDate, ref),
                    gte(events.endDate, ref)
                ),
                orderBy: [desc(events.startDate), desc(events.id)],
            });
            return active || null;
        } catch {
            return null;
        }
    },
    ['active-event'],
    { revalidate: 60 } // Cache for 60 seconds
);

/**
 * Cached version of categories list.
 * Revalidates every 5 minutes since categories rarely change.
 */
export const getCachedCategories = unstable_cache(
    async () => {
        try {
            return await db.query.categories.findMany();
        } catch {
            return [];
        }
    },
    ['categories'],
    { revalidate: 300 } // Cache for 5 minutes
);

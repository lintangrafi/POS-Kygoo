import { NextResponse } from 'next/server';
import { db } from '@/db';
import { verifySession } from '@/lib/auth';
import { getUserScope } from '@/lib/access-control';
import { events } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
    try {
        await verifySession();
        const { userEventId, isStudioAdmin } = await getUserScope();

        const rows = await db.query.events.findMany({
            columns: {
                id: true,
                name: true,
            },
            where: !isStudioAdmin && userEventId ? eq(events.id, userEventId) : undefined,
            orderBy: (events, { asc }) => asc(events.name),
        });

        return NextResponse.json({ success: true, data: rows });
    } catch (err: any) {
        console.error('GET /api/inventory/events:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

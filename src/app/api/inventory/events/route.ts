import { NextResponse } from 'next/server';
import { db } from '@/db';
import { verifySession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await verifySession();
        
        // Fetch all events with basic info
        const events = await db.query.events.findMany({
            columns: {
                id: true,
                name: true,
            },
            orderBy: (events, { asc }) => asc(events.name),
        });

        return NextResponse.json({ success: true, data: events });
    } catch (err: any) {
        console.error('GET /api/inventory/events:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

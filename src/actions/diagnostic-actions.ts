'use server';

import { verifySession } from '@/lib/auth';
import { db } from '@/db';
import { events, orders, openBills } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { getCurrentUserEventId } from '@/lib/event-utils';

export async function getDiagnosticInfo() {
    await verifySession();
    
    const userEventId = await getCurrentUserEventId();
    
    const allEvents = await db.query.events.findMany({
        columns: {
            id: true,
            name: true,
            isActive: true,
            startDate: true,
            endDate: true,
        },
        orderBy: [desc(events.id)],
    });
    
    const allOrders = await db.query.orders.findMany({
        columns: {
            id: true,
            invoiceNumber: true,
            eventId: true,
            totalAmount: true,
            createdAt: true,
            status: true,
        },
        orderBy: [desc(orders.createdAt)],
    });
    
    const allOpenBills = await db.query.openBills.findMany({
        columns: {
            id: true,
            billNumber: true,
            eventId: true,
            totalAmount: true,
            status: true,
            createdAt: true,
        },
        orderBy: [desc(openBills.createdAt)],
    });

    // Count by event
    const ordersByEvent: Record<string, number> = {};
    for (const order of allOrders) {
        const key = order.eventId ? `Event ${order.eventId}` : 'Studio (null)';
        ordersByEvent[key] = (ordersByEvent[key] || 0) + 1;
    }

    const billsByEvent: Record<string, number> = {};
    for (const bill of allOpenBills) {
        const key = bill.eventId ? `Event ${bill.eventId}` : 'Studio (null)';
        billsByEvent[key] = (billsByEvent[key] || 0) + 1;
    }

    return {
        currentUserEventId: userEventId,
        eventsCount: allEvents.length,
        events: allEvents.map(e => ({
            ...e,
            startDate: new Date(e.startDate).toISOString(),
            endDate: new Date(e.endDate).toISOString(),
        })),
        ordersCount: allOrders.length,
        ordersByEvent,
        orders: allOrders.slice(0, 20).map(o => ({
            ...o,
            createdAt: new Date(o.createdAt).toISOString(),
        })),
        openBillsCount: allOpenBills.length,
        billsByEvent,
        openBills: allOpenBills.slice(0, 10).map(b => ({
            ...b,
            createdAt: new Date(b.createdAt).toISOString(),
        })),
    };
}

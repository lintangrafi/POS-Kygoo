'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, gte, lte, lt, desc, ne } from 'drizzle-orm';
import { db } from '@/db';
import { auditLogs, events, expenses, incomes, orders } from '@/db/schema';
import { verifySession } from '@/lib/auth';

type EventInput = {
    name: string;
    startDate: Date;
    endDate: Date;
    notes?: string;
    isActive?: boolean;
};

function startOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

function toDateLabel(date: Date | string) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

async function requireAdmin() {
    const session = await verifySession();
    if (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN') {
        throw new Error('Only admins can access event management');
    }
    return session;
}

async function validateNoOverlap(startDate: Date, endDate: Date, excludeId?: number) {
    const overlapConditions: any[] = [
        eq(events.isActive, true),
        lte(events.startDate, endDate),
        gte(events.endDate, startDate),
    ];

    if (excludeId) {
        overlapConditions.push(ne(events.id, excludeId));
    }

    const overlapping = await db.query.events.findFirst({
        where: and(...overlapConditions),
        columns: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
        },
    });

    if (overlapping) {
        throw new Error(
            `Event overlaps with ${overlapping.name} (${toDateLabel(overlapping.startDate)} to ${toDateLabel(overlapping.endDate)})`
        );
    }
}

export async function getEvents() {
    await requireAdmin();

    return db.query.events.findMany({
        orderBy: [desc(events.startDate), desc(events.id)],
    });
}

export async function getActiveEvent(onDate?: Date) {
    await verifySession();

    const ref = onDate ? new Date(onDate) : new Date();

    const active = await db.query.events.findFirst({
        where: and(
            eq(events.isActive, true),
            lte(events.startDate, ref),
            gte(events.endDate, ref)
        ),
        orderBy: [desc(events.startDate), desc(events.id)],
    });

    return active || null;
}

export async function getEventOptions() {
    await verifySession();

    const rows = await db.query.events.findMany({
        where: eq(events.isActive, true),
        orderBy: [desc(events.startDate), desc(events.id)],
        columns: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
        },
    });

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        startDate: row.startDate,
        endDate: row.endDate,
    }));
}

export async function createEvent(data: EventInput) {
    const session = await requireAdmin();

    if (!data.name.trim()) {
        throw new Error('Event name is required');
    }

    const startDate = startOfDay(data.startDate);
    const endDate = endOfDay(data.endDate);

    if (startDate.getTime() > endDate.getTime()) {
        throw new Error('Event start date must be before end date');
    }

    if (data.isActive !== false) {
        await validateNoOverlap(startDate, endDate);
    }

    const [created] = await db.insert(events).values({
        name: data.name.trim(),
        startDate,
        endDate,
        notes: data.notes?.trim() || null,
        isActive: data.isActive ?? true,
        createdBy: session.userId,
    }).returning();

    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'CREATE',
        entity: 'EVENT',
        entityId: created.id,
        newValue: JSON.stringify(created),
    });

    revalidatePath('/events');
    revalidatePath('/reports');
    revalidatePath('/pos');

    return created;
}

export async function updateEvent(id: number, data: Partial<EventInput>) {
    const session = await requireAdmin();

    const existing = await db.query.events.findFirst({ where: eq(events.id, id) });
    if (!existing) {
        throw new Error('Event not found');
    }

    const nextName = (data.name ?? existing.name).trim();
    const nextStart = startOfDay(data.startDate ?? existing.startDate);
    const nextEnd = endOfDay(data.endDate ?? existing.endDate);
    const nextActive = data.isActive ?? existing.isActive;

    if (!nextName) {
        throw new Error('Event name is required');
    }

    if (nextStart.getTime() > nextEnd.getTime()) {
        throw new Error('Event start date must be before end date');
    }

    if (nextActive) {
        await validateNoOverlap(nextStart, nextEnd, id);
    }

    const [updated] = await db.update(events)
        .set({
            name: nextName,
            startDate: nextStart,
            endDate: nextEnd,
            notes: (data.notes ?? existing.notes)?.toString().trim() || null,
            isActive: nextActive,
            updatedAt: new Date(),
        })
        .where(eq(events.id, id))
        .returning();

    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'UPDATE',
        entity: 'EVENT',
        entityId: id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updated),
    });

    revalidatePath('/events');
    revalidatePath('/reports');
    revalidatePath('/pos');

    return updated;
}

export async function deleteEvent(id: number) {
    const session = await requireAdmin();

    const existing = await db.query.events.findFirst({ where: eq(events.id, id) });
    if (!existing) {
        throw new Error('Event not found');
    }

    await db.delete(events).where(eq(events.id, id));

    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'DELETE',
        entity: 'EVENT',
        entityId: id,
        oldValue: JSON.stringify(existing),
    });

    revalidatePath('/events');
    revalidatePath('/reports');
    revalidatePath('/pos');

    return { success: true };
}

export async function bulkAssignEvent(params: {
    eventId: number;
    from: Date;
    to: Date;
    includeOrders?: boolean;
    includeExpenses?: boolean;
    includeIncomes?: boolean;
}) {
    const session = await requireAdmin();

    const event = await db.query.events.findFirst({ where: eq(events.id, params.eventId) });
    if (!event) {
        throw new Error('Event not found');
    }

    const from = startOfDay(params.from);
    const toExclusive = new Date(endOfDay(params.to).getTime() + 1);

    const includeOrders = params.includeOrders ?? true;
    const includeExpenses = params.includeExpenses ?? true;
    const includeIncomes = params.includeIncomes ?? true;

    let orderCount = 0;
    let expenseCount = 0;
    let incomeCount = 0;

    if (includeOrders) {
        const updated = await db.update(orders)
            .set({ eventId: params.eventId })
            .where(and(gte(orders.createdAt, from), lt(orders.createdAt, toExclusive)))
            .returning({ id: orders.id });
        orderCount = updated.length;
    }

    if (includeExpenses) {
        const updated = await db.update(expenses)
            .set({ eventId: params.eventId })
            .where(and(gte(expenses.date, from), lt(expenses.date, toExclusive)))
            .returning({ id: expenses.id });
        expenseCount = updated.length;
    }

    if (includeIncomes) {
        const updated = await db.update(incomes)
            .set({ eventId: params.eventId })
            .where(and(gte(incomes.date, from), lt(incomes.date, toExclusive)))
            .returning({ id: incomes.id });
        incomeCount = updated.length;
    }

    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'BULK_ASSIGN_EVENT',
        entity: 'EVENT',
        entityId: params.eventId,
        newValue: JSON.stringify({
            from,
            toExclusive,
            includeOrders,
            includeExpenses,
            includeIncomes,
            orderCount,
            expenseCount,
            incomeCount,
        }),
    });

    revalidatePath('/events');
    revalidatePath('/reports');
    revalidatePath('/invoices');

    return { orderCount, expenseCount, incomeCount };
}

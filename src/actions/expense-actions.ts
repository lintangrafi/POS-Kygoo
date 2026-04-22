'use server';

import { db } from '@/db';
import { expenses, auditLogs } from '@/db/schema';
import { and, gte, lt, desc, eq } from 'drizzle-orm';
import { verifySession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { getCurrentUserEventId } from '@/lib/event-utils';
import { requireStudioAdmin } from '@/lib/access-control';

export async function getExpenses({ from, to, eventId }: { from?: Date; to?: Date; eventId?: number }) {
    await requireStudioAdmin();
    
    // Get user's event if assigned, otherwise use passed eventId
    const userEventId = await getCurrentUserEventId();
    const filterEventId = userEventId ?? eventId;

    const conditions: any[] = [];
    if (from) conditions.push(gte(expenses.date, from));
    if (to) conditions.push(lt(expenses.date, to));
    if (filterEventId) conditions.push(eq(expenses.eventId, filterEventId));

    const result = await db.query.expenses.findMany({
        columns: {
            id: true,
            userId: true,
            description: true,
            amount: true,
            category: true,
            paymentMethod: true,
            date: true,
            notes: true,
            createdAt: true,
        },
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
            user: true,
        },
        orderBy: [desc(expenses.date)],
        limit: 100,
    });

    return result;
}

export async function addExpense(data: {
    description: string;
    amount: number;
    category: 'SUPPLIES' | 'UTILITIES' | 'MAINTENANCE' | 'OTHER';
    paymentMethod: 'CASH' | 'QRIS';
    date: Date;
    notes?: string;
    eventId?: number | null;
}) {
    const { session } = await requireStudioAdmin();

    // Auto-assign to user's event if not specified
    let finalEventId = data.eventId;
    if (finalEventId === undefined || finalEventId === null) {
        const userEventId = await getCurrentUserEventId();
        finalEventId = userEventId;
    }

    const [expense] = await db.insert(expenses).values({
        userId: session.userId,
        description: data.description,
        amount: data.amount.toString(),
        category: data.category,
        paymentMethod: data.paymentMethod,
        eventId: finalEventId ?? null,
        date: data.date,
        notes: data.notes || null,
    }).returning();

    // Log the action
    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'CREATE',
        entity: 'EXPENSE',
        entityId: expense.id,
        newValue: JSON.stringify(expense),
    });

    revalidatePath('/reports');
    return expense;
}

export async function updateExpense(id: number, data: {
    description?: string;
    amount?: number;
    category?: 'SUPPLIES' | 'UTILITIES' | 'MAINTENANCE' | 'OTHER';
    paymentMethod?: 'CASH' | 'QRIS';
    date?: Date;
    notes?: string;
    eventId?: number | null;
}) {
    const { session } = await requireStudioAdmin();

    const existing = await db.query.expenses.findFirst({
        where: eq(expenses.id, id),
    });

    if (!existing) {
        throw new Error('Expense not found');
    }

    const updates: any = {};
    if (data.description !== undefined) updates.description = data.description;
    if (data.amount !== undefined) updates.amount = data.amount.toString();
    if (data.category !== undefined) updates.category = data.category;
    if (data.paymentMethod !== undefined) updates.paymentMethod = data.paymentMethod;
    if (data.eventId !== undefined) updates.eventId = data.eventId;
    if (data.date !== undefined) updates.date = data.date;
    if (data.notes !== undefined) updates.notes = data.notes;

    const [updated] = await db.update(expenses)
        .set(updates)
        .where(eq(expenses.id, id))
        .returning();

    // Log the action
    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'UPDATE',
        entity: 'EXPENSE',
        entityId: id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updated),
    });

    revalidatePath('/reports');
    return updated;
}

export async function deleteExpense(id: number) {
    const { session } = await requireStudioAdmin();

    const existing = await db.query.expenses.findFirst({
        where: eq(expenses.id, id),
    });

    if (!existing) {
        throw new Error('Expense not found');
    }

    await db.delete(expenses).where(eq(expenses.id, id));

    // Log the action
    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'DELETE',
        entity: 'EXPENSE',
        entityId: id,
        oldValue: JSON.stringify(existing),
    });

    revalidatePath('/reports');
    return { success: true };
}

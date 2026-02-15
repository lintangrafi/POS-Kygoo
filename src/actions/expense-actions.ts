'use server';

import { db } from '@/db';
import { expenses, auditLogs } from '@/db/schema';
import { and, gte, lt, desc, eq } from 'drizzle-orm';
import { verifySession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getExpenses({ from, to }: { from?: Date; to?: Date }) {
    const session = await verifySession();

    const conditions: any[] = [];
    if (from) conditions.push(gte(expenses.date, from));
    if (to) conditions.push(lt(expenses.date, to));

    const result = await db.query.expenses.findMany({
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
    date: Date;
    notes?: string;
}) {
    const session = await verifySession();

    if (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN') {
        throw new Error('Only admins can add expenses');
    }

    const [expense] = await db.insert(expenses).values({
        userId: session.userId,
        description: data.description,
        amount: data.amount.toString(),
        category: data.category,
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
    date?: Date;
    notes?: string;
}) {
    const session = await verifySession();

    if (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN') {
        throw new Error('Only admins can update expenses');
    }

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
    const session = await verifySession();

    if (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN') {
        throw new Error('Only admins can delete expenses');
    }

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

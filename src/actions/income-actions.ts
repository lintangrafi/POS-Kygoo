'use server';

import { db } from '@/db';
import { incomes, auditLogs } from '@/db/schema';
import { and, gte, lt, desc, eq } from 'drizzle-orm';
import { verifySession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getIncomes({ from, to }: { from?: Date; to?: Date }) {
    const session = await verifySession();

    const conditions: any[] = [];
    if (from) conditions.push(gte(incomes.date, from));
    if (to) conditions.push(lt(incomes.date, to));

    const result = await db.query.incomes.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
            user: true,
        },
        orderBy: [desc(incomes.date)],
        limit: 100,
    });

    return result;
}

export async function addIncome(data: {
    description: string;
    amount: number;
    category: 'SERVICE' | 'REFUND' | 'OTHER';
    paymentMethod: 'CASH' | 'QRIS';
    date: Date;
    notes?: string;
}) {
    const session = await verifySession();

    if (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN') {
        throw new Error('Only admins can add incomes');
    }

    const [income] = await db.insert(incomes).values({
        userId: session.userId,
        description: data.description,
        amount: data.amount.toString(),
        category: data.category,
        paymentMethod: data.paymentMethod,
        date: data.date,
        notes: data.notes || null,
    }).returning();

    // Log the action
    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'CREATE',
        entity: 'INCOME',
        entityId: income.id,
        newValue: JSON.stringify(income),
    });

    revalidatePath('/reports');
    return income;
}

export async function updateIncome(id: number, data: {
    description?: string;
    amount?: number;
    category?: 'SERVICE' | 'REFUND' | 'OTHER';
    paymentMethod?: 'CASH' | 'QRIS';
    date?: Date;
    notes?: string;
}) {
    const session = await verifySession();

    if (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN') {
        throw new Error('Only admins can update incomes');
    }

    const existing = await db.query.incomes.findFirst({
        where: eq(incomes.id, id),
    });

    if (!existing) {
        throw new Error('Income not found');
    }

    const updates: any = {};
    if (data.description !== undefined) updates.description = data.description;
    if (data.amount !== undefined) updates.amount = data.amount.toString();
    if (data.category !== undefined) updates.category = data.category;
    if (data.paymentMethod !== undefined) updates.paymentMethod = data.paymentMethod;
    if (data.date !== undefined) updates.date = data.date;
    if (data.notes !== undefined) updates.notes = data.notes;

    const [updated] = await db.update(incomes)
        .set(updates)
        .where(eq(incomes.id, id))
        .returning();

    // Log the action
    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'UPDATE',
        entity: 'INCOME',
        entityId: id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updated),
    });

    revalidatePath('/reports');
    return updated;
}

export async function deleteIncome(id: number) {
    const session = await verifySession();

    if (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN') {
        throw new Error('Only admins can delete incomes');
    }

    const existing = await db.query.incomes.findFirst({
        where: eq(incomes.id, id),
    });

    if (!existing) {
        throw new Error('Income not found');
    }

    await db.delete(incomes).where(eq(incomes.id, id));

    // Log the action
    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'DELETE',
        entity: 'INCOME',
        entityId: id,
        oldValue: JSON.stringify(existing),
    });

    revalidatePath('/reports');
    return { success: true };
}

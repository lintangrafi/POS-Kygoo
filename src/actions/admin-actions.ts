'use server';

import { db } from '@/db';
import { orders, products, auditLogs, orderItems, payments } from '@/db/schema';
import { desc, sql, eq, and, gte, lt, lte } from 'drizzle-orm';
import { verifySession } from '@/lib/auth';

export async function getDashboardStats() {
    await verifySession();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Total Sales Today
    const todayOrders = await db.query.orders.findMany({
        where: and(
            gte(orders.createdAt, today),
            lt(orders.createdAt, tomorrow),
            eq(orders.status, 'COMPLETED')
        ),
    });

    const totalSalesDid = todayOrders.reduce((acc, order) => acc + Number(order.totalAmount), 0);
    const totaltransactions = todayOrders.length;

    // 2. Low Stock Items
    const lowStockProducts = await db.query.products.findMany({
        where: (products, { lte }) => lte(products.stock, 10),
        limit: 5,
    });

    // 3. Recent Orders (today only)
    const recentOrders = await db.query.orders.findMany({
        where: and(
            gte(orders.createdAt, today),
            lt(orders.createdAt, tomorrow),
            eq(orders.status, 'COMPLETED')
        ),
        orderBy: [desc(orders.createdAt)],
        limit: 5,
        with: {
            user: true,
        }
    });

    return {
        todaySales: totalSalesDid,
        todayCount: totaltransactions,
        lowStock: lowStockProducts,
        recentOrders: recentOrders,
    };
}

export async function getInventory() {
    await verifySession();
    return await db.query.products.findMany({
        orderBy: [desc(products.id)],
        with: {
            category: true,
        }
    });
}

export async function getAuditLogs({ from, to, limit = 50 }: { from?: Date; to?: Date; limit?: number } = {}) {
    // Ideally pagination here
    await verifySession();

    return await db.query.auditLogs.findMany({
        where: (al, { and: andOp, gte: gteOp, lt: ltOp }) => {
            const conds: any[] = [];
            if (from) conds.push(gteOp(al.timestamp, from));
            if (to) conds.push(ltOp(al.timestamp, to));
            if (conds.length === 0) return undefined;
            return andOp(...conds);
        },
        orderBy: [desc(auditLogs.timestamp)],
        limit,
        with: {
            user: true,
        }
    });
}

// --- Invoices / Orders management (admin only)
export async function requireAdmin() {
    const session = await verifySession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
        throw new Error('Not authorized');
    }
    return session;
}

export async function getOrders({ limit = 50, from, to }: { limit?: number; from?: Date; to?: Date } = {}) {
    await requireAdmin();

    return await db.query.orders.findMany({
        where: (ordersTable, { and: andOp, gte: gteOp, lt: ltOp }) => {
            const conds: any[] = [];
            if (from) conds.push(gteOp(ordersTable.createdAt, from));
            if (to) conds.push(ltOp(ordersTable.createdAt, to));
            if (conds.length === 0) return undefined;
            return andOp(...conds);
        },
        orderBy: [desc(orders.createdAt)],
        limit,
        with: {
            user: true,
            items: { with: { product: true } },
            payments: true,
        }
    });
}

export async function getOrderById(id: number) {
    const session = await requireAdmin();
    if (typeof id !== 'number' || Number.isNaN(id)) {
        console.warn('[getOrderById] invalid id', { id });
        return null;
    }

    console.log('[getOrderById] called by', { userId: session.userId, role: session.role }, 'for id', id);

    const order = await db.query.orders.findFirst({
        where: eq(orders.id, id),
        with: {
            user: true,
            items: { with: { product: true } },
            payments: true,
        }
    });

    if (!order) console.log('[getOrderById] order not found for id', id);
    return order;
}

export async function voidOrder(id: number) {
    const session = await requireAdmin();

    // mark order as VOID
    const existing = await db.query.orders.findFirst({ where: eq(orders.id, id) });
    if (!existing) throw new Error('Order not found');

    await db.update(orders).set({ status: 'VOID' }).where(eq(orders.id, id));

    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'UPDATE',
        entity: 'ORDER',
        entityId: id,
        oldValue: JSON.stringify({ status: existing.status, total: existing.totalAmount }),
        newValue: JSON.stringify({ status: 'VOID' }),
    });

    return { success: true };
}

export async function deleteOrder(id: number) {
    const session = await requireAdmin();

    const existing = await db.query.orders.findFirst({ where: eq(orders.id, id) });
    if (!existing) throw new Error('Order not found');

    // delete payments and order items then order
    await db.delete(payments).where(eq(payments.orderId, id));
    await db.delete(orderItems).where(eq(orderItems.orderId, id));
    await db.delete(orders).where(eq(orders.id, id));

    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'DELETE',
        entity: 'ORDER',
        entityId: id,
        oldValue: JSON.stringify({ invoice: existing.invoiceNumber, total: existing.totalAmount }),
        newValue: null,
    });

    return { success: true };
}

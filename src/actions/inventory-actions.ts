'use server';

import { db } from '@/db';
import { products, stockAdjustments, auditLogs, orderItems } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireAdmin } from './admin-actions';
import { verifySession } from '@/lib/auth';

export async function getStockAdjustmentsPublic({ productId, limit = 20, page = 1, from, to }: { productId?: number; limit?: number; page?: number; from?: Date; to?: Date } = {}) {
    // Allow any authenticated user (cashier or admin) to view recent adjustments
    await verifySession();

    const whereFn = (sa: any, { and: andOp, eq: eqOp, gte: gteOp, lt: ltOp }: any) => {
        const conds: any[] = [];
        if (productId) conds.push(eqOp(sa.productId, productId));
        if (from) conds.push(gteOp(sa.createdAt, from));
        if (to) conds.push(ltOp(sa.createdAt, to));
        if (conds.length === 0) return undefined;
        return andOp(...conds);
    };

    // total count (simple approach)
    const all = await db.query.stockAdjustments.findMany({ where: whereFn });
    const total = all.length;

    const offset = (Math.max(1, page) - 1) * limit;
    const data = await db.query.stockAdjustments.findMany({
        where: whereFn,
        limit,
        offset,
        orderBy: [desc(stockAdjustments.createdAt)],
        with: { user: true, product: true }
    });

    return { data, total };
}

export async function addProduct(payload: { categoryId: number; sku?: string; name: string; price: string | number; costPrice?: string | number; stock?: number; isMenuItem?: boolean }) {
    const session = await requireAdmin();

    const [p] = await db.insert(products).values({
        categoryId: payload.categoryId,
        sku: payload.sku,
        name: payload.name,
        price: payload.price.toString(),
        costPrice: (payload.costPrice || 0).toString(),
        stock: payload.stock || 0,
        isMenuItem: typeof payload.isMenuItem === 'boolean' ? payload.isMenuItem : true,
    }).returning();

    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'CREATE',
        entity: 'PRODUCT',
        entityId: p.id,
        oldValue: null,
        newValue: JSON.stringify(p),
    });

    return p;
}

export async function updateProduct(id: number, payload: { name?: string; price?: string | number; costPrice?: string | number; sku?: string; categoryId?: number; isMenuItem?: boolean }) {
    const session = await requireAdmin();

    const existing = await db.query.products.findFirst({ where: (p, { eq }) => eq(p.id, id) });
    if (!existing) throw new Error('Product not found');

    const oldVal = existing;

    await db.update(products).set({
        name: payload.name ?? existing.name,
        price: payload.price !== undefined ? payload.price.toString() : existing.price,
        costPrice: payload.costPrice !== undefined ? payload.costPrice.toString() : existing.costPrice,
        sku: payload.sku ?? existing.sku,
        categoryId: payload.categoryId ?? existing.categoryId,
        isMenuItem: payload.isMenuItem ?? existing.isMenuItem,
    }).where(eq(products.id, id));

    const updated = await db.query.products.findFirst({ where: (p, { eq }) => eq(p.id, id) });

    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'UPDATE',
        entity: 'PRODUCT',
        entityId: id,
        oldValue: JSON.stringify(oldVal),
        newValue: JSON.stringify(updated),
    });

    return updated;
}

export async function adjustStock({ productId, change, type, reason, reference }: { productId: number; change: number; type: 'IN' | 'OUT' | 'ADJUSTMENT'; reason?: string; reference?: string }) {
    // Allow authenticated users (cashier or admin) to adjust stock
    const session = await verifySession();

    if (!Number.isInteger(change) || change <= 0) throw new Error('Change must be positive integer');
    const delta = type === 'OUT' ? -Math.abs(change) : Math.abs(change);

    const existing = await db.query.products.findFirst({ where: (p, { eq }) => eq(p.id, productId) });
    if (!existing) throw new Error('Product not found');

    const newStock = existing.stock + delta;

    await db.update(products).set({ stock: newStock }).where(eq(products.id, productId));

    const [adj] = await db.insert(stockAdjustments).values({
        productId,
        userId: session.userId,
        change: delta,
        type,
        reason: reason || null,
        reference: reference || null,
    }).returning();

    // fetch full adjustment with relations for returning to client
    const fullAdj = await db.query.stockAdjustments.findFirst({ where: (sa, { eq }) => eq(sa.id, adj.id), with: { user: true, product: true } });

    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'ADJUST_STOCK',
        entity: 'PRODUCT',
        entityId: productId,
        oldValue: JSON.stringify({ stock: existing.stock }),
        newValue: JSON.stringify({
            stockBefore: existing.stock,
            stockAfter: newStock,
            adjustmentId: adj.id,
            change: delta,
            type,
            reason: reason || null,
            reference: reference || null,
            performedByRole: session.role || null,
        }),
    });

    return { success: true, adjustment: fullAdj };
}

export async function getStockAdjustments({ productId, limit = 100, from, to }: { productId?: number; limit?: number; from?: Date; to?: Date } = {}) {
    await requireAdmin();

    return await db.query.stockAdjustments.findMany({
        where: (sa, { and: andOp, eq: eqOp, gte: gteOp, lt: ltOp }) => {
            const conds: any[] = [];
            if (productId) conds.push(eqOp(sa.productId, productId));
            if (from) conds.push(gteOp(sa.createdAt, from));
            if (to) conds.push(ltOp(sa.createdAt, to));
            if (conds.length === 0) return undefined;
            return andOp(...conds);
        },
        limit,
        with: { user: true, product: true }
    });
}

export async function getMenuItems() {
    await requireAdmin();
    try {
        return await db.query.products.findMany({
            where: (p, { eq }) => eq(p.isMenuItem, true),
            with: {
                category: true,
            }
        });
    } catch (err: any) {
        const msg = String(err?.message || '').toLowerCase();
        if (msg.includes('is_archived') || msg.includes('does not exist')) {
            throw new Error('Database missing column "is_archived". Run DB migrations (e.g., `drizzle migrate`) and restart the dev server.');
        }
        throw err;
    }
}

export async function getProducts({ isMenuItem, includeArchived = false }: { isMenuItem?: boolean; includeArchived?: boolean } = {}) {
    await requireAdmin();
    return await db.query.products.findMany({
        where: (p, { and: andOp, eq: eqOp }) => {
            const conds: any[] = [];
            if (typeof isMenuItem === 'boolean') conds.push(eqOp(p.isMenuItem, isMenuItem));
            if (!includeArchived) conds.push(eqOp(p.isArchived, false));
            if (conds.length === 0) return undefined;
            return andOp(...conds);
        }
    });
}

// Public version for authenticated users (cashiers/admins) to list products
export async function getProductsPublic({ isMenuItem, includeArchived = false }: { isMenuItem?: boolean; includeArchived?: boolean } = {}) {
    await verifySession();
    return await db.query.products.findMany({
        where: (p, { and: andOp, eq: eqOp }) => {
            const conds: any[] = [];
            if (typeof isMenuItem === 'boolean') conds.push(eqOp(p.isMenuItem, isMenuItem));
            if (!includeArchived) conds.push(eqOp(p.isArchived, false));
            if (conds.length === 0) return undefined;
            return andOp(...conds);
        }
    });
}

export async function getCategories() {
    await requireAdmin();
    return await db.query.categories.findMany();
}

// Functions to add/remove menu items
export async function toggleMenuItem(productId: number, isMenuItem: boolean) {
    const session = await requireAdmin();

    const existing = await db.query.products.findFirst({ where: (p, { eq }) => eq(p.id, productId) });
    if (!existing) throw new Error('Product not found');

    const [updated] = await db.update(products)
        .set({ isMenuItem })
        .where(eq(products.id, productId))
        .returning();

    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'UPDATE',
        entity: 'PRODUCT',
        entityId: productId,
        oldValue: JSON.stringify({ isMenuItem: existing.isMenuItem }),
        newValue: JSON.stringify({ isMenuItem: updated.isMenuItem }),
    });

    return updated;
}

// Functions for stock adjustments
export async function addStockAdjustment({ productId, change, type, reason, reference }: {
    productId: number;
    change: number;
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    reason?: string;
    reference?: string
}) {
    // Allow authenticated users to add adjustments (e.g. cashier)
    const session = await verifySession();

    if (!Number.isInteger(change) || change <= 0) throw new Error('Change must be positive integer');
    const delta = type === 'OUT' ? -Math.abs(change) : Math.abs(change);

    const existing = await db.query.products.findFirst({ where: (p, { eq }) => eq(p.id, productId) });
    if (!existing) throw new Error('Product not found');

    const newStock = existing.stock + delta;

    await db.update(products).set({ stock: newStock }).where(eq(products.id, productId));

    const [adj] = await db.insert(stockAdjustments).values({
        productId,
        userId: session.userId,
        change: delta,
        type,
        reason: reason || null,
        reference: reference || null,
    }).returning();

    const fullAdj = await db.query.stockAdjustments.findFirst({ where: (sa, { eq }) => eq(sa.id, adj.id), with: { user: true, product: true } });

    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'ADJUST_STOCK',
        entity: 'PRODUCT',
        entityId: productId,
        oldValue: JSON.stringify({ stock: existing.stock }),
        newValue: JSON.stringify({
            stockBefore: existing.stock,
            stockAfter: newStock,
            adjustmentId: adj.id,
            change: delta,
            type,
            reason: reason || null,
            reference: reference || null,
            performedByRole: session.role || null,
        }),
    });

    return { success: true, adjustment: fullAdj };
}

// Archive / unarchive a product (soft-delete)
export async function archiveProduct(productId: number) {
    const session = await requireAdmin();
    const existing = await db.query.products.findFirst({ where: (p, { eq }) => eq(p.id, productId) });
    if (!existing) throw new Error('Product not found');

    const [updated] = await db.update(products).set({ isArchived: true }).where(eq(products.id, productId)).returning();

    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'ARCHIVE',
        entity: 'PRODUCT',
        entityId: productId,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updated),
    });

    return updated;
}

export async function unarchiveProduct(productId: number) {
    const session = await requireAdmin();
    const existing = await db.query.products.findFirst({ where: (p, { eq }) => eq(p.id, productId) });
    if (!existing) throw new Error('Product not found');

    const [updated] = await db.update(products).set({ isArchived: false }).where(eq(products.id, productId)).returning();

    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'UNARCHIVE',
        entity: 'PRODUCT',
        entityId: productId,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updated),
    });

    return updated;
}

// Function to delete a product
export async function deleteProduct(productId: number) {
    const session = await requireAdmin();

    const existing = await db.query.products.findFirst({ where: (p, { eq }) => eq(p.id, productId) });
    if (!existing) throw new Error('Product not found');

    // Prevent deletion if product is referenced in orders or adjustments
    const linkedOrderItem = await db.query.orderItems.findFirst({ where: (oi, { eq }) => eq(oi.productId, productId) });
    if (linkedOrderItem) {
        throw new Error('Product cannot be deleted because it is referenced by existing orders. Consider archiving or disabling the product instead.');
    }

    const linkedAdjustment = await db.query.stockAdjustments.findFirst({ where: (sa, { eq }) => eq(sa.productId, productId) });
    if (linkedAdjustment) {
        throw new Error('Product cannot be deleted because it has stock adjustment history. Consider archiving or disabling the product instead.');
    }

    await db.delete(products).where(eq(products.id, productId));

    await db.insert(auditLogs).values({
        userId: session.userId,
        action: 'DELETE',
        entity: 'PRODUCT',
        entityId: productId,
        oldValue: JSON.stringify(existing),
        newValue: null,
    });

    return { success: true };
}

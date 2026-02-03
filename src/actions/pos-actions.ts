'use server';

import { db } from '@/db';
import { categories, products, orders, orderItems, payments, auditLogs } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { verifySession } from '@/lib/auth';
import { getOpenShift } from './shift-actions';

export async function getPosData() {
    const allCategories = await db.query.categories.findMany();
    const allProducts = await db.query.products.findMany({
        where: (products, { gt }) => gt(products.stock, -1000), // Show all for now, maybe filter stock later
    });

    // Deduplicate categories by normalized name (case-insensitive, trimmed)
    const map = new Map<string, typeof allCategories[number]>();
    for (const c of allCategories) {
        const key = (c.name || '').toString().trim().toLowerCase();
        if (!map.has(key)) map.set(key, c);
    }

    const uniqueCategories = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));

    return {
        categories: uniqueCategories,
        products: allProducts,
    };
}

export async function processTransaction(data: {
    items: { productId: number; quantity: number; price: number }[];
    paymentMethods: { method: 'CASH' | 'QRIS' | 'TRANSFER'; amount: number }[];
    totalAmount: number;
}) {
    const session = await verifySession();
    const openShift = await getOpenShift();

    if (!openShift) {
        return { error: 'No open shift found.' };
    }

    try {
        // 1. Create Order
        const invoiceNumber = `INV-${Date.now()}`;
        const [newOrder] = await db.insert(orders).values({
            invoiceNumber,
            userId: session.userId,
            totalAmount: data.totalAmount.toString(),
            status: 'COMPLETED',
        }).returning();

        // 2. Create Order Items & Update Stock
        for (const item of data.items) {
            // Get current cost price (snapshot)
            const product = await db.query.products.findFirst({
                where: eq(products.id, item.productId),
            });

            if (!product) continue;

            await db.insert(orderItems).values({
                orderId: newOrder.id,
                productId: item.productId,
                quantity: item.quantity,
                priceAtSale: item.price.toString(),
                costAtSale: product.costPrice,
            });

            // Update Stock
            await db.update(products)
                .set({ stock: product.stock - item.quantity })
                .where(eq(products.id, item.productId));
        }

        // 3. Record Payments
        for (const payment of data.paymentMethods) {
            await db.insert(payments).values({
                orderId: newOrder.id,
                method: payment.method,
                amount: payment.amount.toString(),
            });

            // If CASH, update shift total
            if (payment.method === 'CASH') {
                // Note: Ideally we update the shift live or just calculate at close. 
                // For now let's just log it or update a running total if we had one.
                // The 'totalCashReceived' in shifts table is cleaner to update at close based on actual count,
                // or we can keep a running 'system_calculated_cash' there.
                // For simplicity, we'll calculate totals when viewing reports/closing.
            }
        }

        // 4. Audit Log
        await db.insert(auditLogs).values({
            userId: session.userId,
            action: 'CREATE',
            entity: 'ORDER',
            entityId: newOrder.id,
            newValue: JSON.stringify({ invoice: invoiceNumber, total: data.totalAmount }),
        });

        return { success: true, orderId: newOrder.id, invoiceAndDate: `${invoiceNumber} - ${new Date().toLocaleString()}` };

    } catch (error) {
        console.error('Transaction Error:', error);
        return { error: 'Transaction failed.' };
    }
}

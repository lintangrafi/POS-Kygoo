'use server';

import { db } from '@/db';
import { orders, orderItems, payments, products, shifts } from '@/db/schema';
import { and, gte, lt, eq, desc } from 'drizzle-orm';
import { verifySession } from '@/lib/auth';

export async function getFinancialReport({ from, to }: { from: Date; to: Date }) {
    await verifySession();

    const ordersInRange = await db.query.orders.findMany({
        where: and(
            gte(orders.createdAt, from),
            lt(orders.createdAt, to),
            eq(orders.status, 'COMPLETED')
        ),
        with: {
            items: true,
            payments: true,
        },
        orderBy: [desc(orders.createdAt)],
    });

    const turnover = ordersInRange.reduce((acc, o) => acc + Number(o.totalAmount), 0);
    const totalOrders = ordersInRange.length;

    // COGS from order items snapshot
    let cogs = 0;
    for (const o of ordersInRange) {
        for (const it of o.items || []) {
            cogs += Number(it.costAtSale) * Number(it.quantity);
        }
    }

    // Payment breakdown
    const paymentsBreakdown: Record<string, number> = {};
    for (const o of ordersInRange) {
        for (const p of o.payments || []) {
            const m = p.method;
            paymentsBreakdown[m] = (paymentsBreakdown[m] || 0) + Number(p.amount);
        }
    }

    // Daily revenue (simple grouping by date)
    const dailyRevenue: Record<string, number> = {};
    for (const o of ordersInRange) {
        const d = new Date(o.createdAt).toISOString().slice(0, 10);
        dailyRevenue[d] = (dailyRevenue[d] || 0) + Number(o.totalAmount);
    }

    // Include shift totals (reported cash) that ended in the range
    const shiftsInRange = await db.query.shifts.findMany({
        where: (s, { and: andOp, gte: gteOp, lt: ltOp, eq: eqOp }) => {
            const conds: any[] = [];
            if (from) conds.push(gteOp(s.endTime, from));
            if (to) conds.push(ltOp(s.endTime, to));
            if (conds.length === 0) return undefined;
            conds.push(eqOp(s.status, 'CLOSED'));
            return andOp(...conds);
        },
    });

    const totalCashInDrawer = shiftsInRange.reduce((acc, s) => acc + Number(s.totalCashReceived || 0), 0);

    return {
        turnover,
        totalOrders,
        cogs,
        grossProfit: turnover - cogs,
        paymentsBreakdown,
        dailyRevenue,
        orders: ordersInRange,
        shifts: shiftsInRange,
        totalCashInDrawer,
    };
}

export async function getTopProducts({ from, to, limit = 10 }: { from: Date; to: Date; limit?: number }) {
    await verifySession();

    // Get order ids in range
    const ordersInRange = await db.query.orders.findMany({
        where: and(gte(orders.createdAt, from), lt(orders.createdAt, to), eq(orders.status, 'COMPLETED')),
    });
    const orderIds = ordersInRange.map(o => o.id);

    if (orderIds.length === 0) return [];

    // Simplify query to avoid lateral join issues
    const items = await db.query.orderItems.findMany({
        where: (orderItems, { inArray }) => inArray(orderItems.orderId, orderIds),
    });

    // Fetch products separately
    const productIds = [...new Set(items.map(item => item.productId))];
    const products = productIds.length > 0 
        ? await db.query.products.findMany({
            where: (products, { inArray }) => inArray(products.id, productIds),
        })
        : [];
    
    const productMap = products.reduce((acc, product) => {
        acc[product.id] = product;
        return acc;
    }, {} as Record<number, any>);

const agg: Record<number, { productName: string; qty: number; revenue: number }> = {};
    for (const it of items) {
        const pid = it.productId;
        const product = productMap[pid];
        const name = product?.name || 'Unknown';
        agg[pid] = agg[pid] || { productName: name, qty: 0, revenue: 0 };
        agg[pid].qty += Number(it.quantity);
        agg[pid].revenue += Number(it.priceAtSale) * Number(it.quantity);
    }

    const list = Object.entries(agg).map(([productId, v]) => ({ productId: Number(productId), ...v }));
    list.sort((a, b) => b.qty - a.qty);

    return list.slice(0, limit);
}

export async function getAggregatedRevenue({ from, to, period = 'daily' }: { from: Date; to: Date; period?: 'daily' | 'weekly' | 'monthly' | 'yearly' }) {
    await verifySession();

    const ordersInRange = await db.query.orders.findMany({
        where: and(gte(orders.createdAt, from), lt(orders.createdAt, to), eq(orders.status, 'COMPLETED')),
    });

    const map: Record<string, number> = {};

    const getWeekStart = (d: Date) => {
        // ISO-like week start on Monday
        const dt = new Date(d);
        const day = dt.getDay();
        const diff = (day + 6) % 7; // number of days since Monday
        dt.setDate(dt.getDate() - diff);
        dt.setHours(0,0,0,0);
        return dt;
    };

    const keyFn = (d: Date) => {
        const iso = d.toISOString();
        if (period === 'daily') return iso.slice(0, 10);
        if (period === 'monthly') return iso.slice(0, 7);
        if (period === 'yearly') return iso.slice(0, 4);
        // weekly
        const ws = getWeekStart(d);
        return ws.toISOString().slice(0, 10);
    };

    for (const o of ordersInRange) {
        const k = keyFn(new Date(o.createdAt));
        map[k] = (map[k] || 0) + Number(o.totalAmount);
    }

    const items = Object.entries(map).map(([periodLabel, amount]) => ({ period: periodLabel, amount }));
    items.sort((a, b) => a.period.localeCompare(b.period));

    return items;
}

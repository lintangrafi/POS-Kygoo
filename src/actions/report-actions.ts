'use server';

import { db } from '@/db';
import { orders, orderItems, payments, products, shifts, expenses } from '@/db/schema';
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

    // Get expenses in the range
    const expensesInRange = await db.query.expenses.findMany({
        where: and(
            gte(expenses.date, from),
            lt(expenses.date, to)
        ),
        with: {
            user: true,
        },
        orderBy: [desc(expenses.date)],
    });

    const totalExpenses = expensesInRange.reduce((acc, e) => acc + Number(e.amount), 0);

    return {
        turnover,
        totalOrders,
        cogs,
        grossProfit: turnover - cogs,
        netProfit: turnover - cogs - totalExpenses, // Net profit after expenses
        paymentsBreakdown,
        dailyRevenue,
        orders: ordersInRange,
        shifts: shiftsInRange,
        totalCashInDrawer,
        expenses: expensesInRange,
        totalExpenses,
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
        with: {
            payments: true,
        },
    });

    const map: Record<string, { amount: number; paymentsBreakdown: Record<string, number>; ordersCount: number }> = {};

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
        const dt = new Date(d);
        // Use local date format to fix timezone issue
        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        
        if (period === 'daily') return `${year}-${month}-${day}`;
        if (period === 'monthly') return `${year}-${month}`;
        if (period === 'yearly') return `${year}`;
        // weekly
        const ws = getWeekStart(dt);
        const wYear = ws.getFullYear();
        const wMonth = String(ws.getMonth() + 1).padStart(2, '0');
        const wDay = String(ws.getDate()).padStart(2, '0');
        return `${wYear}-${wMonth}-${wDay}`;
    };

    for (const o of ordersInRange) {
        const k = keyFn(new Date(o.createdAt));
        if (!map[k]) {
            map[k] = { amount: 0, paymentsBreakdown: {}, ordersCount: 0 };
        }
        map[k].amount += Number(o.totalAmount);
        map[k].ordersCount += 1;
        
        // Aggregate payments
        for (const p of o.payments || []) {
            const method = p.method;
            map[k].paymentsBreakdown[method] = (map[k].paymentsBreakdown[method] || 0) + Number(p.amount);
        }
    }

    // Get shifts that ended in range
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

    // Map shifts to periods
    const shiftMap: Record<string, number> = {};
    for (const shift of shiftsInRange) {
        if (shift.endTime) {
            const k = keyFn(new Date(shift.endTime));
            shiftMap[k] = (shiftMap[k] || 0) + Number(shift.totalCashReceived || 0);
        }
    }

    // Get expenses in range
    const expensesInRange = await db.query.expenses.findMany({
        where: and(gte(expenses.date, from), lt(expenses.date, to)),
    });

    // Map expenses to periods
    const expenseMap: Record<string, number> = {};
    for (const expense of expensesInRange) {
        const k = keyFn(new Date(expense.date));
        expenseMap[k] = (expenseMap[k] || 0) + Number(expense.amount);
    }

    const items = Object.entries(map).map(([periodLabel, data]) => ({ 
        period: periodLabel, 
        amount: data.amount,
        paymentsBreakdown: data.paymentsBreakdown,
        ordersCount: data.ordersCount,
        cashInDrawer: shiftMap[periodLabel] || 0,
        expenses: expenseMap[periodLabel] || 0,
    }));
    items.sort((a, b) => a.period.localeCompare(b.period));

    return items;
}

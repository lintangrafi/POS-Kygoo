'use server';

import { db } from '@/db';
import { orders, orderItems, payments, products, shifts, expenses, incomes, events } from '@/db/schema';
import { and, gte, lt, eq, desc } from 'drizzle-orm';
import { verifySession } from '@/lib/auth';
import { getCurrentUserEventId } from '@/lib/event-utils';
import { calculateRevenueShare } from '@/lib/revenue-utils';

const ORDER_BASE_COLUMNS = {
    id: true,
    invoiceNumber: true,
    userId: true,
    subtotalAmount: true,
    discountAmount: true,
    discountPercent: true,
    totalAmount: true,
    status: true,
    createdAt: true,
} as const;

const EXPENSE_BASE_COLUMNS = {
    id: true,
    userId: true,
    description: true,
    amount: true,
    category: true,
    paymentMethod: true,
    date: true,
    notes: true,
    createdAt: true,
} as const;

const INCOME_BASE_COLUMNS = {
    id: true,
    userId: true,
    description: true,
    amount: true,
    category: true,
    paymentMethod: true,
    date: true,
    notes: true,
    createdAt: true,
} as const;

function formatLocalDateKey(input: Date | string | number): string {
    const d = new Date(input);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export async function getFinancialReport({ from, to, eventId }: { from: Date; to: Date; eventId?: number }) {
    const session = await verifySession();

    // Get user's event if assigned, otherwise use passed eventId
    const userEventId = await getCurrentUserEventId();
    const canOverrideEvent = session.role === 'ADMIN' || session.role === 'SUPERADMIN';
    const filterEventId = canOverrideEvent ? (eventId ?? null) : (userEventId ?? eventId ?? null);

    // Fetch event details for revenue sharing
    let eventData: any = null;
    if (filterEventId) {
        eventData = await db.query.events.findFirst({
            where: eq(events.id, filterEventId),
        });
    }

    const ordersInRange = await db.query.orders.findMany({
        columns: ORDER_BASE_COLUMNS,
        where: and(
            gte(orders.createdAt, from),
            lt(orders.createdAt, to),
            eq(orders.status, 'COMPLETED'),
            ...(filterEventId ? [eq(orders.eventId, filterEventId)] : [])
        ),
        with: {
            items: true,
            payments: true,
        },
        orderBy: [desc(orders.createdAt)],
    });

    const turnover = ordersInRange.reduce((acc, o) => {
        const paid = (o.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        return acc + paid;
    }, 0);
    const totalOrders = ordersInRange.length;

    // COGS from order items snapshot
    let cogs = 0;
    for (const o of ordersInRange) {
        for (const it of o.items || []) {
            cogs += Number(it.costAtSale) * Number(it.quantity);
        }
    }

    // Payment breakdown
    const paymentsBreakdown: Record<string, number> = {
        CASH: 0,
        QRIS: 0,
        TRANSFER: 0,
    };
    for (const o of ordersInRange) {
        for (const p of o.payments || []) {
            const m = p.method;
            paymentsBreakdown[m] = (paymentsBreakdown[m] || 0) + Number(p.amount);
        }
    }

    // Daily revenue (simple grouping by date)
    const dailyRevenue: Record<string, number> = {};
    for (const o of ordersInRange) {
        const d = formatLocalDateKey(o.createdAt);
        const paid = (o.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        dailyRevenue[d] = (dailyRevenue[d] || 0) + paid;
    }

    // Include shift totals (reported cash) that ended in the range
    const shiftsInRange = filterEventId
        ? []
        : await db.query.shifts.findMany({
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
        columns: EXPENSE_BASE_COLUMNS,
        where: and(
            gte(expenses.date, from),
            lt(expenses.date, to),
            ...(filterEventId ? [eq(expenses.eventId, filterEventId)] : [])
        ),
        with: {
            user: true,
        },
        orderBy: [desc(expenses.date)],
    });

    const totalExpenses = expensesInRange.reduce((acc, e) => acc + Number(e.amount), 0);
    const expensesByMethod: Record<string, number> = {};
    for (const e of expensesInRange) {
        expensesByMethod[e.paymentMethod] = (expensesByMethod[e.paymentMethod] || 0) + Number(e.amount);
    }

    // Get incomes in the range
    const incomesInRange = await db.query.incomes.findMany({
        columns: INCOME_BASE_COLUMNS,
        where: and(
            gte(incomes.date, from),
            lt(incomes.date, to),
            ...(filterEventId ? [eq(incomes.eventId, filterEventId)] : [])
        ),
        with: {
            user: true,
        },
        orderBy: [desc(incomes.date)],
    });

    const totalIncomes = incomesInRange.reduce((acc, i) => acc + Number(i.amount), 0);
    const incomesByMethod: Record<string, number> = {};
    for (const i of incomesInRange) {
        incomesByMethod[i.paymentMethod] = (incomesByMethod[i.paymentMethod] || 0) + Number(i.amount);
    }

    // Calculate revenue sharing if event has configuration
    const revenueShare = eventData ? calculateRevenueShare(turnover, {
        revenueShareType: eventData.revenueShareType,
        organizerSharePercent: eventData.organizerSharePercent,
        studioSharePercent: eventData.studioSharePercent,
        organizerShareFixed: eventData.organizerShareFixed,
        studioShareFixed: eventData.studioShareFixed,
    }) : null;

    return {
        turnover,
        totalOrders,
        cogs,
        grossProfit: turnover - cogs,
        totalExpenses,
        totalIncomes,
        // Net profit = Gross profit (turnover - cogs) - expenses + incomes
        netProfit: turnover - cogs - totalExpenses + totalIncomes,
        paymentsBreakdown,
        dailyRevenue,
        orders: ordersInRange,
        shifts: shiftsInRange,
        totalCashInDrawer,
        expenses: expensesInRange,
        expensesByMethod,
        incomes: incomesInRange,
        incomesByMethod,
        revenueShare,
        event: eventData,
    };
}

export async function getTopProducts({ from, to, limit = 10, eventId }: { from: Date; to: Date; limit?: number; eventId?: number }) {
    const session = await verifySession();

    // Get user's event if assigned, otherwise use passed eventId
    const userEventId = await getCurrentUserEventId();
    const canOverrideEvent = session.role === 'ADMIN' || session.role === 'SUPERADMIN';
    const filterEventId = canOverrideEvent ? (eventId ?? null) : (userEventId ?? eventId ?? null);

    // Get order ids in range
    const ordersInRange = await db.query.orders.findMany({
        columns: ORDER_BASE_COLUMNS,
        where: and(
            gte(orders.createdAt, from),
            lt(orders.createdAt, to),
            eq(orders.status, 'COMPLETED'),
            ...(filterEventId ? [eq(orders.eventId, filterEventId)] : [])
        ),
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

export async function getAggregatedRevenue({ from, to, period = 'daily', eventId }: { from: Date; to: Date; period?: 'daily' | 'weekly' | 'monthly' | 'yearly'; eventId?: number }) {
    const session = await verifySession();

    // Get user's event if assigned, otherwise use passed eventId
    const userEventId = await getCurrentUserEventId();
    const canOverrideEvent = session.role === 'ADMIN' || session.role === 'SUPERADMIN';
    const filterEventId = canOverrideEvent ? (eventId ?? null) : (userEventId ?? eventId ?? null);

    const ordersInRange = await db.query.orders.findMany({
        columns: ORDER_BASE_COLUMNS,
        where: and(
            gte(orders.createdAt, from),
            lt(orders.createdAt, to),
            eq(orders.status, 'COMPLETED'),
            ...(filterEventId ? [eq(orders.eventId, filterEventId)] : [])
        ),
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
        const paid = (o.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        map[k].amount += paid;
        map[k].ordersCount += 1;
        
        // Aggregate payments
        for (const p of o.payments || []) {
            const method = p.method;
            map[k].paymentsBreakdown[method] = (map[k].paymentsBreakdown[method] || 0) + Number(p.amount);
        }
    }

    // Get shifts that ended in range
    const shiftsInRange = filterEventId
        ? []
        : await db.query.shifts.findMany({
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
        columns: EXPENSE_BASE_COLUMNS,
        where: and(
            gte(expenses.date, from),
            lt(expenses.date, to),
            ...(filterEventId ? [eq(expenses.eventId, filterEventId)] : [])
        ),
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

// Get detailed daily cash flow breakdown with income/expense by payment method
export async function getDailyCashflow({ from, to, eventId }: { from: Date; to: Date; eventId?: number }) {
    const session = await verifySession();

    // Get user's event if assigned, otherwise use passed eventId
    const userEventId = await getCurrentUserEventId();
    const canOverrideEvent = session.role === 'ADMIN' || session.role === 'SUPERADMIN';
    const filterEventId = canOverrideEvent ? (eventId ?? null) : (userEventId ?? eventId ?? null);

    const ordersInRange = await db.query.orders.findMany({
        columns: ORDER_BASE_COLUMNS,
        where: and(
            gte(orders.createdAt, from),
            lt(orders.createdAt, to),
            eq(orders.status, 'COMPLETED'),
            ...(filterEventId ? [eq(orders.eventId, filterEventId)] : [])
        ),
        with: {
            items: true,
            payments: true,
        },
    });

    const expensesInRange = await db.query.expenses.findMany({
        columns: EXPENSE_BASE_COLUMNS,
        where: and(
            gte(expenses.date, from),
            lt(expenses.date, to),
            ...(filterEventId ? [eq(expenses.eventId, filterEventId)] : [])
        ),
    });

    const incomesInRange = await db.query.incomes.findMany({
        columns: INCOME_BASE_COLUMNS,
        where: and(
            gte(incomes.date, from),
            lt(incomes.date, to),
            ...(filterEventId ? [eq(incomes.eventId, filterEventId)] : [])
        ),
    });

    // Group by date
    const dailyCashflow: Record<string, {
        date: string;
        ordersTotal: number;
        cashIncome: number;
        qrisIncome: number;
        transferIncome: number;
        cashExpenses: number;
        qrisExpenses: number;
        transferExpenses: number;
        cashAdditional: number;
        qrisAdditional: number;
        transferAdditional: number;
        netCash: number;
        netQris: number;
        netTransfer: number;
        netDailyIncome: number;
    }> = {};

    // Process orders (from payment breakdown)
    for (const order of ordersInRange) {
        const dateStr = formatLocalDateKey(order.createdAt);
        if (!dailyCashflow[dateStr]) {
            dailyCashflow[dateStr] = {
                date: dateStr,
                ordersTotal: 0,
                cashIncome: 0,
                qrisIncome: 0,
                transferIncome: 0,
                cashExpenses: 0,
                qrisExpenses: 0,
                transferExpenses: 0,
                cashAdditional: 0,
                qrisAdditional: 0,
                transferAdditional: 0,
                netCash: 0,
                netQris: 0,
                netTransfer: 0,
                netDailyIncome: 0,
            };
        }
        dailyCashflow[dateStr].ordersTotal += Number(order.totalAmount);

        for (const payment of order.payments || []) {
            if (payment.method === 'CASH') {
                dailyCashflow[dateStr].cashIncome += Number(payment.amount);
            } else if (payment.method === 'QRIS') {
                dailyCashflow[dateStr].qrisIncome += Number(payment.amount);
            } else if (payment.method === 'TRANSFER') {
                dailyCashflow[dateStr].transferIncome += Number(payment.amount);
            }
        }
    }

    // Process expenses
    for (const expense of expensesInRange) {
        const dateStr = formatLocalDateKey(expense.date);
        if (!dailyCashflow[dateStr]) {
            dailyCashflow[dateStr] = {
                date: dateStr,
                ordersTotal: 0,
                cashIncome: 0,
                qrisIncome: 0,
                transferIncome: 0,
                cashExpenses: 0,
                qrisExpenses: 0,
                transferExpenses: 0,
                cashAdditional: 0,
                qrisAdditional: 0,
                transferAdditional: 0,
                netCash: 0,
                netQris: 0,
                netTransfer: 0,
                netDailyIncome: 0,
            };
        }

        if (expense.paymentMethod === 'CASH') {
            dailyCashflow[dateStr].cashExpenses += Number(expense.amount);
        } else if (expense.paymentMethod === 'QRIS') {
            dailyCashflow[dateStr].qrisExpenses += Number(expense.amount);
        } else if (expense.paymentMethod === 'TRANSFER') {
            dailyCashflow[dateStr].transferExpenses += Number(expense.amount);
        }
    }

    // Process incomes
    for (const income of incomesInRange) {
        const dateStr = formatLocalDateKey(income.date);
        if (!dailyCashflow[dateStr]) {
            dailyCashflow[dateStr] = {
                date: dateStr,
                ordersTotal: 0,
                cashIncome: 0,
                qrisIncome: 0,
                transferIncome: 0,
                cashExpenses: 0,
                qrisExpenses: 0,
                transferExpenses: 0,
                cashAdditional: 0,
                qrisAdditional: 0,
                transferAdditional: 0,
                netCash: 0,
                netQris: 0,
                netTransfer: 0,
                netDailyIncome: 0,
            };
        }

        if (income.paymentMethod === 'CASH') {
            dailyCashflow[dateStr].cashAdditional += Number(income.amount);
        } else if (income.paymentMethod === 'QRIS') {
            dailyCashflow[dateStr].qrisAdditional += Number(income.amount);
        } else if (income.paymentMethod === 'TRANSFER') {
            dailyCashflow[dateStr].transferAdditional += Number(income.amount);
        }
    }

    // Calculate net daily income for each day
    for (const dateStr in dailyCashflow) {
        const day = dailyCashflow[dateStr];
        // Net CASH = Cash income + Cash additional income - Cash expenses
        day.netCash = day.cashIncome + day.cashAdditional - day.cashExpenses;
        // Net QRIS = QRIS income + QRIS additional income - QRIS expenses
        day.netQris = day.qrisIncome + day.qrisAdditional - day.qrisExpenses;
        // Net TRANSFER = Transfer income + Transfer additional income - Transfer expenses
        day.netTransfer = day.transferIncome + day.transferAdditional - day.transferExpenses;
        // Net daily income across all payment methods
        day.netDailyIncome = day.netCash + day.netQris + day.netTransfer;
    }

    const results = Object.values(dailyCashflow).sort((a, b) => a.date.localeCompare(b.date));
    return results;
}

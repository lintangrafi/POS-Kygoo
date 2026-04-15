import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { events } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getDailyCashflow, getFinancialReport, getTopProducts } from '@/actions/report-actions';

function parseDateOnly(input: string | null, fallback: Date): Date {
    if (!input) return fallback;
    const [year, month, day] = input.split('-').map(Number);
    if (!year || !month || !day) return fallback;
    const d = new Date(year, month - 1, day);
    d.setHours(0, 0, 0, 0);
    return d;
}

function fmtDate(input: Date): string {
    const year = input.getFullYear();
    const month = String(input.getMonth() + 1).padStart(2, '0');
    const day = String(input.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function toCurrency(value: number): string {
    return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(value || 0))}`;
}

function csvEscape(value: string | number): string {
    const raw = String(value ?? '');
    if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
        return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
}

function normalizeMethodBreakdown(input: Record<string, number> | undefined) {
    const base = {
        CASH: 0,
        QRIS: 0,
        TRANSFER: 0,
    };
    const merged: Record<string, number> = { ...base };
    for (const [method, amount] of Object.entries(input || {})) {
        merged[method] = (merged[method] || 0) + Number(amount || 0);
    }
    return merged;
}

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const format = (url.searchParams.get('format') || 'csv').toLowerCase();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const from = parseDateOnly(url.searchParams.get('from'), now);
    const to = parseDateOnly(url.searchParams.get('to'), now);
    if (from.getTime() > to.getTime()) {
        return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const toExclusive = new Date(to);
    toExclusive.setDate(toExclusive.getDate() + 1);

    const eventIdRaw = url.searchParams.get('eventId');
    const eventId = eventIdRaw ? Number(eventIdRaw) : undefined;
    const selectedEventId = eventId && Number.isFinite(eventId) ? eventId : undefined;

    const [financial, topProducts, dailyCashflow, selectedEvent] = await Promise.all([
        getFinancialReport({ from, to: toExclusive, eventId: selectedEventId }),
        getTopProducts({ from, to: toExclusive, limit: 10, eventId: selectedEventId }),
        getDailyCashflow({ from, to: toExclusive, eventId: selectedEventId }),
        selectedEventId
            ? db.query.events.findFirst({
                where: eq(events.id, selectedEventId),
                columns: { id: true, name: true },
            })
            : Promise.resolve(null),
    ]);

    const eventLabel = selectedEvent?.name || 'All Events';
    const fromLabel = fmtDate(from);
    const toLabel = fmtDate(to);
    const paymentBreakdown = normalizeMethodBreakdown(financial.paymentsBreakdown);
    const expenseBreakdown = normalizeMethodBreakdown(financial.expensesByMethod);
    const incomeBreakdown = normalizeMethodBreakdown(financial.incomesByMethod);

    if (format === 'pdf') {
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        let page = pdfDoc.addPage([595, 842]);
        let { height } = page.getSize();
        let y = height - 40;

        const lines: string[] = [
            'POS Kygo - Financial Report',
            `Period: ${fromLabel} to ${toLabel}`,
            `Event: ${eventLabel}`,
            '',
            `Turnover: ${toCurrency(financial.turnover)}`,
            `Total Orders: ${financial.totalOrders}`,
            `COGS: ${toCurrency(financial.cogs)}`,
            `Gross Profit: ${toCurrency(financial.grossProfit)}`,
            `Expenses: ${toCurrency(financial.totalExpenses)}`,
            `Additional Income: ${toCurrency(financial.totalIncomes)}`,
            `Net Profit: ${toCurrency(financial.netProfit)}`,
            '',
            'Payment Breakdown (Order Revenue)',
            ...Object.entries(paymentBreakdown).map(([method, amount]) => `${method}: ${toCurrency(Number(amount))}`),
            '',
            'Expense Breakdown',
            ...Object.entries(expenseBreakdown).map(([method, amount]) => `${method}: ${toCurrency(Number(amount))}`),
            '',
            'Additional Income Breakdown',
            ...Object.entries(incomeBreakdown).map(([method, amount]) => `${method}: ${toCurrency(Number(amount))}`),
            '',
            'Top Products',
            ...topProducts.slice(0, 10).map((p, idx) => `${idx + 1}. ${p.productName} | Qty ${p.qty} | ${toCurrency(Number(p.revenue))}`),
            '',
            'Daily Cashflow',
            ...dailyCashflow.slice(-14).map((row) => `${row.date} | Net ${toCurrency(Number(row.netDailyIncome))} | Cash ${toCurrency(Number(row.netCash))} | QRIS ${toCurrency(Number(row.netQris))}`),
        ];

        for (const line of lines) {
            if (y < 40) {
                page = pdfDoc.addPage([595, 842]);
                height = page.getSize().height;
                y = height - 40;
            }
            page.drawText(line, {
                x: 40,
                y,
                size: 10,
                font,
                color: rgb(0.1, 0.1, 0.1),
            });
            y -= 14;
        }

        const bytes = await pdfDoc.save();
        return new NextResponse(Buffer.from(bytes), {
            status: 200,
            headers: {
                'content-type': 'application/pdf',
                'content-disposition': `attachment; filename="financial-report-${fromLabel}-to-${toLabel}.pdf"`,
            },
        });
    }

    const rows: string[] = [];
    rows.push(['Section', 'Metric', 'Value'].map(csvEscape).join(','));
    rows.push(['Summary', 'Period From', fromLabel].map(csvEscape).join(','));
    rows.push(['Summary', 'Period To', toLabel].map(csvEscape).join(','));
    rows.push(['Summary', 'Event', eventLabel].map(csvEscape).join(','));
    rows.push(['Summary', 'Turnover', financial.turnover].map(csvEscape).join(','));
    rows.push(['Summary', 'Total Orders', financial.totalOrders].map(csvEscape).join(','));
    rows.push(['Summary', 'COGS', financial.cogs].map(csvEscape).join(','));
    rows.push(['Summary', 'Gross Profit', financial.grossProfit].map(csvEscape).join(','));
    rows.push(['Summary', 'Expenses', financial.totalExpenses].map(csvEscape).join(','));
    rows.push(['Summary', 'Additional Incomes', financial.totalIncomes].map(csvEscape).join(','));
    rows.push(['Summary', 'Net Profit', financial.netProfit].map(csvEscape).join(','));

    rows.push('');
    rows.push(['Payment Breakdown', 'Method', 'Amount'].map(csvEscape).join(','));
    for (const [method, amount] of Object.entries(paymentBreakdown)) {
        rows.push(['Payment Breakdown', method, Number(amount)].map(csvEscape).join(','));
    }

    rows.push('');
    rows.push(['Expense Breakdown', 'Method', 'Amount'].map(csvEscape).join(','));
    for (const [method, amount] of Object.entries(expenseBreakdown)) {
        rows.push(['Expense Breakdown', method, Number(amount)].map(csvEscape).join(','));
    }

    rows.push('');
    rows.push(['Income Breakdown', 'Method', 'Amount'].map(csvEscape).join(','));
    for (const [method, amount] of Object.entries(incomeBreakdown)) {
        rows.push(['Income Breakdown', method, Number(amount)].map(csvEscape).join(','));
    }

    rows.push('');
    rows.push(['Top Products', 'Product', 'Qty', 'Revenue'].map(csvEscape).join(','));
    for (const item of topProducts) {
        rows.push(['Top Products', item.productName, item.qty, Number(item.revenue)].map(csvEscape).join(','));
    }

    rows.push('');
    rows.push(['Daily Cashflow', 'Date', 'Cash In', 'Cash Exp', 'Cash Add', 'Net Cash', 'QRIS In', 'QRIS Exp', 'QRIS Add', 'Net QRIS', 'Net Daily'].map(csvEscape).join(','));
    for (const row of dailyCashflow) {
        rows.push([
            'Daily Cashflow',
            row.date,
            row.cashIncome,
            row.cashExpenses,
            row.cashAdditional,
            row.netCash,
            row.qrisIncome,
            row.qrisExpenses,
            row.qrisAdditional,
            row.netQris,
            row.netDailyIncome,
        ].map(csvEscape).join(','));
    }

    return new NextResponse(rows.join('\n'), {
        status: 200,
        headers: {
            'content-type': 'text/csv; charset=utf-8',
            'content-disposition': `attachment; filename="financial-report-${fromLabel}-to-${toLabel}.csv"`,
        },
    });
}

import { getOrders } from '@/actions/admin-actions';
import { getDraftInvoices } from '@/actions/pos-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import InvoiceListClient from './InvoiceListClient';

export default async function InvoicesPage({ searchParams }: { searchParams?: { period?: string; from?: string; to?: string } }) {
    // searchParams may be a Promise in Next.js app router — await it first
    const sp = (await searchParams) || {};

    // Determine date range from search params; default to today
    const period = (sp?.period as 'today' | 'daily' | 'weekly' | 'monthly' | 'custom') || 'today';
    const to = sp?.to ? new Date(sp.to) : new Date();
    const from = sp?.from ? new Date(sp.from) : new Date();

    // for period shortcuts, override from/to
    let fromDate = from;
    let toDate = new Date(to.getTime() + 1000 * 60 * 60 * 24); // inclusive
    if (period === 'today') {
        fromDate = new Date();
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(fromDate.getTime() + 1000 * 60 * 60 * 24);
    } else if (period === 'daily') {
        fromDate = new Date();
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(fromDate.getTime() + 1000 * 60 * 60 * 24);
    } else if (period === 'weekly') {
        fromDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
        toDate = new Date(toDate.getTime() + 1000);
    } else if (period === 'monthly') {
        fromDate = new Date();
        fromDate.setDate(1);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
        toDate = new Date(toDate.getTime() + 1000);
    }

    const orders = await getOrders({ limit: 500, from: fromDate, to: toDate });
    const draftInvoices = await getDraftInvoices({ from: fromDate, to: toDate });

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Invoices</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Completed invoices & draft invoices from open bills</p>
            </div>

            <form method="get" className="flex items-end gap-4">
                <div>
                    <label className="text-sm text-muted-foreground">From</label>
                    <input name="from" type="date" defaultValue={fromDate.toISOString().slice(0, 10)} className="mt-1 block rounded-md border px-3 py-2" />
                </div>
                <div>
                    <label className="text-sm text-muted-foreground">To</label>
                    <input name="to" type="date" defaultValue={(new Date(toDate.getTime() - 1000 * 60 * 60 * 24)).toISOString().slice(0, 10)} className="mt-1 block rounded-md border px-3 py-2" />
                </div>
                <input type="hidden" name="period" value={period} />
                <button type="submit" className="btn btn-primary">Filter</button>
            </form>

            <div className="mt-4 flex gap-2">
                <a title="Today" href={`?period=today`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'today' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-100'} transition`}>Today</a>
                <a title="Daily" href={`?period=daily`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'daily' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-100'} transition`}>Daily</a>
                <a title="Weekly" href={`?period=weekly`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'weekly' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-100'} transition`}>Weekly</a>
                <a title="Monthly" href={`?period=monthly`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'monthly' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-100'} transition`}>Monthly</a>
                <a title="Custom range" href={`?period=custom`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'custom' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-100'} transition`}>Custom</a>
            </div>

            <InvoiceListClient serverOrders={orders} draftInvoices={draftInvoices} />
        </div>
    );
}
import { getOrders } from '@/actions/admin-actions';
import { getDraftInvoices } from '@/actions/pos-actions';
import InvoiceMasterDetailClient from './InvoiceMasterDetailClient';
import { getOpenBillsByRange } from '@/actions/pos-actions';
import { verifySession } from '@/lib/auth';
import { getEventOptions } from '@/actions/event-actions';

export default async function InvoicesPage({ searchParams }: { searchParams?: { period?: string; from?: string; to?: string; day?: string; week?: string; type?: string; eventId?: string } }) {
    // searchParams may be a Promise in Next.js app router — await it first
    const sp = (await searchParams) || {};
    const session = await verifySession();
    if (session.role === 'CASHIER') {
        return <div className="p-8 text-sm text-[#8B1A1A]">Not authorized</div>;
    }

    // Determine date range from search params; default to today
    const period = (sp?.period as 'today' | 'daily' | 'weekly' | 'monthly' | 'custom') || 'today';
    const selectedDay = sp?.day ? Number(sp.day) : null; // 0=Mon..6=Sun
    const selectedWeek = sp?.week ? Number(sp.week) : null; // 1..5
    const selectedType = (sp?.type as 'ALL' | 'OB' | 'INV') || 'ALL';
    const selectedEventId = sp?.eventId ? Number(sp.eventId) : null;
    const to = sp?.to ? new Date(sp.to) : new Date();
    const from = sp?.from ? new Date(sp.from) : new Date();
    const dateRangeError = sp?.from && sp?.to && from.getTime() > to.getTime() ? 'Invalid date range' : '';

    // for period shortcuts, override from/to
    let fromDate = from;
    let toDate = new Date(to.getTime() + 1000 * 60 * 60 * 24); // inclusive
    if (period === 'today') {
        fromDate = new Date();
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(fromDate.getTime() + 1000 * 60 * 60 * 24);
    } else if (period === 'daily') {
        const base = new Date();
        base.setHours(0, 0, 0, 0);
        const jsDay = base.getDay(); // 0=Sun..6=Sat
        const mondayOffset = (jsDay + 6) % 7; // days since Monday
        const weekStart = new Date(base);
        weekStart.setDate(base.getDate() - mondayOffset);
        weekStart.setHours(0, 0, 0, 0);

        if (selectedDay !== null && selectedDay >= 0 && selectedDay <= 6) {
            fromDate = new Date(weekStart.getTime() + selectedDay * 24 * 60 * 60 * 1000);
            toDate = new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
        } else {
            fromDate = base;
            toDate = new Date(base.getTime() + 24 * 60 * 60 * 1000);
        }
    } else if (period === 'weekly') {
        const monthStart = new Date(to.getFullYear(), to.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        const nextMonthStart = new Date(to.getFullYear(), to.getMonth() + 1, 1);
        nextMonthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(nextMonthStart.getTime() - 1000);

        if (selectedWeek && selectedWeek >= 1 && selectedWeek <= 5) {
            fromDate = new Date(monthStart.getTime() + (selectedWeek - 1) * 7 * 24 * 60 * 60 * 1000);
            toDate = new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            if (toDate > nextMonthStart) {
                toDate = nextMonthStart;
            }
        } else {
            fromDate = monthStart;
            toDate = nextMonthStart;
        }
    } else if (period === 'monthly') {
        fromDate = new Date();
        fromDate.setDate(1);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
        toDate = new Date(toDate.getTime() + 1000);
    }

    const canChooseEvent = session.role === 'ADMIN' || session.role === 'SUPERADMIN';
    const eventOptions = canChooseEvent ? await getEventOptions() : [];
    const effectiveEventId = selectedEventId && Number.isFinite(selectedEventId) ? selectedEventId : null;

    const orders = await getOrders({
        limit: 500,
        from: fromDate,
        to: toDate,
        eventId: effectiveEventId || undefined,
        bypassUserEventScope: true,
    });
    const openBillsInRange = await getOpenBillsByRange({
        from: fromDate,
        to: toDate,
        eventId: effectiveEventId || undefined,
        bypassUserEventScope: true,
    });
    const openBillsByInvoice = openBillsInRange.reduce((acc: Record<string, any>, bill) => {
        acc[bill.invoiceNumber] = bill;
        return acc;
    }, {});
    const filteredOrders = selectedType === 'ALL'
        ? orders
        : orders.filter((order) => (selectedType === 'OB'
            ? order.invoiceNumber.startsWith('OB-')
            : order.invoiceNumber.startsWith('INV-')));
    const draftInvoices = await getDraftInvoices({ from: fromDate, to: toDate });

    return (
        <div className="rounded-2xl border border-[#E6DED0] bg-[#F5F1E8] p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
            <div className="flex items-center justify-between rounded-xl border border-[#E6DED0] bg-white px-4 py-3">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#1F1D1A]">Invoices</h1>
                    <p className="text-sm text-[#6F6659]">Lihat transaksi, status, dan rincian payment breakdown dengan cepat.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="rounded-lg border border-[#DCCFBF] bg-[#F8F3EA] px-3 py-1.5 text-sm">Completed</button>
                    <button className="rounded-lg border border-[#E6DED0] bg-white px-3 py-1.5 text-sm text-[#6F6659]">Void</button>
                    <button className="rounded-lg bg-[#C86B2A] px-3 py-1.5 text-sm font-semibold text-white">Export</button>
                </div>
            </div>

            <div className="rounded-xl border border-[#E6DED0] bg-white px-4 py-3">
                <div className="text-sm font-semibold text-[#5A5348]">Filter</div>
                {dateRangeError && (
                    <div className="mt-2 rounded-md border border-[#F2C6C6] bg-[#FFF1F1] px-3 py-2 text-xs text-[#8B1A1A]">
                        {dateRangeError}
                    </div>
                )}
                <form method="get" className="mt-3 flex flex-wrap items-end gap-4">
                    {canChooseEvent && (
                        <div>
                            <label className="text-sm text-[#6F6659]">Event</label>
                            <select
                                name="eventId"
                                defaultValue={selectedEventId ? String(selectedEventId) : ''}
                                className="mt-1 block rounded-md border border-[#DCCFBF] bg-white px-3 py-2"
                            >
                                <option value="">All Events</option>
                                {eventOptions.map((event) => (
                                    <option key={event.id} value={String(event.id)}>
                                        {event.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="text-sm text-[#6F6659]">From</label>
                        <input name="from" type="date" defaultValue={fromDate.toISOString().slice(0, 10)} className="mt-1 block rounded-md border border-[#DCCFBF] bg-white px-3 py-2" />
                    </div>
                    <div>
                        <label className="text-sm text-[#6F6659]">To</label>
                        <input name="to" type="date" defaultValue={(new Date(toDate.getTime() - 1000 * 60 * 60 * 24)).toISOString().slice(0, 10)} className="mt-1 block rounded-md border border-[#DCCFBF] bg-white px-3 py-2" />
                    </div>
                    <input type="hidden" name="period" value={period} />
                    {selectedDay !== null && <input type="hidden" name="day" value={String(selectedDay)} />}
                    {selectedWeek !== null && <input type="hidden" name="week" value={String(selectedWeek)} />}
                    {selectedType !== 'ALL' && <input type="hidden" name="type" value={selectedType} />}
                    {canChooseEvent && selectedEventId && (
                        <input type="hidden" name="eventId" value={String(selectedEventId)} />
                    )}
                    <button type="submit" className="inline-flex items-center rounded-md bg-[#C86B2A] px-4 py-2 text-sm font-medium text-white hover:bg-[#B25E24]">Apply</button>
                    <div className="flex flex-wrap gap-2">
                        <a title="Today" href={`?period=today${selectedEventId ? `&eventId=${selectedEventId}` : ''}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'today' ? 'bg-[#C86B2A] text-white border-[#C86B2A]' : 'bg-white border-[#DCCFBF] text-[#5A5348] hover:bg-[#F8F3EA]'} transition`}>Today</a>
                        <a title="Daily" href={`?period=daily${selectedEventId ? `&eventId=${selectedEventId}` : ''}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'daily' ? 'bg-[#C86B2A] text-white border-[#C86B2A]' : 'bg-white border-[#DCCFBF] text-[#5A5348] hover:bg-[#F8F3EA]'} transition`}>Daily</a>
                        <a title="Weekly" href={`?period=weekly${selectedEventId ? `&eventId=${selectedEventId}` : ''}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'weekly' ? 'bg-[#C86B2A] text-white border-[#C86B2A]' : 'bg-white border-[#DCCFBF] text-[#5A5348] hover:bg-[#F8F3EA]'} transition`}>Weekly</a>
                        <a title="Monthly" href={`?period=monthly${selectedEventId ? `&eventId=${selectedEventId}` : ''}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'monthly' ? 'bg-[#C86B2A] text-white border-[#C86B2A]' : 'bg-white border-[#DCCFBF] text-[#5A5348] hover:bg-[#F8F3EA]'} transition`}>Monthly</a>
                        <a title="Custom range" href={`?period=custom${selectedEventId ? `&eventId=${selectedEventId}` : ''}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'custom' ? 'bg-[#C86B2A] text-white border-[#C86B2A]' : 'bg-white border-[#DCCFBF] text-[#5A5348] hover:bg-[#F8F3EA]'} transition`}>Custom</a>
                    </div>
                    {period === 'daily' && (
                        <div className="flex flex-wrap gap-2">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, idx) => (
                                <a
                                    key={label}
                                    href={`?period=daily&day=${idx}${selectedEventId ? `&eventId=${selectedEventId}` : ''}`}
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${selectedDay === idx ? 'bg-[#1F1D1A] text-white border-[#1F1D1A]' : 'bg-white border-[#DCCFBF] text-[#5A5348] hover:bg-[#F8F3EA]'} transition`}
                                >
                                    {label}
                                </a>
                            ))}
                        </div>
                    )}
                    {period === 'weekly' && (
                        <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5].map((week) => (
                                <a
                                    key={week}
                                    href={`?period=weekly&week=${week}${selectedEventId ? `&eventId=${selectedEventId}` : ''}`}
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${selectedWeek === week ? 'bg-[#1F1D1A] text-white border-[#1F1D1A]' : 'bg-white border-[#DCCFBF] text-[#5A5348] hover:bg-[#F8F3EA]'} transition`}
                                >
                                    Week {week}
                                </a>
                            ))}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        {[{ label: 'All', value: 'ALL' }, { label: 'OB', value: 'OB' }, { label: 'INV', value: 'INV' }].map((item) => (
                            <a
                                key={item.value}
                                href={`?period=${period}&type=${item.value}${selectedDay !== null ? `&day=${selectedDay}` : ''}${selectedWeek !== null ? `&week=${selectedWeek}` : ''}${selectedEventId ? `&eventId=${selectedEventId}` : ''}`}
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${selectedType === item.value ? 'bg-[#1F1D1A] text-white border-[#1F1D1A]' : 'bg-white border-[#DCCFBF] text-[#5A5348] hover:bg-[#F8F3EA]'} transition`}
                            >
                                {item.label}
                            </a>
                        ))}
                    </div>
                </form>
            </div>

            <InvoiceMasterDetailClient orders={filteredOrders} openBillsByInvoice={openBillsByInvoice} />
        </div>
    );
}
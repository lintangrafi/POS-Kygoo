import { getAuditLogs } from '@/actions/admin-actions';
import { getFinancialReport, getTopProducts, getAggregatedRevenue, getDailyCashflow } from '@/actions/report-actions';
import { getExpenses } from '@/actions/expense-actions';
import { getIncomes } from '@/actions/income-actions';
import { getActiveEvent, getEventOptions } from '@/actions/event-actions';
import TrendChart from '@/components/reports/TrendChart';
import BarChart from '@/components/reports/BarChart';
import { ExpenseManagement } from '@/components/reports/ExpenseManagement';
import { IncomeManagement } from '@/components/reports/IncomeManagement';
import { EventSelector } from '@/components/reports/EventSelector';
import { formatRupiah } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { verifySession } from '@/lib/auth';
import { calculateRevenueShare } from '@/lib/revenue-utils';

export default async function ReportsPage({ searchParams }: { searchParams?: { from?: string; to?: string; period?: string; day?: string; week?: string; dailyDate?: string; eventId?: string } }) {
    // `searchParams` may be a Promise in some Next.js versions, unwrap it to `sp`
    const sp = await (searchParams as any);
    const session = await verifySession();

    // period: 'today' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' (default today)
    const period = (sp?.period as 'today' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom') || 'today';
    const selectedDay = sp?.day ? Number(sp.day) : null; // 0=Mon..6=Sun
    const selectedWeek = sp?.week ? Number(sp.week) : null; // 1..5
    const selectedDailyDate = sp?.dailyDate;
    const selectedEventId = sp?.eventId ? Number(sp.eventId) : null;

    // parse date range from query params or default based on period
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let from: Date, to: Date;
    
    const dateRangeError = sp?.from && sp?.to && new Date(sp.from).getTime() > new Date(sp.to).getTime()
        ? 'Invalid date range'
        : '';

    if (sp?.from && sp?.to) {
        // Use provided dates
        from = new Date(sp.from);
        to = new Date(sp.to);
    } else {
        // Default based on period
        if (period === 'today') {
            from = today;
            to = today;
        } else if (period === 'daily') {
            if (selectedDailyDate) {
                const [year, month, day] = selectedDailyDate.split('-').map(Number);
                const pickedDate = new Date(year, (month || 1) - 1, day || 1);
                pickedDate.setHours(0, 0, 0, 0);
                from = pickedDate;
                to = pickedDate;
            } else {
            const jsDay = today.getDay(); // 0=Sun..6=Sat
            const mondayOffset = (jsDay + 6) % 7;
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - mondayOffset);
            weekStart.setHours(0, 0, 0, 0);

            if (selectedDay !== null && selectedDay >= 0 && selectedDay <= 6) {
                from = new Date(weekStart.getTime() + selectedDay * 24 * 60 * 60 * 1000);
                to = new Date(from);
            } else {
                from = today;
                to = today;
            }
            }
        } else if (period === 'weekly') {
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            monthStart.setHours(0, 0, 0, 0);
            const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            nextMonthStart.setHours(0, 0, 0, 0);

            if (selectedWeek && selectedWeek >= 1 && selectedWeek <= 5) {
                from = new Date(monthStart.getTime() + (selectedWeek - 1) * 7 * 24 * 60 * 60 * 1000);
                to = new Date(from.getTime() + 6 * 24 * 60 * 60 * 1000);
                const monthLastDay = new Date(nextMonthStart.getTime() - 24 * 60 * 60 * 1000);
                if (to > monthLastDay) {
                    to = monthLastDay;
                }
            } else {
                from = monthStart;
                to = new Date(nextMonthStart.getTime() - 24 * 60 * 60 * 1000);
            }
        } else if (period === 'monthly') {
            from = new Date(today.getTime() - 11 * 30 * 24 * 60 * 60 * 1000);
            to = today;
        } else if (period === 'yearly') {
            from = new Date(today.getTime() - 4 * 365 * 24 * 60 * 60 * 1000);
            to = today;
        } else {
            // custom or fallback
            from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
            to = new Date();
        }
    }
    
    const toInclusive = new Date(to.getTime() + 1000 * 60 * 60 * 24); // convert inclusive end date to exclusive upper bound

    // Always fetch financial report for the selected range so metrics reflect the period
    const r = await getFinancialReport({
        from,
        to: toInclusive,
        eventId: selectedEventId && Number.isFinite(selectedEventId) ? selectedEventId : undefined,
    });

    // fetch audit logs filtered by selected range (limit to 10 for reports)
    const logs = await getAuditLogs({ from, to: toInclusive, limit: 10 });

    // fetch expenses filtered by selected range
    const expensesList = await getExpenses({
        from,
        to: toInclusive,
        eventId: selectedEventId && Number.isFinite(selectedEventId) ? selectedEventId : undefined,
    });

    // fetch incomes filtered by selected range
    const incomesList = await getIncomes({
        from,
        to: toInclusive,
        eventId: selectedEventId && Number.isFinite(selectedEventId) ? selectedEventId : undefined,
    });

    const [eventOptions, activeEvent] = await Promise.all([
        getEventOptions(),
        getActiveEvent(),
    ]);

    const selectedEventForShare = selectedEventId
        ? eventOptions.find((event) => event.id === selectedEventId)
        : null;
    const reportRevenueShare = r.revenueShare || (
        selectedEventForShare
            ? (selectedEventForShare.revenueShareType === 'FIXED'
                ? (() => {
                    const organizerFixed = Number(selectedEventForShare.organizerShareFixed || 0);
                    let organizerShare = 0;
                    let studioShare = 0;

                    for (const order of r.orders || []) {
                        for (const item of order.items || []) {
                            const unitPrice = Number(item.priceAtSale || 0);
                            const qty = Number(item.quantity || 0);
                            const organizerTake = Math.min(organizerFixed, unitPrice);
                            organizerShare += organizerTake * qty;
                            studioShare += Math.max(0, unitPrice - organizerTake) * qty;
                        }
                    }

                    return {
                        total: r.turnover,
                        organizerShare: Math.round(organizerShare * 100) / 100,
                        studioShare: Math.round(studioShare * 100) / 100,
                        type: 'FIXED' as const,
                    };
                })()
                : calculateRevenueShare(r.turnover, {
                    revenueShareType: selectedEventForShare.revenueShareType,
                    organizerSharePercent: selectedEventForShare.organizerSharePercent,
                    studioSharePercent: selectedEventForShare.studioSharePercent,
                    organizerShareFixed: selectedEventForShare.organizerShareFixed,
                    studioShareFixed: selectedEventForShare.studioShareFixed,
                }))
            : null
    );

    // fetch daily cashflow detailed breakdown
    const dailyCashflow = await getDailyCashflow({
        from,
        to: toInclusive,
        eventId: selectedEventId && Number.isFinite(selectedEventId) ? selectedEventId : undefined,
    });

    // aggregated series used for charts when not custom/today (except weekly, which should show daily)
    let aggregated: { period: string; amount: number; paymentsBreakdown: Record<string, number>; ordersCount: number; cashInDrawer: number; expenses: number }[] | null = null;
    if (period !== 'custom' && period !== 'today' && period !== 'weekly') {
        aggregated = await getAggregatedRevenue({
            from,
            to: toInclusive,
            period,
            eventId: selectedEventId && Number.isFinite(selectedEventId) ? selectedEventId : undefined,
        });
    }

    const topProducts = await getTopProducts({
        from,
        to: toInclusive,
        limit: 10,
        eventId: selectedEventId && Number.isFinite(selectedEventId) ? selectedEventId : undefined,
    });

    const fmtDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const exportBase = `/api/reports/export?from=${fmtDate(from)}&to=${fmtDate(to)}${selectedEventId ? `&eventId=${selectedEventId}` : ''}`;

    // Trend data: weekly should show daily trend, otherwise use aggregated or daily revenue
    const dailyTrend = Object.entries(r?.dailyRevenue || {}).map(([period, amount]) => ({ period, amount: Number(amount) }));
    const trendData = period === 'weekly'
        ? dailyTrend
        : aggregated
            ? aggregated.map(a => ({ period: a.period, amount: Number(a.amount) }))
            : dailyTrend;
    const trendLabel = period === 'weekly'
        ? 'Daily revenue (Mon-Sun)'
        : aggregated
            ? `${period} revenue`
            : period === 'today'
                ? "Today's revenue"
                : 'Daily revenue (custom range)';

    return (
        <div className="rounded-2xl border border-[#E6DED0] bg-[#F5F1E8] p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between rounded-xl border border-[#E6DED0] bg-white px-4 py-3">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#1F1D1A]">Financial Reports</h1>
                    <p className="text-sm text-[#6F6659]">Analisis revenue, expense, dan profit untuk keputusan operasional harian.</p>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <a href={`${exportBase}&format=csv`} className="rounded-lg border border-[#E6DED0] bg-white px-3 py-1.5 text-sm text-[#6F6659] hover:bg-[#F8F3EA]">Export CSV</a>
                        <a href={`${exportBase}&format=pdf`} className="rounded-lg border border-[#E6DED0] bg-white px-3 py-1.5 text-sm text-[#6F6659] hover:bg-[#F8F3EA]">Export PDF</a>
                        <a href={`?period=today${selectedEventId ? `&eventId=${selectedEventId}` : ''}`} className={`rounded-lg border px-3 py-1.5 text-sm ${period === 'today' ? 'bg-[#F8F3EA] border-[#DCCFBF] text-[#1F1D1A]' : 'bg-white border-[#E6DED0] text-[#6F6659]'}`}>Today</a>
                        <a href={`?period=weekly${selectedEventId ? `&eventId=${selectedEventId}` : ''}`} className={`rounded-lg border px-3 py-1.5 text-sm ${period === 'weekly' ? 'bg-[#F8F3EA] border-[#DCCFBF] text-[#1F1D1A]' : 'bg-white border-[#E6DED0] text-[#6F6659]'}`}>Weekly</a>
                        <a href={`?period=monthly${selectedEventId ? `&eventId=${selectedEventId}` : ''}`} className={`rounded-lg border px-3 py-1.5 text-sm ${period === 'monthly' ? 'bg-[#F8F3EA] border-[#DCCFBF] text-[#1F1D1A]' : 'bg-white border-[#E6DED0] text-[#6F6659]'}`}>Monthly</a>
                    </div>
                    <EventSelector events={eventOptions} currentEventId={selectedEventId} />
                </div>
            </div>

            {dateRangeError && (
                <div className="rounded-md border border-[#F2C6C6] bg-[#FFF1F1] px-3 py-2 text-xs text-[#8B1A1A]">
                    {dateRangeError}
                </div>
            )}
            <form method="get" className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                {period === 'daily' && (
                    <div>
                        <label className="text-sm text-[#6F6659]">Date</label>
                        <input
                            name="dailyDate"
                            type="date"
                            defaultValue={selectedDailyDate || `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`}
                            className="mt-1 block rounded-md border border-[#DCCFBF] bg-white px-3 py-2"
                        />
                    </div>
                )}
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
                {period === 'custom' && (
                    <>
                        <div>
                            <label className="text-sm text-[#6F6659]">From</label>
                            <input name="from" type="date" defaultValue={`${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`} className="mt-1 block rounded-md border border-[#DCCFBF] bg-white px-3 py-2" />
                        </div>
                        <div>
                            <label className="text-sm text-[#6F6659]">To</label>
                            <input name="to" type="date" defaultValue={`${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}-${String(to.getDate()).padStart(2, '0')}`} className="mt-1 block rounded-md border border-[#DCCFBF] bg-white px-3 py-2" />
                        </div>
                    </>
                )}
                <input type="hidden" name="period" value={period} />
                {selectedDay !== null && <input type="hidden" name="day" value={String(selectedDay)} />}
                {selectedWeek !== null && <input type="hidden" name="week" value={String(selectedWeek)} />}
                <button type="submit" className="inline-flex items-center rounded-md bg-[#C86B2A] px-4 py-2 text-sm font-medium text-white hover:bg-[#B25E24]">Filter</button>
            </form>

            {/* period buttons set explicit ranges */}
            <div className="mt-4 flex flex-wrap gap-2">
                {/* compute ranges relative to today */}
                {
                    (() => {
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        const fmt = (d: Date) => {
                            const year = d.getFullYear();
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            return `${year}-${month}-${day}`;
                        };
                        const ranges: Record<string, [Date, Date]> = {
                            today: [today, today], // today only
                            daily: [today, today], // single-day daily report
                            weekly: [new Date(today.getTime() - 6 * 7 * 24 * 60 * 60 * 1000), today], // last 7 weeks
                            monthly: [new Date(today.getTime() - 11 * 30 * 24 * 60 * 60 * 1000), today], // last 12 months
                            yearly: [new Date(today.getTime() - 4 * 365 * 24 * 60 * 60 * 1000), today], // last 5 years
                            custom: [from, to],
                        };
                        const dToday = ranges.today; const dDaily = ranges.daily; const dWeekly = ranges.weekly; const dMonthly = ranges.monthly; const dYearly = ranges.yearly;
                        return (
                            <>
                                <a title="Show today's report" href={`?period=today&from=${fmt(dToday[0])}&to=${fmt(dToday[1])}${selectedEventId ? `&eventId=${selectedEventId}` : ''}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'today' ? 'bg-[#C86B2A] text-white border-[#C86B2A]' : 'bg-white border-[#DCCFBF] text-[#5A5348] hover:bg-[#F8F3EA]'} transition`}>Today</a>
                                <a title="Show daily report" href={`?period=daily&dailyDate=${fmt(dDaily[0])}${selectedEventId ? `&eventId=${selectedEventId}` : ''}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'daily' ? 'bg-[#C86B2A] text-white border-[#C86B2A]' : 'bg-white border-[#DCCFBF] text-[#5A5348] hover:bg-[#F8F3EA]'} transition`}>Daily</a>
                                <a title="Show weekly aggregates" href={`?period=weekly&from=${fmt(dWeekly[0])}&to=${fmt(dWeekly[1])}${selectedEventId ? `&eventId=${selectedEventId}` : ''}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'weekly' ? 'bg-[#C86B2A] text-white border-[#C86B2A]' : 'bg-white border-[#DCCFBF] text-[#5A5348] hover:bg-[#F8F3EA]'} transition`}>Weekly</a>
                                <a title="Show monthly aggregates" href={`?period=monthly&from=${fmt(dMonthly[0])}&to=${fmt(dMonthly[1])}${selectedEventId ? `&eventId=${selectedEventId}` : ''}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'monthly' ? 'bg-[#C86B2A] text-white border-[#C86B2A]' : 'bg-white border-[#DCCFBF] text-[#5A5348] hover:bg-[#F8F3EA]'} transition`}>Monthly</a>
                                <a title="Show yearly aggregates" href={`?period=yearly&from=${fmt(dYearly[0])}&to=${fmt(dYearly[1])}${selectedEventId ? `&eventId=${selectedEventId}` : ''}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'yearly' ? 'bg-[#C86B2A] text-white border-[#C86B2A]' : 'bg-white border-[#DCCFBF] text-[#5A5348] hover:bg-[#F8F3EA]'} transition`}>Yearly</a>
                                <a title="Show custom range" href={`?period=custom&from=${fmt(from)}&to=${fmt(to)}${selectedEventId ? `&eventId=${selectedEventId}` : ''}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'custom' ? 'bg-[#C86B2A] text-white border-[#C86B2A]' : 'bg-white border-[#DCCFBF] text-[#5A5348] hover:bg-[#F8F3EA]'} transition`}>Custom range</a>
                            </>
                        );
                    })()
                }
            </div>
            {period === 'daily' && !selectedDailyDate && (
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Card className="border-[#E6DED0] bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Turnover</CardTitle>
                        <CardDescription>Revenue in selected range</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold">{formatRupiah(r.turnover)}</div>
                    </CardContent>
                </Card>
                <Card className="border-[#E6DED0] bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Expenses</CardTitle>
                        <CardDescription>Daily operational costs</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold text-[#B6452C]">{formatRupiah(r.totalExpenses || 0)}</div>
                    </CardContent>
                </Card>
                <Card className="border-[#E6DED0] bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Net Profit</CardTitle>
                        <CardDescription>Gross Profit - Expenses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold">{formatRupiah(r.netProfit || 0)}</div>
                    </CardContent>
                </Card>
                <Card className="border-[#E6DED0] bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Cash in Drawer</CardTitle>
                        <CardDescription>Reported cash</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold">{formatRupiah(r.totalCashInDrawer || 0)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Revenue Sharing Display */}
            {reportRevenueShare && (r.event || selectedEventForShare) && (
                <Card className="border-[#E6DED0] bg-[#FFF8F0]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            💰 Pembagian Hasil - {(r.event?.name || selectedEventForShare?.name) ?? 'Event'}
                        </CardTitle>
                        <CardDescription>
                            {reportRevenueShare.type === 'PERCENTAGE' 
                                ? `Persentase: Penyelenggara ${reportRevenueShare.organizerPercent}% | Studio ${reportRevenueShare.studioPercent}%`
                                : 'Nominal Tetap'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-lg border border-[#E6DED0] bg-white p-3">
                                <p className="text-xs text-[#6F6659] mb-1">Total Revenue</p>
                                <p className="text-xl font-semibold text-[#1F1D1A]">{formatRupiah(reportRevenueShare.total)}</p>
                            </div>
                            <div className="rounded-lg border border-[#D4A574] bg-[#FEF6EB] p-3">
                                <p className="text-xs text-[#8B6F47] mb-1">🏢 Penyelenggara</p>
                                <p className="text-xl font-semibold text-[#C86B2A]">{formatRupiah(reportRevenueShare.organizerShare)}</p>
                            </div>
                            <div className="rounded-lg border border-[#C86B2A] bg-[#FFF8F0] p-3">
                                <p className="text-xs text-[#8B5A2B] mb-1">🎬 Studio</p>
                                <p className="text-xl font-semibold text-[#1F1D1A]">{formatRupiah(reportRevenueShare.studioShare)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-[#E6DED0] bg-white">
                    <CardHeader>
                        <CardTitle>Revenue Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <BarChart data={trendData} xLabel="Date" yLabel="Amount (IDR)" showValues={true} />
                    </CardContent>
                </Card>
                <Card className="border-[#E6DED0] bg-white">
                    <CardHeader>
                        <CardTitle>Payment Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-center justify-between rounded-md bg-[#EAF7EF] px-3 py-2 text-sm">
                            <span className="font-semibold">CASH</span>
                            <span>{formatRupiah((r as any).paymentsBreakdown?.CASH || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-md bg-[#EEF5FF] px-3 py-2 text-sm">
                            <span className="font-semibold">QRIS</span>
                            <span>{formatRupiah((r as any).paymentsBreakdown?.QRIS || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-md bg-[#F4EDFF] px-3 py-2 text-sm">
                            <span className="font-semibold">TRANSFER</span>
                            <span>{formatRupiah((r as any).paymentsBreakdown?.TRANSFER || 0)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-[#E6DED0] bg-white">
                    <CardHeader>
                        <CardTitle>Expense Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ExpenseManagement
                            expenses={expensesList as any}
                            role={session.role}
                            eventOptions={eventOptions}
                            defaultEventId={activeEvent?.id ?? null}
                        />
                    </CardContent>
                </Card>
                <Card className="border-[#E6DED0] bg-white">
                    <CardHeader>
                        <CardTitle>Income Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <IncomeManagement
                            incomes={incomesList as any}
                            role={session.role}
                            eventOptions={eventOptions}
                            defaultEventId={activeEvent?.id ?? null}
                        />
                    </CardContent>
                </Card>
            </div>

            <details className="rounded-xl border border-[#E6DED0] bg-white px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-[#5A5348]">Advanced reports</summary>
                <div className="mt-4 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Revenue Share Breakdown</CardTitle>
                            <CardDescription>Pembagian pembayaran untuk periode terpilih.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {reportRevenueShare && (r.event || selectedEventForShare) ? (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="rounded-lg border border-[#E6DED0] bg-[#F8F3EA] p-3">
                                        <div className="text-xs text-[#6F6659]">Total Revenue</div>
                                        <div className="text-lg font-semibold text-[#1F1D1A]">{formatRupiah(reportRevenueShare.total)}</div>
                                    </div>
                                    <div className="rounded-lg border border-[#D4A574] bg-[#FEF6EB] p-3">
                                        <div className="text-xs text-[#8B6F47]">Penyelenggara</div>
                                        <div className="text-lg font-semibold text-[#C86B2A]">{formatRupiah(reportRevenueShare.organizerShare)}</div>
                                    </div>
                                    <div className="rounded-lg border border-[#C86B2A] bg-[#FFF8F0] p-3">
                                        <div className="text-xs text-[#8B5A2B]">Studio</div>
                                        <div className="text-lg font-semibold text-[#1F1D1A]">{formatRupiah(reportRevenueShare.studioShare)}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    Pilih event untuk melihat pembagian pembayaran.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Expenses & Income by Payment Method</CardTitle>
                            <CardDescription>Breakdown of cash vs QRIS for selected period</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                <div className="border rounded-md p-3 bg-red-50">
                                    <div className="text-sm font-medium text-muted-foreground">Cash Expenses</div>
                                    <div className="text-lg font-semibold text-red-600">{formatRupiah(r.expensesByMethod?.CASH || 0)}</div>
                                </div>
                                <div className="border rounded-md p-3 bg-red-50">
                                    <div className="text-sm font-medium text-muted-foreground">QRIS Expenses</div>
                                    <div className="text-lg font-semibold text-red-600">{formatRupiah(r.expensesByMethod?.QRIS || 0)}</div>
                                </div>
                                <div className="border rounded-md p-3 bg-green-50">
                                    <div className="text-sm font-medium text-muted-foreground">Cash Additional Income</div>
                                    <div className="text-lg font-semibold text-green-600">+{formatRupiah(r.incomesByMethod?.CASH || 0)}</div>
                                </div>
                                <div className="border rounded-md p-3 bg-green-50">
                                    <div className="text-sm font-medium text-muted-foreground">QRIS Additional Income</div>
                                    <div className="text-lg font-semibold text-green-600">+{formatRupiah(r.incomesByMethod?.QRIS || 0)}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Operational Summary</CardTitle>
                            <CardDescription>Quick breakdown of gross profit and order volume.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="rounded-lg border border-[#E6DED0] bg-[#F8F3EA] p-3">
                                    <div className="text-xs text-[#6F6659]">Total Orders</div>
                                    <div className="text-lg font-semibold text-[#1F1D1A]">{r.totalOrders}</div>
                                </div>
                                <div className="rounded-lg border border-[#E6DED0] bg-[#F8F3EA] p-3">
                                    <div className="text-xs text-[#6F6659]">COGS</div>
                                    <div className="text-lg font-semibold text-[#1F1D1A]">{formatRupiah(r.cogs || 0)}</div>
                                </div>
                                <div className="rounded-lg border border-[#E6DED0] bg-[#F8F3EA] p-3">
                                    <div className="text-xs text-[#6F6659]">Gross Profit</div>
                                    <div className="text-lg font-semibold text-[#1F1D1A]">{formatRupiah(r.grossProfit || 0)}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Top Products</CardTitle>
                            <CardDescription>Produk terlaris berdasarkan kuantitas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {topProducts.length === 0 ? (
                                <div className="text-sm text-muted-foreground">Belum ada data produk.</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Revenue</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topProducts.slice(0, 8).map((item: any) => (
                                            <TableRow key={item.productId}>
                                                <TableCell className="font-medium">{item.productName}</TableCell>
                                                <TableCell className="text-right">{item.qty}</TableCell>
                                                <TableCell className="text-right">{formatRupiah(item.revenue)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Daily Cashflow</CardTitle>
                            <CardDescription>Rincian cashflow harian per metode pembayaran.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {dailyCashflow.length === 0 ? (
                                <div className="text-sm text-muted-foreground">Belum ada cashflow harian.</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Cash In</TableHead>
                                            <TableHead className="text-right">Cash Expenses</TableHead>
                                            <TableHead className="text-right">Cash Additional</TableHead>
                                            <TableHead className="text-right">Net Cash</TableHead>
                                            <TableHead className="text-right">QRIS In</TableHead>
                                            <TableHead className="text-right">QRIS Expenses</TableHead>
                                            <TableHead className="text-right">QRIS Additional</TableHead>
                                            <TableHead className="text-right">Net QRIS</TableHead>
                                            <TableHead className="text-right">Transfer In</TableHead>
                                            <TableHead className="text-right">Transfer Expenses</TableHead>
                                            <TableHead className="text-right">Transfer Additional</TableHead>
                                            <TableHead className="text-right">Net Transfer</TableHead>
                                            <TableHead className="text-right">Net Daily</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dailyCashflow.slice(-8).map((row: any) => (
                                            <TableRow key={row.date}>
                                                <TableCell className="font-medium">{row.date}</TableCell>
                                                <TableCell className="text-right">{formatRupiah(row.cashIncome)}</TableCell>
                                                <TableCell className="text-right">{formatRupiah(row.cashExpenses)}</TableCell>
                                                <TableCell className="text-right">{formatRupiah(row.cashAdditional)}</TableCell>
                                                <TableCell className="text-right">{formatRupiah(row.netCash)}</TableCell>
                                                <TableCell className="text-right">{formatRupiah(row.qrisIncome)}</TableCell>
                                                <TableCell className="text-right">{formatRupiah(row.qrisExpenses)}</TableCell>
                                                <TableCell className="text-right">{formatRupiah(row.qrisAdditional)}</TableCell>
                                                <TableCell className="text-right">{formatRupiah(row.netQris)}</TableCell>
                                                <TableCell className="text-right">{formatRupiah(row.transferIncome || 0)}</TableCell>
                                                <TableCell className="text-right">{formatRupiah(row.transferExpenses || 0)}</TableCell>
                                                <TableCell className="text-right">{formatRupiah(row.transferAdditional || 0)}</TableCell>
                                                <TableCell className="text-right">{formatRupiah(row.netTransfer || 0)}</TableCell>
                                                <TableCell className="text-right">{formatRupiah(row.netDailyIncome)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {aggregated && aggregated.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Period Breakdown</CardTitle>
                                <CardDescription>Revenue, orders, dan cash per periode.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Period</TableHead>
                                            <TableHead className="text-right">Revenue</TableHead>
                                            <TableHead className="text-right">Orders</TableHead>
                                            <TableHead className="text-right">Cash In Drawer</TableHead>
                                            <TableHead className="text-right">Expenses</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {aggregated.slice(-8).map((row) => (
                                            <TableRow key={row.period}>
                                                <TableCell className="font-medium">{row.period}</TableCell>
                                                <TableCell className="text-right">{formatRupiah(row.amount)}</TableCell>
                                                <TableCell className="text-right">{row.ordersCount}</TableCell>
                                                <TableCell className="text-right">{formatRupiah(row.cashInDrawer)}</TableCell>
                                                <TableCell className="text-right">{formatRupiah(row.expenses)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Audit Logs (Filtered)</CardTitle>
                            <CardDescription>System actions in the selected range.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Entity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</TableCell>
                                            <TableCell className="font-medium">{log.user?.name || 'System'}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
                                                    {log.action}
                                                </span>
                                            </TableCell>
                                            <TableCell>{log.entity}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </details>
        </div>
    );
}

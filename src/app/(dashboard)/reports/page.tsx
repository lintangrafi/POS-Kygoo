import { getAuditLogs } from '@/actions/admin-actions';
import { getFinancialReport, getTopProducts, getAggregatedRevenue } from '@/actions/report-actions';
import TrendChart from '@/components/reports/TrendChart';
import BarChart from '@/components/reports/BarChart';
import { formatRupiah } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function ReportsPage({ searchParams }: { searchParams?: { from?: string; to?: string; period?: string } }) {
    // `searchParams` may be a Promise in some Next.js versions, unwrap it to `sp`
    const sp = await (searchParams as any);

    // period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' (default custom = date-range)
    const period = (sp?.period as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom') || 'custom';

    // parse date range from query params or default to last 30 days
    const to = sp?.to ? new Date(sp.to) : new Date();
    const from = sp?.from ? new Date(sp.from) : new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
    const toInclusive = new Date(to.getTime() + 1000 * 60 * 60 * 24); // include end day

    // Always fetch financial report for the selected range so metrics reflect the period
    const r = await getFinancialReport({ from, to: toInclusive });

    // fetch audit logs filtered by selected range (limit to 10 for reports)
    const logs = await getAuditLogs({ from, to: toInclusive, limit: 10 });

    // aggregated series used for charts when not custom
    let aggregated: { period: string; amount: number }[] | null = null;
    if (period !== 'custom') {
        aggregated = await getAggregatedRevenue({ from, to: toInclusive, period });
    }

    const topProducts = await getTopProducts({ from, to: toInclusive, limit: 10 });

    // Trend data: if aggregated (daily/weekly/monthly/yearly) use aggregated series, otherwise use dailyRevenue from custom report
    const trendData = aggregated ? aggregated.map(a => ({ period: a.period, amount: Number(a.amount) })) : Object.entries(r?.dailyRevenue || {}).map(([period, amount]) => ({ period, amount: Number(amount) }));
    const trendLabel = aggregated ? `${period} revenue` : 'Daily revenue (custom range)';

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                <p className="text-muted-foreground">Financial summaries and activity reports.</p>
            </div>

            <form method="get" className="flex items-end gap-4">
                {period === 'custom' && (
                    <>
                        <div>
                            <label className="text-sm text-muted-foreground">From</label>
                            <input name="from" type="date" defaultValue={from.toISOString().slice(0, 10)} className="mt-1 block rounded-md border px-3 py-2" />
                        </div>
                        <div>
                            <label className="text-sm text-muted-foreground">To</label>
                            <input name="to" type="date" defaultValue={to.toISOString().slice(0, 10)} className="mt-1 block rounded-md border px-3 py-2" />
                        </div>
                    </>
                )}
                <input type="hidden" name="period" value={period} />
                <button type="submit" className="btn btn-primary">Filter</button>
            </form>

            {/* period buttons set explicit ranges */}
            <div className="mt-4 flex gap-2">
                {/* compute ranges relative to today */}
                {
                    (() => {
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        const fmt = (d: Date) => d.toISOString().slice(0,10);
                        const ranges: Record<string, [Date, Date]> = {
                            daily: [today, today],
                            weekly: [new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000), today],
                            monthly: [new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000), today],
                            yearly: [new Date(today.getTime() - 364 * 24 * 60 * 60 * 1000), today],
                            custom: [from, to],
                        };
                        const dDaily = ranges.daily; const dWeekly = ranges.weekly; const dMonthly = ranges.monthly; const dYearly = ranges.yearly;
                        return (
                            <>
                                <a title="Show daily aggregates" href={`?period=daily&from=${fmt(dDaily[0])}&to=${fmt(dDaily[1])}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'daily' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-100'} transition`}>Daily</a>
                                <a title="Show weekly aggregates" href={`?period=weekly&from=${fmt(dWeekly[0])}&to=${fmt(dWeekly[1])}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'weekly' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-100'} transition`}>Weekly</a>
                                <a title="Show monthly aggregates" href={`?period=monthly&from=${fmt(dMonthly[0])}&to=${fmt(dMonthly[1])}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'monthly' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-100'} transition`}>Monthly</a>
                                <a title="Show yearly aggregates" href={`?period=yearly&from=${fmt(dYearly[0])}&to=${fmt(dYearly[1])}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'yearly' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-100'} transition`}>Yearly</a>
                                <a title="Show custom range" href={`?period=custom&from=${from.toISOString().slice(0,10)}&to=${to.toISOString().slice(0,10)}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'custom' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-100'} transition`}>Custom range</a>
                            </>
                        );
                    })()
                }
            </div>

            {/* Summary metrics for the selected range (always shown) */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Turnover</CardTitle>
                        <CardDescription>Revenue in selected range</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold">{formatRupiah(r.turnover)}</div>
                        <div className="text-sm text-muted-foreground">Orders: {r.totalOrders}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>HPP / COGS</CardTitle>
                        <CardDescription>Cost of goods sold</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold">{formatRupiah(r.cogs)}</div>
                        <div className="text-sm text-muted-foreground">Calculated from order items</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Gross Profit</CardTitle>
                        <CardDescription>Turnover - HPP</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold">{formatRupiah(r.grossProfit)}</div>
                        <div className="text-sm text-muted-foreground">{r.turnover > 0 ? ((r.grossProfit / r.turnover) * 100).toFixed(1) + '%' : '-'}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Payments Breakdown</CardTitle>
                        <CardDescription>By payment method</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Method</TableHead>
                                    <TableHead>Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(r.paymentsBreakdown || {}).map(([method, amount]) => (
                                    <TableRow key={method}>
                                        <TableCell className="font-medium">{method}</TableCell>
                                        <TableCell>{formatRupiah(Number(amount))}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Cash in Drawer</CardTitle>
                        <CardDescription>Reported cash from closed shifts in period</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold">{formatRupiah(r.totalCashInDrawer || 0)}</div>
                        <div className="text-sm text-muted-foreground">From {r.shifts?.length || 0} closed shift(s)</div>
                    </CardContent>
                </Card>
            </div>

            {/* Show bar chart for custom (daily revenue) */}
            {!aggregated && (
                <Card className="mt-4">
                    <CardHeader>
                        <CardTitle>Revenue</CardTitle>
                        <CardDescription>{period === 'custom' ? 'Daily revenue (custom range)' : 'Revenue for selected range'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mt-2">
                            <BarChart data={trendData} xLabel={period === 'daily' || period === 'custom' ? 'Date' : period === 'weekly' ? 'Week start' : period === 'monthly' ? 'Month' : 'Year'} yLabel={'Amount (IDR)'} showValues={true} />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Aggregated chart and table (if applicable) */}
            {aggregated && (
                <div className="grid grid-cols-1 gap-4">
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>{period.charAt(0).toUpperCase() + period.slice(1)} Revenue</CardTitle>
                            <CardDescription>Aggregated revenue by {period} for selected range</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TrendChart data={aggregated.map(a => ({ period: a.period, amount: Number(a.amount) }))} periodLabel={`${period} aggregate`} />
                            <div className="mt-6">
                                <BarChart data={aggregated.map(a => ({ period: a.period, amount: Number(a.amount) }))} xLabel={period === 'daily' ? 'Date' : period === 'weekly' ? 'Week start' : period === 'monthly' ? 'Month' : 'Year'} yLabel={'Amount (IDR)'} showValues={true} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Aggregated table</CardTitle>
                            <CardDescription>Raw numbers for the selected period</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{period === 'daily' ? 'Date' : period === 'weekly' ? 'Week' : period === 'monthly' ? 'Month' : 'Year'}</TableHead>
                                        <TableHead>Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {aggregated.map((row) => (
                                        <TableRow key={row.period}>
                                            <TableCell className="font-medium">{row.period}</TableCell>
                                            <TableCell>{formatRupiah(Number(row.amount))}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Top Products</CardTitle>
                        <CardDescription>Most sold products by quantity</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TrendChart data={trendData} periodLabel={trendLabel} />
                        <Table className="mt-4">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead>Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topProducts.map((p) => (
                                    <TableRow key={p.productId}>
                                        <TableCell className="font-medium">{p.productName}</TableCell>
                                        <TableCell>{p.qty}</TableCell>
                                        <TableCell>{formatRupiah(p.revenue)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

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
        </div>
    );
}

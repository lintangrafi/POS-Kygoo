import { getAuditLogs } from '@/actions/admin-actions';
import { getFinancialReport, getTopProducts, getAggregatedRevenue, getDailyCashflow } from '@/actions/report-actions';
import { getExpenses } from '@/actions/expense-actions';
import { getIncomes } from '@/actions/income-actions';
import TrendChart from '@/components/reports/TrendChart';
import BarChart from '@/components/reports/BarChart';
import { ExpenseManagement } from '@/components/reports/ExpenseManagement';
import { IncomeManagement } from '@/components/reports/IncomeManagement';
import { formatRupiah } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function ReportsPage({ searchParams }: { searchParams?: { from?: string; to?: string; period?: string } }) {
    // `searchParams` may be a Promise in some Next.js versions, unwrap it to `sp`
    const sp = await (searchParams as any);

    // period: 'today' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' (default today)
    const period = (sp?.period as 'today' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom') || 'today';

    // parse date range from query params or default based on period
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let from: Date, to: Date;
    
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
            from = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
            to = today;
        } else if (period === 'weekly') {
            from = new Date(today.getTime() - 6 * 7 * 24 * 60 * 60 * 1000);
            to = today;
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
    
    const toInclusive = new Date(to.getTime() + 1000 * 60 * 60 * 24); // include end day

    // Always fetch financial report for the selected range so metrics reflect the period
    const r = await getFinancialReport({ from, to: toInclusive });

    // fetch audit logs filtered by selected range (limit to 10 for reports)
    const logs = await getAuditLogs({ from, to: toInclusive, limit: 10 });

    // fetch expenses filtered by selected range
    const expensesList = await getExpenses({ from, to: toInclusive });

    // fetch incomes filtered by selected range
    const incomesList = await getIncomes({ from, to: toInclusive });

    // fetch daily cashflow detailed breakdown
    const dailyCashflow = await getDailyCashflow({ from, to: toInclusive });

    // aggregated series used for charts when not custom/today
    let aggregated: { period: string; amount: number; paymentsBreakdown: Record<string, number>; ordersCount: number; cashInDrawer: number; expenses: number }[] | null = null;
    if (period !== 'custom' && period !== 'today') {
        aggregated = await getAggregatedRevenue({ from, to: toInclusive, period });
    }

    const topProducts = await getTopProducts({ from, to: toInclusive, limit: 10 });

    // Trend data: if aggregated (daily/weekly/monthly/yearly) use aggregated series, otherwise use dailyRevenue from custom report
    const trendData = aggregated ? aggregated.map(a => ({ period: a.period, amount: Number(a.amount) })) : Object.entries(r?.dailyRevenue || {}).map(([period, amount]) => ({ period, amount: Number(amount) }));
    const trendLabel = aggregated ? `${period} revenue` : period === 'today' ? "Today's revenue" : 'Daily revenue (custom range)';

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Financial summaries and activity reports.</p>
            </div>

            <form method="get" className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                {period === 'custom' && (
                    <>
                        <div>
                            <label className="text-sm text-muted-foreground">From</label>
                            <input name="from" type="date" defaultValue={`${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`} className="mt-1 block rounded-md border px-3 py-2" />
                        </div>
                        <div>
                            <label className="text-sm text-muted-foreground">To</label>
                            <input name="to" type="date" defaultValue={`${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}-${String(to.getDate()).padStart(2, '0')}`} className="mt-1 block rounded-md border px-3 py-2" />
                        </div>
                    </>
                )}
                <input type="hidden" name="period" value={period} />
                <button type="submit" className="btn btn-primary">Filter</button>
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
                            daily: [new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000), today], // last 7 days with daily aggregation
                            weekly: [new Date(today.getTime() - 6 * 7 * 24 * 60 * 60 * 1000), today], // last 7 weeks
                            monthly: [new Date(today.getTime() - 11 * 30 * 24 * 60 * 60 * 1000), today], // last 12 months
                            yearly: [new Date(today.getTime() - 4 * 365 * 24 * 60 * 60 * 1000), today], // last 5 years
                            custom: [from, to],
                        };
                        const dToday = ranges.today; const dDaily = ranges.daily; const dWeekly = ranges.weekly; const dMonthly = ranges.monthly; const dYearly = ranges.yearly;
                        return (
                            <>
                                <a title="Show today's report" href={`?period=today&from=${fmt(dToday[0])}&to=${fmt(dToday[1])}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'today' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-100'} transition`}>Today</a>
                                <a title="Show daily aggregates" href={`?period=daily&from=${fmt(dDaily[0])}&to=${fmt(dDaily[1])}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'daily' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-100'} transition`}>Daily</a>
                                <a title="Show weekly aggregates" href={`?period=weekly&from=${fmt(dWeekly[0])}&to=${fmt(dWeekly[1])}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'weekly' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-100'} transition`}>Weekly</a>
                                <a title="Show monthly aggregates" href={`?period=monthly&from=${fmt(dMonthly[0])}&to=${fmt(dMonthly[1])}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'monthly' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-100'} transition`}>Monthly</a>
                                <a title="Show yearly aggregates" href={`?period=yearly&from=${fmt(dYearly[0])}&to=${fmt(dYearly[1])}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'yearly' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-100'} transition`}>Yearly</a>
                                <a title="Show custom range" href={`?period=custom&from=${fmt(from)}&to=${fmt(to)}`} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${period === 'custom' ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-100'} transition`}>Custom range</a>
                            </>
                        );
                    })()
                }
            </div>

            {/* Summary metrics for the selected range (always shown) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
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
                        <CardTitle>Expenses</CardTitle>
                        <CardDescription>Daily operational costs</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold text-red-600">{formatRupiah(r.totalExpenses || 0)}</div>
                        <div className="text-sm text-muted-foreground">{r.expenses?.length || 0} expense(s)</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Additional Income</CardTitle>
                        <CardDescription>Daily additional income sources</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold text-green-600">+{formatRupiah(r.totalIncomes || 0)}</div>
                        <div className="text-sm text-muted-foreground">{r.incomes?.length || 0} income(s)</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
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
                        <CardTitle>Net Profit</CardTitle>
                        <CardDescription>Gross Profit - Expenses + Additional Income</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold">{formatRupiah(r.netProfit || 0)}</div>
                        <div className="text-sm text-muted-foreground">{r.turnover > 0 ? ((r.netProfit / r.turnover) * 100).toFixed(1) + '%' : '-'}</div>
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

            {/* Daily Cashflow Detail */}
            <Card>
                <CardHeader>
                    <CardTitle>Daily Cashflow Detail</CardTitle>
                    <CardDescription>Net cash by payment method for each day (Cash/QRIS income + additional income - expenses)</CardDescription>
                </CardHeader>
                <CardContent>
                    {dailyCashflow && dailyCashflow.length > 0 ? (
                        <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Orders Total</TableHead>
                                    <TableHead className="bg-green-50">Cash Income</TableHead>
                                    <TableHead className="bg-blue-50">QRIS Income</TableHead>
                                    <TableHead className="bg-green-50">Cash +Income</TableHead>
                                    <TableHead className="bg-blue-50">QRIS +Income</TableHead>
                                    <TableHead className="bg-red-50">Cash Exp</TableHead>
                                    <TableHead className="bg-red-50">QRIS Exp</TableHead>
                                    <TableHead className="font-bold bg-green-100">Net Cash</TableHead>
                                    <TableHead className="font-bold bg-blue-100">Net QRIS</TableHead>
                                    <TableHead className="font-bold">Daily Net</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dailyCashflow.map((day, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">{day.date}</TableCell>
                                        <TableCell>{formatRupiah(day.ordersTotal)}</TableCell>
                                        <TableCell className="bg-green-50">{formatRupiah(day.cashIncome)}</TableCell>
                                        <TableCell className="bg-blue-50">{formatRupiah(day.qrisIncome)}</TableCell>
                                        <TableCell className="bg-green-50 text-green-600">+{formatRupiah(day.cashAdditional)}</TableCell>
                                        <TableCell className="bg-blue-50 text-green-600">+{formatRupiah(day.qrisAdditional)}</TableCell>
                                        <TableCell className="bg-red-50 text-red-600">{formatRupiah(day.cashExpenses)}</TableCell>
                                        <TableCell className="bg-red-50 text-red-600">{formatRupiah(day.qrisExpenses)}</TableCell>
                                        <TableCell className={`font-bold bg-green-100 ${day.netCash >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                            {day.netCash >= 0 ? '+' : '-'}{formatRupiah(Math.abs(day.netCash))}
                                        </TableCell>
                                        <TableCell className={`font-bold bg-blue-100 ${day.netQris >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                            {day.netQris >= 0 ? '+' : '-'}{formatRupiah(Math.abs(day.netQris))}
                                        </TableCell>
                                        <TableCell className={`font-bold ${day.netDailyIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                            {day.netDailyIncome >= 0 ? '+' : '-'}{formatRupiah(Math.abs(day.netDailyIncome))}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No financial data for selected period
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Show bar chart for custom/today (daily revenue) */}
            {(period === 'custom' || period === 'today') && (
                <Card className="mt-4">
                    <CardHeader>
                        <CardTitle>Revenue</CardTitle>
                        <CardDescription>{period === 'today' ? "Today's revenue" : 'Daily revenue (custom range)'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mt-2">
                            <BarChart data={trendData} xLabel="Date" yLabel="Amount (IDR)" showValues={true} />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Aggregated chart and table (if applicable) */}
            {aggregated && aggregated.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Daily Revenue vs Expenses</CardTitle>
                            <CardDescription>Revenue and operational expenses breakdown by {period}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {aggregated.map((row) => {
                                    const revenue = Number(row.amount);
                                    const expenses = Number(row.expenses);
                                    const netProfit = revenue - expenses;
                                    return (
                                        <div key={row.period} className="border rounded-lg p-4 space-y-3">
                                            <div className="font-semibold text-sm">{row.period}</div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Revenue:</span>
                                                    <span className="font-semibold">{formatRupiah(revenue)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Expenses:</span>
                                                    <span className="font-semibold text-red-600">{formatRupiah(expenses)}</span>
                                                </div>
                                                <div className="border-t pt-2 flex justify-between">
                                                    <span className="text-muted-foreground font-medium">Net Profit:</span>
                                                    <span className={`font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {formatRupiah(netProfit)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

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
                            <CardDescription>Detailed breakdown for the selected period</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{period === 'daily' ? 'Date' : period === 'weekly' ? 'Week' : period === 'monthly' ? 'Month' : 'Year'}</TableHead>
                                            <TableHead>Revenue</TableHead>
                                            <TableHead>Expenses</TableHead>
                                            <TableHead>Net Profit</TableHead>
                                            <TableHead>Orders</TableHead>
                                            <TableHead>Payment Breakdown</TableHead>
                                            <TableHead>Cash in Drawer</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {aggregated.map((row) => {
                                            const revenue = Number(row.amount);
                                            const expenses = Number(row.expenses);
                                            const netProfit = revenue - expenses;
                                            const netProfitPercent = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '-';
                                            return (
                                                <TableRow key={row.period}>
                                                    <TableCell className="font-medium">{row.period}</TableCell>
                                                    <TableCell className="font-semibold">{formatRupiah(revenue)}</TableCell>
                                                    <TableCell className="text-red-600 font-semibold">{formatRupiah(expenses)}</TableCell>
                                                    <TableCell className={`font-semibold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        <div>{formatRupiah(netProfit)}</div>
                                                        <div className="text-xs text-muted-foreground">{netProfitPercent}%</div>
                                                    </TableCell>
                                                    <TableCell>{row.ordersCount}</TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1 text-xs">
                                                            {Object.entries(row.paymentsBreakdown || {}).map(([method, amt]) => (
                                                                <div key={method} className="flex justify-between gap-4">
                                                                    <span className="font-medium">{method}:</span>
                                                                    <span>{formatRupiah(Number(amt))}</span>
                                                                </div>
                                                            ))}
                                                            {Object.keys(row.paymentsBreakdown || {}).length === 0 && (
                                                                <span className="text-muted-foreground">-</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{formatRupiah(Number(row.cashInDrawer))}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Top Products</CardTitle>
                        <CardDescription>Most sold products by quantity in selected period</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
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
                        <CardTitle>Expenses Management</CardTitle>
                        <CardDescription>Record daily operational expenses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ExpenseManagement expenses={expensesList as any} />
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Income Management</CardTitle>
                    <CardDescription>Record daily additional income (services, refunds, etc)</CardDescription>
                </CardHeader>
                <CardContent>
                    <IncomeManagement incomes={incomesList as any} />
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
    );
}

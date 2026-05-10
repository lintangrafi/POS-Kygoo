import { getDashboardStats } from '@/actions/admin-actions';
import { getOpenShift } from '@/actions/shift-actions';
import { getExpenses } from '@/actions/expense-actions';
import { getIncomes } from '@/actions/income-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { BadgeDollarSign, ShoppingBag, AlertTriangle, TrendingUp, Wallet } from 'lucide-react';
import { getPaymentMethodFromPayments } from '@/components/ui/payment-badge';
import { verifySession } from '@/lib/auth';
import { getCurrentUserEventId } from '@/lib/event-utils';

export default async function DashboardPage() {
    const session = await verifySession();
    const userEventId = await getCurrentUserEventId();
    if (session.role === 'ADMIN' && userEventId) {
        return <div className="p-8 text-sm text-[#8B1A1A]">Not authorized</div>;
    }

    // Parallelize all data fetching
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const [stats, openShift, todayExpenses, todayIncomes] = await Promise.all([
        getDashboardStats(),
        getOpenShift(),
        getExpenses({ from: today, to: tomorrow }).catch((error) => {
            console.error('[dashboard] failed to load expenses, fallback to empty list', error);
            return [] as Awaited<ReturnType<typeof getExpenses>>;
        }),
        getIncomes({ from: today, to: tomorrow }).catch((error) => {
            console.error('[dashboard] failed to load incomes, fallback to empty list', error);
            return [] as Awaited<ReturnType<typeof getIncomes>>;
        }),
    ]);
    const totalExpenses = todayExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const totalIncomes = todayIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0);

    // Calculate net profit: revenue - expenses + additional incomes
    // Consistent with report-actions formula: turnover - cogs - expenses + incomes
    // (COGS not available at dashboard level without fetching order items, so simplified)
    const netProfit = stats.todaySales - totalExpenses + totalIncomes;
    const profitPercentage = stats.todaySales > 0 ? ((netProfit / stats.todaySales) * 100).toFixed(1) : '0';

    return (
        <div className="min-h-screen bg-[#F5F1E8]">
            <div className="p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C86B2A]">Ringkasan Harian</p>
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2">Dashboard Operasional</h1>
                        <p className="mt-2 max-w-2xl text-sm text-gray-600">
                            Pantau performa toko hari ini, lihat kondisi shift aktif, dan deteksi stok kritis sebelum mengganggu penjualan.
                        </p>
                    </div>
                    <button className="bg-[#C86B2A] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#A85820] transition-colors whitespace-nowrap h-fit">
                        + Transaksi Baru
                    </button>
                </div>

                {/* Metric Cards: 4 columns */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                    <Card className="border-[#E6DED0] bg-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pendapatan Hari Ini</CardTitle>
                            <BadgeDollarSign className="h-5 w-5 text-[#C86B2A]" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">{formatRupiah(stats.todaySales)}</div>
                            <p className="text-xs text-gray-600 mt-1">Total nilai transaksi yang berhasil diproses.</p>
                        </CardContent>
                    </Card>

                    <Card className="border-[#E6DED0] bg-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Laba Bersih</CardTitle>
                            <TrendingUp className="h-5 w-5 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatRupiah(netProfit)}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{profitPercentage}% margin hari ini</p>
                        </CardContent>
                    </Card>

                    <Card className="border-[#E6DED0] bg-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Transaksi</CardTitle>
                            <ShoppingBag className="h-5 w-5 text-gray-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">{stats.todayCount}</div>
                            <p className="text-xs text-gray-600 mt-1">Rata-rata Rp {stats.todayCount > 0 ? formatRupiah(Math.round(stats.todaySales / stats.todayCount)) : '0'}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-[#F0D8C5] bg-[#FFF8F3]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Stok Kritis</CardTitle>
                            <AlertTriangle className="h-5 w-5 text-[#C86B2A]" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-[#C86B2A]">{stats.lowStock.length} item</div>
                            <p className="text-xs text-gray-600 mt-1">Perlu restock hari ini</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Net Profit Summary Card */}
                <Card className="border-[#E6DED0] bg-white">
                    <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="text-lg font-semibold">Laba Bersih Hari Ini</CardTitle>
                            <CardDescription className="text-gray-600">Pendapatan - pengeluaran operasional</CardDescription>
                        </div>
                        <Wallet className={`h-8 w-8 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatRupiah(netProfit)}
                        </div>
                        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                            <div className="rounded-lg border border-[#E6DED0] bg-[#FAFAF9] p-4">
                                <p className="text-xs uppercase tracking-wide text-gray-600">Pemasukan</p>
                                <p className="mt-2 font-semibold text-gray-900">{formatRupiah(stats.todaySales)}</p>
                            </div>
                            <div className="rounded-lg border border-[#E6DED0] bg-[#FAFAF9] p-4">
                                <p className="text-xs uppercase tracking-wide text-gray-600">Pengeluaran</p>
                                <p className="mt-2 font-semibold text-gray-900">{formatRupiah(totalExpenses)}</p>
                            </div>
                            <div className="rounded-lg border border-[#E6DED0] bg-[#FAFAF9] p-4">
                                <p className="text-xs uppercase tracking-wide text-gray-600">Margin</p>
                                <p className="mt-2 font-semibold text-gray-900">{profitPercentage}%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tren Revenue & Aktivitas Terbaru */}
                <div className="grid gap-4 grid-cols-1 xl:grid-cols-7">
                    <Card className="xl:col-span-4 border-[#E6DED0] bg-white">
                        <CardHeader>
                            <CardTitle>Tren Revenue 7 Hari</CardTitle>
                            <CardDescription className="text-gray-600">Performa penjualan mingguan</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64 flex items-center justify-center text-gray-400">
                                [Revenue Chart Area]
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="xl:col-span-3 border-[#E6DED0] bg-white">
                        <CardHeader>
                            <CardTitle>Aktivitas Terbaru</CardTitle>
                            <CardDescription className="text-gray-600">Update status dan kejadian penting</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {stats.recentOrders.slice(0, 3).map((order: any) => (
                                    <div key={order.id} className="flex items-center gap-3 pb-3">
                                        <div className="w-1 h-1 bg-[#C86B2A] rounded-full flex-shrink-0"></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{order.invoiceNumber}</p>
                                            <p className="text-xs text-gray-600">
                                                {order.payments && order.payments.length > 0 
                                                    ? getPaymentMethodFromPayments(order.payments)
                                                    : 'N/A'
                                                }
                                            </p>
                                        </div>
                                        <p className="text-xs text-gray-600 whitespace-nowrap">
                                            {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                ))}
                                {stats.recentOrders.length === 0 && (
                                    <p className="text-sm text-gray-600">Belum ada aktivitas transaksi hari ini.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 grid-cols-1 xl:grid-cols-3">
                    <Card className="border-[#E6DED0] bg-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xl">Top Product</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {stats.lowStock.slice(0, 3).map((product) => (
                                <div key={product.id} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-900">{product.name}</span>
                                    <span className="text-gray-600">{product.stock}x</span>
                                </div>
                            ))}
                            {stats.lowStock.length === 0 && <p className="text-sm text-gray-600">Data produk aman.</p>}
                        </CardContent>
                    </Card>

                    <Card className="border-[#E6DED0] bg-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xl">Shift Aktif</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm">
                            {openShift ? (
                                <>
                                    <p className="text-gray-900">Kasir: {openShift.user?.name || 'Unknown'}</p>
                                    <p className="text-gray-600">Mulai {new Date(openShift.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                </>
                            ) : (
                                <p className="text-gray-600">Belum ada shift aktif.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-[#F0D8C5] bg-[#FFF8F3]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xl text-[#8A5328]">Action Required</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm text-[#7A5A42]">
                            <p>- {stats.lowStock.length} item stok di bawah minimum</p>
                            <p>- {todayExpenses.length} data pengeluaran tercatat</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

import { getDashboardStats } from '@/actions/admin-actions';
import { getOpenShift } from '@/actions/shift-actions';
import { getExpenses } from '@/actions/expense-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { BadgeDollarSign, ShoppingBag, AlertTriangle, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

export default async function DashboardPage() {
    const stats = await getDashboardStats();
    const openShift = await getOpenShift();

    // Get today's expenses
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const todayExpenses = await getExpenses({ from: today, to: tomorrow });
    const totalExpenses = todayExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    // Calculate net profit (revenue - expenses)
    const netProfit = stats.todaySales - totalExpenses;
    const profitPercentage = stats.todaySales > 0 ? ((netProfit / stats.todaySales) * 100).toFixed(1) : '0';

    return (
        <div className="w-full space-y-8 enter-fade">
            <div className="enter-fade-up">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Ringkasan Harian</p>
                <h1>Dashboard Operasional</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                    Pantau performa toko hari ini, lihat kondisi shift aktif, dan deteksi stok kritis sebelum mengganggu penjualan.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
                <Card className="enter-fade-up stagger-1 border-border/70">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pendapatan Hari Ini</CardTitle>
                        <BadgeDollarSign className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatRupiah(stats.todaySales)}</div>
                        <p className="text-xs text-muted-foreground">Total nilai transaksi yang berhasil diproses.</p>
                    </CardContent>
                </Card>

                <Card className="enter-fade-up stagger-2 border-border/70">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pengeluaran Hari Ini</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatRupiah(totalExpenses)}</div>
                        <p className="text-xs text-muted-foreground">{todayExpenses.length} data pengeluaran tercatat.</p>
                    </CardContent>
                </Card>

                <Card className="enter-fade-up stagger-3 border-border/70">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.todayCount}</div>
                        <p className="text-xs text-muted-foreground">Orders processed today</p>
                    </CardContent>
                </Card>

                <Card className="enter-fade-up stagger-4 border-border/70">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.lowStock.length}</div>
                        <p className="text-xs text-muted-foreground">Products require attention</p>
                    </CardContent>
                </Card>

                <Card className="enter-fade-up stagger-5 border-border/70">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Shift</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {openShift ? (
                            <div>
                                <div className="text-lg font-semibold">Opened by {openShift.user?.name || 'Unknown'}</div>
                                <div className="text-sm text-muted-foreground">{new Date(openShift.startTime).toLocaleString()}</div>
                            </div>
                        ) : (
                            <div className="text-2xl font-bold">No active shift</div>
                        )}
                        <p className="text-xs text-muted-foreground">Current cashier status</p>
                    </CardContent>
                </Card>
            </div>

            {/* Net Profit Summary Card */}
            <Card className="enter-fade-up surface-glass border-border/70">
                <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="text-lg font-semibold">Laba Bersih Hari Ini</CardTitle>
                        <CardDescription>Pendapatan - pengeluaran operasional</CardDescription>
                    </div>
                    <Wallet className={`h-8 w-8 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatRupiah(netProfit)}
                    </div>
                    <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                        <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                            <p className="text-xs uppercase tracking-wide">Pemasukan</p>
                            <p className="mt-1 font-semibold text-foreground">{formatRupiah(stats.todaySales)}</p>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                            <p className="text-xs uppercase tracking-wide">Pengeluaran</p>
                            <p className="mt-1 font-semibold text-foreground">{formatRupiah(totalExpenses)}</p>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                            <p className="text-xs uppercase tracking-wide">Margin</p>
                            <p className="mt-1 font-semibold text-foreground">{profitPercentage}%</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Sales & Low Stock Details */}
            <div className="grid gap-4 grid-cols-1 xl:grid-cols-7">
                <Card className="xl:col-span-4 col-span-1 enter-fade-up border-border/70">
                    <CardHeader>
                        <CardTitle>Transaksi Terbaru</CardTitle>
                        <CardDescription>Daftar penjualan paling akhir dari kasir.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.recentOrders.map((order) => (
                                <div key={order.id} className="flex items-center rounded-lg border border-border/60 bg-background/60 p-3">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">{order.invoiceNumber}</p>
                                        <p className="text-sm text-muted-foreground">
                                            by {order.user.name} at {new Date(order.createdAt).toLocaleTimeString()}
                                        </p>
                                    </div>
                                    <div className="ml-auto font-medium">{formatRupiah(Number(order.totalAmount))}</div>
                                </div>
                            ))}
                            {stats.recentOrders.length === 0 && (
                                <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
                                    Belum ada transaksi hari ini.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="xl:col-span-3 col-span-1 enter-fade-up stagger-1 border-border/70">
                    <CardHeader>
                        <CardTitle>Peringatan Stok Menipis</CardTitle>
                        <CardDescription>Produk dengan stok di bawah batas aman.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.lowStock.map((product) => (
                                <div key={product.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 p-3">
                                    <div>
                                        <p className="text-sm font-medium">{product.name}</p>
                                        <p className="text-xs text-muted-foreground">SKU: {product.sku || 'N/A'}</p>
                                    </div>
                                    <div className="font-bold text-red-600">
                                        {product.stock} left
                                    </div>
                                </div>
                            ))}
                            {stats.lowStock.length === 0 && (
                                <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
                                    Stok aman. Tidak ada item kritis saat ini.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

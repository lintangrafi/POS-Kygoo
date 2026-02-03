import { getDashboardStats } from '@/actions/admin-actions';
import { getOpenShift } from '@/actions/shift-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { BadgeDollarSign, ShoppingBag, AlertTriangle, TrendingUp } from 'lucide-react';

export default async function DashboardPage() {
    const stats = await getDashboardStats();
    const openShift = await getOpenShift();

    return (
        <div className="w-full space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">Overview of your store's performance today.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue (Today)</CardTitle>
                        <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatRupiah(stats.todaySales)}</div>
                        <p className="text-xs text-muted-foreground">+0% from yesterday</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.todayCount}</div>
                        <p className="text-xs text-muted-foreground">Orders processed today</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.lowStock.length}</div>
                        <p className="text-xs text-muted-foreground">Products require attention</p>
                    </CardContent>
                </Card>

                <Card>
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

            {/* Recent Sales & Low Stock Details */}
            <div className="grid gap-4 grid-cols-1 xl:grid-cols-7">
                <Card className="xl:col-span-4 col-span-1">
                    <CardHeader>
                        <CardTitle>Recent Sales</CardTitle>
                        <CardDescription>Latest transactions from the POS.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.recentOrders.map((order) => (
                                <div key={order.id} className="flex items-center">
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">{order.invoiceNumber}</p>
                                        <p className="text-sm text-muted-foreground">
                                            by {order.user.name} at {new Date(order.createdAt).toLocaleTimeString()}
                                        </p>
                                    </div>
                                    <div className="ml-auto font-medium">{formatRupiah(Number(order.totalAmount))}</div>
                                </div>
                            ))}
                            {stats.recentOrders.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">No recent sales.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="xl:col-span-3 col-span-1">
                    <CardHeader>
                        <CardTitle>Low Stock Alerts</CardTitle>
                        <CardDescription>Items with stock below 10.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.lowStock.map((product) => (
                                <div key={product.id} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">{product.name}</p>
                                        <p className="text-xs text-muted-foreground">SKU: {product.sku || 'N/A'}</p>
                                    </div>
                                    <div className="font-bold text-red-500">
                                        {product.stock} left
                                    </div>
                                </div>
                            ))}
                            {stats.lowStock.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">Inventory looks good.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

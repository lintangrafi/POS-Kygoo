import { getOrderById } from '@/actions/admin-actions';
import { formatRupiah } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default async function InvoiceDetail({ params }: { params: { id: string } }) {
    const p = await params;
    const id = Number(p.id);
    if (Number.isNaN(id) || !Number.isFinite(id)) {
        return <div className="p-8">Invoice not found</div>;
    }
    const order = await getOrderById(id);

    if (!order) return <div className="p-8">Invoice not found</div>;

    const getStatusBadge = (status: string) => {
        if (status === 'COMPLETED') {
            return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-base px-4 py-1">✓ Completed</Badge>;
        }
        if (status === 'VOID') {
            return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-base px-4 py-1">✕ Void</Badge>;
        }
        return <Badge variant="outline" className="text-base px-4 py-1">{status}</Badge>;
    };

    const formatDateTime = (date: Date | string) => {
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleString('id-ID', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="p-8 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <Card className="border-2 border-blue-500">
                <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-blue-600 mb-2">Invoice {order.invoiceNumber}</h1>
                            <p className="text-muted-foreground text-sm">{formatDateTime(order.createdAt)}</p>
                            <p className="text-sm mt-2"><span className="font-semibold">Cashier:</span> {order.user?.name || 'Unknown'}</p>
                        </div>
                        <div className="text-right">
                            {getStatusBadge(order.status)}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
                <CardHeader className="bg-slate-50">
                    <CardTitle className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-blue-500 rounded"></div>
                        Order Items
                    </CardTitle>
                    <CardDescription>Products purchased</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-100 border-b-2 border-slate-200">
                                <TableHead className="font-bold">Product</TableHead>
                                <TableHead className="font-bold text-center">Qty</TableHead>
                                <TableHead className="font-bold text-right">Price</TableHead>
                                <TableHead className="font-bold text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {order.items.map((it: any) => (
                                <TableRow key={it.id} className="border-b border-slate-100">
                                    <TableCell className="font-medium">{it.product?.name || 'Unknown'}</TableCell>
                                    <TableCell className="text-center">
                                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md font-bold">{it.quantity}</span>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">{formatRupiah(Number(it.priceAtSale))}</TableCell>
                                    <TableCell className="text-right font-bold">{formatRupiah(Number(it.priceAtSale) * Number(it.quantity))}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="mt-6 bg-slate-50 rounded-lg p-4">
                        <div className="flex justify-end">
                            <div className="text-right space-y-3 min-w-[300px]">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Subtotal:</span>
                                    <span className="text-lg font-semibold">{formatRupiah(Number(order.subtotalAmount ?? order.totalAmount))}</span>
                                </div>
                                {Number(order.discountAmount || 0) > 0 && (
                                    <div className="flex justify-between items-center text-orange-600">
                                        <span className="text-sm font-medium">Discount:</span>
                                        <div className="text-right">
                                            <div className="text-lg font-semibold">- {formatRupiah(Number(order.discountAmount))}</div>
                                            {Number(order.discountPercent || 0) > 0 && (
                                                <div className="text-xs">({Number(order.discountPercent).toFixed(1)}%)</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-3 border-t-2 border-slate-300">
                                    <span className="text-base font-bold">Grand Total:</span>
                                    <span className="text-3xl font-bold text-green-600">{formatRupiah(Number(order.totalAmount))}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Payment Information */}
            {order.payments && order.payments.length > 0 && (
                <Card>
                    <CardHeader className="bg-green-50">
                        <CardTitle className="flex items-center gap-2">
                            <div className="w-1 h-6 bg-green-500 rounded"></div>
                            Payment Information
                        </CardTitle>
                        <CardDescription>Payment method breakdown</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-3">
                            {order.payments.map((p: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
                                    <div className="flex items-center gap-4">
                                        <span className={`px-4 py-2 rounded-lg font-bold shadow-md ${
                                            p.method === 'CASH' ? 'bg-green-500 text-white' :
                                            p.method === 'QRIS' ? 'bg-blue-500 text-white' :
                                            'bg-gray-500 text-white'
                                        }`}>
                                            {p.method}
                                        </span>
                                        <span className="text-sm text-muted-foreground">Payment {idx + 1}</span>
                                    </div>
                                    <div className="font-bold text-xl">{formatRupiah(Number(p.amount))}</div>
                                </div>
                            ))}
                            {order.payments.length > 1 && (
                                <div className="mt-4 pt-4 border-t-2 border-slate-300 flex items-center justify-between">
                                    <span className="font-bold text-lg">Split Bill ({order.payments.length} methods)</span>
                                    <span className="text-2xl font-bold text-green-600">{formatRupiah(Number(order.totalAmount))}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
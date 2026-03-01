import { getOrderById } from '@/actions/admin-actions';
import { formatRupiah } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function InvoiceDetail({ params }: { params: { id: string } }) {
    const p = await params;
    const id = Number(p.id);
    if (Number.isNaN(id) || !Number.isFinite(id)) {
        return <div className="p-8">Invoice not found</div>;
    }
    const order = await getOrderById(id);

    if (!order) return <div className="p-8">Invoice not found</div>;

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Invoice {order.invoiceNumber}</h1>
                <p className="text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                    <CardDescription>Order summary</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="text-sm text-muted-foreground">Cashier</div>
                        <div className="font-medium">{order.user?.name}</div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {order.items.map((it: any) => (
                                <TableRow key={it.id}>
                                    <TableCell>{it.product?.name || 'Unknown'}</TableCell>
                                    <TableCell>{it.quantity}</TableCell>
                                    <TableCell>{formatRupiah(Number(it.priceAtSale))}</TableCell>
                                    <TableCell>{formatRupiah(Number(it.priceAtSale) * Number(it.quantity))}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="mt-4 text-right">
                        <div className="text-sm text-muted-foreground">Subtotal</div>
                        <div className="text-lg font-semibold">{formatRupiah(Number(order.subtotalAmount ?? order.totalAmount))}</div>
                        <div className="text-sm text-muted-foreground mt-2">Discount</div>
                        <div className="text-lg font-semibold">- {formatRupiah(Number(order.discountAmount ?? 0))}</div>
                        {Number(order.discountPercent || 0) > 0 && (
                            <div className="text-xs text-muted-foreground">({Number(order.discountPercent).toFixed(2)}%)</div>
                        )}
                        <div className="text-sm text-muted-foreground mt-2">Total</div>
                        <div className="text-2xl font-bold">{formatRupiah(Number(order.totalAmount))}</div>
                    </div>
                </CardContent>
            </Card>

            {order.payments && order.payments.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Payment Method</CardTitle>
                        <CardDescription>Payment breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {order.payments.map((p: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 border rounded-md">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded text-xs font-semibold ${
                                            p.method === 'CASH' ? 'bg-green-100 text-green-800' :
                                            p.method === 'QRIS' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {p.method}
                                        </span>
                                        <span className="text-sm text-muted-foreground">Payment {idx + 1}</span>
                                    </div>
                                    <div className="font-semibold text-lg">{formatRupiah(Number(p.amount))}</div>
                                </div>
                            ))}
                            {order.payments.length > 1 && (
                                <div className="mt-4 pt-3 border-t flex items-center justify-between font-bold">
                                    <span>Split Bill ({order.payments.length} methods)</span>
                                    <span className="text-lg">{formatRupiah(Number(order.totalAmount))}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
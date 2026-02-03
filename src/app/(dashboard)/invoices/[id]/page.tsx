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
                        <div className="text-sm text-muted-foreground">Total</div>
                        <div className="text-2xl font-bold">{formatRupiah(Number(order.totalAmount))}</div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
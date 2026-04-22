import { getOrderById } from '@/actions/admin-actions';
import { getOpenBillByInvoiceNumber, getOpenBillByOrderId } from '@/actions/pos-actions';
import { formatRupiah } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PaymentBadge } from '@/components/ui/payment-badge';
import { verifySession } from '@/lib/auth';
import { getCurrentUserEventId } from '@/lib/event-utils';

export default async function InvoiceDetail({ params }: { params: { id: string } }) {
    const session = await verifySession();
    const userEventId = await getCurrentUserEventId();
    if (session.role === 'CASHIER' || (session.role === 'ADMIN' && userEventId)) {
        return <div className="p-8 text-sm text-[#8B1A1A]">Not authorized</div>;
    }

    const p = await params;
    const id = Number(p.id);
    if (Number.isNaN(id) || !Number.isFinite(id)) {
        return <div className="p-8">Invoice not found</div>;
    }
    const order = await getOrderById(id);

    if (!order) return <div className="p-8">Invoice not found</div>;

    const getStatusBadge = (status: string) => {
        if (status === 'COMPLETED') {
            return <Badge className="bg-[#EAF7EF] border border-[#BFE7CB] text-[#17663A] hover:bg-[#EAF7EF] text-base px-4 py-1">Completed</Badge>;
        }
        if (status === 'VOID') {
            return <Badge className="bg-[#FFF0F0] border border-[#FFBDBD] text-[#8B1A1A] hover:bg-[#FFF0F0] text-base px-4 py-1">Void</Badge>;
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

    let openBill: any = null;
    if (order.invoiceNumber.startsWith('OB-')) {
        openBill = await getOpenBillByInvoiceNumber(order.invoiceNumber, { bypassUserEventScope: true });
    } else {
        openBill = await getOpenBillByOrderId(order.id, { bypassUserEventScope: true });
    }

    const paymentBreakdown = (order.payments || []).reduce((acc: Record<string, number>, p: any) => {
        const method = String(p.method || 'OTHER').toUpperCase();
        acc[method] = (acc[method] || 0) + Number(p.amount || 0);
        return acc;
    }, {});
    const paidTotal = Object.values(paymentBreakdown)
        .map((value) => Number(value || 0))
        .reduce((sum, value) => sum + value, 0);

    return (
        <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
            {/* Header */}
            <Card className="border-[#E6DED0] bg-[#FFFDF9]">
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C86B2A]">Invoice Detail</p>
                            <h1 className="mb-2 mt-2 text-2xl sm:text-3xl font-bold text-[#1F1D1A]">{order.invoiceNumber}</h1>
                            <p className="text-muted-foreground text-sm">{formatDateTime(order.createdAt)}</p>
                            <p className="text-sm mt-2"><span className="font-semibold">Cashier:</span> {order.user?.name || 'Unknown'}</p>
                            {order.event?.name && (
                                <p className="mt-2 inline-flex w-fit rounded-full border border-[#DCCFBF] bg-[#FFF6E7] px-3 py-1 text-xs font-semibold text-[#8C4A1D]">
                                    Event: {order.event.name}
                                </p>
                            )}
                            {order.invoiceNumber.startsWith('OB-') && (
                                <p className="mt-2 text-xs font-semibold text-[#C86B2A]">Down Payment Invoice</p>
                            )}
                            {openBill && !order.invoiceNumber.startsWith('OB-') && Number(openBill.paidAmount || 0) > 0 && (
                                <p className="mt-2 text-xs text-[#6F6659]">DP Invoice: {openBill.billNumber}</p>
                            )}
                        </div>
                        <div className="text-left sm:text-right">
                            {getStatusBadge(order.status)}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
                <CardHeader className="bg-[#F8F3EC]">
                    <CardTitle className="flex items-center gap-2">
                        <div className="h-6 w-1 rounded bg-[#C86B2A]"></div>
                        Order Items
                    </CardTitle>
                    <CardDescription>Products purchased</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b-2 border-[#E6DED0] bg-[#FBF8F2]">
                                <TableHead className="font-bold">Product</TableHead>
                                <TableHead className="font-bold text-center">Qty</TableHead>
                                <TableHead className="font-bold text-right">Price</TableHead>
                                <TableHead className="font-bold text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(openBill?.items || order.items).map((it: any) => (
                                <TableRow key={it.id} className="border-b border-[#F1E8DA]">
                                    <TableCell className="font-medium">{it.product?.name || it.productName || 'Unknown'}</TableCell>
                                    <TableCell className="text-center">
                                        <span className="rounded-md bg-[#F5F1E8] px-3 py-1 font-bold text-[#6B645C]">{it.quantity}</span>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">{formatRupiah(Number(it.priceAtSale || it.price))}</TableCell>
                                    <TableCell className="text-right font-bold">{formatRupiah(Number(it.priceAtSale || it.price) * Number(it.quantity))}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="mt-6 rounded-lg bg-[#FBF8F2] p-4">
                        <div className="flex justify-end">
                            <div className="text-right space-y-3 min-w-[300px]">
                                {openBill && order.invoiceNumber.startsWith('OB-') && Number(openBill.paidAmount || 0) > 0 && (
                                    <div className="flex justify-between items-center text-amber-700">
                                        <span className="text-sm font-medium">Down Payment Paid:</span>
                                        <span className="text-lg font-semibold">{formatRupiah(Number(openBill.paidAmount))}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Subtotal:</span>
                                    <span className="text-lg font-semibold">{formatRupiah(Number(openBill?.subtotalAmount ?? order.subtotalAmount ?? order.totalAmount))}</span>
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
                                {openBill && Number(openBill.paidAmount || 0) > 0 && !order.invoiceNumber.startsWith('OB-') && (
                                    <>
                                        <div className="flex justify-between items-center text-amber-700">
                                            <span className="text-sm font-medium">Down Payment Paid:</span>
                                            <span className="text-lg font-semibold">- {formatRupiah(Number(openBill.paidAmount))}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-emerald-700">
                                            <span className="text-sm font-medium">Remaining Paid (This Invoice):</span>
                                            <span className="text-lg font-semibold">
                                                {formatRupiah(Math.max(0, Number(openBill.totalAmount || order.totalAmount) - Number(openBill.paidAmount || 0)))}
                                            </span>
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-between items-center pt-3 border-t-2 border-[#D9CEC0]">
                                    <span className="text-base font-bold">Grand Total:</span>
                                    <span className="text-3xl font-bold text-[#17663A]">{formatRupiah(Number(openBill?.totalAmount ?? order.totalAmount))}</span>
                                </div>
                                {openBill && order.invoiceNumber.startsWith('OB-') && (
                                    <div className="flex justify-between items-center text-[#6F6659]">
                                        <span className="text-sm font-medium">Remaining for Final Invoice:</span>
                                        <span className="text-lg font-semibold">
                                            {formatRupiah(Math.max(0, Number(openBill.totalAmount || order.totalAmount) - Number(openBill.paidAmount || 0)))}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Payment Information */}
            {order.payments && order.payments.length > 0 && (
                <Card>
                    <CardHeader className="bg-[#F8F3EC]">
                        <CardTitle className="flex items-center gap-2">
                            <div className="h-6 w-1 rounded bg-[#C86B2A]"></div>
                            Payment Information
                        </CardTitle>
                        <CardDescription>Payment method breakdown</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-3">
                            <div className="rounded-lg border border-[#E6DED0] bg-[#FFFDF9] p-4">
                                <div className="mb-3 text-sm font-semibold text-[#1F1D1A]">Breakdown Per Metode</div>
                                <div className="space-y-2">
                                    {Object.entries(paymentBreakdown).map(([method, amount]) => (
                                        <div key={method} className="flex items-center justify-between rounded-md bg-[#F8F3EA] px-3 py-2">
                                            <div className="flex items-center gap-3">
                                                <PaymentBadge method={method} className="px-3 py-1" />
                                                <span className="text-xs text-muted-foreground">{method}</span>
                                            </div>
                                            <span className="font-semibold">{formatRupiah(Number(amount))}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 flex items-center justify-between border-t border-[#E6DED0] pt-3">
                                    <span className="text-sm font-semibold">Total Dibayar</span>
                                    <span className="text-lg font-bold text-[#17663A]">{formatRupiah(paidTotal)}</span>
                                </div>
                            </div>

                            {order.payments.map((p: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between rounded-lg border border-[#E6DED0] bg-[#FFFDF9] p-4">
                                    <div className="flex items-center gap-4">
                                        <PaymentBadge method={p.method} className="px-3 py-1" />
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
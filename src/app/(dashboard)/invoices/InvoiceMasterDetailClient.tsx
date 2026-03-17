'use client';

import { useMemo, useState } from 'react';
import { formatRupiah, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type InvoiceOrder = {
    id: number;
    invoiceNumber: string;
    status: string;
    createdAt: string | Date;
    subtotalAmount?: number | string;
    discountAmount?: number | string;
    totalAmount?: number | string;
    payments?: { method?: string; amount?: number | string }[];
    user?: { name?: string } | null;
    items?: {
        product?: { name?: string } | null;
        productName?: string | null;
        quantity: number;
        priceAtSale?: number | string | null;
        price?: number | string | null;
    }[];
};

type OpenBillDetail = {
    totalAmount: number;
    paidAmount: number;
    items: { productName?: string | null; quantity: number; price: number }[];
};

type DetailItem = {
    product?: { name?: string } | null;
    productName?: string | null;
    quantity: number;
    priceAtSale?: number | string | null;
    price?: number | string | null;
};

export default function InvoiceMasterDetailClient({
    orders,
    openBillsByInvoice,
}: {
    orders: InvoiceOrder[];
    openBillsByInvoice: Record<string, OpenBillDetail>;
}) {
    const [orderRows, setOrderRows] = useState<InvoiceOrder[]>(orders || []);
    const [selectedId, setSelectedId] = useState<number | null>(orders[0]?.id ?? null);
    const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
    const [isVoidingId, setIsVoidingId] = useState<number | null>(null);
    const visibleLimit = 8;
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(orderRows.length / visibleLimit));
    const startIndex = (page - 1) * visibleLimit;
    const visibleOrders = orderRows.slice(startIndex, startIndex + visibleLimit);

    const selectedOrder = useMemo(() => {
        if (!orderRows.length) return null;
        return orderRows.find((o) => o.id === selectedId) || orderRows[0];
    }, [orderRows, selectedId]);

    const paymentSummary = useMemo(() => {
        const payments = selectedOrder?.payments || [];
        return payments.reduce((acc: Record<string, number>, p: any) => {
            const key = p.method || 'OTHER';
            acc[key] = (acc[key] || 0) + Number(p.amount || 0);
            return acc;
        }, {});
    }, [selectedOrder]);

    const formatDayTime = (dateStr: string | Date) => {
        const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
        const dayLabel = date.toLocaleDateString('id-ID', { weekday: 'short' });
        const dateLabel = date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
        const timeLabel = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        return { dayLabel, dateLabel, timeLabel };
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete invoice permanently? This action cannot be undone.')) return;
        setIsDeletingId(id);
        try {
            const res = await fetch('/api/admin/delete-order', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (data.success) {
                const next = orderRows.filter((o) => o.id !== id);
                setOrderRows(next);
                if (next.length) {
                    setSelectedId(next[0].id);
                } else {
                    setSelectedId(null);
                }
                // client-only update; parent is server-rendered, so refresh is not triggered here
                // eslint-disable-next-line no-alert
                alert('Invoice deleted');
            } else {
                // eslint-disable-next-line no-alert
                alert('Error: ' + (data.error || 'Unknown'));
            }
        } finally {
            setIsDeletingId(null);
        }
    };

    const handleVoid = async (id: number) => {
        if (!confirm('Void invoice? This will mark it as VOID.')) return;
        setIsVoidingId(id);
        try {
            const res = await fetch('/api/admin/void-order', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (data.success) {
                setOrderRows((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'VOID' } : o)));
            } else {
                // eslint-disable-next-line no-alert
                alert('Error: ' + (data.error || 'Unknown'));
            }
        } finally {
            setIsVoidingId(null);
        }
    };

    if (!orderRows.length) {
        return (
            <div className="rounded-xl border border-[#E6DED0] bg-white p-6 text-sm text-[#6F6659]">
                Tidak ada invoice untuk periode ini.
            </div>
        );
    }

    const selectedOpenBill = selectedOrder?.invoiceNumber?.startsWith('OB-')
        ? openBillsByInvoice[selectedOrder.invoiceNumber]
        : null;
    const detailItems: DetailItem[] = selectedOpenBill?.items || selectedOrder?.items || [];
    const downPaymentAmount = Number(selectedOpenBill?.paidAmount || 0);
    const openBillTotal = Number(selectedOpenBill?.totalAmount || selectedOrder?.totalAmount || 0);
    const openBillRemaining = Math.max(0, openBillTotal - downPaymentAmount);

    return (
        <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
            <div className="rounded-xl border border-[#E6DED0] bg-white">
                <div className="p-3">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[#6F6659]">
                                    <th className="px-2 py-2 font-medium">Invoice</th>
                                    <th className="px-2 py-2 font-medium">Cashier</th>
                                    <th className="px-2 py-2 font-medium">Status</th>
                                    <th className="px-2 py-2 font-medium">Payment</th>
                                    <th className="px-2 py-2 font-medium">Total</th>
                                    <th className="px-2 py-2 font-medium">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleOrders.map((order) => (
                                    <tr
                                        key={order.id}
                                        className={cn(
                                            'border-t border-[#EDE5D8] first:border-t-0 cursor-pointer',
                                            selectedOrder?.id === order.id && 'bg-[#FFF8EC]'
                                        )}
                                        onClick={() => setSelectedId(order.id)}
                                    >
                                        <td className="px-2 py-2">
                                            <div className="font-medium text-[#1F1D1A]">{order.invoiceNumber}</div>
                                        </td>
                                        <td className="px-2 py-2">{order.user?.name || '-'}</td>
                                        <td className="px-2 py-2">
                                            <span className={cn(
                                                'inline-flex rounded px-2 py-0.5 text-xs',
                                                order.status === 'COMPLETED'
                                                    ? 'bg-[#EAF7EF] text-[#17663A]'
                                                    : 'bg-[#FFF0F0] text-[#8B1A1A]'
                                            )}>
                                                {order.status === 'COMPLETED' ? 'Completed' : order.status}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span>{(order.payments || []).map((p) => p.method).join(' + ') || '-'}</span>
                                                {(order.payments || []).length > 1 && (
                                                    <span className="rounded-full border border-[#DCCFBF] bg-[#FFF6E7] px-2 py-0.5 text-[10px] font-semibold text-[#C86B2A]">Split Bill</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-2 py-2">{formatRupiah(Number(order.totalAmount || 0))}</td>
                                        <td className="px-2 py-2">
                                            {(() => {
                                                const { dayLabel, dateLabel, timeLabel } = formatDayTime(order.createdAt);
                                                return (
                                                    <div className="text-xs">
                                                        <div className="font-medium text-[#1F1D1A]">{dayLabel}, {dateLabel}</div>
                                                        <div className="text-[#6F6659]">{timeLabel}</div>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {orderRows.length > visibleLimit && (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EDE5D8] px-3 py-2 text-xs text-[#6F6659]">
                            <span>Menampilkan {startIndex + 1}-{Math.min(startIndex + visibleLimit, orderRows.length)} dari {orderRows.length} invoice.</span>
                            <div className="flex flex-wrap gap-1">
                                {Array.from({ length: totalPages }).map((_, idx) => {
                                    const pageNum = idx + 1;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={pageNum === page
                                                ? 'h-7 w-7 rounded-full border border-[#C86B2A] bg-[#FFF6E7] text-[#C86B2A]'
                                                : 'h-7 w-7 rounded-full border border-[#E6DED0] bg-white text-[#6F6659] hover:bg-[#F8F3EA]'
                                            }
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-[#E6DED0] bg-white">
                <div className="border-b border-[#EDE5D8] px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">Invoice Detail</div>
                        {selectedOrder && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    className="h-8 border-[#E6DED0] text-[#6F6659] hover:bg-[#F8F3EA]"
                                    onClick={() => handleVoid(selectedOrder.id)}
                                    disabled={isVoidingId === selectedOrder.id || selectedOrder.status === 'VOID'}
                                >
                                    {selectedOrder.status === 'VOID' ? 'Voided' : (isVoidingId === selectedOrder.id ? 'Voiding...' : 'Void')}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-8 border-[#EBC6C0] text-[#B33D2A] hover:bg-[#FFF1EF]"
                                    onClick={() => handleDelete(selectedOrder.id)}
                                    disabled={isDeletingId === selectedOrder.id}
                                >
                                    {isDeletingId === selectedOrder.id ? 'Deleting...' : 'Delete'}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="space-y-2 px-4 py-3 text-sm">
                    {selectedOrder && (selectedOrder.payments || []).length > 1 && (
                        <div className="inline-flex w-fit items-center rounded-full border border-[#DCCFBF] bg-[#FFF6E7] px-3 py-1 text-xs font-semibold text-[#C86B2A]">
                            Split Bill ({selectedOrder.payments?.length} metode)
                        </div>
                    )}
                    {selectedOpenBill && downPaymentAmount > 0 && (
                        <div className="flex justify-between rounded-md bg-[#FFF6E7] px-3 py-2 text-amber-700">
                            <span>Down Payment</span>
                            <span>-{formatRupiah(downPaymentAmount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between rounded-md bg-[#F8F3EA] px-3 py-2">
                        <span>Subtotal</span>
                        <span>{formatRupiah(Number(selectedOrder?.subtotalAmount || selectedOrder?.totalAmount || 0))}</span>
                    </div>
                    <div className="flex justify-between rounded-md bg-[#F8F3EA] px-3 py-2">
                        <span>Discount</span>
                        <span>-{formatRupiah(Number(selectedOrder?.discountAmount || 0))}</span>
                    </div>
                    {Object.entries(paymentSummary).map(([method, amount]) => (
                        <div key={method} className="flex justify-between rounded-md bg-[#F8F3EA] px-3 py-2">
                            <span>{method}</span>
                            <span>{formatRupiah(Number(amount))}</span>
                        </div>
                    ))}
                    <div className="mt-2 flex justify-between text-3xl font-bold">
                        <span>Total</span>
                        <span>{formatRupiah(Number(selectedOrder?.totalAmount || 0))}</span>
                    </div>
                    {selectedOpenBill && (
                        <div className="flex justify-between text-sm font-semibold text-[#6F6659]">
                            <span>Sisa Pembayaran</span>
                            <span>{formatRupiah(openBillRemaining)}</span>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                        <button className="rounded-lg border border-[#DCCFBF] bg-white px-3 py-2 text-sm">Print</button>
                        <a
                            href={selectedOrder ? `/invoices/${selectedOrder.id}` : '#'}
                            className="rounded-lg bg-[#C86B2A] px-3 py-2 text-center text-sm font-semibold text-white"
                        >
                            View Full
                        </a>
                    </div>
                    <div className="pt-2">
                        <p className="mb-2 font-semibold">Items</p>
                        <div className="space-y-1">
                            {detailItems.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="flex justify-between rounded-md bg-[#F8F3EA] px-3 py-2 text-xs">
                                    <span>{item.product?.name || item.productName || 'Item'} x{item.quantity}</span>
                                    <span>{formatRupiah(Number(item.priceAtSale ?? item.price ?? 0) * Number(item.quantity || 1))}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatRupiah } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function InvoiceListClient({ serverOrders }: any) {
    const [orders, setOrders] = useState(serverOrders || []);
    const [loadingId, setLoadingId] = useState<number | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    async function voidOrder(id: number) {
        setLoadingId(id);
        const res = await fetch('/api/admin/void-order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
        const data = await res.json();
        if (data.success) {
            setOrders((prev: any[]) => prev.map((o: any) => o.id === id ? { ...o, status: 'VOID' } : o));
        } else {
            alert('Error: ' + (data.error || 'Unknown'));
        }
        setLoadingId(null);
    }

    async function deleteOrder(id: number) {
        if (!confirm('Delete invoice permanently? This action cannot be undone.')) return;
        setLoadingId(id);
        const res = await fetch('/api/admin/delete-order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
        const data = await res.json();
        if (data.success) {
            setOrders((prev: any[]) => prev.filter((o: any) => o.id !== id));
        } else {
            alert('Error: ' + (data.error || 'Unknown'));
        }
        setLoadingId(null);
    }

    return (
        <div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Cashier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.map((o: any) => (
                        <React.Fragment key={o.id}>
                            <TableRow>
                                <TableCell>
                                    <button
                                        onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                                        className="p-1 hover:bg-slate-200 rounded"
                                    >
                                        {expandedId === o.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                </TableCell>
                                <TableCell className="font-medium">{o.invoiceNumber}</TableCell>
                                <TableCell>{new Date(o.createdAt).toLocaleString()}</TableCell>
                                <TableCell>{o.user?.name || 'Unknown'}</TableCell>
                                <TableCell>{o.status}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {o.payments && o.payments.length > 0 ? (
                                            o.payments.map((p: any, idx: number) => (
                                                <span key={idx} className={`px-2 py-1 rounded text-xs font-semibold ${
                                                    p.method === 'CASH' ? 'bg-green-100 text-green-800' :
                                                    p.method === 'QRIS' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {p.method}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-muted-foreground text-xs">-</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm font-medium">
                                        {formatRupiah(Number(o.discountAmount || 0))}
                                    </div>
                                    {Number(o.discountPercent || 0) > 0 && (
                                        <div className="text-xs text-muted-foreground">({Number(o.discountPercent).toFixed(2)}%)</div>
                                    )}
                                </TableCell>
                                <TableCell className="font-semibold">{formatRupiah(Number(o.totalAmount))}</TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        <a className="btn btn-outline" href={`/invoices/${o.id}`} target="_blank" rel="noreferrer">View</a>
                                        {o.status !== 'VOID' && (
                                            <Button variant="outline" onClick={() => voidOrder(o.id)} disabled={loadingId === o.id}>Void</Button>
                                        )}
                                        <Button className="border-red-500 text-red-600" onClick={() => deleteOrder(o.id)} disabled={loadingId === o.id}>Delete</Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                            {expandedId === o.id && o.items && o.items.length > 0 && (
                                <TableRow className="bg-slate-50">
                                    <TableCell colSpan={9} className="p-4">
                                        <div className="ml-6">
                                            <h4 className="font-semibold text-sm mb-3">Items Sold:</h4>
                                            <Table className="text-sm">
                                                <TableHeader>
                                                    <TableRow className="border-b">
                                                        <TableHead className="text-xs">Product</TableHead>
                                                        <TableHead className="text-xs text-right">Qty</TableHead>
                                                        <TableHead className="text-xs text-right">Price</TableHead>
                                                        <TableHead className="text-xs text-right">Subtotal</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {o.items.map((item: any, idx: number) => (
                                                        <TableRow key={idx} className="border-b-0">
                                                            <TableCell className="py-2">{item.product?.name || 'Unknown Product'}</TableCell>
                                                            <TableCell className="py-2 text-right">{item.quantity}</TableCell>
                                                            <TableCell className="py-2 text-right">{formatRupiah(Number(item.priceAtSale))}</TableCell>
                                                            <TableCell className="py-2 text-right font-medium">
                                                                {formatRupiah(Number(item.priceAtSale) * item.quantity)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            <div className="mt-4 flex justify-end">
                                                <div className="text-right text-sm">
                                                    <div className="text-muted-foreground">Subtotal</div>
                                                    <div className="font-medium">{formatRupiah(Number(o.subtotalAmount ?? o.totalAmount))}</div>
                                                    <div className="text-muted-foreground mt-2">Discount</div>
                                                    <div className="font-medium">- {formatRupiah(Number(o.discountAmount || 0))}</div>
                                                    <div className="text-muted-foreground mt-2">Total</div>
                                                    <div className="font-semibold">{formatRupiah(Number(o.totalAmount))}</div>
                                                </div>
                                            </div>

                                            {o.payments && o.payments.length > 0 && (
                                                <div className="mt-6 pt-4 border-t">
                                                    <h5 className="font-semibold text-sm mb-3">Payment Method:</h5>
                                                    <div className="space-y-2">
                                                        {o.payments.map((p: any, idx: number) => (
                                                            <div key={idx} className="flex items-center justify-between p-2 border rounded text-sm">
                                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                                    p.method === 'CASH' ? 'bg-green-100 text-green-800' :
                                                                    p.method === 'QRIS' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                    {p.method}
                                                                </span>
                                                                <span className="font-medium">{formatRupiah(Number(p.amount))}</span>
                                                            </div>
                                                        ))}
                                                        {o.payments.length > 1 && (
                                                            <div className="mt-2 pt-2 border-t font-semibold flex justify-between text-xs">
                                                                <span>Split Bill ({o.payments.length} methods)</span>
                                                                <span>{formatRupiah(Number(o.totalAmount))}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRupiah } from '@/lib/utils';
import { ChevronDown, ChevronUp, DollarSign, FileText, XCircle } from 'lucide-react';

export default function InvoiceListClient({ serverOrders }: any) {
    const [orders, setOrders] = useState(serverOrders || []);
    const [loadingId, setLoadingId] = useState<number | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Calculate summary statistics
    const stats = useMemo(() => {
        const total = orders.reduce((sum: number, o: any) => sum + Number(o.totalAmount), 0);
        const completed = orders.filter((o: any) => o.status === 'COMPLETED').length;
        const voided = orders.filter((o: any) => o.status === 'VOID').length;
        return { total, completed, voided, count: orders.length };
    }, [orders]);

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

    const getStatusBadge = (status: string) => {
        if (status === 'COMPLETED') {
            return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
        }
        if (status === 'VOID') {
            return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Void</Badge>;
        }
        return <Badge variant="outline">{status}</Badge>;
    };

    const formatDateTime = (date: string) => {
        const d = new Date(date);
        const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        return { date: dateStr, time: timeStr };
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Invoices</p>
                                <p className="text-2xl font-bold">{stats.count}</p>
                            </div>
                            <FileText className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Revenue</p>
                                <p className="text-xl font-bold">{formatRupiah(stats.total)}</p>
                            </div>
                            <DollarSign className="w-8 h-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Completed</p>
                                <p className="text-2xl font-bold">{stats.completed}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                <span className="text-green-600 font-bold text-lg">✓</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Voided</p>
                                <p className="text-2xl font-bold">{stats.voided}</p>
                            </div>
                            <XCircle className="w-8 h-8 text-red-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Invoice Table */}
            <Card>
                <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50">
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="font-semibold">Invoice</TableHead>
                        <TableHead className="font-semibold">Date & Time</TableHead>
                        <TableHead className="font-semibold">Cashier</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Payment</TableHead>
                        <TableHead className="font-semibold text-right">Discount</TableHead>
                        <TableHead className="font-semibold text-right">Total</TableHead>
                        <TableHead className="font-semibold text-center">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.map((o: any) => {
                        const { date, time } = formatDateTime(o.createdAt);
                        return (
                        <React.Fragment key={o.id}>
                            <TableRow className="hover:bg-slate-50">
                                <TableCell>
                                    <button
                                        onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                                        className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                                        aria-label="Toggle details"
                                    >
                                        {expandedId === o.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                </TableCell>
                                <TableCell>
                                    <div className="font-semibold text-blue-600">{o.invoiceNumber}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm">
                                        <div className="font-medium">{date}</div>
                                        <div className="text-muted-foreground text-xs">{time}</div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm font-medium">{o.user?.name || 'Unknown'}</div>
                                </TableCell>
                                <TableCell>{getStatusBadge(o.status)}</TableCell>
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
                                <TableCell className="text-right">
                                    {Number(o.discountAmount || 0) > 0 ? (
                                        <div>
                                            <div className="font-medium text-orange-600">
                                                {formatRupiah(Number(o.discountAmount))}
                                            </div>
                                            {Number(o.discountPercent || 0) > 0 && (
                                                <div className="text-xs text-muted-foreground">({Number(o.discountPercent).toFixed(1)}%)</div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="font-bold text-lg">{formatRupiah(Number(o.totalAmount))}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-1.5 justify-center">
                                        <Button size="sm" variant="outline" asChild>
                                            <a href={`/invoices/${o.id}`} target="_blank" rel="noreferrer">View</a>
                                        </Button>
                                        {o.status !== 'VOID' && (
                                            <Button size="sm" variant="outline" onClick={() => voidOrder(o.id)} disabled={loadingId === o.id}>Void</Button>
                                        )}
                                        <Button size="sm" variant="destructive" onClick={() => deleteOrder(o.id)} disabled={loadingId === o.id}>Delete</Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                            {expandedId === o.id && o.items && o.items.length > 0 && (
                                <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100">
                                    <TableCell colSpan={9} className="p-6">
                                        <div className="ml-8 space-y-4">
                                            <h4 className="font-bold text-base mb-4 flex items-center gap-2">
                                                <div className="w-1 h-5 bg-blue-500 rounded"></div>
                                                Order Details
                                            </h4>
                                            <div className="bg-white rounded-lg p-4 shadow-sm">
                                                <Table className="text-sm">
                                                    <TableHeader>
                                                        <TableRow className="border-b-2 border-slate-200">
                                                            <TableHead className="font-semibold text-slate-700">Product</TableHead>
                                                            <TableHead className="font-semibold text-slate-700 text-center">Qty</TableHead>
                                                            <TableHead className="font-semibold text-slate-700 text-right">Price</TableHead>
                                                            <TableHead className="font-semibold text-slate-700 text-right">Subtotal</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {o.items.map((item: any, idx: number) => (
                                                            <TableRow key={idx} className="border-b border-slate-100">
                                                                <TableCell className="py-3 font-medium">{item.product?.name || 'Unknown Product'}</TableCell>
                                                                <TableCell className="py-3 text-center">
                                                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded font-semibold">{item.quantity}</span>
                                                                </TableCell>
                                                                <TableCell className="py-3 text-right text-muted-foreground">{formatRupiah(Number(item.priceAtSale))}</TableCell>
                                                                <TableCell className="py-3 text-right font-bold">
                                                                    {formatRupiah(Number(item.priceAtSale) * item.quantity)}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 shadow-sm">
                                                <div className="flex justify-end">
                                                    <div className="text-right space-y-2 min-w-[250px]">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-muted-foreground">Subtotal:</span>
                                                            <span className="font-medium">{formatRupiah(Number(o.subtotalAmount ?? o.totalAmount))}</span>
                                                        </div>
                                                        {Number(o.discountAmount || 0) > 0 && (
                                                            <div className="flex justify-between items-center text-orange-600">
                                                                <span className="text-sm">Discount:</span>
                                                                <span className="font-medium">- {formatRupiah(Number(o.discountAmount))}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between items-center pt-2 border-t-2 border-slate-200">
                                                            <span className="font-semibold">Total:</span>
                                                            <span className="text-xl font-bold text-green-600">{formatRupiah(Number(o.totalAmount))}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {o.payments && o.payments.length > 0 && (
                                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                                    <h5 className="font-bold text-sm mb-3 flex items-center gap-2">
                                                        <div className="w-1 h-4 bg-green-500 rounded"></div>
                                                        Payment Information
                                                    </h5>
                                                    <div className="space-y-2">
                                                        {o.payments.map((p: any, idx: number) => (
                                                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`px-3 py-1.5 rounded-md text-xs font-bold shadow-sm ${
                                                                        p.method === 'CASH' ? 'bg-green-500 text-white' :
                                                                        p.method === 'QRIS' ? 'bg-blue-500 text-white' :
                                                                        'bg-gray-500 text-white'
                                                                    }`}>
                                                                        {p.method}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">Payment {idx + 1}</span>
                                                                </div>
                                                                <span className="font-bold text-sm">{formatRupiah(Number(p.amount))}</span>
                                                            </div>
                                                        ))}
                                                        {o.payments.length > 1 && (
                                                            <div className="mt-3 pt-3 border-t-2 border-slate-200 font-bold flex justify-between">
                                                                <span className="text-sm">Split Bill ({o.payments.length} methods)</span>
                                                                <span className="text-base text-green-600">{formatRupiah(Number(o.totalAmount))}</span>
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
                    );})}
                </TableBody>
            </Table>
                </CardContent>
            </Card>
        </div>
    );
}
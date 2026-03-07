"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatRupiah } from '@/lib/utils';
import { ChevronDown, ChevronUp, DollarSign, FileText, Clock, XCircle } from 'lucide-react';

export default function InvoiceListClient({ serverOrders, draftInvoices = [] }: any) {
    const [orders, setOrders] = useState(serverOrders || []);
    const [drafts, setDrafts] = useState(draftInvoices || []);
    const [loadingId, setLoadingId] = useState<number | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'completed' | 'draft'>('completed');

    // Calculate statistics for completed invoices
    const completedStats = useMemo(() => {
        const total = orders.reduce((sum: number, o: any) => sum + Number(o.totalAmount), 0);
        const completed = orders.filter((o: any) => o.status === 'COMPLETED').length;
        const voided = orders.filter((o: any) => o.status === 'VOID').length;
        return { total, completed, voided, count: orders.length };
    }, [orders]);

    // Calculate statistics for draft invoices
    const draftStats = useMemo(() => {
        const total = drafts.reduce((sum: number, d: any) => sum + Number(d.totalAmount), 0);
        const open = drafts.filter((d: any) => d.status === 'OPEN').length;
        const partial = drafts.filter((d: any) => d.status === 'PARTIAL').length;
        return { total, open, partial, count: drafts.length };
    }, [drafts]);

    async function voidOrder(id: number) {
        setLoadingId(id);
        const res = await fetch('/api/admin/void-order', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id })
        });
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
        const res = await fetch('/api/admin/delete-order', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.success) {
            setOrders((prev: any[]) => prev.filter((o: any) => o.id !== id));
        } else {
            alert('Error: ' + (data.error || 'Unknown'));
        }
        setLoadingId(null);
    }

    const getStatusBadge = (status: string, type?: string) => {
        if (type === 'DRAFT_INVOICE') {
            if (status === 'OPEN') {
                return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Draft - Open</Badge>;
            }
            if (status === 'PARTIAL') {
                return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Draft - Partial Payment</Badge>;
            }
        } else {
            if (status === 'COMPLETED') {
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
            }
            if (status === 'VOID') {
                return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Void</Badge>;
            }
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
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'completed' | 'draft')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="completed" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Completed Invoices ({completedStats.count})
                    </TabsTrigger>
                    <TabsTrigger value="draft" className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Draft Invoices ({draftStats.count})
                    </TabsTrigger>
                </TabsList>

                {/* Completed Invoices Tab */}
                <TabsContent value="completed" className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Invoices</p>
                                        <p className="text-2xl font-bold">{completedStats.count}</p>
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
                                        <p className="text-xl font-bold">{formatRupiah(completedStats.total)}</p>
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
                                        <p className="text-2xl font-bold">{completedStats.completed}</p>
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
                                        <p className="text-2xl font-bold">{completedStats.voided}</p>
                                    </div>
                                    <XCircle className="w-8 h-8 text-red-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Completed Invoices Table */}
                    <Card>
                        <CardContent className="p-0">
                            {orders.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    No completed invoices found
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead className="w-12"></TableHead>
                                            <TableHead className="font-semibold">Invoice</TableHead>
                                            <TableHead className="font-semibold">Date & Time</TableHead>
                                            <TableHead className="font-semibold">Cashier</TableHead>
                                            <TableHead className="font-semibold">Status</TableHead>
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
                                                        <TableRow className="bg-slate-50">
                                                            <TableCell colSpan={8} className="p-6">
                                                                <div className="ml-8">
                                                                    <h4 className="font-bold text-base mb-4">Order Details</h4>
                                                                    <div className="bg-white rounded-lg p-4 border">
                                                                        <Table className="text-sm">
                                                                            <TableHeader>
                                                                                <TableRow className="border-b">
                                                                                    <TableHead className="font-semibold">Product</TableHead>
                                                                                    <TableHead className="font-semibold text-center">Qty</TableHead>
                                                                                    <TableHead className="font-semibold text-right">Price</TableHead>
                                                                                    <TableHead className="font-semibold text-right">Subtotal</TableHead>
                                                                                </TableRow>
                                                                            </TableHeader>
                                                                            <TableBody>
                                                                                {o.items.map((item: any, idx: number) => (
                                                                                    <TableRow key={idx} className="border-b">
                                                                                        <TableCell className="py-3">{item.product?.name || 'Unknown'}</TableCell>
                                                                                        <TableCell className="py-3 text-center">{item.quantity}</TableCell>
                                                                                        <TableCell className="py-3 text-right">{formatRupiah(Number(item.priceAtSale))}</TableCell>
                                                                                        <TableCell className="py-3 text-right font-bold">
                                                                                            {formatRupiah(Number(item.priceAtSale) * item.quantity)}
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                ))}
                                                                            </TableBody>
                                                                        </Table>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Draft Invoices Tab */}
                <TabsContent value="draft" className="space-y-6">
                    {/* Draft Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Draft</p>
                                        <p className="text-2xl font-bold">{draftStats.count}</p>
                                    </div>
                                    <Clock className="w-8 h-8 text-orange-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Pending Amount</p>
                                        <p className="text-xl font-bold">{formatRupiah(draftStats.total)}</p>
                                    </div>
                                    <DollarSign className="w-8 h-8 text-yellow-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Open / Partial</p>
                                        <p className="text-2xl font-bold">{draftStats.open + draftStats.partial}</p>
                                    </div>
                                    <Clock className="w-8 h-8 text-blue-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Draft Invoices Table */}
                    <Card>
                        <CardContent className="p-0">
                            {drafts.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    No draft invoices found
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead className="font-semibold">Bill Number</TableHead>
                                            <TableHead className="font-semibold">Invoice Number</TableHead>
                                            <TableHead className="font-semibold">Customer</TableHead>
                                            <TableHead className="font-semibold">Items</TableHead>
                                            <TableHead className="font-semibold">Status</TableHead>
                                            <TableHead className="font-semibold text-right">Total</TableHead>
                                            <TableHead className="font-semibold text-right">Down Payment</TableHead>
                                            <TableHead className="font-semibold text-right">Paid</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {drafts.map((d: any) => {
                                            const { date, time } = formatDateTime(d.createdAt);
                                            return (
                                                <TableRow key={d.id} className="hover:bg-slate-50">
                                                    <TableCell>
                                                        <div className="font-semibold text-emerald-600">{d.billNumber}</div>
                                                        <div className="text-xs text-muted-foreground">{date} {time}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-mono text-sm bg-blue-50 px-2 py-1 rounded w-fit">
                                                            {d.invoiceNumber}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">{d.customerName || 'Walk-in'}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{d.itemCount} items</Badge>
                                                    </TableCell>
                                                    <TableCell>{getStatusBadge(d.status, 'DRAFT_INVOICE')}</TableCell>
                                                    <TableCell className="text-right font-bold">
                                                        {formatRupiah(Number(d.totalAmount))}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {d.downPaymentPercent > 0 ? (
                                                            <span className="text-amber-600 font-medium">{d.downPaymentPercent}%</span>
                                                        ) : d.downPaymentAmount > 0 ? (
                                                            <span className="text-amber-600 font-medium">{formatRupiah(d.downPaymentAmount)}</span>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="text-green-600 font-medium">{formatRupiah(Number(d.paidAmount))}</span>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
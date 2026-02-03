"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatRupiah } from '@/lib/utils';

export default function InvoiceListClient({ serverOrders }: any) {
    const [orders, setOrders] = useState(serverOrders || []);
    const [loadingId, setLoadingId] = useState<number | null>(null);

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
                        <TableHead>Invoice</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Cashier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.map((o: any) => (
                        <TableRow key={o.id}>
                            <TableCell className="font-medium">{o.invoiceNumber}</TableCell>
                            <TableCell>{new Date(o.createdAt).toLocaleString()}</TableCell>
                            <TableCell>{o.user?.name || 'Unknown'}</TableCell>
                            <TableCell>{o.status}</TableCell>
                            <TableCell>{formatRupiah(Number(o.totalAmount))}</TableCell>
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
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
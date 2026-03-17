'use client';

import { useActionState, useEffect, useState } from 'react';
import { openShiftAction, closeShiftAction } from '@/actions/shift-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle, Wallet, Clock3 } from 'lucide-react';

interface ShiftManagementProps {
    initialShift: any;
    lastShift?: any;
}

function AdjustmentRow({ adjustment }: { adjustment: any }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/70 px-4 py-3">
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{adjustment.product?.name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">by {adjustment.user?.name || 'Unknown'}</p>
            </div>
            <div className="w-20 shrink-0 text-right">
                <span className={`font-mono text-sm font-semibold ${adjustment.change < 0 ? 'text-[#8B1A1A]' : 'text-[#17663A]'}`}>
                    {adjustment.change > 0 ? '+' : ''}{adjustment.change}
                </span>
            </div>
            <div className="w-36 shrink-0 text-right text-xs text-muted-foreground">
                {new Date(adjustment.createdAt).toLocaleString()}
            </div>
        </div>
    );
}

export function ShiftManagement({ initialShift, lastShift }: ShiftManagementProps) {
    const [isOpen, setIsOpen] = useState(!!initialShift);
    const [openState, openAction, openPending] = useActionState(openShiftAction, null);
    const [closeState, closeAction, closePending] = useActionState(closeShiftAction, null);

    useEffect(() => {
        if (openState?.success) setIsOpen(true);
        if (closeState?.success) setIsOpen(false);
    }, [openState, closeState]);

    const [adjustments, setAdjustments] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [page, setPage] = useState<number>(1);
    const [limit] = useState<number>(10);
    const [total, setTotal] = useState<number>(0);
    const [productFilter, setProductFilter] = useState<string>('');
    const [fromFilter, setFromFilter] = useState<string>('');
    const [toFilter, setToFilter] = useState<string>('');

    const loadAdjustments = async (targetPage = 1) => {
        try {
            const query = new URLSearchParams();
            query.set('limit', String(limit));
            query.set('page', String(targetPage));
            if (productFilter) query.set('productId', productFilter);
            if (fromFilter) query.set('from', fromFilter);
            if (toFilter) query.set('to', toFilter);
            const res = await fetch('/api/inventory/adjustments-public?' + query.toString());
            const json = await res.json();
            if (json?.success) {
                setAdjustments(json.data || []);
                setTotal(json.total || 0);
                setPage(json.page || targetPage);
            }
        } catch (error) {
            console.warn('Failed to load adjustments', error);
        }
    };

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const res = await fetch('/api/inventory/products');
                const json = await res.json();
                if (json?.success) setProducts(json.data || []);
            } catch (error) {
                console.warn('Failed to load products', error);
            }
        };

        loadProducts();
        loadAdjustments(1);

        const onCreated = () => loadAdjustments(1);
        window.addEventListener('adjustment:created', onCreated as EventListener);
        return () => window.removeEventListener('adjustment:created', onCreated as EventListener);
    }, [isOpen, productFilter, fromFilter, toFilter]);

    const pageCount = Math.max(1, Math.ceil(total / limit));

    return (
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 rounded-2xl border border-[#E6DED0] bg-[#F5F1E8] p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between rounded-xl border border-[#E6DED0] bg-white px-4 py-3">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#1F1D1A]">Shift Management</h1>
                    <p className="text-sm text-[#6F6659]">Monitor shift aktif, rekonsiliasi kas, dan histori shift per kasir.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`rounded-lg border px-3 py-2 text-sm ${isOpen ? 'border-[#CDE7D8] bg-[#EAF7EF] text-[#17663A]' : 'border-[#E6DED0] bg-[#F8F3EA] text-[#6F6659]'}`}>
                        Status: {isOpen ? 'OPEN' : 'CLOSED'}
                    </span>
                </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <Card className="border-[#E6DED0] bg-white">
                    <CardHeader>
                        <CardTitle>Shift Aktif</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center justify-between rounded-md bg-[#F8F3EA] px-3 py-2"><span>Kasir</span><span>{initialShift?.user?.name || '-'}</span></div>
                        <div className="flex items-center justify-between rounded-md bg-[#F8F3EA] px-3 py-2"><span>Mulai Shift</span><span>{initialShift?.startTime ? new Date(initialShift.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</span></div>
                        <div className="flex items-center justify-between rounded-md bg-[#F8F3EA] px-3 py-2"><span>Opening Cash</span><span>{lastShift?.totalCashReceived ? Number(lastShift.totalCashReceived).toLocaleString('id-ID') : '-'}</span></div>
                        <div className="flex items-center justify-between rounded-md bg-[#F8F3EA] px-3 py-2"><span>Order Count</span><span>-</span></div>
                        <div className="flex items-center justify-between rounded-md bg-[#F8F3EA] px-3 py-2"><span>Expected Closing</span><span>-</span></div>
                    </CardContent>
                </Card>

                <Card className="border-[#E6DED0] bg-white">
                    <CardHeader>
                        <CardTitle>Rekonsiliasi</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between rounded-md bg-[#F8F3EA] px-3 py-2 text-sm"><span>Expected Cash</span><span>{lastShift?.totalCashReceived ? Number(lastShift.totalCashReceived).toLocaleString('id-ID') : '-'}</span></div>
                        <form action={closeAction} className="space-y-2">
                            <Label htmlFor="reportedCash">Actual Cash</Label>
                            <Input id="reportedCash" name="reportedCash" type="number" placeholder="0" required min="0" className="bg-white" />
                            {closeState?.error && <p className="text-sm text-destructive">{closeState.error}</p>}
                            <div className="grid grid-cols-2 gap-2">
                                <Button type="button" variant="outline">Hold</Button>
                                <Button className="bg-[#C86B2A] text-white hover:bg-[#B85A1D]" disabled={closePending || !isOpen}>
                                    {closePending ? 'Closing...' : 'Konfirmasi Tutup'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-[#E6DED0] bg-white">
                <CardHeader>
                    <CardTitle>Riwayat Shift</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 text-xs uppercase text-[#8B7C6B]">
                        <span>Tanggal</span><span>Kasir</span><span>Status</span><span>Difference</span>
                    </div>
                    <div className="mt-2 space-y-2 text-sm">
                        {lastShift ? (
                            <div className="grid grid-cols-4 rounded-md bg-[#F8F3EA] px-3 py-2">
                                <span>{new Date(lastShift.endTime || Date.now()).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                                <span>{lastShift.user?.name || '-'}</span>
                                <span>Closed</span>
                                <span>{Number(lastShift.totalCashReceived || 0).toLocaleString('id-ID')}</span>
                            </div>
                        ) : (
                            <p className="text-sm text-[#6F6659]">Belum ada histori shift.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <details className="rounded-xl border border-[#E6DED0] bg-white px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-[#5A5348]">Advanced: Riwayat Adjustment Stok</summary>
                <div className="mt-4 space-y-4">
                    <div className="grid gap-2 sm:grid-cols-3">
                        <select value={productFilter} onChange={(event) => setProductFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                            <option value="">All products</option>
                            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                        </select>
                        <input type="date" value={fromFilter} onChange={(event) => setFromFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
                        <div className="flex gap-2">
                            <input type="date" value={toFilter} onChange={(event) => setToFilter(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
                            <Button type="button" variant="outline" onClick={() => loadAdjustments(1)}>Filter</Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {adjustments.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No adjustments found.</div>
                        ) : (
                            adjustments.map((adjustment) => <AdjustmentRow key={adjustment.id} adjustment={adjustment} />)
                        )}
                    </div>
                </div>
            </details>
        </div>
    );
}

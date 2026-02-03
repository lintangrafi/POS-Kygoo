'use client';

import { useActionState, useEffect, useState } from 'react';
import { openShiftAction, closeShiftAction } from '@/actions/shift-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { formatRupiah } from '@/lib/utils';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ShiftManagementProps {
    initialShift: any; // Using any for simplicity in rapid dev, ideally types from schema
    lastShift?: any; // last closed shift for pre-filling initial cash
}

export function ShiftManagement({ initialShift, lastShift }: ShiftManagementProps) {
    const [isOpen, setIsOpen] = useState(!!initialShift);

    // Open Shift State
    const [openState, openAction, openPending] = useActionState(openShiftAction, null);

    // Close Shift State
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

    const loadAdjustments = async (p = 1) => {
        try {
            const q = new URLSearchParams();
            q.set('limit', String(limit));
            q.set('page', String(p));
            if (productFilter) q.set('productId', productFilter);
            if (fromFilter) q.set('from', fromFilter);
            if (toFilter) q.set('to', toFilter);
            const res = await fetch('/api/inventory/adjustments-public?' + q.toString());
            const json = await res.json();
            if (json?.success) {
                setAdjustments(json.data || []);
                setTotal(json.total || 0);
                setPage(json.page || p);
            }
        } catch (err) {
            console.warn('Failed to load adjustments', err);
        }
    };

    useEffect(() => {
        // initial product list (for filter)
        const load = async () => {
            try {
                const res = await fetch('/api/inventory/products');
                const json = await res.json();
                if (json?.success) setProducts(json.data || []);
            } catch (err) {
                console.warn('Failed to load products', err);
            }
        };
        load();
        loadAdjustments(1);

        const onCreated = () => loadAdjustments(1);
        window.addEventListener('adjustment:created', onCreated as EventListener);
        return () => window.removeEventListener('adjustment:created', onCreated as EventListener);
    }, [isOpen, productFilter, fromFilter, toFilter]);

    const goPrev = () => { if (page > 1) loadAdjustments(page - 1); };
    const goNext = () => { if (page * limit < total) loadAdjustments(page + 1); };
    const applyFilters = () => loadAdjustments(1);

    if (isOpen) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 space-y-6">
                <Card className="w-full max-w-md border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-green-100 text-green-600 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-2">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <CardTitle className="text-green-700 dark:text-green-400">Shift is Open</CardTitle>
                        <CardDescription>You are ready to process transactions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-white/50 dark:bg-black/20 p-4 rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">Started at</p>
                            <p className="font-mono font-medium">
                                {initialShift?.startTime ? new Date(initialShift.startTime).toLocaleString() : new Date().toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">Opened by <span className="font-medium">{initialShift?.user?.name || 'Unknown'}</span></p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>End Shift</CardTitle>
                        <CardDescription>Close your shift to generate a daily report.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={closeAction} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="reportedCash">Total Cash in Drawer (Physical Count)</Label>
                                <Input
                                    id="reportedCash"
                                    name="reportedCash"
                                    type="number"
                                    placeholder="0"
                                    required
                                    min="0"
                                />
                            </div>
                            {closeState?.error && (
                                <p className="text-red-500 text-sm">{closeState.error}</p>
                            )}
                            <Button variant="destructive" className="w-full" disabled={closePending}>
                                {closePending ? 'Closing...' : 'Close Shift'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Recent Stock Adjustments</CardTitle>
                        <CardDescription>Last 10 adjustments (visible to cashier)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className="rounded-md border px-2 py-1">
                                <option value="">All products</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <input type="date" value={fromFilter} onChange={(e) => setFromFilter(e.target.value)} className="rounded-md border px-2 py-1" />
                            <div className="flex gap-2">
                                <input type="date" value={toFilter} onChange={(e) => setToFilter(e.target.value)} className="rounded-md border px-2 py-1" />
                                <Button onClick={() => applyFilters()} className="ml-auto">Filter</Button>
                            </div>
                        </div>

                        {adjustments.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center">No adjustments found.</p>
                        ) : (
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {adjustments.map((a) => (
                                    <div key={a.id} className="flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium truncate">{a.product?.name || 'Unknown'}</div>
                                            <div className="text-xs text-muted-foreground">by {a.user?.name || 'Unknown'}</div>
                                        </div>
                                        <div className={`font-mono ${a.change < 0 ? 'text-red-600' : 'text-green-600'}`}>{a.change}</div>
                                        <div className="text-xs text-muted-foreground ml-4 whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</div>
                                    </div>
                                ))}

                                <div className="flex items-center justify-between mt-3">
                                    <div className="text-sm text-muted-foreground">Page {page} of {Math.max(1, Math.ceil(total / limit))}</div>
                                    <div className="flex gap-2">
                                        <Button disabled={page <= 1} onClick={() => goPrev()}>Prev</Button>
                                        <Button disabled={page * limit >= total} onClick={() => goNext()}>Next</Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full p-4">
            <Card className="w-full max-w-md border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 shadow-xl">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-orange-100 text-orange-600 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-2">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-orange-800 dark:text-orange-400">Shift is Closed</CardTitle>
                    <CardDescription>You must open a shift before accessing the POS.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={openAction} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="initialCash">Initial Cash (Float)</Label>
                            <Input
                                id="initialCash"
                                name="initialCash"
                                type="number"
                                placeholder="0"
                                required
                                min="0"
                                defaultValue={lastShift?.totalCashReceived ?? ''}
                                className="bg-white text-black dark:bg-black dark:text-white"
                            />
                            <p className="text-xs text-muted-foreground">Enter the amount of cash currently in the drawer.</p>
                        </div>
                        {openState?.error && (
                            <p className="text-red-500 text-sm">{openState.error}</p>
                        )}
                        <Button size="lg" className="w-full font-bold" disabled={openPending}>
                            {openPending ? 'Opening...' : 'Open Shift'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="w-full max-w-md mt-4">
                <CardHeader>
                    <CardTitle>Recent Stock Adjustments</CardTitle>
                    <CardDescription>Last 10 adjustments (visible to cashier)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className="rounded-md border px-2 py-1">
                            <option value="">All products</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input type="date" value={fromFilter} onChange={(e) => setFromFilter(e.target.value)} className="rounded-md border px-2 py-1" />
                        <div className="flex gap-2">
                            <input type="date" value={toFilter} onChange={(e) => setToFilter(e.target.value)} className="rounded-md border px-2 py-1" />
                            <Button onClick={() => applyFilters()} className="ml-auto">Filter</Button>
                        </div>
                    </div>

                    {adjustments.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center">No adjustments found.</p>
                    ) : (
                        <div className="space-y-3">
                            {adjustments.map((a) => (
                                <div key={a.id} className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium">{a.product?.name || 'Unknown'}</div>
                                        <div className="text-xs text-muted-foreground">by {a.user?.name || 'Unknown'}</div>
                                    </div>
                                    <div className={`font-mono ${a.change < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {a.change}
                                    </div>
                                    <div className="text-xs text-muted-foreground ml-4">{new Date(a.createdAt).toLocaleString()}</div>
                                </div>
                            ))}

                            <div className="flex items-center justify-between mt-3">
                                <div className="text-sm text-muted-foreground">Page {page} of {Math.max(1, Math.ceil(total / limit))}</div>
                                <div className="flex gap-2">
                                    <Button disabled={page <= 1} onClick={() => goPrev()}>Prev</Button>
                                    <Button disabled={page * limit >= total} onClick={() => goNext()}>Next</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

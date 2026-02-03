"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function StockAdjustClient() {
    const [open, setOpen] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [form, setForm] = useState<any>({ productId: '', type: 'IN', change: 1, reason: '' });
    const toast = useToast();
    const router = useRouter();

    useEffect(() => {
        async function load() {
            try {
                // Fetch all products
                const res = await fetch('/api/inventory/products');
                const data = await res.json();
                if (data.success) setProducts(data.data);
            } catch (err) {
                console.error(err);
            }
        }
        load();
    }, []);

    function setField(key: string, val: any) {
        setForm((s: any) => ({ ...s, [key]: val }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            const payload = {
                productId: Number(form.productId),
                change: Number(form.change),
                type: form.type,
                reason: form.reason,
            };
            const res = await fetch('/api/inventory/adjust-stock', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Error');
            const adjustment = data.data?.adjustment || data.adjustment || null;
            toast.toast({ title: 'Stock updated', description: adjustment ? `${adjustment.product?.name || ''}: ${adjustment.change} (${adjustment.type})` : undefined });
            // notify other parts of app to reload adjustments
            try { window.dispatchEvent(new CustomEvent('adjustment:created', { detail: adjustment })); } catch(e){}
            setOpen(false);
            router.refresh();
        } catch (err: any) {
            toast.toast({ title: 'Error', description: err.message || String(err), variant: 'destructive' });
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default" size="sm">Adjust Stock</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Stock Adjustment</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-sm text-muted-foreground">Product</label>
                        <select value={form.productId} onChange={(e) => setField('productId', e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2" required>
                            <option value="">Select product</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>{p.name} ({p.stock})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm text-muted-foreground">Type</label>
                        <div className="mt-1 flex gap-2">
                            <label className="inline-flex items-center gap-2">
                                <input type="radio" name="type" value="IN" checked={form.type === 'IN'} onChange={() => setField('type', 'IN')} />
                                <span>IN</span>
                            </label>
                            <label className="inline-flex items-center gap-2">
                                <input type="radio" name="type" value="OUT" checked={form.type === 'OUT'} onChange={() => setField('type', 'OUT')} />
                                <span>OUT</span>
                            </label>
                            <label className="inline-flex items-center gap-2">
                                <input type="radio" name="type" value="ADJUSTMENT" checked={form.type === 'ADJUSTMENT'} onChange={() => setField('type', 'ADJUSTMENT')} />
                                <span>ADJUSTMENT</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-muted-foreground">Amount</label>
                        <Input type="number" value={form.change} min={1} onChange={(e) => setField('change', e.target.value)} required />
                    </div>

                    <div>
                        <label className="text-sm text-muted-foreground">Reason</label>
                        <Input value={form.reason} onChange={(e) => setField('reason', e.target.value)} />
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit">Apply</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

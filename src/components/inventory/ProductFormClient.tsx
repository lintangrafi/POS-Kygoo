"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function ProductFormClient({ product, mode = 'add' }: any) {
    const [open, setOpen] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [form, setForm] = useState<any>({
        name: product?.name || '',
        sku: product?.sku || '',
        categoryId: product?.categoryId || undefined,
        price: product?.price || '',
        costPrice: product?.costPrice || '',
        stock: product?.stock ?? 0,
        isMenuItem: product?.isMenuItem ?? true,
    });
    const toast = useToast();
    const router = useRouter();

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch('/api/inventory/categories');
                const data = await res.json();
                if (data.success) setCategories(data.data);
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
            const payload: any = {
                name: form.name,
                sku: form.sku || undefined,
                categoryId: Number(form.categoryId),
                price: String(form.price),
                costPrice: String(form.costPrice || 0),
                stock: Number(form.stock) || 0,
                isMenuItem: Boolean(form.isMenuItem),
            };

            const url = mode === 'add' ? '/api/inventory/add-product' : '/api/inventory/update-product';
            const body = mode === 'add' ? payload : { id: product.id, ...payload };

            const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Error');

            toast.toast({ title: mode === 'add' ? 'Product added' : 'Product updated' });
            setOpen(false);
            router.refresh();
        } catch (err: any) {
            toast.toast({ title: 'Error', description: err.message || String(err), variant: 'destructive' });
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={mode === 'add' ? 'default' : 'outline'} size="sm">{mode === 'add' ? 'Add Product' : 'Edit'}</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{mode === 'add' ? 'Add Product' : 'Edit Product'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-sm text-muted-foreground">Name</label>
                        <Input value={form.name} onChange={(e) => setField('name', e.target.value)} required />
                    </div>
                    <div>
                        <label className="text-sm text-muted-foreground">Category</label>
                        <select value={form.categoryId} onChange={(e) => setField('categoryId', e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2">
                            <option value="">Select category</option>
                            {categories.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm text-muted-foreground">SKU</label>
                        <Input value={form.sku} onChange={(e) => setField('sku', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-sm text-muted-foreground">Price</label>
                            <Input value={form.price} onChange={(e) => setField('price', e.target.value)} required />
                        </div>
                        <div>
                            <label className="text-sm text-muted-foreground">Cost (HPP)</label>
                            <Input value={form.costPrice} onChange={(e) => setField('costPrice', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-sm text-muted-foreground">Stock</label>
                            <Input type="number" value={form.stock} onChange={(e) => setField('stock', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-sm text-muted-foreground">Show in POS</label>
                            <div className="mt-1">
                                <label className="inline-flex items-center gap-2">
                                    <input type="checkbox" checked={form.isMenuItem} onChange={(e) => setField('isMenuItem', e.target.checked)} />
                                    <span className="text-sm">Is menu item</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        {mode === 'edit' && (
                            <Button
                                variant="destructive"
                                onClick={async (e) => {
                                    e.preventDefault();
                                    if (confirm(`Are you sure you want to delete ${form.name}?`)) {
                                        try {
                                            const res = await fetch('/api/inventory/delete-product', {
                                                method: 'POST',
                                                headers: { 'content-type': 'application/json' },
                                                body: JSON.stringify({ id: product.id })
                                            });
                                            const data = await res.json();
                                            if (!data.success) throw new Error(data.error || 'Error');

                                            toast.toast({ title: 'Product deleted' });
                                            setOpen(false);
                                            router.refresh();
                                        } catch (err: any) {
                                            const msg = err.message || String(err);
                                            toast.toast({ title: 'Error', description: msg, variant: 'destructive' });
                                            // If deletion is blocked by FK constraints, offer to archive instead
                                            if (typeof msg === 'string' && (msg.includes('cannot be deleted') || msg.includes('has stock adjustment'))) {
                                                if (confirm('Product cannot be deleted because it is referenced. Archive this product instead?')) {
                                                    try {
                                                        const r = await fetch('/api/inventory/archive-product', {
                                                            method: 'POST',
                                                            headers: { 'content-type': 'application/json' },
                                                            body: JSON.stringify({ id: product.id })
                                                        });
                                                        const d = await r.json();
                                                        if (!d.success) throw new Error(d.error || 'Error');
                                                        toast.toast({ title: 'Product archived' });
                                                        setOpen(false);
                                                        router.refresh();
                                                    } catch (err2: any) {
                                                        toast.toast({ title: 'Archive failed', description: err2.message || String(err2), variant: 'destructive' });
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }}
                            >
                                Delete
                            </Button>
                        )}
                        <Button type="submit">{mode === 'add' ? 'Add' : 'Save'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

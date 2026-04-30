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
    const [events, setEvents] = useState<any[]>([]);
    const [form, setForm] = useState<any>({
        name: product?.name || '',
        sku: product?.sku || '',
        categoryId: product?.categoryId || undefined,
        price: product?.price || '',
        costPrice: product?.costPrice || '',
        stock: product?.stock ?? 0,
        isMenuItem: product?.isMenuItem ?? true,
        eventId: product?.eventId || null,
        organizerShareType: product?.organizerShareType || 'FIXED',
        organizerShareValue: product?.organizerShareValue || '',
    });
    const toast = useToast();
    const router = useRouter();

    useEffect(() => {
        async function load() {
            try {
                const [categoriesRes, eventsRes] = await Promise.all([
                    fetch('/api/inventory/categories'),
                    fetch('/api/inventory/events'),
                ]);
                
                const categoriesData = await categoriesRes.json();
                if (categoriesData.success) setCategories(categoriesData.data);
                
                const eventsData = await eventsRes.json();
                if (eventsData.success) setEvents(eventsData.data);
            } catch (err) {
                console.error(err);
            }
        }
        load();
    }, []);

    useEffect(() => {
        if (!open || mode !== 'add') return;
        if (!form.categoryId && categories.length > 0) {
            setForm((s: any) => ({ ...s, categoryId: categories[0].id }));
        }
    }, [open, mode, categories, form.categoryId]);

    // Reset form when dialog opens in 'add' mode
    useEffect(() => {
        if (open && mode === 'add') {
            setForm({
                name: '',
                sku: '',
                categoryId: undefined,
                price: '',
                costPrice: '',
                stock: 0,
                isMenuItem: true,
                eventId: null,
                organizerShareType: 'FIXED',
                organizerShareValue: '',
            });
        }
    }, [open, mode]);

    useEffect(() => {
        if (!form.eventId) {
            setForm((s: any) => ({
                ...s,
                organizerShareType: 'FIXED',
                organizerShareValue: '',
            }));
        }
    }, [form.eventId]);

    function setField(key: string, val: any) {
        setForm((s: any) => ({ ...s, [key]: val }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (!form.categoryId) {
                toast.toast({ title: 'Category is required', variant: 'destructive' });
                return;
            }
            const payload: any = {
                name: form.name,
                sku: form.sku || undefined,
                categoryId: Number(form.categoryId),
                price: String(form.price),
                costPrice: String(form.costPrice || 0),
                stock: Number(form.stock) || 0,
                isMenuItem: Boolean(form.isMenuItem),
                eventId: form.eventId ? Number(form.eventId) : null,
                organizerShareType: form.eventId ? form.organizerShareType : null,
                organizerShareValue: form.eventId && form.organizerShareValue !== ''
                    ? Number(form.organizerShareValue)
                    : null,
            };

            if (payload.eventId && (payload.organizerShareValue === null || payload.organizerShareValue === '')) {
                toast.toast({ title: 'Nilai pembagian penyelenggara wajib diisi untuk item event', variant: 'destructive' });
                return;
            }

            if (!form.stock && form.stock !== 0) {
                toast.toast({ title: 'Stock wajib diisi', variant: 'destructive' });
                return;
            }

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
                    <DialogTitle>{mode === 'add' ? 'Create Product' : 'Edit Product'}</DialogTitle>
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
                        <label className="text-sm text-muted-foreground">Event (Optional - leave empty for Studio)</label>
                        <select value={form.eventId || ''} onChange={(e) => setField('eventId', e.target.value ? Number(e.target.value) : null)} className="mt-1 block w-full rounded-md border px-3 py-2">
                            <option value="">Studio (No event)</option>
                            {events.map((e: any) => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>
                    </div>
                    {form.eventId && (
                        <div className="rounded-md border border-[#E6DED0] bg-[#FFF8F0] p-3 space-y-2">
                            <label className="text-sm font-medium text-[#1F1D1A]">Pembagian Per Item (Penyelenggara)</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-muted-foreground">Tipe</label>
                                    <select
                                        value={form.organizerShareType}
                                        onChange={(e) => setField('organizerShareType', e.target.value)}
                                        className="mt-1 block w-full rounded-md border px-3 py-2"
                                    >
                                        <option value="FIXED">Nominal Tetap (Rp)</option>
                                        <option value="PERCENTAGE">Persentase (%)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground">Nilai</label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={form.organizerShareType === 'PERCENTAGE' ? 100 : undefined}
                                        step={form.organizerShareType === 'PERCENTAGE' ? '0.01' : '100'}
                                        value={form.organizerShareValue}
                                        onChange={(e) => setField('organizerShareValue', e.target.value)}
                                        placeholder={form.organizerShareType === 'PERCENTAGE' ? 'contoh: 20' : 'contoh: 5000'}
                                        required={!!form.eventId}
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">Bagian studio otomatis dari sisa harga item.</p>
                        </div>
                    )}
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
                            <Input type="number" value={form.stock} onChange={(e) => setField('stock', e.target.value)} required />
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

'use client';

import { useState } from 'react';
import { addIncome, deleteIncome } from '@/actions/income-actions';
import { formatRupiah } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaymentBadge } from '@/components/ui/payment-badge';
import { CategoryBadge } from '@/components/ui/category-badge';

type Income = {
    id: number;
    description: string;
    amount: string;
    category: string;
    paymentMethod: string;
    date: Date;
    notes: string | null;
    user?: { name: string };
};

type EventOption = {
    id: number;
    name: string;
};

export function IncomeManagement({
    incomes,
    role,
    eventOptions = [],
    defaultEventId = null,
}: {
    incomes: Income[];
    role: 'CASHIER' | 'ADMIN' | 'SUPERADMIN';
    eventOptions?: EventOption[];
    defaultEventId?: number | null;
}) {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';
    const visibleLimit = 6;
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(incomes.length / visibleLimit));
    const startIndex = (page - 1) * visibleLimit;
    const visibleIncomes = incomes.slice(startIndex, startIndex + visibleLimit);

    const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isAdmin) {
            alert('Only admins can add incomes');
            return;
        }
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        
        try {
            await addIncome({
                description: formData.get('description') as string,
                amount: parseFloat(formData.get('amount') as string),
                category: formData.get('category') as 'SERVICE' | 'REFUND' | 'OTHER',
                paymentMethod: formData.get('paymentMethod') as 'CASH' | 'QRIS',
                eventId: formData.get('eventId') ? Number(formData.get('eventId')) : null,
                date: new Date(formData.get('date') as string),
                notes: formData.get('notes') as string || undefined,
            });
            
            setIsAddOpen(false);
            e.currentTarget.reset();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!isAdmin) {
            alert('Only admins can delete incomes');
            return;
        }
        if (!confirm('Delete this income?')) return;
        
        try {
            await deleteIncome(id);
        } catch (error: any) {
            alert(error.message);
        }
    };

    // Get today's date in YYYY-MM-DD format for default value
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;



    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-[#1F1D1A]">Daily Income</h3>
                    <p className="text-xs text-[#6F6659]">Catat pemasukan tambahan harian.</p>
                    {!isAdmin && (
                        <p className="text-xs text-[#8B1A1A]">Not authorized</p>
                    )}
                </div>
                <Button
                    className="rounded-full border border-[#E6DED0] bg-white text-[#1F1D1A] hover:bg-[#F8F3EA]"
                    onClick={() => setIsAddOpen(true)}
                    disabled={!isAdmin}
                    title={isAdmin ? 'Add income' : 'Only admins can add incomes'}
                >
                    + Add Income
                </Button>
            </div>

            {incomes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No income recorded for this period
                </div>
            ) : (
                <div className="space-y-2">
                    {visibleIncomes.map((income) => (
                        <div key={income.id} className="flex items-start justify-between rounded-xl border border-[#E6DED0] bg-white px-4 py-3">
                            <div className="flex-1">
                                <div className="font-semibold text-[#1F1D1A]">{income.description}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6F6659]">
                                    <CategoryBadge kind="income" category={income.category} />
                                    <span>•</span>
                                    <PaymentBadge method={income.paymentMethod} />
                                    <span>•</span>
                                    <span>{new Date(income.date).toLocaleDateString('id-ID')}</span>
                                    <span>•</span>
                                    <span>{income.user?.name}</span>
                                </div>
                                {income.notes && (
                                    <div className="mt-1 text-xs text-[#6F6659]">{income.notes}</div>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-sm font-semibold text-[#1F7A3F]">+{formatRupiah(Number(income.amount))}</div>
                                {isAdmin && (
                                    <button
                                        onClick={() => handleDelete(income.id)}
                                        className="text-xs text-[#C3472E] hover:text-[#9C3724]"
                                        title="Delete income"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {incomes.length > visibleLimit && (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6F6659]">
                            <span>Menampilkan {startIndex + 1}-{Math.min(startIndex + visibleLimit, incomes.length)} dari {incomes.length} pemasukan.</span>
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
            )}

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Income</DialogTitle>
                        <DialogDescription>Record daily additional income</DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                            <Label htmlFor="description">Description *</Label>
                            <Input
                                id="description"
                                name="description"
                                placeholder="e.g., Service charge, Refund reversal"
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="amount">Amount (IDR) *</Label>
                            <Input
                                id="amount"
                                name="amount"
                                type="number"
                                step="0.01"
                                placeholder="0"
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="category">Category *</Label>
                            <select
                                id="category"
                                name="category"
                                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                                required
                            >
                                <option value="SERVICE">Service</option>
                                <option value="REFUND">Refund</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="paymentMethod">Payment Method *</Label>
                            <select
                                id="paymentMethod"
                                name="paymentMethod"
                                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                                required
                            >
                                <option value="CASH">Cash</option>
                                <option value="QRIS">QRIS</option>
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="eventId">Event</Label>
                            <select
                                id="eventId"
                                name="eventId"
                                defaultValue={defaultEventId ?? ''}
                                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                            >
                                <option value="">No event</option>
                                {eventOptions.map((event) => (
                                    <option key={event.id} value={event.id}>{event.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="date">Date *</Label>
                            <Input
                                id="date"
                                name="date"
                                type="date"
                                defaultValue={todayStr}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Input
                                id="notes"
                                name="notes"
                                placeholder="Additional notes (optional)"
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Adding...' : 'Add Income'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

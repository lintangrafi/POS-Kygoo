'use client';

import { useState } from 'react';
import { addExpense, deleteExpense } from '@/actions/expense-actions';
import { formatRupiah } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaymentBadge } from '@/components/ui/payment-badge';
import { CategoryBadge } from '@/components/ui/category-badge';

type Expense = {
    id: number;
    description: string;
    amount: string;
    category: string;
    paymentMethod: string;
    date: Date;
    notes: string | null;
    user?: { name: string };
};

export function ExpenseManagement({ expenses, role }: { expenses: Expense[]; role: 'CASHIER' | 'ADMIN' | 'SUPERADMIN' }) {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';
    const visibleLimit = 6;
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(expenses.length / visibleLimit));
    const startIndex = (page - 1) * visibleLimit;
    const visibleExpenses = expenses.slice(startIndex, startIndex + visibleLimit);

    const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isAdmin) {
            alert('Only admins can add expenses');
            return;
        }
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        
        try {
            await addExpense({
                description: formData.get('description') as string,
                amount: parseFloat(formData.get('amount') as string),
                category: formData.get('category') as 'SUPPLIES' | 'UTILITIES' | 'MAINTENANCE' | 'OTHER',
                paymentMethod: formData.get('paymentMethod') as 'CASH' | 'QRIS',
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
            alert('Only admins can delete expenses');
            return;
        }
        if (!confirm('Delete this expense?')) return;
        
        try {
            await deleteExpense(id);
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
                    <h3 className="text-lg font-semibold text-[#1F1D1A]">Daily Expenses</h3>
                    <p className="text-xs text-[#6F6659]">Catat pengeluaran operasional harian.</p>
                    {!isAdmin && (
                        <p className="text-xs text-[#8B1A1A]">Not authorized</p>
                    )}
                </div>
                <Button
                    className="rounded-full border border-[#E6DED0] bg-white text-[#1F1D1A] hover:bg-[#F8F3EA]"
                    onClick={() => setIsAddOpen(true)}
                    disabled={!isAdmin}
                    title={isAdmin ? 'Add expense' : 'Only admins can add expenses'}
                >
                    + Add Expense
                </Button>
            </div>

            {expenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No expenses recorded for this period
                </div>
            ) : (
                <div className="space-y-2">
                    {visibleExpenses.map((expense) => (
                        <div key={expense.id} className="flex items-start justify-between rounded-xl border border-[#E6DED0] bg-white px-4 py-3">
                            <div className="flex-1">
                                <div className="font-semibold text-[#1F1D1A]">{expense.description}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6F6659]">
                                    <CategoryBadge kind="expense" category={expense.category} />
                                    <span>•</span>
                                    <PaymentBadge method={expense.paymentMethod} />
                                    <span>•</span>
                                    <span>{new Date(expense.date).toLocaleDateString('id-ID')}</span>
                                    <span>•</span>
                                    <span>{expense.user?.name}</span>
                                </div>
                                {expense.notes && (
                                    <div className="mt-1 text-xs text-[#6F6659]">{expense.notes}</div>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-sm font-semibold text-[#C3472E]">-{formatRupiah(Number(expense.amount))}</div>
                                {isAdmin && (
                                    <button
                                        onClick={() => handleDelete(expense.id)}
                                        className="text-xs text-[#C3472E] hover:text-[#9C3724]"
                                        title="Delete expense"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {expenses.length > visibleLimit && (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6F6659]">
                            <span>Menampilkan {startIndex + 1}-{Math.min(startIndex + visibleLimit, expenses.length)} dari {expenses.length} pengeluaran.</span>
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
                        <DialogTitle>Add New Expense</DialogTitle>
                        <DialogDescription>Record an unexpected daily expense</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                            <Label htmlFor="description">Description *</Label>
                            <Input
                                id="description"
                                name="description"
                                placeholder="e.g., Bought ice"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="amount">Amount (Rp) *</Label>
                            <Input
                                id="amount"
                                name="amount"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="5000"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="category">Category *</Label>
                            <select
                                id="category"
                                name="category"
                                className="w-full px-3 py-2 border rounded-md"
                                required
                            >
                                <option value="SUPPLIES">Supplies</option>
                                <option value="UTILITIES">Utilities</option>
                                <option value="MAINTENANCE">Maintenance</option>
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
                            <Label htmlFor="notes">Notes (optional)</Label>
                            <textarea
                                id="notes"
                                name="notes"
                                className="w-full px-3 py-2 border rounded-md"
                                rows={2}
                                placeholder="Additional details..."
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Adding...' : 'Add Expense'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

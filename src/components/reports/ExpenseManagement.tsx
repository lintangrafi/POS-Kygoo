'use client';

import { useState } from 'react';
import { addExpense, deleteExpense } from '@/actions/expense-actions';
import { formatRupiah } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Expense = {
    id: number;
    description: string;
    amount: string;
    category: string;
    date: Date;
    notes: string | null;
    user?: { name: string };
};

export function ExpenseManagement({ expenses }: { expenses: Expense[] }) {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        
        try {
            await addExpense({
                description: formData.get('description') as string,
                amount: parseFloat(formData.get('amount') as string),
                category: formData.get('category') as 'SUPPLIES' | 'UTILITIES' | 'MAINTENANCE' | 'OTHER',
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
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Daily Expenses</h3>
                <Button onClick={() => setIsAddOpen(true)}>+ Add Expense</Button>
            </div>

            {expenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No expenses recorded for this period
                </div>
            ) : (
                <div className="space-y-2">
                    {expenses.map((expense) => (
                        <div key={expense.id} className="flex items-start justify-between p-3 border rounded-md">
                            <div className="flex-1">
                                <div className="font-medium">{expense.description}</div>
                                <div className="text-sm text-muted-foreground">
                                    {expense.category} • {new Date(expense.date).toLocaleDateString()} • {expense.user?.name}
                                </div>
                                {expense.notes && (
                                    <div className="text-sm text-muted-foreground mt-1">{expense.notes}</div>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-red-600 font-semibold">-{formatRupiah(Number(expense.amount))}</div>
                                <button
                                    onClick={() => handleDelete(expense.id)}
                                    className="text-xs text-red-500 hover:text-red-700"
                                    title="Delete expense"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
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

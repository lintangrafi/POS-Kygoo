'use client';

import { useState } from 'react';
import { addIncome, deleteIncome } from '@/actions/income-actions';
import { formatRupiah } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

export function IncomeManagement({ incomes }: { incomes: Income[] }) {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        
        try {
            await addIncome({
                description: formData.get('description') as string,
                amount: parseFloat(formData.get('amount') as string),
                category: formData.get('category') as 'SERVICE' | 'REFUND' | 'OTHER',
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

    const getPaymentMethodBadgeColor = (method: string) => {
        return method === 'CASH' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Daily Income</h3>
                <Button onClick={() => setIsAddOpen(true)}>+ Add Income</Button>
            </div>

            {incomes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No income recorded for this period
                </div>
            ) : (
                <div className="space-y-2">
                    {incomes.map((income) => (
                        <div key={income.id} className="flex items-start justify-between p-3 border rounded-md">
                            <div className="flex-1">
                                <div className="font-medium">{income.description}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                    <span>{income.category}</span>
                                    <span>•</span>
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getPaymentMethodBadgeColor(income.paymentMethod)}`}>
                                        {income.paymentMethod}
                                    </span>
                                    <span>•</span>
                                    <span>{new Date(income.date).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>{income.user?.name}</span>
                                </div>
                                {income.notes && (
                                    <div className="text-sm text-muted-foreground mt-1">{income.notes}</div>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-green-600 font-semibold">+{formatRupiah(Number(income.amount))}</div>
                                <button
                                    onClick={() => handleDelete(income.id)}
                                    className="text-xs text-red-500 hover:text-red-700"
                                    title="Delete income"
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

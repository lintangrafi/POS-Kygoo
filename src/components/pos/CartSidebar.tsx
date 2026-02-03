'use client';

import { usePosStore } from '@/store/use-pos-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { formatRupiah, cn } from '@/lib/utils';
import { Minus, Plus, Trash2, CreditCard, Banknote, QrCode } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SmartNumpad } from './SmartNumpad';
import { processTransaction } from '@/actions/pos-actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast'; // We might need to create this hook if Shadcn didn't install it fully, or just use alert for now.

// Custom simple toast/alert since we didn't fully setup Toaster
const notify = (msg: string) => alert(msg);

export function CartSidebar() {
    const { cart, removeFromCart, updateQuantity, clearCart } = usePosStore();
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedToDelete, setSelectedToDelete] = useState<Record<number, boolean>>({});
    const [amountPaid, setAmountPaid] = useState('0');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS' | 'TRANSFER'>('CASH');

    // Split-bill state
    const [isSplitMode, setIsSplitMode] = useState(false);
    const [splitCashAmount, setSplitCashAmount] = useState<number>(0);
    const [splitNonCashAmount, setSplitNonCashAmount] = useState<number>(0);
    const [splitNonCashMethod, setSplitNonCashMethod] = useState<'QRIS'|'TRANSFER'>('QRIS');

    // Derived totals
    const total = cart.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);
    const change = Math.max(0, parseInt(amountPaid || '0') - total);

    // Reset amounts when modal opens or total changes
    useEffect(() => {
        if (isPaymentModalOpen) {
            setAmountPaid(total.toString());
            setPaymentMethod('CASH');
            setIsSplitMode(false);
            setSplitCashAmount(total);
            setSplitNonCashAmount(0);
            setSplitNonCashMethod('QRIS');
            setNumpadTarget('CASH');
        }
    }, [isPaymentModalOpen, total]);

    // Numpad target for split behavior
    const [numpadTarget, setNumpadTarget] = useState<'CASH'|'NONCASH'|'DEFAULT'>('DEFAULT');

    // Initial hydration fix (moved after hooks to keep hook order stable)
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    const handleNumpadInput = (val: string) => {
        if (isSplitMode) {
            if (numpadTarget === 'CASH') {
                setSplitCashAmount(prev => {
                    const prevStr = String(prev || 0);
                    if (prevStr === '0') return Number(val);
                    return Number(prevStr + val);
                });
                return;
            }
            if (numpadTarget === 'NONCASH') {
                setSplitNonCashAmount(prev => {
                    const prevStr = String(prev || 0);
                    if (prevStr === '0') return Number(val);
                    return Number(prevStr + val);
                });
                return;
            }
        }

        setAmountPaid(prev => {
            if (prev === '0') return val;
            return prev + val;
        });
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        if (isSplitMode) {
            const sum = Number(splitCashAmount || 0) + Number(splitNonCashAmount || 0);
            if (sum < total) {
                notify("Insufficient total payment for split bill!");
                return;
            }

            const paymentMethods: { method: 'CASH'|'QRIS'|'TRANSFER'; amount: number }[] = [];
            if (Number(splitCashAmount) > 0) paymentMethods.push({ method: 'CASH', amount: Number(splitCashAmount) });
            if (Number(splitNonCashAmount) > 0) paymentMethods.push({ method: splitNonCashMethod as 'QRIS'|'TRANSFER', amount: Number(splitNonCashAmount) });

            const changeAmount = Math.max(0, sum - total);

            // Processing
            const result = await processTransaction({
                items: cart.map(i => ({ productId: i.id, quantity: i.quantity, price: Number(i.price) })),
                paymentMethods,
                totalAmount: total,
            });

            if (result.success) {
                notify("Transaction Successful!");
                clearCart();
                setIsPaymentModalOpen(false);
                setAmountPaid('0');
                setIsSplitMode(false);
                setSplitCashAmount(0);
                setSplitNonCashAmount(0);
            } else {
                notify("Transaction Failed: " + result.error);
            }

            return;
        }

        // Simple logic: if Cash, ensure paid >= total
        if (paymentMethod === 'CASH' && parseInt(amountPaid) < total) {
            notify("Insufficient cash!");
            return;
        }

        // Processing
        const result = await processTransaction({
            items: cart.map(i => ({ productId: i.id, quantity: i.quantity, price: Number(i.price) })),
            paymentMethods: [{
                method: paymentMethod,
                amount: paymentMethod === 'CASH' ? total : total // For now assume full payment via one method or simple split later
            }],
            totalAmount: total,
        });

        if (result.success) {
            // Print Receipt Logic Here
            const receiptContent = `
                KYGOO STUDIO
                ${result.invoiceAndDate}
                --------------------------------
                ${cart.map(i => `${i.name}\n${i.quantity} x ${formatRupiah(Number(i.price))} = ${formatRupiah(i.quantity * Number(i.price))}`).join('\n')}
                --------------------------------
                TOTAL: ${formatRupiah(total)}
                PAID:  ${formatRupiah(parseInt(amountPaid) || total)}
                CHANGE: ${formatRupiah(change)}
                --------------------------------
                Thank you!
            `;

            // Create a hidden iframe or temporary logic to print
            // For MVP, we invoke window.print() but that prints the whole page. 
            // Better: Open a small popup or write to a hidden div.
            // Let's do a basic alert for success then Clear.

            // Really basic print trigger mimicking thermal printer
            console.log("PRINTING:", receiptContent);

            notify("Transaction Successful!");
            clearCart();
            setIsPaymentModalOpen(false);
            setAmountPaid('0');
        } else {
            notify("Transaction Failed: " + result.error);
        }
    };

    return (
        <div className="flex flex-col h-full border-l bg-card">
            {/* Cart Header */}
            <div className="p-4 border-b">
                <h2 className="font-bold text-lg">Current Order</h2>
                <span className="text-sm text-muted-foreground">{cart.length} items</span>
            </div>

            {/* Cart Items */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {cart.map((item) => (
                        <div key={item.id} className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-muted-foreground">{formatRupiah(Number(item.price))}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                    <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-4 text-center text-sm">{item.quantity}</span>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                    <Plus className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="destructive" className="h-6 w-6" onClick={() => removeFromCart(item.id)}>
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* Totals & Actions */}
            <div className="p-4 border-t bg-muted/20">
                <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-lg">Total</span>
                    <span className="font-bold text-2xl">{formatRupiah(total)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => setIsDeleteModalOpen(true)}>
                        Delete
                    </Button>
                    <Button className="w-full font-bold text-lg" disabled={cart.length === 0} onClick={() => setIsPaymentModalOpen(true)}>
                        Charge
                    </Button>
                </div>
            </div>

            {/* Delete Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Items from Cart</DialogTitle>
                    </DialogHeader>
                    <div className="p-4">
                        <p className="text-sm text-muted-foreground">Select items to delete from current order.</p>
                        <div className="mt-3 space-y-2">
                            {cart.map(item => (
                                <label key={item.id} className="flex items-center gap-2">
                                    <input type="checkbox" checked={!!selectedToDelete[item.id]} onChange={(e) => setSelectedToDelete(prev => ({ ...prev, [item.id]: e.target.checked }))} />
                                    <div className="flex-1">
                                        <div className="font-medium">{item.name}</div>
                                        <div className="text-xs text-muted-foreground">{formatRupiah(Number(item.price))} x {item.quantity}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="p-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => { setSelectedToDelete({}); setIsDeleteModalOpen(false); }}>Cancel</Button>
                        <Button className="bg-red-600 text-white" onClick={() => {
                            const idsToDelete = Object.entries(selectedToDelete).filter(([k, v]) => v).map(([k]) => Number(k));
                            if (idsToDelete.length === 0) {
                                alert('No items selected');
                                return;
                            }
                            for (const id of idsToDelete) {
                                removeFromCart(id);
                            }
                            setSelectedToDelete({});
                            setIsDeleteModalOpen(false);
                        }}>Delete Selected</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Payment Modal */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="max-w-[95vw] md:max-w-4xl h-[90vh] md:h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Payment</DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col md:flex-row flex-1 gap-4 md:gap-6 min-h-0">
                        {/* Left: Summary & Methods */}
                        <div className="w-full md:w-1/2 flex flex-col gap-4">
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                <span className="block text-sm text-muted-foreground">Total Due</span>
                                <span className="block text-4xl font-bold">{formatRupiah(total)}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <Button
                                    variant={paymentMethod === 'CASH' ? 'default' : 'outline'}
                                    className="h-20 flex-col gap-2"
                                    onClick={() => { setPaymentMethod('CASH'); setIsSplitMode(false); setAmountPaid(total.toString()); }}
                                >
                                    <Banknote className="w-6 h-6" />
                                    Cash
                                </Button>
                                <Button
                                    variant={paymentMethod === 'QRIS' ? 'default' : 'outline'}
                                    className="h-20 flex-col gap-2"
                                    onClick={() => { setPaymentMethod('QRIS'); setIsSplitMode(false); setAmountPaid(total.toString()); }}
                                >
                                    <QrCode className="w-6 h-6" />
                                    QRIS
                                </Button>
                                <Button
                                    variant={paymentMethod === 'TRANSFER' ? 'default' : 'outline'}
                                    className="h-20 flex-col gap-2"
                                    onClick={() => { setPaymentMethod('TRANSFER'); setIsSplitMode(false); setAmountPaid(total.toString()); }}
                                >
                                    <CreditCard className="w-6 h-6" />
                                    Transfer
                                </Button>
                            </div>

                            <div className="mt-3 flex gap-2">
                                <Button variant={isSplitMode ? 'default' : 'outline'} onClick={() => setIsSplitMode(!isSplitMode)} className="flex-1">
                                    {isSplitMode ? 'Split: ON' : 'Split Bill'}
                                </Button>
                            </div>

                            {isSplitMode && (
                                <div className="mt-3 space-y-2">
                                    <div>
                                        <Label htmlFor="splitCash">Cash Amount</Label>
                                        <input id="splitCash" type="number" min={0} value={splitCashAmount} onFocus={() => setNumpadTarget('CASH')} onChange={(e) => setSplitCashAmount(Number(e.target.value))} className="w-full rounded border px-2 py-1" />
                                    </div>
                                    <div>
                                        <Label htmlFor="splitNonCash">Non-cash Method</Label>
                                        <div className="flex gap-2 items-center">
                                            <select value={splitNonCashMethod} onChange={(e) => setSplitNonCashMethod(e.target.value as any)} className="rounded border px-2 py-1">
                                                <option value="QRIS">QRIS</option>
                                                <option value="TRANSFER">Transfer</option>
                                            </select>
                                            <input id="splitNonCash" type="number" min={0} value={splitNonCashAmount} onFocus={() => setNumpadTarget('NONCASH')} onChange={(e) => setSplitNonCashAmount(Number(e.target.value))} className="w-full rounded border px-2 py-1" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-auto">
                                <div className="flex justify-between text-lg font-medium mb-2">
                                    <span>Tendered:</span>
                                    <span>{formatRupiah(parseInt(amountPaid) || (isSplitMode ? (splitCashAmount + splitNonCashAmount) : 0))}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold text-primary">
                                    <span>Change:</span>
                                    <span>{formatRupiah(isSplitMode ? Math.max(0, (splitCashAmount + splitNonCashAmount) - total) : change)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Numpad (Only active for Cash usually) */}
                        <div className="w-full md:w-1/2 h-full">
                            <SmartNumpad
                                value={isSplitMode ? (numpadTarget === 'CASH' ? String(splitCashAmount) : numpadTarget === 'NONCASH' ? String(splitNonCashAmount) : amountPaid) : amountPaid}
                                onInput={handleNumpadInput}
                                onDelete={() => {
                                    if (isSplitMode) {
                                        if (numpadTarget === 'CASH') setSplitCashAmount(prev => Math.floor((prev || 0) / 10));
                                        else if (numpadTarget === 'NONCASH') setSplitNonCashAmount(prev => Math.floor((prev || 0) / 10));
                                        else setAmountPaid(prev => prev.slice(0, -1) || '0');
                                    } else {
                                        setAmountPaid(prev => prev.slice(0, -1) || '0');
                                    }
                                }}
                                onClear={() => {
                                    if (isSplitMode) {
                                        if (numpadTarget === 'CASH') setSplitCashAmount(0);
                                        else if (numpadTarget === 'NONCASH') setSplitNonCashAmount(0);
                                        else setAmountPaid('0');
                                    } else {
                                        setAmountPaid('0');
                                    }
                                }}
                                onEnter={handleCheckout}
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

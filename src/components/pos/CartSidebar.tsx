'use client';

import { usePosStore } from '@/store/use-pos-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { formatRupiah, cn } from '@/lib/utils';
import { Minus, Plus, Trash2, CreditCard, Banknote, QrCode } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SmartNumpad } from './SmartNumpad';
import { closeOpenBillAndCheckout, getOpenBillById, getOpenBills, processTransaction, saveOpenBill, voidOpenBill } from '@/actions/pos-actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

type OpenBillListItem = {
    id: number;
    billNumber: string;
    customerName: string | null;
    note: string | null;
    subtotalAmount: number;
    discountAmount: number;
    discountPercent: number;
    totalAmount: number;
    status: 'OPEN' | 'PARTIAL' | 'CLOSED' | 'VOID';
    itemCount: number;
    updatedAt: string;
    cashierName: string;
};

interface CartSidebarProps {
    initialOpenBills?: OpenBillListItem[];
}

// Custom simple toast/alert since we didn't fully setup Toaster
const notify = (msg: string) => alert(msg);

export function CartSidebar({ initialOpenBills = [] }: CartSidebarProps) {
    const {
        cart,
        removeFromCart,
        updateQuantity,
        clearCart,
        setCart,
        activeOpenBill,
        setActiveOpenBill,
    } = usePosStore();
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedToDelete, setSelectedToDelete] = useState<Record<number, boolean>>({});
    const [openBills, setOpenBills] = useState<OpenBillListItem[]>(initialOpenBills);
    const [isLoadingOpenBills, setIsLoadingOpenBills] = useState(false);
    const [isSavingOpenBill, setIsSavingOpenBill] = useState(false);
    const [isVoidingOpenBillId, setIsVoidingOpenBillId] = useState<number | null>(null);
    const [openBillSearch, setOpenBillSearch] = useState('');
    const [amountPaid, setAmountPaid] = useState('0');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS' | 'TRANSFER'>('CASH');
    const [discountType, setDiscountType] = useState<'AMOUNT' | 'PERCENT'>('AMOUNT');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [isProcessing, setIsProcessing] = useState(false); // Prevent double submission
    const [customerName, setCustomerName] = useState('');
    const [billNote, setBillNote] = useState('');

    // Split-bill state
    const [isSplitMode, setIsSplitMode] = useState(false);
    const [splitCashAmount, setSplitCashAmount] = useState<number>(0);
    const [splitNonCashAmount, setSplitNonCashAmount] = useState<number>(0);
    const [splitNonCashMethod, setSplitNonCashMethod] = useState<'QRIS'|'TRANSFER'>('QRIS');

    // Derived totals
    const subtotal = cart.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);
    const normalizedDiscountValue = discountType === 'PERCENT'
        ? Math.min(Math.max(discountValue, 0), 100)
        : Math.min(Math.max(discountValue, 0), subtotal);
    const discountAmount = discountType === 'PERCENT'
        ? (subtotal * normalizedDiscountValue) / 100
        : normalizedDiscountValue;
    const discountPercent = discountType === 'PERCENT'
        ? normalizedDiscountValue
        : subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
    const totalAfterDiscount = Math.max(0, subtotal - discountAmount);
    const change = Math.max(0, parseInt(amountPaid || '0') - totalAfterDiscount);

    // Reset amounts when modal opens or total changes
    useEffect(() => {
        if (discountType === 'AMOUNT') {
            if (discountValue > subtotal) setDiscountValue(subtotal);
            if (discountValue < 0) setDiscountValue(0);
        } else {
            if (discountValue > 100) setDiscountValue(100);
            if (discountValue < 0) setDiscountValue(0);
        }
    }, [discountType, discountValue, subtotal]);

    useEffect(() => {
        if (isPaymentModalOpen) {
            setAmountPaid(totalAfterDiscount.toString());
            setPaymentMethod('CASH');
            setIsSplitMode(false);
            setSplitCashAmount(totalAfterDiscount);
            setSplitNonCashAmount(0);
            setSplitNonCashMethod('QRIS');
            setNumpadTarget('CASH');
            setIsProcessing(false); // Reset processing flag when modal opens
        } else {
            setIsProcessing(false); // Reset processing flag when modal closes
        }
    }, [isPaymentModalOpen, totalAfterDiscount]);

    // Numpad target for split behavior
    const [numpadTarget, setNumpadTarget] = useState<'CASH'|'NONCASH'|'DEFAULT'>('DEFAULT');

    // Initial hydration fix (moved after hooks to keep hook order stable)
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const refreshOpenBills = async () => {
        setIsLoadingOpenBills(true);
        try {
            const rows = await getOpenBills();
            setOpenBills(rows as OpenBillListItem[]);
        } catch (error) {
            console.error('Failed to load open bills:', error);
        } finally {
            setIsLoadingOpenBills(false);
        }
    };

    useEffect(() => {
        if (!activeOpenBill) return;
        setCustomerName(activeOpenBill.customerName || '');
        setBillNote(activeOpenBill.note || '');
    }, [activeOpenBill]);

    const handleSaveOpenBill = async () => {
        if (cart.length === 0 || isSavingOpenBill) return;
        setIsSavingOpenBill(true);

        try {
            const result = await saveOpenBill({
                billId: activeOpenBill?.id,
                items: cart.map((item) => ({
                    productId: item.id,
                    quantity: item.quantity,
                    price: Number(item.price),
                    productName: item.name,
                })),
                subtotalAmount: subtotal,
                discountAmount,
                discountPercent,
                totalAmount: totalAfterDiscount,
                customerName: customerName.trim() || undefined,
                note: billNote.trim() || undefined,
            });

            if (!result.success) {
                notify(`Gagal simpan open bill: ${result.error}`);
                return;
            }

            setActiveOpenBill({
                id: result.billId,
                billNumber: result.billNumber,
                customerName: customerName.trim() || undefined,
                note: billNote.trim() || undefined,
            });
            notify(`Open bill ${result.billNumber} tersimpan.`);
            await refreshOpenBills();
        } catch (error) {
            console.error('Save open bill error:', error);
            notify('Terjadi error saat menyimpan open bill.');
        } finally {
            setIsSavingOpenBill(false);
        }
    };

    const handleResumeBill = async (billId: number) => {
        const result = await getOpenBillById(billId);

        if (!result.success) {
            notify(`Gagal buka bill: ${result.error}`);
            return;
        }

        const selectedBill = result.bill;
        setCart(
            selectedBill.items.map((item) => ({
                id: item.productId,
                name: item.productName,
                price: item.price.toString(),
                quantity: item.quantity,
                stock: 99999,
                categoryId: 0,
            }))
        );

        setDiscountType('AMOUNT');
        setDiscountValue(selectedBill.discountAmount);
        setCustomerName(selectedBill.customerName || '');
        setBillNote(selectedBill.note || '');
        setActiveOpenBill({
            id: selectedBill.id,
            billNumber: selectedBill.billNumber,
            customerName: selectedBill.customerName || undefined,
            note: selectedBill.note || undefined,
        });
        notify(`Bill ${selectedBill.billNumber} dimuat ke cart.`);
    };

    const resetCurrentOrderContext = () => {
        clearCart();
        setDiscountValue(0);
        setDiscountType('AMOUNT');
        setCustomerName('');
        setBillNote('');
        setActiveOpenBill(null);
    };

    const handleVoidBill = async (bill: OpenBillListItem) => {
        const confirmation = window.confirm(`Void bill ${bill.billNumber}? Tindakan ini tidak dapat dibatalkan.`);
        if (!confirmation) return;

        const reason = window.prompt('Alasan void (opsional):') || undefined;
        setIsVoidingOpenBillId(bill.id);
        try {
            const result = await voidOpenBill(bill.id, reason);
            if (!result.success) {
                notify(`Gagal void bill: ${result.error}`);
                return;
            }

            if (activeOpenBill?.id === bill.id) {
                resetCurrentOrderContext();
            }

            notify(`Bill ${bill.billNumber} berhasil di-void.`);
            await refreshOpenBills();
        } catch (error) {
            console.error('Void bill error:', error);
            notify('Terjadi error saat void bill.');
        } finally {
            setIsVoidingOpenBillId(null);
        }
    };

    const filteredOpenBills = openBills.filter((bill) => {
        const query = openBillSearch.trim().toLowerCase();
        if (!query) return true;

        return (
            bill.billNumber.toLowerCase().includes(query)
            || (bill.customerName || '').toLowerCase().includes(query)
            || (bill.cashierName || '').toLowerCase().includes(query)
        );
    });

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
        // Prevent double submission
        if (isProcessing) {
            notify("Processing transaction, please wait...");
            return;
        }

        if (cart.length === 0) return;

        setIsProcessing(true); // Set processing flag

        try {
            if (isSplitMode) {
                const sum = Number(splitCashAmount || 0) + Number(splitNonCashAmount || 0);
                if (sum < totalAfterDiscount) {
                    notify("Insufficient total payment for split bill!");
                    setIsProcessing(false);
                    return;
                }

                const paymentMethods: { method: 'CASH'|'QRIS'|'TRANSFER'; amount: number }[] = [];
                if (Number(splitCashAmount) > 0) paymentMethods.push({ method: 'CASH', amount: Number(splitCashAmount) });
                if (Number(splitNonCashAmount) > 0) paymentMethods.push({ method: splitNonCashMethod as 'QRIS'|'TRANSFER', amount: Number(splitNonCashAmount) });

                const changeAmount = Math.max(0, sum - totalAfterDiscount);

                // Processing
                const result = activeOpenBill
                    ? await closeOpenBillAndCheckout({
                        openBillId: activeOpenBill.id,
                        items: cart.map(i => ({ productId: i.id, quantity: i.quantity, price: Number(i.price) })),
                        paymentMethods,
                        subtotalAmount: subtotal,
                        discountAmount,
                        discountPercent,
                        totalAmount: totalAfterDiscount,
                    })
                    : await processTransaction({
                        items: cart.map(i => ({ productId: i.id, quantity: i.quantity, price: Number(i.price) })),
                        paymentMethods,
                        subtotalAmount: subtotal,
                        discountAmount,
                        discountPercent,
                        totalAmount: totalAfterDiscount,
                    });

                if (result.success) {
                    notify("Transaction Successful!");
                    resetCurrentOrderContext();
                    setIsPaymentModalOpen(false);
                    setAmountPaid('0');
                    setIsSplitMode(false);
                    setSplitCashAmount(0);
                    setSplitNonCashAmount(0);
                    await refreshOpenBills();
                } else {
                    notify("Transaction Failed: " + result.error);
                }

                setIsProcessing(false);
                return;
            }

            // Simple logic: if Cash, ensure paid >= total
            if (paymentMethod === 'CASH' && parseInt(amountPaid) < totalAfterDiscount) {
                notify("Insufficient cash!");
                setIsProcessing(false);
                return;
            }

            // Processing
            const result = activeOpenBill
                ? await closeOpenBillAndCheckout({
                    openBillId: activeOpenBill.id,
                    items: cart.map(i => ({ productId: i.id, quantity: i.quantity, price: Number(i.price) })),
                    paymentMethods: [{
                        method: paymentMethod,
                        amount: totalAfterDiscount,
                    }],
                    subtotalAmount: subtotal,
                    discountAmount,
                    discountPercent,
                    totalAmount: totalAfterDiscount,
                })
                : await processTransaction({
                    items: cart.map(i => ({ productId: i.id, quantity: i.quantity, price: Number(i.price) })),
                    paymentMethods: [{
                        method: paymentMethod,
                        amount: totalAfterDiscount,
                    }],
                    subtotalAmount: subtotal,
                    discountAmount,
                    discountPercent,
                    totalAmount: totalAfterDiscount,
                });

            if (result.success) {
            // Print Receipt Logic Here
            const receiptContent = `
                KYGOO STUDIO
                ${result.invoiceAndDate}
                --------------------------------
                ${cart.map(i => `${i.name}\n${i.quantity} x ${formatRupiah(Number(i.price))} = ${formatRupiah(i.quantity * Number(i.price))}`).join('\n')}
                --------------------------------
                SUBTOTAL: ${formatRupiah(subtotal)}
                DISCOUNT: ${formatRupiah(discountAmount)}
                TOTAL: ${formatRupiah(totalAfterDiscount)}
                PAID:  ${formatRupiah(parseInt(amountPaid) || totalAfterDiscount)}
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
            resetCurrentOrderContext();
            setIsPaymentModalOpen(false);
            setAmountPaid('0');
            await refreshOpenBills();
        } else {
            notify("Transaction Failed: " + result.error);
        }

        setIsProcessing(false); // Reset processing flag
        } catch (error) {
            console.error('Checkout error:', error);
            notify("An error occurred during checkout. Please try again.");
            setIsProcessing(false); // Ensure flag is reset on error
        }
    };

    if (!mounted) return null;

    return (
        <div className="flex flex-col h-full border-l bg-card/95">
            {/* Cart Header */}
            <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-lg">Current Order</h2>
                    {activeOpenBill ? (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Open Bill: {activeOpenBill.billNumber}</Badge>
                    ) : (
                        <Badge variant="secondary">Walk-in</Badge>
                    )}
                </div>
                <span className="text-sm text-muted-foreground">{cart.length} items</span>

                <div className="mt-3 grid gap-2">
                    <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Nama customer (opsional)"
                        className="h-9 rounded-md border bg-background px-3 text-sm"
                    />
                    <input
                        type="text"
                        value={billNote}
                        onChange={(e) => setBillNote(e.target.value)}
                        placeholder="Catatan bill"
                        className="h-9 rounded-md border bg-background px-3 text-sm"
                    />
                </div>
            </div>

            {/* Cart Items */}
            <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-background to-muted/10">
                <div className="space-y-4">
                    {cart.map((item) => (
                        <div key={item.id} className="flex justify-between items-start border rounded-lg p-2 bg-background">
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

                <div className="mt-5 rounded-lg border bg-muted/40 p-3">
                    <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Open Bills</h3>
                        <Badge variant="outline">{openBills.length}</Badge>
                    </div>
                    <input
                        type="text"
                        value={openBillSearch}
                        onChange={(e) => setOpenBillSearch(e.target.value)}
                        placeholder="Cari bill/customer..."
                        className="mb-2 h-8 w-full rounded-md border bg-background px-2 text-xs"
                    />
                    {isLoadingOpenBills ? (
                        <p className="text-xs text-muted-foreground">Loading open bills...</p>
                    ) : filteredOpenBills.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Belum ada open bill aktif.</p>
                    ) : (
                        <div className="space-y-2">
                            {filteredOpenBills.slice(0, 8).map((bill) => (
                                <div key={bill.id} className={cn(
                                    'rounded-md border p-2 bg-background',
                                    activeOpenBill?.id === bill.id && 'border-amber-500 bg-amber-50/70'
                                )}>
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-xs font-semibold">{bill.billNumber}</p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {bill.customerName || 'Walk-in'} • {bill.itemCount} item
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button size="sm" variant="outline" className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => handleResumeBill(bill.id)}>
                                                Resume
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50"
                                                disabled={isVoidingOpenBillId === bill.id}
                                                onClick={() => handleVoidBill(bill)}
                                            >
                                                {isVoidingOpenBillId === bill.id ? 'Voiding...' : 'Void'}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="mt-1 text-xs font-medium text-emerald-700">
                                        {formatRupiah(bill.totalAmount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Totals & Actions */}
            <div className="p-4 border-t bg-muted/20">
                <div className="space-y-1 mb-4">
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{formatRupiah(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>Discount</span>
                        <span>- {formatRupiah(discountAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">Total</span>
                        <span className="font-bold text-2xl">{formatRupiah(totalAfterDiscount)}</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => setIsDeleteModalOpen(true)}>
                        Delete
                    </Button>
                    <Button
                        variant="outline"
                        className="border-amber-200 text-amber-700 hover:bg-amber-50"
                        disabled={cart.length === 0 || isSavingOpenBill}
                        onClick={handleSaveOpenBill}
                    >
                        {isSavingOpenBill ? 'Saving...' : (activeOpenBill ? 'Update Bill' : 'Save Bill')}
                    </Button>
                    <Button className="w-full font-bold text-lg bg-emerald-600 hover:bg-emerald-700 text-white" disabled={cart.length === 0} onClick={() => setIsPaymentModalOpen(true)}>
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
                <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[95vh] md:max-h-[90vh] flex flex-col overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>
                            Payment {activeOpenBill ? `• ${activeOpenBill.billNumber}` : ''}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col md:flex-row flex-1 gap-4 md:gap-6 min-h-0 overflow-hidden">
                        {/* Left: Summary & Methods */}
                        <div className="w-full md:w-1/2 flex flex-col gap-4 overflow-y-auto pr-2">
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                <span className="block text-sm text-muted-foreground">Total Due</span>
                                <span className="block text-4xl font-bold">{formatRupiah(totalAfterDiscount)}</span>
                                <div className="mt-2 text-sm text-muted-foreground">
                                    <div className="flex justify-between">
                                        <span>Subtotal</span>
                                        <span>{formatRupiah(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Discount</span>
                                        <span>- {formatRupiah(discountAmount)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-shrink-0 grid grid-cols-3 gap-2">
                                <Button
                                    variant={paymentMethod === 'CASH' ? 'default' : 'outline'}
                                    className="h-20 flex-col gap-2"
                                    onClick={() => { setPaymentMethod('CASH'); setIsSplitMode(false); setAmountPaid(totalAfterDiscount.toString()); }}
                                >
                                    <Banknote className="w-6 h-6" />
                                    Cash
                                </Button>
                                <Button
                                    variant={paymentMethod === 'QRIS' ? 'default' : 'outline'}
                                    className="h-20 flex-col gap-2"
                                    onClick={() => { setPaymentMethod('QRIS'); setIsSplitMode(false); setAmountPaid(totalAfterDiscount.toString()); }}
                                >
                                    <QrCode className="w-6 h-6" />
                                    QRIS
                                </Button>
                                <Button
                                    variant={paymentMethod === 'TRANSFER' ? 'default' : 'outline'}
                                    className="h-20 flex-col gap-2"
                                    onClick={() => { setPaymentMethod('TRANSFER'); setIsSplitMode(false); setAmountPaid(totalAfterDiscount.toString()); }}
                                >
                                    <CreditCard className="w-6 h-6" />
                                    Transfer
                                </Button>
                            </div>

                            <div className="flex-shrink-0 mt-3">
                                <Label htmlFor="discountValue">Discount</Label>
                                <div className="flex gap-2">
                                    <select
                                        value={discountType}
                                        onChange={(e) => setDiscountType(e.target.value as 'AMOUNT' | 'PERCENT')}
                                        className="rounded border px-2 py-1"
                                    >
                                        <option value="AMOUNT">Rp</option>
                                        <option value="PERCENT">%</option>
                                    </select>
                                    <input
                                        id="discountValue"
                                        type="number"
                                        min={0}
                                        max={discountType === 'PERCENT' ? 100 : subtotal}
                                        step={discountType === 'PERCENT' ? 0.1 : 1}
                                        value={discountValue || ''}
                                        onChange={(e) => {
                                            const val = e.target.value.trim();
                                            if (val === '') {
                                                setDiscountValue(0);
                                            } else {
                                                let num = Number(val);
                                                if (discountType === 'PERCENT') {
                                                    num = Math.min(Math.max(num, 0), 100);
                                                } else {
                                                    num = Math.min(Math.max(num, 0), subtotal);
                                                }
                                                setDiscountValue(num);
                                            }
                                        }}
                                        className="w-full rounded border px-2 py-1"
                                    />
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    Applied: {formatRupiah(discountAmount)} ({discountPercent.toFixed(2)}%)
                                </div>
                            </div>

                            <div className="flex-shrink-0 mt-3 flex gap-2">
                                <Button variant={isSplitMode ? 'default' : 'outline'} onClick={() => setIsSplitMode(!isSplitMode)} className="flex-1">
                                    {isSplitMode ? 'Split: ON' : 'Split Bill'}
                                </Button>
                            </div>

                            {isSplitMode && (
                                <div className="mt-3 space-y-2">
                                    <div>
                                        <Label htmlFor="splitCash">Cash Amount</Label>
                                        <input 
                                            id="splitCash" 
                                            type="number" 
                                            min={0} 
                                            value={splitCashAmount || ''}
                                            onFocus={() => setNumpadTarget('CASH')} 
                                            onChange={(e) => {
                                                const val = e.target.value.trim();
                                                if (val === '') {
                                                    setSplitCashAmount(0);
                                                } else {
                                                    let num = Number(val);
                                                    num = Math.min(Math.max(num, 0), totalAfterDiscount);
                                                    setSplitCashAmount(num);
                                                }
                                            }}
                                            className="w-full rounded border px-2 py-1" 
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="splitNonCash">Non-cash Method</Label>
                                        <div className="flex gap-2 items-center">
                                            <select value={splitNonCashMethod} onChange={(e) => setSplitNonCashMethod(e.target.value as any)} className="rounded border px-2 py-1">
                                                <option value="QRIS">QRIS</option>
                                                <option value="TRANSFER">Transfer</option>
                                            </select>
                                            <input 
                                                id="splitNonCash" 
                                                type="number" 
                                                min={0} 
                                                value={splitNonCashAmount || ''}
                                                onFocus={() => setNumpadTarget('NONCASH')} 
                                                onChange={(e) => {
                                                    const val = e.target.value.trim();
                                                    if (val === '') {
                                                        setSplitNonCashAmount(0);
                                                    } else {
                                                        let num = Number(val);
                                                        num = Math.min(Math.max(num, 0), totalAfterDiscount);
                                                        setSplitNonCashAmount(num);
                                                    }
                                                }}
                                                className="w-full rounded border px-2 py-1" 
                                            />
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
                                    <span>{formatRupiah(isSplitMode ? Math.max(0, (splitCashAmount + splitNonCashAmount) - totalAfterDiscount) : change)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Numpad (Only active for Cash usually) */}
                        <div className="w-full md:w-1/2 h-full overflow-hidden">
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
                                isProcessing={isProcessing}
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

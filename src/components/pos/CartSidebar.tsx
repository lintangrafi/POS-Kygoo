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
import { PaymentBadge, getPaymentMethodFromPayments } from '@/components/ui/payment-badge';

type OpenBillListItem = {
    id: number;
    billNumber: string;
    invoiceNumber: string | null;
    customerName: string | null;
    note: string | null;
    subtotalAmount: number;
    discountAmount: number;
    discountPercent: number;
    totalAmount: number;
    downPaymentPercent: number;
    downPaymentAmount: number;
    paidAmount: number;
    status: 'OPEN' | 'PARTIAL' | 'CLOSED' | 'VOID';
    itemCount: number;
    updatedAt: string;
    cashierName: string;
};

type EventOption = {
    id: number;
    name: string;
    startDate: Date;
    endDate: Date;
};

interface CartSidebarProps {
    initialOpenBills?: OpenBillListItem[];
    isShiftOpen?: boolean;
    initialEventOptions?: EventOption[];
    activeEventId?: number | null;
}

type CheckoutReceipt = {
    orderId?: number;
    invoiceNumber: string;
    createdAtLabel: string;
    totalAmount: number;
    paidAmount: number;
    itemCount: number;
    paymentLabel: string;
};

// Custom simple toast/alert since we didn't fully setup Toaster
const notify = (msg: string) => alert(msg);

export function CartSidebar({
    initialOpenBills = [],
    isShiftOpen = true,
    initialEventOptions = [],
    activeEventId = null,
}: CartSidebarProps) {
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
    const [eventOptions] = useState<EventOption[]>(initialEventOptions);
    const [selectedEventId, setSelectedEventId] = useState<number | null>(activeEventId);
    const [isLoadingOpenBills, setIsLoadingOpenBills] = useState(false);
    const [isSavingOpenBill, setIsSavingOpenBill] = useState(false);
    const [isVoidingOpenBillId, setIsVoidingOpenBillId] = useState<number | null>(null);
    const [openBillSearch, setOpenBillSearch] = useState('');
    const [paymentView, setPaymentView] = useState<'PAY' | 'OPEN_BILLS'>('PAY');
    const [amountPaid, setAmountPaid] = useState('0');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS' | 'TRANSFER'>('CASH');
    const [discountType, setDiscountType] = useState<'AMOUNT' | 'PERCENT'>('AMOUNT');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [downPaymentType, setDownPaymentType] = useState<'AMOUNT' | 'PERCENT'>('AMOUNT');
    const [downPaymentValue, setDownPaymentValue] = useState<number>(0);
    const [downPaymentMethod, setDownPaymentMethod] = useState<'CASH' | 'QRIS' | 'TRANSFER'>('CASH');
    const [isProcessing, setIsProcessing] = useState(false); // Prevent double submission
    const [customerName, setCustomerName] = useState('');
    const [billNote, setBillNote] = useState('');
    const [latestReceipt, setLatestReceipt] = useState<CheckoutReceipt | null>(null);
    const [splitError, setSplitError] = useState('');
    const [isQtyNumpadOpen, setIsQtyNumpadOpen] = useState(false);
    const [qtyTargetId, setQtyTargetId] = useState<number | null>(null);
    const [qtyValue, setQtyValue] = useState('0');

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
    // Down payment calculations
    const downPaymentPercent = downPaymentType === 'PERCENT' ? Math.min(Math.max(downPaymentValue, 0), 100) : 0;
    const downPaymentAmount = downPaymentType === 'AMOUNT' ? Math.min(Math.max(downPaymentValue, 0), totalAfterDiscount) : 0;
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
            const paid = activeOpenBill?.paidAmount || 0;
            const remaining = Math.max(0, totalAfterDiscount - paid);
            setAmountPaid(remaining.toString());
            setPaymentMethod('CASH');
            setIsSplitMode(false);
            setSplitCashAmount(Math.max(0, totalAfterDiscount - (activeOpenBill?.paidAmount || 0)));
            setSplitNonCashAmount(0);
            setSplitNonCashMethod('QRIS');
            setNumpadTarget('CASH');
            setSplitError('');
            // Don't reset paymentView here - let the button click handler set it
            setIsProcessing(false); // Reset processing flag when modal opens
        } else {
            setIsProcessing(false); // Reset processing flag when modal closes
        }
    }, [isPaymentModalOpen, totalAfterDiscount]);

    useEffect(() => {
        setSelectedEventId(activeEventId ?? null);
    }, [activeEventId]);

    // Numpad target for split behavior
    const [numpadTarget, setNumpadTarget] = useState<'CASH'|'NONCASH'|'DOWN_PAYMENT'|'DEFAULT'>('DEFAULT');

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
        if (isPaymentModalOpen && paymentView === 'OPEN_BILLS') {
            refreshOpenBills();
        }
    }, [isPaymentModalOpen, paymentView]);

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
                downPaymentPercent: downPaymentType === 'PERCENT' ? downPaymentValue : 0,
                downPaymentAmount: downPaymentType === 'AMOUNT' ? downPaymentValue : 0,
                paymentMethod: downPaymentValue > 0 ? downPaymentMethod : undefined,
                customerName: customerName.trim() || undefined,
                note: billNote.trim() || undefined,
            });

            if (!result.success) {
                notify(`Gagal simpan open bill: ${result.error}`);
                return;
            }

            notify(`Open bill ${result.billNumber} tersimpan (Invoice: ${result.invoiceNumber})`);
            
            // Refresh the open bills list
            await refreshOpenBills();
            
            // Clear active bill and cart (user dapat membuat open bill baru)
            clearCart();
            setActiveOpenBill(null);
            setCustomerName('');
            setBillNote('');
            setDiscountValue(0);
            setDownPaymentValue(0);
            setIsPaymentModalOpen(false);
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
        setDownPaymentType('AMOUNT');
        setDownPaymentValue(selectedBill.paidAmount || selectedBill.downPaymentAmount || 0);
        setCustomerName(selectedBill.customerName || '');
        setBillNote(selectedBill.note || '');
        setActiveOpenBill({
            id: selectedBill.id,
            billNumber: selectedBill.billNumber,
            customerName: selectedBill.customerName || undefined,
            note: selectedBill.note || undefined,
            paidAmount: selectedBill.paidAmount || 0,
            downPaymentAmount: selectedBill.downPaymentAmount || 0,
            totalAmount: selectedBill.totalAmount || 0,
        });
        setPaymentView('PAY');
        notify(`Bill ${selectedBill.billNumber} dimuat ke cart.`);
    };

    const resetCurrentOrderContext = () => {
        clearCart();
        setDiscountValue(0);
        setDiscountType('AMOUNT');
        setCustomerName('');
        setBillNote('');
        setActiveOpenBill(null);
        setPaymentView('PAY');
        setDownPaymentType('AMOUNT');
        setDownPaymentValue(0);
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
        if (numpadTarget === 'DOWN_PAYMENT') {
            setDownPaymentValue(prev => {
                const prevStr = String(prev || 0);
                if (prevStr === '0') return Number(val);
                return Number(prevStr + val);
            });
            return;
        }

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

        if (!isShiftOpen) {
            notify('No active shift found. Open a shift before checkout.');
            return;
        }

        if (cart.length === 0) return;

        setIsProcessing(true); // Set processing flag

        try {
            const paid = activeOpenBill?.paidAmount || 0;
            const remaining = Math.max(0, totalAfterDiscount - paid);

            if (isSplitMode) {
                const sum = Number(splitCashAmount || 0) + Number(splitNonCashAmount || 0);
                if (sum !== remaining) {
                    setSplitError('Split payment amounts do not equal total');
                    notify('Split payment amounts do not equal total');
                    setIsProcessing(false);
                    return;
                }

                const paymentMethods: { method: 'CASH'|'QRIS'|'TRANSFER'; amount: number }[] = [];
                if (Number(splitCashAmount) > 0) paymentMethods.push({ method: 'CASH', amount: Number(splitCashAmount) });
                if (Number(splitNonCashAmount) > 0) paymentMethods.push({ method: splitNonCashMethod as 'QRIS'|'TRANSFER', amount: Number(splitNonCashAmount) });

                const changeAmount = Math.max(0, sum - remaining);

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
                        eventId: selectedEventId,
                    })
                    : await processTransaction({
                        items: cart.map(i => ({ productId: i.id, quantity: i.quantity, price: Number(i.price) })),
                        paymentMethods,
                        subtotalAmount: subtotal,
                        discountAmount,
                        discountPercent,
                        totalAmount: totalAfterDiscount,
                        eventId: selectedEventId,
                    });

                if (result.success) {
                    setLatestReceipt({
                        orderId: result.orderId,
                        invoiceNumber: result.invoiceNumber,
                        createdAtLabel: result.invoiceAndDate,
                        totalAmount: Number(result.totalAmount || totalAfterDiscount),
                        paidAmount: sum,
                        itemCount: cart.reduce((acc, item) => acc + item.quantity, 0),
                        paymentLabel: getPaymentMethodFromPayments(result.paymentMethods || paymentMethods),
                    });
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
            if (paymentMethod === 'CASH' && parseInt(amountPaid) < remaining) {
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
                        amount: remaining,
                    }],
                    subtotalAmount: subtotal,
                    discountAmount,
                    discountPercent,
                    totalAmount: totalAfterDiscount,
                    eventId: selectedEventId,
                })
                : await processTransaction({
                    items: cart.map(i => ({ productId: i.id, quantity: i.quantity, price: Number(i.price) })),
                    paymentMethods: [{
                        method: paymentMethod,
                        amount: remaining,
                    }],
                    subtotalAmount: subtotal,
                    discountAmount,
                    discountPercent,
                    totalAmount: totalAfterDiscount,
                    eventId: selectedEventId,
                });

            if (result.success) {
            setLatestReceipt({
                orderId: result.orderId,
                invoiceNumber: result.invoiceNumber,
                createdAtLabel: result.invoiceAndDate,
                totalAmount: Number(result.totalAmount || totalAfterDiscount),
                paidAmount: parseInt(amountPaid) || remaining,
                itemCount: cart.reduce((acc, item) => acc + item.quantity, 0),
                paymentLabel: getPaymentMethodFromPayments(result.paymentMethods || [{ method: paymentMethod }]),
            });
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
        <div className="flex flex-col h-full border-l border-[#E6DED0] bg-white">
            {/* Cart Header */}
            <div className="p-4 border-b border-[#E6DED0] bg-[#FCFAF6]">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-lg">Cart</h2>
                    <span className="text-sm text-[#6F6659]">{activeOpenBill ? 'Open Bill' : 'Walk-in'}</span>
                </div>
                <span className="text-sm text-[#8B7C6B]">{cart.length} items</span>
            </div>

            {/* Cart Items */}
            <ScrollArea className="flex-1 p-4 bg-[#FFFEFC]">
                <div className="space-y-4">
                    {cart.map((item) => (
                        <div key={item.id} className="flex justify-between items-start border border-[#E6DED0] rounded-lg p-2 bg-[#FCFAF6]">
                            <div className="flex-1">
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-muted-foreground">{formatRupiah(Number(item.price))}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                    <Minus className="h-3 w-3" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-6 w-8 px-1 text-center text-sm"
                                    onClick={() => {
                                        setQtyTargetId(item.id);
                                        setQtyValue(String(item.quantity));
                                        setIsQtyNumpadOpen(true);
                                    }}
                                >
                                    {item.quantity}
                                </Button>
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
            <div className="p-4 border-t border-[#E6DED0] bg-[#FCFAF6]">
                <div className="space-y-1 mb-4">
                    <div className="flex justify-between items-center text-sm text-[#6F6659]">
                        <span>Subtotal</span>
                        <span>{formatRupiah(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-[#6F6659]">
                        <span>Discount</span>
                        <span>- {formatRupiah(discountAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">Total</span>
                        <span className="font-bold text-2xl">{formatRupiah(totalAfterDiscount)}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                    <Button
                        variant="outline"
                        className="border-[#DCCFBF] bg-white text-[#5A5348] hover:bg-[#F8F3EA]"
                        onClick={() => {
                            setPaymentView('OPEN_BILLS');
                            setIsPaymentModalOpen(true);
                        }}
                        disabled={!isShiftOpen || cart.length === 0}
                    >
                        Open Bill
                    </Button>
                    <Button
                        className="bg-[#C86B2A] text-white hover:bg-[#B25E24]"
                        onClick={() => {
                            setPaymentView('PAY');
                            setIsPaymentModalOpen(true);
                        }}
                        disabled={!isShiftOpen || cart.length === 0}
                    >
                        Bayar
                    </Button>
                </div>

                {!isShiftOpen && (
                    <div className="rounded-lg border border-[#F2C6C6] bg-[#FFF1F1] px-3 py-2 text-xs text-[#8B1A1A]">
                        Checkout disabled until a shift is opened.
                    </div>
                )}

                <div className="mt-3">
                    <Button variant="outline" className="w-full border-[#EBC6C0] text-[#B33D2A] hover:bg-[#FFF1EF]" onClick={() => setIsDeleteModalOpen(true)}>
                        Delete
                    </Button>
                </div>

                {latestReceipt && (
                    <div className="mt-4 rounded-2xl border border-[#E6DED0] bg-[#FFFDF9] p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C86B2A]">Invoice siap cetak</p>
                                <h3 className="mt-1 text-base font-semibold text-[#1F1D1A]">{latestReceipt.invoiceNumber}</h3>
                                <p className="mt-1 text-xs text-muted-foreground">{latestReceipt.createdAtLabel}</p>
                            </div>
                            <PaymentBadge method={latestReceipt.paymentLabel} />
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-xl bg-[#F5F1E8] px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wide text-[#6B645C]">Items</p>
                                <p className="mt-1 text-sm font-semibold text-[#1F1D1A]">{latestReceipt.itemCount}</p>
                            </div>
                            <div className="rounded-xl bg-[#F5F1E8] px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wide text-[#6B645C]">Paid</p>
                                <p className="mt-1 text-sm font-semibold text-[#1F1D1A]">{formatRupiah(latestReceipt.paidAmount)}</p>
                            </div>
                            <div className="rounded-xl bg-[#F5F1E8] px-3 py-2">
                                <p className="text-[11px] uppercase tracking-wide text-[#6B645C]">Total</p>
                                <p className="mt-1 text-sm font-semibold text-[#1F1D1A]">{formatRupiah(latestReceipt.totalAmount)}</p>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {latestReceipt.orderId ? (
                                <Button variant="outline" asChild className="border-[#D9CEC0] bg-white hover:bg-[#F8F3EC]">
                                    <a href={`/invoices/${latestReceipt.orderId}`} target="_blank" rel="noreferrer">View invoice</a>
                                </Button>
                            ) : (
                                <Button variant="outline" disabled className="border-[#D9CEC0] bg-white">View invoice</Button>
                            )}
                            {latestReceipt.orderId ? (
                                <Button asChild className="bg-[#C86B2A] text-white hover:bg-[#B85A1D]">
                                    <a href={`/invoices/${latestReceipt.orderId}`} target="_blank" rel="noreferrer">Save PDF</a>
                                </Button>
                            ) : (
                                <Button disabled className="bg-[#C86B2A] text-white">Save PDF</Button>
                            )}
                        </div>
                    </div>
                )}
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
                <DialogContent className="max-w-[95vw] md:max-w-5xl max-h-[95vh] md:max-h-[90vh] flex flex-col overflow-hidden border border-[#E6DED0] bg-[#F5F1E8]">
                    <DialogHeader className="pb-0">
                        <DialogTitle className="text-lg font-semibold text-[#1F1D1A]">
                            Payment {activeOpenBill ? `• ${activeOpenBill.billNumber}` : ''}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="rounded-xl border border-[#E6DED0] bg-white p-2">
                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                variant={paymentView === 'PAY' ? 'default' : 'outline'}
                                className={cn(
                                    'h-10 rounded-full text-sm',
                                    paymentView === 'PAY'
                                        ? 'bg-[#1F1D1A] text-white hover:bg-[#1F1D1A]'
                                        : 'border-[#E6DED0] text-[#5A5348] hover:bg-[#F8F3EA]'
                                )}
                                onClick={() => setPaymentView('PAY')}
                            >
                                Bayar
                            </Button>
                            <Button
                                variant={paymentView === 'OPEN_BILLS' ? 'default' : 'outline'}
                                className={cn(
                                    'h-10 rounded-full text-sm',
                                    paymentView === 'OPEN_BILLS'
                                        ? 'bg-[#1F1D1A] text-white hover:bg-[#1F1D1A]'
                                        : 'border-[#E6DED0] text-[#5A5348] hover:bg-[#F8F3EA]'
                                )}
                                onClick={() => setPaymentView('OPEN_BILLS')}
                            >
                                Open Bills
                            </Button>
                            <Button
                                variant="outline"
                                className="h-10 rounded-full border-[#F1D9A8] bg-white text-[#C86B2A] hover:bg-[#FFF6E7]"
                                disabled={cart.length === 0 || isSavingOpenBill}
                                onClick={handleSaveOpenBill}
                            >
                                {isSavingOpenBill ? 'Saving...' : (activeOpenBill ? 'Update Bill' : 'Save to Open Bill')}
                            </Button>
                        </div>
                    </div>

                    {paymentView === 'OPEN_BILLS' ? (
                        <div className="flex-1 min-h-0 overflow-y-auto rounded-md border p-3 bg-muted/20">
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-sm font-semibold">Daftar Open Bills</h3>
                                <Badge variant="outline">{openBills.length}</Badge>
                            </div>
                            <input
                                type="text"
                                value={openBillSearch}
                                onChange={(e) => setOpenBillSearch(e.target.value)}
                                placeholder="Cari bill/customer..."
                                className="mb-3 h-9 w-full rounded-md border bg-background px-3 text-sm"
                            />

                            {isLoadingOpenBills ? (
                                <p className="text-sm text-muted-foreground">Loading open bills...</p>
                            ) : filteredOpenBills.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Belum ada open bill aktif.</p>
                            ) : (
                                <div className="space-y-2">
                                    {filteredOpenBills.map((bill) => (
                                        <div
                                            key={bill.id}
                                            className={cn(
                                                'rounded-md border p-3 bg-background',
                                                activeOpenBill?.id === bill.id && 'border-amber-500 bg-amber-50/70'
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-semibold">{bill.billNumber}</p>
                                                    {bill.invoiceNumber && (
                                                        <p className="text-xs text-blue-600 font-medium">{bill.invoiceNumber}</p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground">
                                                        {bill.customerName || 'Walk-in'} • {bill.itemCount} item • {bill.cashierName}
                                                    </p>
                                                    <p className="text-xs font-medium text-emerald-700 mt-1">{formatRupiah(bill.totalAmount)}</p>
                                                    {(bill.downPaymentPercent > 0 || bill.downPaymentAmount > 0) && (
                                                        <p className="text-xs text-amber-600 mt-1">
                                                            DP: {bill.downPaymentPercent > 0 ? `${bill.downPaymentPercent}%` : formatRupiah(bill.downPaymentAmount)}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                                                        onClick={() => handleResumeBill(bill.id)}
                                                    >
                                                        Gunakan
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-xs border-red-200 text-red-700 hover:bg-red-50"
                                                        disabled={isVoidingOpenBillId === bill.id}
                                                        onClick={() => handleVoidBill(bill)}
                                                    >
                                                        {isVoidingOpenBillId === bill.id ? 'Voiding...' : 'Void'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="flex flex-col md:flex-row flex-1 gap-4 md:gap-6 overflow-hidden">
                        {/* Left: Methods & Settings & Summary */}
                        <div className="w-full md:w-1/2 flex flex-col gap-4 overflow-y-auto pr-2">
                            <div className="grid gap-2 rounded-xl border border-[#E6DED0] bg-white p-3">
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Nama customer (opsional)"
                                    className="h-9 rounded-md border border-[#E6DED0] bg-white px-3 text-sm"
                                />
                                <input
                                    type="text"
                                    value={billNote}
                                    onChange={(e) => setBillNote(e.target.value)}
                                    placeholder="Catatan bill"
                                    className="h-9 rounded-md border border-[#E6DED0] bg-white px-3 text-sm"
                                />
                                <select
                                    value={selectedEventId ?? ''}
                                    onChange={(e) => setSelectedEventId(e.target.value ? Number(e.target.value) : null)}
                                    className="h-9 rounded-md border border-[#E6DED0] bg-white px-3 text-sm"
                                >
                                    <option value="">No event</option>
                                    {eventOptions.map((event) => (
                                        <option key={event.id} value={event.id}>
                                            {event.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex-shrink-0 grid grid-cols-3 gap-2">
                                <Button
                                    variant="outline"
                                    className={cn(
                                        'h-20 flex-col gap-2 rounded-xl border-[#E6DED0] bg-white text-[#1F1D1A] hover:bg-[#F8F3EA]',
                                        paymentMethod === 'CASH' && 'border-[#1F1D1A] bg-[#F8F3EA]'
                                    )}
                                    onClick={() => { setPaymentMethod('CASH'); setIsSplitMode(false); setAmountPaid(totalAfterDiscount.toString()); }}
                                >
                                    <Banknote className="w-6 h-6" />
                                    Cash
                                </Button>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        'h-20 flex-col gap-2 rounded-xl border-[#E6DED0] bg-white text-[#1F1D1A] hover:bg-[#F8F3EA]',
                                        paymentMethod === 'QRIS' && 'border-[#1F1D1A] bg-[#F8F3EA]'
                                    )}
                                    onClick={() => { setPaymentMethod('QRIS'); setIsSplitMode(false); setAmountPaid(totalAfterDiscount.toString()); }}
                                >
                                    <QrCode className="w-6 h-6" />
                                    QRIS
                                </Button>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        'h-20 flex-col gap-2 rounded-xl border-[#E6DED0] bg-white text-[#1F1D1A] hover:bg-[#F8F3EA]',
                                        paymentMethod === 'TRANSFER' && 'border-[#1F1D1A] bg-[#F8F3EA]'
                                    )}
                                    onClick={() => { setPaymentMethod('TRANSFER'); setIsSplitMode(false); setAmountPaid(totalAfterDiscount.toString()); }}
                                >
                                    <CreditCard className="w-6 h-6" />
                                    Transfer
                                </Button>
                            </div>

                            <div className="flex-shrink-0 mt-3 rounded-xl border border-[#E6DED0] bg-white p-3">
                                <Label htmlFor="discountValue" className="text-sm">Discount</Label>
                                <div className="mt-2 flex gap-2">
                                    <select
                                        value={discountType}
                                        onChange={(e) => setDiscountType(e.target.value as 'AMOUNT' | 'PERCENT')}
                                        className="rounded-md border border-[#E6DED0] px-2 py-1"
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
                                        className="w-full rounded-md border border-[#E6DED0] px-2 py-1"
                                    />
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    Applied: {formatRupiah(discountAmount)} ({discountPercent.toFixed(2)}%)
                                </div>
                            </div>

                            <div className="flex-shrink-0 mt-3 rounded-xl border border-[#E6DED0] bg-white p-3">
                                <Label htmlFor="downPaymentValue" className="text-sm">Down Payment (DP)</Label>
                                <div className="mt-2 flex gap-2">
                                    <select
                                        value={downPaymentType}
                                        onChange={(e) => setDownPaymentType(e.target.value as 'AMOUNT' | 'PERCENT')}
                                        className="rounded-md border border-[#E6DED0] px-2 py-1"
                                    >
                                        <option value="AMOUNT">Rp</option>
                                        <option value="PERCENT">%</option>
                                    </select>
                                    <input
                                        id="downPaymentValue"
                                        type="number"
                                        min={0}
                                        max={downPaymentType === 'PERCENT' ? 100 : totalAfterDiscount}
                                        step={downPaymentType === 'PERCENT' ? 0.1 : 1}
                                        value={downPaymentValue || ''}
                                        onFocus={() => setNumpadTarget('DOWN_PAYMENT')}
                                        onChange={(e) => {
                                            const val = e.target.value.trim();
                                            if (val === '') {
                                                setDownPaymentValue(0);
                                            } else {
                                                let num = Number(val);
                                                if (downPaymentType === 'PERCENT') {
                                                    num = Math.min(Math.max(num, 0), 100);
                                                } else {
                                                    num = Math.min(Math.max(num, 0), totalAfterDiscount);
                                                }
                                                setDownPaymentValue(num);
                                            }
                                        }}
                                        className="w-full rounded-md border border-[#E6DED0] px-2 py-1"
                                    />
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    {downPaymentType === 'PERCENT'
                                        ? `${downPaymentValue}% = ${formatRupiah((totalAfterDiscount * downPaymentValue) / 100)}`
                                        : `Received: ${formatRupiah(downPaymentValue)} / Remaining: ${formatRupiah(Math.max(0, totalAfterDiscount - downPaymentValue))}`
                                    }
                                </div>
                                {downPaymentValue > 0 && (
                                    <div className="mt-2">
                                        <Label className="text-xs">Metode Pembayaran DP</Label>
                                        <div className="grid grid-cols-3 gap-1 mt-1">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={downPaymentMethod === 'CASH' ? 'default' : 'outline'}
                                                onClick={() => setDownPaymentMethod('CASH')}
                                                className="h-8 text-xs"
                                            >
                                                Cash
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={downPaymentMethod === 'QRIS' ? 'default' : 'outline'}
                                                onClick={() => setDownPaymentMethod('QRIS')}
                                                className="h-8 text-xs"
                                            >
                                                QRIS
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={downPaymentMethod === 'TRANSFER' ? 'default' : 'outline'}
                                                onClick={() => setDownPaymentMethod('TRANSFER')}
                                                className="h-8 text-xs"
                                            >
                                                Transfer
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex-shrink-0 mt-3 flex gap-2">
                                <Button variant={isSplitMode ? 'default' : 'outline'} onClick={() => setIsSplitMode(!isSplitMode)} className="flex-1 rounded-full">
                                    {isSplitMode ? 'Split: ON' : 'Split Bill'}
                                </Button>
                            </div>

                            {isSplitMode && (
                                <div className="mt-3 space-y-2">
                                    {splitError && (
                                        <div className="rounded-md border border-[#F2C6C6] bg-[#FFF1F1] px-3 py-2 text-xs text-[#8B1A1A]">
                                            {splitError}
                                        </div>
                                    )}
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
                                                setSplitError('');
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
                                                    setSplitError('');
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

                            {/* Total Due & Tendered/Change Summary */}
                            <div className="mt-4 space-y-3 border-t border-[#E6DED0] pt-4">
                                <div className="bg-white p-4 rounded-xl border border-[#E6DED0]">
                                    <span className="block text-sm text-muted-foreground">Total Due</span>
                                    <span className="block text-3xl font-bold">{formatRupiah(totalAfterDiscount)}</span>
                                    <div className="mt-2 text-xs text-muted-foreground">
                                        <div className="flex justify-between">
                                            <span>Subtotal</span>
                                            <span>{formatRupiah(subtotal)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Discount</span>
                                            <span>- {formatRupiah(discountAmount)}</span>
                                        </div>
                                        {(downPaymentPercent > 0 || downPaymentAmount > 0) && (
                                            <>
                                                <div className="flex justify-between mt-1 pt-1 border-t">
                                                    <span className="text-amber-700 font-medium">DP Received</span>
                                                    <span className="text-amber-700 font-medium">{formatRupiah(downPaymentPercent > 0 ? (totalAfterDiscount * downPaymentPercent) / 100 : downPaymentAmount)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-amber-700 font-medium">Remaining</span>
                                                    <span className="text-amber-700 font-medium">{formatRupiah(Math.max(0, totalAfterDiscount - (downPaymentPercent > 0 ? (totalAfterDiscount * downPaymentPercent) / 100 : downPaymentAmount)))}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-[#F4F1EA] p-3 rounded-xl border border-[#E6DED0]">
                                        <div className="text-xs text-blue-600 font-medium">Tendered</div>
                                        <div className="text-xl font-bold text-blue-700 mt-1">{formatRupiah(parseInt(amountPaid) || (isSplitMode ? (splitCashAmount + splitNonCashAmount) : 0))}</div>
                                    </div>
                                    <div className="bg-[#F4F1EA] p-3 rounded-xl border border-[#E6DED0]">
                                        <div className="text-xs text-green-600 font-medium">Change</div>
                                        <div className="text-xl font-bold text-green-700 mt-1">{formatRupiah(isSplitMode ? Math.max(0, (splitCashAmount + splitNonCashAmount) - totalAfterDiscount) : change)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Numpad (Only active for Cash usually) */}
                        <div className="w-full md:w-1/2 h-full overflow-hidden rounded-xl border border-[#E6DED0] bg-white p-3">
                            <div className="mb-2 text-sm font-semibold text-[#1F1D1A]">Smart Numpad</div>
                            <SmartNumpad
                                value={numpadTarget === 'DOWN_PAYMENT' ? String(downPaymentValue) : (isSplitMode ? (numpadTarget === 'CASH' ? String(splitCashAmount) : numpadTarget === 'NONCASH' ? String(splitNonCashAmount) : amountPaid) : amountPaid)}
                                onInput={handleNumpadInput}
                                onDelete={() => {
                                    if (numpadTarget === 'DOWN_PAYMENT') {
                                        setDownPaymentValue(prev => Math.floor((prev || 0) / 10));
                                    } else if (isSplitMode) {
                                        if (numpadTarget === 'CASH') setSplitCashAmount(prev => Math.floor((prev || 0) / 10));
                                        else if (numpadTarget === 'NONCASH') setSplitNonCashAmount(prev => Math.floor((prev || 0) / 10));
                                        else setAmountPaid(prev => prev.slice(0, -1) || '0');
                                    } else {
                                        setAmountPaid(prev => prev.slice(0, -1) || '0');
                                    }
                                }}
                                onClear={() => {
                                    if (numpadTarget === 'DOWN_PAYMENT') {
                                        setDownPaymentValue(0);
                                    } else if (isSplitMode) {
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
                    </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isQtyNumpadOpen} onOpenChange={setIsQtyNumpadOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Smart Numpad</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">Quantity</div>
                        <div className="rounded-md border border-[#E6DED0] bg-[#F8F3EA] px-3 py-2 text-center text-2xl font-mono">
                            {qtyValue}
                        </div>
                        <SmartNumpad
                            value={qtyValue}
                            onInput={(val) => {
                                setQtyValue((prev) => (prev === '0' ? val : prev + val));
                            }}
                            onDelete={() => {
                                setQtyValue((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
                            }}
                            onClear={() => setQtyValue('0')}
                            onEnter={() => {
                                if (qtyTargetId !== null) {
                                    const nextQty = Math.max(1, Number(qtyValue || '0'));
                                    updateQuantity(qtyTargetId, nextQty);
                                }
                                setIsQtyNumpadOpen(false);
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

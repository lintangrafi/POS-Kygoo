'use server';

import { db } from '@/db';
import { categories, products, orders, orderItems, payments, auditLogs, openBills, openBillItems, incomes } from '@/db/schema';
import { and, desc, eq, inArray, gte, lte } from 'drizzle-orm';
import { verifySession } from '@/lib/auth';
import { getOpenShift } from './shift-actions';

type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER';

type CheckoutPayload = {
    items: { productId: number; quantity: number; price: number }[];
    paymentMethods: { method: PaymentMethod; amount: number }[];
    subtotalAmount: number;
    discountAmount: number;
    discountPercent: number;
    totalAmount: number;
};

type SaveOpenBillPayload = {
    billId?: number;
    items: { productId: number; quantity: number; price: number; productName: string }[];
    subtotalAmount: number;
    discountAmount: number;
    discountPercent: number;
    totalAmount: number;
    downPaymentPercent?: number; // 0-100 if using percentage
    downPaymentAmount?: number;  // Rp amount if not using percentage
    paymentMethod?: PaymentMethod; // Payment method for down payment
    customerName?: string;
    note?: string;
};

export async function getPosData() {
    const allCategories = await db.query.categories.findMany();
    const allProducts = await db.query.products.findMany({
        where: (products, { gt }) => gt(products.stock, -1000), // Show all for now, maybe filter stock later
    });

    // Deduplicate categories by normalized name (case-insensitive, trimmed)
    const map = new Map<string, typeof allCategories[number]>();
    for (const c of allCategories) {
        const key = (c.name || '').toString().trim().toLowerCase();
        if (!map.has(key)) map.set(key, c);
    }

    const uniqueCategories = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));

    return {
        categories: uniqueCategories,
        products: allProducts,
    };
}

export async function processTransaction(data: {
    items: { productId: number; quantity: number; price: number }[];
    paymentMethods: { method: PaymentMethod; amount: number }[];
    subtotalAmount: number;
    discountAmount: number;
    discountPercent: number;
    totalAmount: number;
}) {
    return createCompletedOrder(data);
}

async function createCompletedOrder(data: CheckoutPayload, openBillId?: number) {
    const session = await verifySession();
    const openShift = await getOpenShift();

    if (!openShift) {
        return { error: 'No open shift found.' };
    }

    try {
        const invoiceNumber = `INV-${Date.now()}`;

        const result = await db.transaction(async (tx) => {
            const [newOrder] = await tx.insert(orders).values({
                invoiceNumber,
                userId: session.userId,
                subtotalAmount: data.subtotalAmount.toString(),
                discountAmount: data.discountAmount.toString(),
                discountPercent: data.discountPercent.toString(),
                totalAmount: data.totalAmount.toString(),
                status: 'COMPLETED',
            }).returning();

            for (const item of data.items) {
                const product = await tx.query.products.findFirst({
                    where: eq(products.id, item.productId),
                });

                if (!product) continue;

                await tx.insert(orderItems).values({
                    orderId: newOrder.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    priceAtSale: item.price.toString(),
                    costAtSale: product.costPrice,
                });

                await tx.update(products)
                    .set({ stock: product.stock - item.quantity })
                    .where(eq(products.id, item.productId));
            }

            for (const payment of data.paymentMethods) {
                await tx.insert(payments).values({
                    orderId: newOrder.id,
                    method: payment.method,
                    amount: payment.amount.toString(),
                });
            }

            if (openBillId) {
                // Get the open bill to calculate remaining payment
                const openBill = await tx.query.openBills.findFirst({
                    where: eq(openBills.id, openBillId),
                });
                
                if (openBill) {
                    const paidAmount = Number(openBill.paidAmount || 0);
                    const totalAmount = data.totalAmount;
                    const remainingAmount = totalAmount - paidAmount;
                    
                    // Record income for remaining payment if exists
                    if (remainingAmount > 0 && data.paymentMethods.length > 0) {
                        const primaryPaymentMethod = data.paymentMethods[0].method;
                        await tx.insert(incomes).values({
                            userId: session.userId,
                            description: `Final Payment - ${invoiceNumber} (${openBill.customerName || 'Walk-in'})`,
                            amount: remainingAmount.toString(),
                            category: 'OTHER',
                            paymentMethod: primaryPaymentMethod === 'TRANSFER' ? 'QRIS' : primaryPaymentMethod,
                            date: new Date(),
                            notes: `Open Bill Closed: ${openBill.billNumber}`,
                        });
                    }
                }
                
                await tx.update(openBills)
                    .set({
                        status: 'CLOSED',
                        paidAmount: data.totalAmount.toString(),
                        closedAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .where(eq(openBills.id, openBillId));
            }

            await tx.insert(auditLogs).values({
                userId: session.userId,
                action: openBillId ? 'CLOSE_OPEN_BILL' : 'CREATE',
                entity: 'ORDER',
                entityId: newOrder.id,
                newValue: JSON.stringify({
                    invoice: invoiceNumber,
                    subtotal: data.subtotalAmount,
                    discountAmount: data.discountAmount,
                    discountPercent: data.discountPercent,
                    total: data.totalAmount,
                    openBillId,
                }),
            });

            return newOrder;
        });

        return {
            success: true,
            orderId: result.id,
            invoiceAndDate: `${invoiceNumber} - ${new Date().toLocaleString()}`,
        };

    } catch (error) {
        console.error('Transaction Error:', error);
        return { error: 'Transaction failed.' };
    }
}

export async function getOpenBills() {
    await verifySession();

    const rows = await db.query.openBills.findMany({
        where: inArray(openBills.status, ['OPEN', 'PARTIAL']),
        with: {
            items: true,
            user: {
                columns: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: [desc(openBills.updatedAt)],
    });

    return rows.map((bill) => ({
        id: bill.id,
        billNumber: bill.billNumber,
        invoiceNumber: bill.invoiceNumber,
        customerName: bill.customerName,
        note: bill.note,
        subtotalAmount: Number(bill.subtotalAmount),
        discountAmount: Number(bill.discountAmount),
        discountPercent: Number(bill.discountPercent),
        totalAmount: Number(bill.totalAmount),
        downPaymentPercent: Number(bill.downPaymentPercent),
        downPaymentAmount: Number(bill.downPaymentAmount),
        paidAmount: Number(bill.paidAmount),
        status: bill.status,
        itemCount: bill.items.length,
        updatedAt: bill.updatedAt.toISOString(),
        cashierName: bill.user?.name || '-',
    }));
}

export async function getOpenBillById(billId: number) {
    await verifySession();

    const bill = await db.query.openBills.findFirst({
        where: eq(openBills.id, billId),
        with: {
            items: true,
        },
    });

    if (!bill) {
        return { error: 'Open bill not found.' };
    }

    return {
        success: true,
        bill: {
            id: bill.id,
            billNumber: bill.billNumber,
            invoiceNumber: bill.invoiceNumber,
            customerName: bill.customerName,
            note: bill.note,
            subtotalAmount: Number(bill.subtotalAmount),
            discountAmount: Number(bill.discountAmount),
            discountPercent: Number(bill.discountPercent),
            totalAmount: Number(bill.totalAmount),
            downPaymentPercent: Number(bill.downPaymentPercent),
            downPaymentAmount: Number(bill.downPaymentAmount),
            paidAmount: Number(bill.paidAmount),
            status: bill.status,
            items: bill.items.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                price: Number(item.priceAtBill),
            })),
        },
    };
}

export async function saveOpenBill(data: SaveOpenBillPayload) {
    const session = await verifySession();

    if (data.items.length === 0) {
        return { error: 'Cart is empty. Cannot save open bill.' };
    }

    try {
        const savedBill = await db.transaction(async (tx) => {
            let targetBillId = data.billId;
            let invoiceNumber: string;

            if (!targetBillId) {
                // Generate new bill and draft invoice
                const billNumber = `OB-${Date.now()}`;
                invoiceNumber = `DRAFT-${Date.now()}`;
                const downPayment = data.downPaymentAmount || 0;
                
                const [newBill] = await tx.insert(openBills).values({
                    billNumber,
                    invoiceNumber,
                    invoiceStatus: 'DRAFT',
                    userId: session.userId,
                    customerName: data.customerName || null,
                    note: data.note || null,
                    subtotalAmount: data.subtotalAmount.toString(),
                    discountAmount: data.discountAmount.toString(),
                    discountPercent: data.discountPercent.toString(),
                    totalAmount: data.totalAmount.toString(),
                    downPaymentPercent: (data.downPaymentPercent || 0).toString(),
                    downPaymentAmount: downPayment.toString(),
                    paidAmount: downPayment.toString(),
                    paymentMethod: data.paymentMethod || null,
                    status: 'OPEN',
                }).returning();
                targetBillId = newBill.id;
                
                // Record income for down payment if exists
                if (downPayment > 0 && data.paymentMethod) {
                    await tx.insert(incomes).values({
                        userId: session.userId,
                        description: `Down Payment - ${invoiceNumber} (${data.customerName || 'Walk-in'})`,
                        amount: downPayment.toString(),
                        category: 'OTHER',
                        paymentMethod: data.paymentMethod === 'TRANSFER' ? 'QRIS' : data.paymentMethod,
                        date: new Date(),
                        notes: `Open Bill: ${billNumber}`,
                    });
                }
            } else {
                // Get existing bill to preserve invoice number
                const existingBill = await tx.query.openBills.findFirst({
                    where: eq(openBills.id, targetBillId),
                });
                invoiceNumber = existingBill?.invoiceNumber || `DRAFT-${Date.now()}`;

                const downPayment = data.downPaymentAmount || 0;
                
                await tx.update(openBills)
                    .set({
                        customerName: data.customerName || null,
                        note: data.note || null,
                        subtotalAmount: data.subtotalAmount.toString(),
                        discountAmount: data.discountAmount.toString(),
                        discountPercent: data.discountPercent.toString(),
                        totalAmount: data.totalAmount.toString(),
                        downPaymentPercent: (data.downPaymentPercent || 0).toString(),
                        downPaymentAmount: downPayment.toString(),
                        paidAmount: downPayment.toString(),
                        paymentMethod: data.paymentMethod || null,
                        updatedAt: new Date(),
                    })
                    .where(and(eq(openBills.id, targetBillId), inArray(openBills.status, ['OPEN', 'PARTIAL'])));

                await tx.delete(openBillItems).where(eq(openBillItems.openBillId, targetBillId));
            }

            await tx.insert(openBillItems).values(
                data.items.map((item) => ({
                    openBillId: targetBillId!,
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    priceAtBill: item.price.toString(),
                }))
            );

            const bill = await tx.query.openBills.findFirst({
                where: eq(openBills.id, targetBillId!),
            });

            if (!bill) throw new Error('Failed to fetch saved open bill.');
            return bill;
        });

        await db.insert(auditLogs).values({
            userId: session.userId,
            action: data.billId ? 'UPDATE_OPEN_BILL' : 'CREATE_OPEN_BILL',
            entity: 'OPEN_BILL',
            entityId: savedBill.id,
            newValue: JSON.stringify({
                billNumber: savedBill.billNumber,
                invoiceNumber: savedBill.invoiceNumber,
                totalAmount: data.totalAmount,
                itemCount: data.items.length,
            }),
        });

        return {
            success: true,
            billId: savedBill.id,
            billNumber: savedBill.billNumber,
            invoiceNumber: savedBill.invoiceNumber,
        };
    } catch (error) {
        console.error('Save Open Bill Error:', error);
        return { error: 'Failed to save open bill.' };
    }
}

export async function closeOpenBillAndCheckout(data: CheckoutPayload & { openBillId: number }) {
    return createCompletedOrder(data, data.openBillId);
}

export async function voidOpenBill(openBillId: number, reason?: string) {
    const session = await verifySession();

    try {
        const existing = await db.query.openBills.findFirst({
            where: eq(openBills.id, openBillId),
        });

        if (!existing) {
            return { error: 'Open bill not found.' };
        }

        if (!['OPEN', 'PARTIAL'].includes(existing.status)) {
            return { error: 'Only OPEN/PARTIAL bills can be voided.' };
        }

        await db.update(openBills)
            .set({
                status: 'VOID',
                note: reason?.trim() ? `VOID: ${reason.trim()}` : existing.note,
                closedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(openBills.id, openBillId));

        await db.insert(auditLogs).values({
            userId: session.userId,
            action: 'VOID_OPEN_BILL',
            entity: 'OPEN_BILL',
            entityId: openBillId,
            newValue: JSON.stringify({
                billNumber: existing.billNumber,
                reason: reason || null,
            }),
        });

        return { success: true };
    } catch (error) {
        console.error('Void Open Bill Error:', error);
        return { error: 'Failed to void open bill.' };
    }
}

/**
 * Get draft invoices from open bills
 */
export async function getDraftInvoices(params?: { from?: Date; to?: Date }) {
    await verifySession();

    try {
        const conditions = [inArray(openBills.status, ['OPEN', 'PARTIAL'])];
        
        if (params?.from) {
            conditions.push(gte(openBills.createdAt, params.from));
        }
        if (params?.to) {
            conditions.push(lte(openBills.createdAt, params.to));
        }

        const rows = await db.query.openBills.findMany({
            where: conditions.length > 1 ? and(...conditions) : conditions[0],
            with: {
                items: true,
                user: {
                    columns: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: [desc(openBills.updatedAt)],
        });

        return rows.map((bill) => ({
            id: bill.id,
            type: 'DRAFT_INVOICE',
            invoiceNumber: bill.invoiceNumber,
            billNumber: bill.billNumber,
            customerName: bill.customerName || 'Walk-in',
            totalAmount: Number(bill.totalAmount),
            status: bill.status,
            createdAt: bill.createdAt.toISOString(),
            updatedAt: bill.updatedAt.toISOString(),
            userId: bill.userId,
            userName: bill.user?.name || '-',
            itemCount: bill.items.length,
            items: bill.items.map((item) => ({
                productName: item.productName,
                quantity: item.quantity,
                price: Number(item.priceAtBill),
            })),
            downPaymentPercent: Number(bill.downPaymentPercent),
            downPaymentAmount: Number(bill.downPaymentAmount),
            paidAmount: Number(bill.paidAmount),
            paymentMethod: bill.paymentMethod || null,
        }));
    } catch (error) {
        console.error('Error fetching draft invoices:', error);
        return [];
    }
}

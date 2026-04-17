'use server';

import { db } from '@/db';
import { categories, products, orders, orderItems, payments, auditLogs, openBills, openBillItems, incomes } from '@/db/schema';
import { and, desc, eq, inArray, gte, lte, lt } from 'drizzle-orm';
import { verifySession } from '@/lib/auth';
import { getOpenShift } from './shift-actions';
import { getCurrentUserEventId } from '@/lib/event-utils';

type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER';

type CheckoutPayload = {
    items: { productId: number; quantity: number; price: number }[];
    paymentMethods: { method: PaymentMethod; amount: number }[];
    subtotalAmount: number;
    discountAmount: number;
    discountPercent: number;
    totalAmount: number;
    eventId?: number | null;
};

type SaveOpenBillPayload = {
    billId?: number;
    items: { productId: number; quantity: number; price: number; productName: string }[];
    subtotalAmount: number;
    discountAmount: number;
    discountPercent: number;
    totalAmount: number;
    eventId?: number | null;
    downPaymentPercent?: number; // 0-100 if using percentage
    downPaymentAmount?: number;  // Rp amount if not using percentage
    paymentMethod?: PaymentMethod; // Payment method for down payment
    customerName?: string;
    note?: string;
};

export async function getPosData() {
    // Get user's event if assigned
    const userEventId = await getCurrentUserEventId();

    const allCategories = await db.query.categories.findMany();
    const allProducts = await db.query.products.findMany({
        where: (products, { gt, eq, isNull, or, and }) => {
            const conditions: any[] = [];
            conditions.push(gt(products.stock, -1000));
            
            // Event users can see: studio items (eventId NULL) + their own event items
            // Studio users can see: everything (no eventId filter)
            if (userEventId) {
                conditions.push(or(
                    isNull(products.eventId),
                    eq(products.eventId, userEventId)
                ));
            }
            return and(...conditions);
        },
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
    eventId?: number | null;
}) {
    return createCompletedOrder(data);
}

async function createCompletedOrder(data: CheckoutPayload, openBillId?: number) {
    const session = await verifySession();
    const openShift = await getOpenShift();

    if (!openShift) {
        return { error: 'No open shift found.' };
    }

    // Get user's event if assigned (and not manually overridden)
    const userEventId = await getCurrentUserEventId();
    // Event users are locked to their assigned event.
    // Studio users may choose event/studio from POS selector.
    const orderEventId = userEventId ?? (data.eventId !== undefined ? data.eventId : null);

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
                eventId: orderEventId ?? null,
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
                await tx.update(openBills)
                    .set({
                        status: 'CLOSED',
                        paidAmount: data.totalAmount.toString(),
                        invoiceStatus: 'CONVERTED',
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
                    eventId: orderEventId ?? null,
                }),
            });

            return newOrder;
        });

        return {
            success: true,
            orderId: result.id,
            invoiceNumber,
            totalAmount: data.totalAmount,
            paymentMethods: data.paymentMethods,
            invoiceAndDate: `${invoiceNumber} - ${new Date().toLocaleString()}`,
        };

    } catch (error) {
        console.error('Transaction Error:', error);
        return { error: 'Transaction failed.' };
    }
}

async function createDownPaymentInvoice(tx: any, params: {
    billNumber: string;
    customerName?: string | null;
    subtotalAmount: number;
    discountAmount: number;
    discountPercent: number;
    downPayment: number;
    paymentMethod: PaymentMethod;
    userId: number;
    eventId?: number | null;
}) {
    const invoiceNumber = params.billNumber; // OB-xxxx

    const [newOrder] = await tx.insert(orders).values({
        invoiceNumber,
        userId: params.userId,
        subtotalAmount: params.subtotalAmount.toString(),
        discountAmount: params.discountAmount.toString(),
        discountPercent: params.discountPercent.toString(),
        totalAmount: params.downPayment.toString(),
        status: 'COMPLETED',
        eventId: params.eventId ?? null,
    }).returning();

    await tx.insert(payments).values({
        orderId: newOrder.id,
        method: params.paymentMethod,
        amount: params.downPayment.toString(),
    });

    await tx.insert(auditLogs).values({
        userId: params.userId,
        action: 'CREATE_DP_INVOICE',
        entity: 'ORDER',
        entityId: newOrder.id,
        newValue: JSON.stringify({
            invoice: invoiceNumber,
            downPayment: params.downPayment,
            billNumber: params.billNumber,
        }),
    });

    return newOrder;
}

export async function getOpenBills() {
    await verifySession();

    // Get user's event if assigned
    const userEventId = await getCurrentUserEventId();

    const rows = await db.query.openBills.findMany({
        where: (openBillsTable, { and: andOp, eq: eqOp, inArray: inArrayOp }) => {
            const conditions: any[] = [inArrayOp(openBillsTable.status, ['OPEN', 'PARTIAL'])];
            if (userEventId) {
                conditions.push(eqOp(openBillsTable.eventId, userEventId));
            }
            return andOp(...conditions);
        },
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

    // Get user's event if assigned
    const userEventId = await getCurrentUserEventId();

    const bill = await db.query.openBills.findFirst({
        where: (openBillsTable, { and: andOp, eq: eqOp }) => {
            const conditions: any[] = [eqOp(openBillsTable.id, billId)];
            if (userEventId) {
                conditions.push(eqOp(openBillsTable.eventId, userEventId));
            }
            return andOp(...conditions);
        },
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

export async function getOpenBillByInvoiceNumber(invoiceNumber: string) {
    await verifySession();

    // Get user's event if assigned
    const userEventId = await getCurrentUserEventId();

    const bill = await db.query.openBills.findFirst({
        where: and(
            eq(openBills.invoiceNumber, invoiceNumber),
            ...(userEventId ? [eq(openBills.eventId, userEventId)] : [])
        ),
        with: { items: true },
    });

    if (!bill) return null;

    return {
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
    };
}

export async function getOpenBillByOrderId(orderId: number) {
    await verifySession();

    const log = await db.query.auditLogs.findFirst({
        where: and(eq(auditLogs.entity, 'ORDER'), eq(auditLogs.entityId, orderId)),
        orderBy: [desc(auditLogs.timestamp)],
    });

    if (!log?.newValue) return null;

    try {
        const parsed = JSON.parse(log.newValue);
        if (!parsed?.openBillId) return null;
        const result = await getOpenBillById(parsed.openBillId);
        if (!result?.success) return null;
        return result.bill;
    } catch {
        return null;
    }
}

export async function getOpenBillsByRange(params: { from: Date; to: Date }) {
    await verifySession();

    // Get user's event if assigned
    const userEventId = await getCurrentUserEventId();

    const rows = await db.query.openBills.findMany({
        where: and(
            gte(openBills.createdAt, params.from),
            lt(openBills.createdAt, params.to),
            ...(userEventId ? [eq(openBills.eventId, userEventId)] : [])
        ),
        with: { items: true },
        orderBy: [desc(openBills.createdAt)],
    });

    return rows
        .filter((bill) => !!bill.invoiceNumber)
        .map((bill) => ({
            invoiceNumber: bill.invoiceNumber as string,
            billNumber: bill.billNumber,
            totalAmount: Number(bill.totalAmount),
            paidAmount: Number(bill.paidAmount),
            items: bill.items.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                price: Number(item.priceAtBill),
            })),
        }));
}

export async function saveOpenBill(data: SaveOpenBillPayload) {
    const session = await verifySession();

    if (data.items.length === 0) {
        return { error: 'Cart is empty. Cannot save open bill.' };
    }

    // Get user's event if assigned
    const userEventId = await getCurrentUserEventId();
    // Event users are locked to their assigned event.
    // Studio users may choose event/studio from POS selector.
    const billEventId = userEventId ?? (data.eventId !== undefined ? data.eventId : null);

    try {
        const savedBill = await db.transaction(async (tx) => {
            let targetBillId = data.billId;
            let invoiceNumber: string;

            // Convert DP input to nominal (supports both fixed amount and percent DP).
            const calculatedDownPaymentByPercent = (data.downPaymentPercent || 0) > 0
                ? (data.totalAmount * (data.downPaymentPercent || 0)) / 100
                : 0;
            const requestedDownPayment = (data.downPaymentAmount || 0) > 0
                ? (data.downPaymentAmount || 0)
                : calculatedDownPaymentByPercent;
            const downPayment = Number(Math.min(data.totalAmount, Math.max(0, requestedDownPayment)).toFixed(2));

            if (!targetBillId) {
                // Generate new bill and draft invoice
                const billNumber = `OB-${Date.now()}`;
                invoiceNumber = billNumber;
                
                const [newBill] = await tx.insert(openBills).values({
                    billNumber,
                    invoiceNumber,
                    invoiceStatus: downPayment > 0 ? 'DP' : 'DRAFT',
                    userId: session.userId,
                    eventId: billEventId ?? null,
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
                    status: downPayment > 0 ? 'PARTIAL' : 'OPEN',
                }).returning();
                targetBillId = newBill.id;

                if (downPayment > 0 && data.paymentMethod) {
                    await createDownPaymentInvoice(tx, {
                        billNumber,
                        customerName: data.customerName || null,
                        subtotalAmount: data.subtotalAmount,
                        discountAmount: data.discountAmount,
                        discountPercent: data.discountPercent,
                        downPayment,
                        paymentMethod: data.paymentMethod,
                        userId: session.userId,
                        eventId: billEventId ?? null,
                    });
                }
            } else {
                // Get existing bill to preserve invoice number
                const existingBill = await tx.query.openBills.findFirst({
                    where: eq(openBills.id, targetBillId),
                });
                invoiceNumber = existingBill?.invoiceNumber || `DRAFT-${Date.now()}`;
                const existingPaidAmount = Number(existingBill?.paidAmount || 0);
                if (existingPaidAmount > 0 && downPayment > existingPaidAmount) {
                    throw new Error('Down payment sudah tercatat. Tidak bisa menambahkan DP kedua pada open bill yang sama.');
                }

                const finalDownPayment = Math.max(existingPaidAmount, downPayment);
                const delta = Number(Math.max(0, finalDownPayment - existingPaidAmount).toFixed(2));
                
                await tx.update(openBills)
                    .set({
                        eventId: billEventId ?? null,
                        customerName: data.customerName || null,
                        note: data.note || null,
                        subtotalAmount: data.subtotalAmount.toString(),
                        discountAmount: data.discountAmount.toString(),
                        discountPercent: data.discountPercent.toString(),
                        totalAmount: data.totalAmount.toString(),
                        downPaymentPercent: (data.downPaymentPercent || 0).toString(),
                        downPaymentAmount: finalDownPayment.toString(),
                        paidAmount: finalDownPayment.toString(),
                        paymentMethod: data.paymentMethod || null,
                        status: finalDownPayment > 0 ? 'PARTIAL' : 'OPEN',
                        updatedAt: new Date(),
                    })
                    .where(and(eq(openBills.id, targetBillId), inArray(openBills.status, ['OPEN', 'PARTIAL'])));

                await tx.delete(openBillItems).where(eq(openBillItems.openBillId, targetBillId));

                if (delta > 0 && data.paymentMethod) {
                    await createDownPaymentInvoice(tx, {
                        billNumber: `OB-${Date.now()}`,
                        customerName: data.customerName || null,
                        subtotalAmount: data.subtotalAmount,
                        discountAmount: data.discountAmount,
                        discountPercent: data.discountPercent,
                        downPayment: delta,
                        paymentMethod: data.paymentMethod,
                        userId: session.userId,
                        eventId: billEventId ?? null,
                    });
                }
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

    // Get user's event if assigned
    const userEventId = await getCurrentUserEventId();

    try {
        const conditions = [inArray(openBills.status, ['OPEN', 'PARTIAL'])];
        
        if (userEventId) {
            conditions.push(eq(openBills.eventId, userEventId));
        }
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

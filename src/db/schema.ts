import { pgTable, serial, text, integer, timestamp, boolean, pgEnum, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['CASHIER', 'ADMIN', 'SUPERADMIN']);
export const categoryTypeEnum = pgEnum('category_type', ['STUDIO', 'FB']);
export const orderStatusEnum = pgEnum('order_status', ['COMPLETED', 'VOID']);
export const paymentMethodEnum = pgEnum('payment_method', ['CASH', 'QRIS', 'TRANSFER']);
export const shiftStatusEnum = pgEnum('shift_status', ['OPEN', 'CLOSED']);
export const openBillStatusEnum = pgEnum('open_bill_status', ['OPEN', 'PARTIAL', 'CLOSED', 'VOID']);

// Events Table (defined before Users)
export const events = pgTable('events', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    notes: text('notes'),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: integer('created_by'), // Foreign key to users.id (defined in relations)
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Users Table
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(), // Hashed
    role: userRoleEnum('role').default('CASHIER').notNull(),
    eventId: integer('event_id').references(() => events.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Categories Table
export const categories = pgTable('categories', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    type: categoryTypeEnum('type').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Products Table
export const products = pgTable('products', {
    id: serial('id').primaryKey(),
    categoryId: integer('category_id').references(() => categories.id).notNull(),
    sku: text('sku').unique(),   // Optional or Not Null depending on need, unique for barcode
    name: text('name').notNull(),
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    costPrice: decimal('cost_price', { precision: 12, scale: 2 }).notNull().default('0'), // HPP
    stock: integer('stock').notNull().default(0),
    isMenuItem: boolean('is_menu_item').notNull().default(true), // true -> shown in POS menu; false -> stock-only item
    isArchived: boolean('is_archived').notNull().default(false), // soft-delete / archive flag
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const productsRelations = relations(products, ({ one }) => ({
    category: one(categories, {
        fields: [products.categoryId],
        references: [categories.id],
    }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
    products: many(products),
}));

// Orders Table
export const orders = pgTable('orders', {
    id: serial('id').primaryKey(),
    invoiceNumber: text('invoice_number').notNull().unique(),
    userId: integer('user_id').references(() => users.id).notNull(), // Cashier who handled it
    subtotalAmount: decimal('subtotal_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).notNull().default('0'),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
    status: orderStatusEnum('status').default('COMPLETED').notNull(),
    eventId: integer('event_id').references(() => events.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Order Items Table
export const orderItems = pgTable('order_items', {
    id: serial('id').primaryKey(),
    orderId: integer('order_id').references(() => orders.id).notNull(),
    productId: integer('product_id').references(() => products.id).notNull(),
    quantity: integer('quantity').notNull(),
    priceAtSale: decimal('price_at_sale', { precision: 12, scale: 2 }).notNull(),
    costAtSale: decimal('cost_at_sale', { precision: 12, scale: 2 }).notNull(), // Snapshot of cost
});

// Payments Table
export const payments = pgTable('payments', {
    id: serial('id').primaryKey(),
    orderId: integer('order_id').references(() => orders.id).notNull(),
    method: paymentMethodEnum('method').notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Open Bills Table (suspended transactions before final checkout)
export const openBills = pgTable('open_bills', {
    id: serial('id').primaryKey(),
    billNumber: text('bill_number').notNull().unique(),
    invoiceNumber: text('invoice_number').unique(), // DRAFT-xxx for open bills, INV-xxx when converted to order
    invoiceStatus: text('invoice_status').default('DRAFT'), // DRAFT or CONVERTED
    userId: integer('user_id').references(() => users.id).notNull(),
    customerName: text('customer_name'),
    note: text('note'),
    subtotalAmount: decimal('subtotal_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).notNull().default('0'),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    downPaymentPercent: decimal('down_payment_percent', { precision: 5, scale: 2 }).notNull().default('0'), // % if > 0
    downPaymentAmount: decimal('down_payment_amount', { precision: 12, scale: 2 }).notNull().default('0'), // Rp if downPaymentPercent = 0
    paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    paymentMethod: paymentMethodEnum('payment_method'), // Payment method for down payment (if any)
    status: openBillStatusEnum('status').notNull().default('OPEN'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    closedAt: timestamp('closed_at'),
});

// Open Bill Items (snapshot item + price while bill is suspended)
export const openBillItems = pgTable('open_bill_items', {
    id: serial('id').primaryKey(),
    openBillId: integer('open_bill_id').references(() => openBills.id).notNull(),
    productId: integer('product_id').references(() => products.id).notNull(),
    productName: text('product_name').notNull(),
    quantity: integer('quantity').notNull(),
    priceAtBill: decimal('price_at_bill', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Order Relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
    user: one(users, {
        fields: [orders.userId],
        references: [users.id],
    }),
    event: one(events, {
        fields: [orders.eventId],
        references: [events.id],
    }),
    items: many(orderItems),
    payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
    order: one(orders, {
        fields: [orderItems.orderId],
        references: [orders.id],
    }),
    product: one(products, {
        fields: [orderItems.productId],
        references: [products.id],
    }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
    order: one(orders, {
        fields: [payments.orderId],
        references: [orders.id],
    }),
}));

export const openBillsRelations = relations(openBills, ({ one, many }) => ({
    user: one(users, {
        fields: [openBills.userId],
        references: [users.id],
    }),
    items: many(openBillItems),
}));

export const openBillItemsRelations = relations(openBillItems, ({ one }) => ({
    openBill: one(openBills, {
        fields: [openBillItems.openBillId],
        references: [openBills.id],
    }),
    product: one(products, {
        fields: [openBillItems.productId],
        references: [products.id],
    }),
}));

// Shifts Table
export const shifts = pgTable('shifts', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    startTime: timestamp('start_time').defaultNow().notNull(),
    endTime: timestamp('end_time'),
    initialCash: decimal('initial_cash', { precision: 12, scale: 2 }).notNull().default('0'),
    totalCashReceived: decimal('total_cash_received', { precision: 12, scale: 2 }).default('0'),
    status: shiftStatusEnum('status').default('OPEN').notNull(),
});

export const shiftsRelations = relations(shifts, ({ one }) => ({
    user: one(users, {
        fields: [shifts.userId],
        references: [users.id],
    }),
}));

// Audit Logs Table
export const auditLogs = pgTable('audit_logs', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id), // Nullable if system action or user deleted? Better keep track.
    action: text('action').notNull(), // "CREATE", "UPDATE", "DELETE", "LOGIN"
    entity: text('entity').notNull(), // "ORDER", "PRODUCT", "USER"
    entityId: integer('entity_id'),   // ID of the affected entity
    oldValue: text('old_value'),      // JSON stringified or text description
    newValue: text('new_value'),      // JSON stringified or text description
    timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// Stock adjustments table (for opname / manual stock changes)
export const stockAdjustmentTypeEnum = pgEnum('stock_adjustment_type', ['IN', 'OUT', 'ADJUSTMENT']);
export const stockAdjustments = pgTable('stock_adjustments', {
    id: serial('id').primaryKey(),
    productId: integer('product_id').references(() => products.id).notNull(),
    userId: integer('user_id').references(() => users.id).notNull(),
    change: integer('change').notNull(), // positive or negative delta
    type: stockAdjustmentTypeEnum('type').notNull(),
    reason: text('reason'),
    reference: text('reference'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const stockAdjustmentsRelations = relations(stockAdjustments, ({ one }) => ({
    product: one(products, {
        fields: [stockAdjustments.productId],
        references: [products.id],
    }),
    user: one(users, {
        fields: [stockAdjustments.userId],
        references: [users.id],
    }),
}));

// Expenses Table (daily unexpected expenses like buying ice, etc)
export const expenseCategoryEnum = pgEnum('expense_category', ['SUPPLIES', 'UTILITIES', 'MAINTENANCE', 'OTHER']);
export const transactionPaymentMethodEnum = pgEnum('transaction_payment_method', ['CASH', 'QRIS']);
export const expenses = pgTable('expenses', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(), // Admin who recorded it
    description: text('description').notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    category: expenseCategoryEnum('category').default('OTHER').notNull(),
    paymentMethod: transactionPaymentMethodEnum('payment_method').default('CASH').notNull(), // CASH or QRIS
    eventId: integer('event_id').references(() => events.id),
    date: timestamp('date').notNull(), // Date of the expense
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const expensesRelations = relations(expenses, ({ one }) => ({
    user: one(users, {
        fields: [expenses.userId],
        references: [users.id],
    }),
    event: one(events, {
        fields: [expenses.eventId],
        references: [events.id],
    }),
}));

// Income Table (daily income from various sources like additional services, rebates, etc)
export const incomeCategoryEnum = pgEnum('income_category', ['SERVICE', 'REFUND', 'OTHER']);
export const incomes = pgTable('incomes', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(), // Admin who recorded it
    description: text('description').notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    category: incomeCategoryEnum('category').default('OTHER').notNull(),
    paymentMethod: transactionPaymentMethodEnum('payment_method').default('CASH').notNull(), // CASH or QRIS
    eventId: integer('event_id').references(() => events.id),
    date: timestamp('date').notNull(), // Date of the income
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const incomesRelations = relations(incomes, ({ one }) => ({
    user: one(users, {
        fields: [incomes.userId],
        references: [users.id],
    }),
    event: one(events, {
        fields: [incomes.eventId],
        references: [events.id],
    }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
    createdByUser: one(users, {
        fields: [events.createdBy],
        references: [users.id],
    }),
    orders: many(orders),
    expenses: many(expenses),
    incomes: many(incomes),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    user: one(users, {
        fields: [auditLogs.userId],
        references: [users.id],
    }),
}));

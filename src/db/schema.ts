import { pgTable, serial, text, integer, timestamp, boolean, pgEnum, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['CASHIER', 'ADMIN', 'SUPERADMIN']);
export const categoryTypeEnum = pgEnum('category_type', ['STUDIO', 'FB']);
export const orderStatusEnum = pgEnum('order_status', ['COMPLETED', 'VOID']);
export const paymentMethodEnum = pgEnum('payment_method', ['CASH', 'QRIS', 'TRANSFER']);
export const shiftStatusEnum = pgEnum('shift_status', ['OPEN', 'CLOSED']);

// Users Table
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(), // Hashed
    role: userRoleEnum('role').default('CASHIER').notNull(),
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

// Order Relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
    user: one(users, {
        fields: [orders.userId],
        references: [users.id],
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
export const expenses = pgTable('expenses', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(), // Admin who recorded it
    description: text('description').notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    category: expenseCategoryEnum('category').default('OTHER').notNull(),
    date: timestamp('date').notNull(), // Date of the expense
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const expensesRelations = relations(expenses, ({ one }) => ({
    user: one(users, {
        fields: [expenses.userId],
        references: [users.id],
    }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    user: one(users, {
        fields: [auditLogs.userId],
        references: [users.id],
    }),
}));

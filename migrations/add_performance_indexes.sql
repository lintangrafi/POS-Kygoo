-- Performance indexes for commonly queried patterns
-- These address slow queries identified in production (10-30s page loads)

-- Index for getOpenShift(): queries shifts WHERE status='OPEN' ORDER BY start_time DESC
-- Without this, Postgres does a sequential scan on the entire shifts table
CREATE INDEX IF NOT EXISTS idx_shifts_status_start_time 
ON shifts (status, start_time DESC);

-- Index for orders queried by date range + status (used by reports, dashboard, invoices)
CREATE INDEX IF NOT EXISTS idx_orders_created_status 
ON orders (created_at DESC, status);

-- Index for orders filtered by event (used by event reports)
CREATE INDEX IF NOT EXISTS idx_orders_event_created 
ON orders (event_id, created_at DESC) WHERE event_id IS NOT NULL;

-- Index for expenses queried by date range
CREATE INDEX IF NOT EXISTS idx_expenses_date 
ON expenses (date DESC);

-- Index for expenses filtered by event
CREATE INDEX IF NOT EXISTS idx_expenses_event_date 
ON expenses (event_id, date DESC) WHERE event_id IS NOT NULL;

-- Index for incomes queried by date range
CREATE INDEX IF NOT EXISTS idx_incomes_date 
ON incomes (date DESC);

-- Index for open bills filtered by status (used by POS open bills list)
CREATE INDEX IF NOT EXISTS idx_open_bills_status_updated 
ON open_bills (status, updated_at DESC);

-- Index for products filtered by menu/archived status (used by POS product grid)
CREATE INDEX IF NOT EXISTS idx_products_menu_active 
ON products (is_menu_item, is_archived) WHERE is_menu_item = true AND is_archived = false;

-- Index for audit logs by timestamp (used by reports)
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp 
ON audit_logs (timestamp DESC);

-- Index for order_items by order_id (used when fetching order details)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON order_items (order_id);

-- Index for payments by order_id (used when fetching payment breakdowns)
CREATE INDEX IF NOT EXISTS idx_payments_order_id 
ON payments (order_id);

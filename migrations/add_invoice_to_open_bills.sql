-- Add invoice tracking to open_bills table
ALTER TABLE open_bills
ADD COLUMN invoice_number TEXT UNIQUE,
ADD COLUMN invoice_status TEXT DEFAULT 'DRAFT';

-- Create index for invoice tracking
CREATE INDEX idx_open_bills_invoice_number ON open_bills(invoice_number);
CREATE INDEX idx_open_bills_invoice_status ON open_bills(invoice_status);

-- Add comment
COMMENT ON COLUMN open_bills.invoice_number IS 'Invoice number (DRAFT-xxx for open bills, INV-xxx when converted to order)';
COMMENT ON COLUMN open_bills.invoice_status IS 'DRAFT = open bill, CONVERTED = converted to order';

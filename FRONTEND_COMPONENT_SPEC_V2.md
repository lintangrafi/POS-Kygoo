# FRONTEND COMPONENT SPEC V2

Last updated: 2026-03-17
Scope: Implementation-ready UI spec from Paper designs (Dashboard, POS, Inventory, Reports, Invoices, Shift, Settings).

## 1. Design Tokens (Final)

Use this token mapping consistently across all dashboard pages.

### 1.1 Base Palette
- `bg-canvas`: `#F5F1E8`
- `bg-surface`: `#FFFFFF`
- `text-primary`: `#1F1D1A`
- `text-secondary`: `#6B645C`
- `border-default`: `#E6DED0`
- `accent-primary`: `#C86B2A`
- `accent-primary-hover`: `#B85A1D`

### 1.2 Payment Colors
- `payment-cash-bg`: `#EAF7EF`
- `payment-cash-border`: `#BFE7CB`
- `payment-cash-text`: `#17663A`
- `payment-qris-bg`: `#EAF1FF`
- `payment-qris-border`: `#C4D6FF`
- `payment-qris-text`: `#1D4E9E`
- `payment-transfer-bg`: `#F3ECFF`
- `payment-transfer-border`: `#D9C7FF`
- `payment-transfer-text`: `#5A2FA0`

### 1.3 Category Colors
Expense categories:
- `SUPPLIES`: bg `#FFF4E5`, border `#F1D2A6`, text `#8A4B00`
- `UTILITIES`: bg `#EAFBFF`, border `#BFEAF5`, text `#00677F`
- `MAINTENANCE`: bg `#FFECEE`, border `#F4C2C8`, text `#A12737`
- `OTHER`: bg `#F3F4F6`, border `#D8DCE3`, text `#374151`

Income categories:
- `SERVICE`: bg `#EAF7EF`, border `#BFE7CB`, text `#17663A`
- `REFUND`: bg `#FFF0F5`, border `#F5C9D8`, text `#9E2F5D`
- `OTHER`: bg `#F3F4F6`, border `#D8DCE3`, text `#374151`

### 1.4 Status Colors
- `COMPLETED`: green (`#2F7A43` style family)
- `VOID`: red/orange warning (`#7A4D2C` style family)
- `DRAFT/PARTIAL`: yellow family
- `LOW STOCK`: warning orange/red family

## 2. Typography and Spacing

Fonts:
- Heading: Sora
- Body: DM Sans

Type scale:
- Page title: 22px / 700
- Section title: 16-18px / 600
- Body row: 12-14px / 400-500

Spacing rhythm:
- Section gap: 18px
- Card gap: 12-14px
- Row vertical padding: 8-10px
- Radius:
  - Main card: 14px
  - Control/button: 9-10px

## 3. Core Component Specs

## 3.1 AppShell
Purpose: Shared dashboard shell for all pages.

Structure:
- Fixed left sidebar (260px)
- Main content pane with page header + content sections
- Active nav state must be unique (only one active item per page)

Implementation target:
- `src/components/layout/Sidebar.tsx`
- `src/app/(dashboard)/layout.tsx`

Acceptance criteria:
- Active menu is correct per route
- No double-highlight states
- Mobile and desktop maintain same visual language

## 3.2 PageHeader
Purpose: Standard top block for page title, subtitle, and actions.

Variants:
- Filter chips (Reports, Invoices)
- Primary CTA (Add Product, Export, Close Shift)
- Status chip (Shift OPEN/CLOSED)

Acceptance criteria:
- No text wrapping in chips like "Void", "Status: OPEN", "General", "Users"
- Minimum control height 36px

## 3.3 DataLaneTable
Purpose: Replace misaligned ad hoc rows with fixed column lanes.

Rule:
- Every row uses fixed-width column slots (`flex-shrink: 0` lanes)
- Header and row widths must match exactly

Used in:
- Inventory product rows
- Invoices list rows
- Shift history rows
- Settings user management rows

Implementation target:
- `src/app/(dashboard)/inventory/page.tsx`
- `src/app/(dashboard)/invoices/InvoiceListClient.tsx`
- `src/components/shift/ShiftManagement.tsx`
- `src/app/(dashboard)/settings/page.tsx` (if client split, also related components)

## 3.4 PaymentBadge
Purpose: Strong visual cue for payment type.

API:
- Props: `method: 'CASH' | 'QRIS' | 'TRANSFER' | 'SPLIT'`
- Output: pill/badge with mapped bg/border/text token

Behavior:
- `SPLIT` can render label "CASH + QRIS" with neutral-emphasis purple/amber style

Implementation target:
- New: `src/components/ui/payment-badge.tsx`
- Integrate in:
  - `src/app/(dashboard)/invoices/InvoiceListClient.tsx`
  - `src/app/(dashboard)/reports/page.tsx`
  - `src/components/reports/ExpenseManagement.tsx`
  - `src/components/reports/IncomeManagement.tsx`

## 3.5 CategoryBadge
Purpose: Highlight expense/income category by color token.

API:
- Props:
  - `kind: 'expense' | 'income'`
  - `category: string`

Implementation target:
- New: `src/components/ui/category-badge.tsx`
- Integrate in:
  - `src/components/reports/ExpenseManagement.tsx`
  - `src/components/reports/IncomeManagement.tsx`

## 3.6 InvoicePrintablePanel (POS)
Purpose: After payment, show "ready to print" invoice panel in POS cart area.

Required fields:
- Invoice number
- Payment status
- Item summary
- Actions: Print, Save PDF

Implementation target:
- `src/components/pos/CartSidebar.tsx`

Acceptance criteria:
- Panel appears only after successful checkout
- Data mirrors latest completed transaction

## 3.7 InvoiceItemDetailPanel (Invoices)
Purpose: In invoice page, users can quickly see order items.

Required fields:
- Product name
- Qty
- Line/subtotal amount

Implementation target:
- `src/app/(dashboard)/invoices/InvoiceListClient.tsx`
- Keep expandable row behavior and side detail panel synchronized

## 3.8 ExpenseIncomeActions
Purpose: Both modules must provide Add and Delete actions clearly.

Required actions per module:
- Expense: `+ Add Expense`, `Delete Expense`
- Income: `+ Add Income`, `Delete Income`

Implementation target:
- `src/components/reports/ExpenseManagement.tsx`
- `src/components/reports/IncomeManagement.tsx`

## 4. Page-Level Implementation Notes

## 4.1 Reports page
Target file: `src/app/(dashboard)/reports/page.tsx`

Must include blocks:
- KPI cards
- Revenue trend
- Payment breakdown
- Expense management
- Income management
- Audit logs

Color requirements:
- Payment rows use PaymentBadge colors
- Expense/Income category rows use CategoryBadge colors

## 4.2 Invoices page
Target file: `src/app/(dashboard)/invoices/InvoiceListClient.tsx`

Must include:
- Payment method column in main invoice list
- Invoice detail includes item list
- Status and payment badges are color-distinct

## 4.3 Inventory page
Target file: `src/app/(dashboard)/inventory/page.tsx`

Must include:
- Lane-aligned product table
- Category/status emphasis colors for low stock and menu/stock states

## 4.4 Shift page
Target file: `src/components/shift/ShiftManagement.tsx` and/or `src/app/(dashboard)/shift/page.tsx`

Must include:
- Shift active summary
- Reconciliation card
- Lane-aligned history rows

## 4.5 Settings page
Target file: `src/app/(dashboard)/settings/page.tsx`

Must include:
- Lane-aligned user management rows
- Role and system preference cards
- No wrapped text in top filter tabs

## 5. Implementation Sequence (Recommended)

1. Add reusable badges (`PaymentBadge`, `CategoryBadge`).
2. Replace hardcoded color classes in Reports components.
3. Apply DataLaneTable pattern to Invoices + Inventory + Shift + Settings rows.
4. Add POS printable invoice panel state handling.
5. Final visual QA on desktop + mobile breakpoints.

## 6. QA Checklist

- [ ] Payment colors are consistent everywhere.
- [ ] Category colors are consistent for both expense and income.
- [ ] No lane misalignment in table-like rows.
- [ ] No wrapped labels in compact chips/tabs.
- [ ] Print-ready invoice panel appears after payment in POS.
- [ ] Invoice items visible in Invoices module without extra navigation.
- [ ] Contrast remains readable for all colored rows/badges.

## 7. Notes for Developer Handoff

- Keep existing Tailwind + UI primitives; do not introduce heavy new UI framework.
- If introducing constants, create shared maps in one place (for payment/category color mapping).
- Prefer small reusable components over page-level duplicated color logic.

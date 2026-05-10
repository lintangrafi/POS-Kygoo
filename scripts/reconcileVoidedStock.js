/**
 * Stock Reconciliation Script for Voided Orders
 * 
 * This script finds all orders with status 'VOID' and restores the stock
 * that was incorrectly deducted when those orders were originally processed.
 * 
 * Previously, voidOrder() did NOT restore stock — this script fixes the 
 * accumulated discrepancy from all past voids.
 * 
 * Usage:
 *   node scripts/reconcileVoidedStock.js          # Dry run (shows what would change)
 *   node scripts/reconcileVoidedStock.js --apply  # Actually apply the stock restoration
 * 
 * Requires DATABASE_URL environment variable.
 */

require('dotenv').config();
const postgres = require('postgres');

const DRY_RUN = !process.argv.includes('--apply');

async function reconcileVoidedStock() {
    const sql = postgres(process.env.DATABASE_URL, { prepare: false });

    try {
        console.log('='.repeat(60));
        console.log(DRY_RUN
            ? '🔍 DRY RUN - Showing stock adjustments needed (no changes will be made)'
            : '⚠️  APPLYING stock restoration from voided orders'
        );
        console.log('='.repeat(60));
        console.log('');

        // 1. Find all VOID orders
        const voidOrders = await sql`
            SELECT id, invoice_number, created_at
            FROM orders
            WHERE status = 'VOID'
            ORDER BY created_at DESC
        `;

        console.log(`Found ${voidOrders.length} voided order(s).`);
        console.log('');

        if (voidOrders.length === 0) {
            console.log('✅ No voided orders found. Stock is consistent.');
            process.exit(0);
        }

        // 2. Get all order items for voided orders
        const voidOrderIds = voidOrders.map(o => o.id);
        const voidItems = await sql`
            SELECT oi.order_id, oi.product_id, oi.quantity, p.name AS product_name, p.stock AS current_stock
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = ANY(${voidOrderIds})
            ORDER BY oi.product_id
        `;

        console.log(`Found ${voidItems.length} line item(s) across voided orders.`);
        console.log('');

        // 3. Aggregate: how much stock should be restored per product
        const stockDelta = {};
        for (const item of voidItems) {
            const pid = item.product_id;
            if (!stockDelta[pid]) {
                stockDelta[pid] = {
                    productId: pid,
                    productName: item.product_name,
                    currentStock: item.current_stock,
                    totalToRestore: 0,
                    orderCount: 0,
                    orders: [],
                };
            }
            stockDelta[pid].totalToRestore += item.quantity;
            stockDelta[pid].orderCount += 1;
            stockDelta[pid].orders.push(item.order_id);
        }

        const products = Object.values(stockDelta);
        products.sort((a, b) => b.totalToRestore - a.totalToRestore);

        // 4. Display summary
        console.log('┌─────────┬────────────────────────────────────┬──────────┬──────────┬──────────┐');
        console.log('│ ID      │ Product Name                       │ Current  │ Restore  │ New Stock│');
        console.log('├─────────┼────────────────────────────────────┼──────────┼──────────┼──────────┤');
        
        let totalRestored = 0;
        for (const p of products) {
            const newStock = p.currentStock + p.totalToRestore;
            totalRestored += p.totalToRestore;
            console.log(
                `│ ${String(p.productId).padEnd(7)} │ ${p.productName.slice(0, 34).padEnd(34)} │ ${String(p.currentStock).padStart(8)} │ +${String(p.totalToRestore).padStart(7)} │ ${String(newStock).padStart(8)} │`
            );
        }
        
        console.log('└─────────┴────────────────────────────────────┴──────────┴──────────┴──────────┘');
        console.log('');
        console.log(`Summary: ${products.length} product(s), +${totalRestored} total units to restore.`);
        console.log('');

        // 5. Check if any stock was already restored (idempotency check)
        // We look at audit_logs to see if we've already run this script
        const existingReconciliation = await sql`
            SELECT id FROM audit_logs
            WHERE action = 'RECONCILE_VOID_STOCK'
            LIMIT 1
        `;

        if (existingReconciliation.length > 0 && !DRY_RUN) {
            console.log('⚠️  WARNING: A previous stock reconciliation was already applied.');
            console.log('   Running this again may DOUBLE-restore stock.');
            console.log('   If you are sure, delete the RECONCILE_VOID_STOCK audit log entry first.');
            console.log('');
            console.log('Aborting. No changes made.');
            process.exit(1);
        }

        // 6. Apply if not dry run
        if (!DRY_RUN) {
            console.log('Applying stock restoration...');
            console.log('');

            await sql.begin(async (tx) => {
                for (const p of products) {
                    await tx`
                        UPDATE products
                        SET stock = stock + ${p.totalToRestore}
                        WHERE id = ${p.productId}
                    `;
                    console.log(`  ✓ ${p.productName}: +${p.totalToRestore} (was ${p.currentStock}, now ${p.currentStock + p.totalToRestore})`);
                }

                // Log the reconciliation action for idempotency
                await tx`
                    INSERT INTO audit_logs (user_id, action, entity, entity_id, new_value, timestamp)
                    VALUES (
                        1,
                        'RECONCILE_VOID_STOCK',
                        'SYSTEM',
                        0,
                        ${JSON.stringify({
                            voidOrderCount: voidOrders.length,
                            productsAffected: products.length,
                            totalUnitsRestored: totalRestored,
                            details: products.map(p => ({
                                productId: p.productId,
                                name: p.productName,
                                restored: p.totalToRestore,
                            })),
                            appliedAt: new Date().toISOString(),
                        })},
                        NOW()
                    )
                `;
            });

            console.log('');
            console.log('✅ Stock reconciliation COMPLETE.');
            console.log(`   ${products.length} product(s) updated, +${totalRestored} total units restored.`);
        } else {
            console.log('─'.repeat(60));
            console.log('This was a DRY RUN. No changes were made.');
            console.log('To apply these changes, run:');
            console.log('');
            console.log('  node scripts/reconcileVoidedStock.js --apply');
            console.log('');
        }

        await sql.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during reconciliation:', err);
        await sql.end();
        process.exit(1);
    }
}

reconcileVoidedStock();

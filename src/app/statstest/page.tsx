import { db } from '@/db';
import { orders, products, auditLogs } from '@/db/schema';
import { desc, sql, eq, and, gte, lt, lte } from 'drizzle-orm';

export default async function TestStatsPage() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Test 1: Simple orders query
        console.log('Testing orders query...');
        const allOrders = await db.query.orders.findMany({
            limit: 5
        });
        
        // Test 2: Today's orders query
        console.log('Testing today orders query...');
        const todayOrders = await db.query.orders.findMany({
            where: and(
                gte(orders.createdAt, today),
                lt(orders.createdAt, tomorrow),
                eq(orders.status, 'COMPLETED')
            ),
            limit: 5
        });

        // Test 3: Products query
        console.log('Testing products query...');
        const lowStockProducts = await db.query.products.findMany({
            where: (products, { lte }) => lte(products.stock, 10),
            limit: 5,
        });

        return (
            <div className="p-8">
                <h1>Dashboard Stats Test</h1>
                
                <div className="space-y-4">
                    <div>
                        <h2>All Orders (first 5): {allOrders.length} found</h2>
                        {allOrders.map(order => (
                            <p key={order.id}>Order {order.invoiceNumber} - {order.totalAmount}</p>
                        ))}
                    </div>
                    
                    <div>
                        <h2>Today's Orders: {todayOrders.length} found</h2>
                        {todayOrders.map(order => (
                            <p key={order.id}>Order {order.invoiceNumber} - {order.totalAmount}</p>
                        ))}
                    </div>
                    
                    <div>
                        <h2>Low Stock Products: {lowStockProducts.length} found</h2>
                        {lowStockProducts.map(product => (
                            <p key={product.id}>{product.name} - Stock: {product.stock}</p>
                        ))}
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        return (
            <div className="p-8">
                <h1>Stats Error</h1>
                <pre>{error instanceof Error ? error.message : String(error)}</pre>
                <pre>{error instanceof Error ? error.stack : ''}</pre>
            </div>
        );
    }
}
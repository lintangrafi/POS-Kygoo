#!/usr/bin/env node

const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const schema = require('../src/db/schema');

(async () => {
    try {
        const client = postgres(process.env.DATABASE_URL, { prepare: false });
        const db = drizzle(client, { schema });

        console.log('\n✅ EVENTS:');
        const allEvents = await db.query.events.findMany({
            columns: {
                id: true,
                name: true,
                isActive: true,
                startDate: true,
                endDate: true,
            },
        });
        console.table(allEvents);

        console.log('\n✅ ORDERS:');
        const allOrders = await db.query.orders.findMany({
            columns: {
                id: true,
                invoiceNumber: true,
                eventId: true,
                totalAmount: true,
                createdAt: true,
            },
        });
        console.table(allOrders);

        console.log('\n✅ OPEN BILLS:');
        const allOpenBills = await db.query.openBills.findMany({
            columns: {
                id: true,
                billNumber: true,
                eventId: true,
                totalAmount: true,
                status: true,
                createdAt: true,
            },
        });
        console.table(allOpenBills);

        await client.end();
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();

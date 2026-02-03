import 'dotenv/config';
import { db } from './index';
import { users, categories, products } from './schema';
import bcrypt from 'bcryptjs';
import { exit } from 'process';

async function seed() {
    console.log('🌱 Seeding database...');

    // 1. Create Superadmin
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await db.insert(users).values({
        name: 'Super Admin',
        email: 'admin@kygoo.studio',
        password: hashedPassword,
        role: 'SUPERADMIN',
    }).onConflictDoNothing();

    await db.insert(users).values({
        name: 'Cashier One',
        email: 'cashier@kygoo.studio',
        password: hashedPassword,
        role: 'CASHIER',
    }).onConflictDoNothing();

    // 2. Create Basic Categories
    await db.insert(categories).values([
        { name: 'Self Photo Studio', type: 'STUDIO' },
        { name: 'Coffee', type: 'FB' },
        { name: 'Non-Coffee', type: 'FB' },
        { name: 'Snacks', type: 'FB' },
    ]).onConflictDoNothing();

    // 3. Create Products
    const cats = await db.query.categories.findMany();
    const studioId = cats.find(c => c.name === 'Self Photo Studio')?.id;
    const coffeeId = cats.find(c => c.name === 'Coffee')?.id;
    const nonCoffeeId = cats.find(c => c.name === 'Non-Coffee')?.id;
    const snacksId = cats.find(c => c.name === 'Snacks')?.id;

    if (studioId && coffeeId && nonCoffeeId && snacksId) {
        // Check if products already exist to avoid duplicates
        const existingProducts = await db.query.products.findMany();
        const existingNames = new Set(existingProducts.map(p => p.name));

        const productsToInsert = [
            { categoryId: studioId, name: 'Basic Session (15min)', price: '75000', costPrice: '0', stock: 999 },
            { categoryId: studioId, name: 'Premium Session (30min)', price: '120000', costPrice: '0', stock: 999 },
            { categoryId: coffeeId, name: 'Americano', price: '18000', costPrice: '5000', stock: 50 },
            { categoryId: coffeeId, name: 'Cappuccino', price: '22000', costPrice: '7000', stock: 50 },
            { categoryId: coffeeId, name: 'Latte', price: '24000', costPrice: '8000', stock: 50 },
            { categoryId: nonCoffeeId, name: 'Matcha Latte', price: '25000', costPrice: '9000', stock: 30 },
            { categoryId: nonCoffeeId, name: 'Chocolate', price: '23000', costPrice: '8000', stock: 30 },
            { categoryId: snacksId, name: 'French Fries', price: '15000', costPrice: '5000', stock: 20 },
            { categoryId: snacksId, name: 'Platter', price: '30000', costPrice: '12000', stock: 15 },
        ].filter(product => !existingNames.has(product.name)); // Only insert if product doesn't already exist

        if (productsToInsert.length > 0) {
            await db.insert(products).values(productsToInsert);
        }
    }

    console.log('✅ Seeding complete!');
    exit(0);
}

seed().catch((err) => {
    console.error('❌ Seeding failed:', err);
    exit(1);
});

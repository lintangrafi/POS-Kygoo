require('dotenv').config();
const postgres = require('postgres');
const bcrypt = require('bcryptjs');

async function seedUser() {
    const sql = postgres(process.env.DATABASE_URL);
    
    try {
        console.log('🌱 Seeding users...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        // Insert superadmin
        await sql`
            INSERT INTO users (name, email, password, role)
            VALUES ('Super Admin', 'admin@kygoo.studio', ${hashedPassword}, 'SUPERADMIN')
            ON CONFLICT DO NOTHING
        `;
        
        // Insert cashier
        await sql`
            INSERT INTO users (name, email, password, role)
            VALUES ('Cashier One', 'cashier@kygoo.studio', ${hashedPassword}, 'CASHIER')
            ON CONFLICT DO NOTHING
        `;
        
        // Check users
        const users = await sql`SELECT id, name, email, role FROM users`;
        console.log('✅ Users created:', users);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
        process.exit(1);
    }
}

seedUser();

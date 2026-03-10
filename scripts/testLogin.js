require('dotenv').config();
const postgres = require('postgres');
const bcrypt = require('bcryptjs');
const { SignJWT } = require('jose');

async function getSessionCookie() {
    // Parse DATABASE_URL if individual env vars not available
    let sql;
    if (process.env.DATABASE_URL) {
        sql = postgres(process.env.DATABASE_URL);
    } else {
        sql = postgres({
            host: process.env.DATABASE_HOST,
            port: process.env.DATABASE_PORT,
            database: process.env.DATABASE_NAME,
            username: process.env.DATABASE_USER,
            password: process.env.DATABASE_PASSWORD,
            ssl: 'require',
        });
    }

    try {
        // 1. Query user
        const users = await sql`SELECT * FROM users WHERE email = 'admin@kygoo.studio'`;
        if (!users || users.length === 0) {
            console.error('User not found');
            process.exit(1);
        }

        const user = users[0];
        console.log('✅ User query result:', { id: user.id, email: user.email, role: user.role });

        // 2. Verify password (default is admin123)
        const passwordMatch = await bcrypt.compare('admin123', user.password);
        if (!passwordMatch) {
            console.error('Password mismatch');
            process.exit(1);
        }
        console.log('✅ Password verification: PASS');

        // 3. Create JWT session token using exact app logic
        const KEY = new TextEncoder().encode(process.env.AUTH_SECRET || 'secret-key-generic');
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const payload = {
            userId: user.id,
            name: user.name,
            role: user.role,
            expires: expires,
        };

        const token = await new SignJWT(payload)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(KEY);

        console.log('✅ Session token generated');
        console.log('📋 Token (first 50 chars):', token.substring(0, 50) + '...');
        console.log('📋 Payload:', payload);
        console.log('\n🎯 Cookie header to use:');
        console.log(`Cookie: session=${token}`);
        console.log('\n💾 Save this token to use in API tests\n');

        await sql.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        await sql.end();
        process.exit(1);
    }
}

getSessionCookie();

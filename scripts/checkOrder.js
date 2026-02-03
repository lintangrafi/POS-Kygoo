require('dotenv/config');
const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

async function main() {
  const id = process.argv[2] ? Number(process.argv[2]) : null;
  if (!id) {
    console.error('Usage: node scripts/checkOrder.js <id>');
    process.exit(1);
  }

  try {
    const order = await sql`SELECT * FROM orders WHERE id = ${id} LIMIT 1`; 
    console.log('Order:', order);

    const items = await sql`SELECT oi.*, p.name as product_name FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ${id}`;
    console.log('Items:', items);

    const payments = await sql`SELECT * FROM payments WHERE order_id = ${id}`;
    console.log('Payments:', payments);
  } catch (err) {
    console.error('DB error:', err);
  } finally {
    await sql.end({ timeout: 0 });
  }
}

main();
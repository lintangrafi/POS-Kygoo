import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Optimized for Vercel serverless:
// - prepare: false required for pgBouncer/Supabase pooler "Transaction" mode
// - max: limit concurrent connections per serverless instance
// - idle_timeout: close idle connections quickly to free DB slots
// - connect_timeout: fail fast if DB is unreachable
const client = postgres(connectionString, {
  prepare: false,
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

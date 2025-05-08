// src/db/index.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Create database connection
const sql = neon(process.env.DATABASE_URL!, {
  fetchOptions: {
    cache: 'no-store',
  },
});
export const db = drizzle(sql, { schema });

// Export database types
export * from './schema';
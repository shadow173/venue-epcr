// drizzle.config.ts
import type { Config } from 'drizzle-kit';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql', // Changed from driver: 'pg' to dialect: 'postgresql'
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Changed from connectionString to url
  },
  verbose: true,
  strict: true,
}) satisfies Config;

// Add the import for defineConfig
import { defineConfig } from 'drizzle-kit';
import { createClient } from '@libsql/client';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const tursoUrl = process.env.TURSO_DATABASE_URL || '';
const authToken = process.env.TURSO_AUTH_TOKEN || '';

const client = createClient({
  url: tursoUrl,
  authToken: authToken,
});

const sql = fs.readFileSync('/tmp/migration.sql', 'utf-8');

const statements = sql.split(';').filter((s) => s.trim());

async function migrate() {
  console.log('Applying migration to Turso...');

  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await client.execute(statement);
        console.log('Executed:', statement.substring(0, 50) + '...');
      } catch (err: any) {
        if (err.message?.includes('already exists')) {
          console.log('Skipped (already exists):', statement.substring(0, 50));
        } else {
          console.error('Error:', err.message);
        }
      }
    }
  }

  console.log('Migration complete!');
  await client.close();
}

migrate();

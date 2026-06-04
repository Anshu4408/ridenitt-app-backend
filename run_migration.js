const { Client } = require('pg');
const fs = require('fs');

const migrationPath = './prisma/migrations/20251228195802_add_push_subscription/migration.sql';

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✓ Connected to database');
    
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    await client.query(sql);
    console.log('✓ Migration applied successfully');
    
    const result = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );
    console.log('Tables created:', result.rows.map(r => r.table_name).join(', '));
    
  } catch (err) {
    console.error('×Error:', err.message);
  } finally {
    await client.end();
  }
}

runMigration();

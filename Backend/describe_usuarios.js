// Script to describe the usuarios table
const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function describeUsuarios() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'usuarios' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    console.log('Columns in usuarios:');
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

describeUsuarios();
// Script to drop the usuarios table
const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function dropUsuarios() {
  try {
    await pool.query('DROP TABLE IF EXISTS public.usuarios CASCADE');
    console.log('Usuarios table dropped');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

dropUsuarios();
// Script to add descripcion column to habitaciones
const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function addColumn() {
  try {
    await pool.query('ALTER TABLE public.habitaciones ADD COLUMN IF NOT EXISTS descripcion TEXT');
    console.log('Added descripcion column to habitaciones table');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

addColumn();
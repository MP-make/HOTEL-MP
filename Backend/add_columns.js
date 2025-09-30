// Script to add missing columns to habitaciones table
const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function addColumns() {
  try {
    console.log('🔧 Adding missing columns to habitaciones table...');

    // Check current columns
    const columns = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'habitaciones' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    const colNames = columns.rows.map(r => r.column_name);
    console.log('Current columns in habitaciones:', colNames);

    // Add capacidad if missing
    if (!colNames.includes('capacidad')) {
      await pool.query('ALTER TABLE public.habitaciones ADD COLUMN capacidad INTEGER');
      console.log('Added capacidad column');
    }

    // Add piso if missing
    if (!colNames.includes('piso')) {
      await pool.query('ALTER TABLE public.habitaciones ADD COLUMN piso INTEGER');
      console.log('Added piso column');
    }

    // Add precio_por_hora if missing
    if (!colNames.includes('precio_por_hora')) {
      await pool.query('ALTER TABLE public.habitaciones ADD COLUMN precio_por_hora NUMERIC');
      console.log('Added precio_por_hora column');
    }

    // Add precio_por_dia if missing
    if (!colNames.includes('precio_por_dia')) {
      await pool.query('ALTER TABLE public.habitaciones ADD COLUMN precio_por_dia NUMERIC');
      console.log('Added precio_por_dia column');
    }

    console.log('✅ Columns added successfully');

  } catch (error) {
    console.error('Error adding columns:', error);
  } finally {
    await pool.end();
  }
}

addColumns();
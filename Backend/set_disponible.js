// Script to set all habitaciones to disponible = true
const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function setDisponible() {
  try {
    console.log('🔧 Setting all habitaciones to disponible = true...');

    const result = await pool.query('UPDATE public.habitaciones SET disponible = true WHERE disponible = false');
    console.log(`Updated ${result.rowCount} habitaciones to disponible = true`);

    console.log('✅ Done');

  } catch (error) {
    console.error('Error setting disponible:', error);
  } finally {
    await pool.end();
  }
}

setDisponible();
// Script to delete all categories
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function deleteCategories() {
  try {
    // First, set id_categoria to null for all habitaciones
    await pool.query('UPDATE public.habitaciones SET id_categoria = NULL');
    console.log('Set id_categoria to NULL for all habitaciones.');

    // Then delete categories
    const result = await pool.query('DELETE FROM public.categorias_habitaciones');
    console.log(`Deleted ${result.rowCount} categories.`);
  } catch (err) {
    console.error('Error deleting categories:', err);
  } finally {
    await pool.end();
  }
}

deleteCategories();
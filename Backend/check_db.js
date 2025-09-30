// Script to check if required tables and columns exist
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking database structure...');
    console.log('DB_DATABASE:', process.env.DB_DATABASE);
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_USER:', process.env.DB_USER);

    // Check if hotel_config table exists in any schema
    const hotelConfigExists = await pool.query(`
      SELECT table_schema, table_name FROM information_schema.tables
      WHERE table_name = 'hotel_config'
    `);
    console.log('hotel_config table locations:', hotelConfigExists.rows);

    if (hotelConfigExists.rows.length > 0) {
      const hotelConfigColumns = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'hotel_config' AND table_schema = '${hotelConfigExists.rows[0].table_schema}'
        ORDER BY ordinal_position;
      `);
      console.log('hotel_config columns:', hotelConfigColumns.rows.map(r => r.column_name));
    }

    // Check categorias_habitaciones in any schema
    const catExists = await pool.query(`
      SELECT table_schema, table_name FROM information_schema.tables
      WHERE table_name = 'categorias_habitaciones'
    `);
    console.log('categorias_habitaciones table locations:', catExists.rows);

    if (catExists.rows.length > 0) {
      const catColumns = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'categorias_habitaciones' AND table_schema = '${catExists.rows[0].table_schema}'
        ORDER BY ordinal_position;
      `);
      console.log('categorias_habitaciones columns:', catColumns.rows.map(r => r.column_name));

      // Check if descripcion column exists
      const hasDesc = catColumns.rows.some(r => r.column_name === 'descripcion');
      console.log('descripcion column exists:', hasDesc);
    }

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase();
// Script to get columns of tables
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function getColumns() {
  const tables = ['public.categorias_habitaciones', 'public.habitaciones', 'public.reservas', 'public.habitaciones_old'];
  
  for (const table of tables) {
    try {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table.split('.')[1]]);
      
      console.log(`\nTabla: ${table}`);
      console.log('Columnas:');
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${row.column_default ? 'DEFAULT ' + row.column_default : ''}`);
      });
    } catch (err) {
      console.error(`Error getting columns for ${table}:`, err.message);
    }
  }
  
  await pool.end();
}

getColumns();
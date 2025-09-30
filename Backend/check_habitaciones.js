// Script to check habitaciones status
const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkHabitaciones() {
  try {
    const result = await pool.query('SELECT id_habitacion, numero_habitacion, disponible FROM public.habitaciones ORDER BY numero_habitacion');
    console.log('Estado de habitaciones:');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id_habitacion}, Numero: ${row.numero_habitacion}, Disponible: ${row.disponible}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkHabitaciones();
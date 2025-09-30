// Script to create hotel_config table
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function createHotelConfigTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hotel_config (
        id SERIAL PRIMARY KEY,
        num_pisos INTEGER NOT NULL DEFAULT 1,
        habitaciones_por_piso INTEGER NOT NULL DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Tabla hotel_config creada o ya existe.');

    // Insert default if not exists
    const result = await pool.query('SELECT COUNT(*) FROM hotel_config');
    if (parseInt(result.rows[0].count) === 0) {
      await pool.query('INSERT INTO hotel_config (num_pisos, habitaciones_por_piso) VALUES (1, 10)');
      console.log('Configuración por defecto insertada.');
    }
  } catch (err) {
    console.error('Error creando tabla hotel_config:', err);
  } finally {
    await pool.end();
  }
}

createHotelConfigTable();
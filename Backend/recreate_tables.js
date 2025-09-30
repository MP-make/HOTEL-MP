// Script to drop and recreate problematic tables
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function recreateTables() {
  try {
    console.log('🔄 Dropping and recreating tables...');

    // Drop tables if exist
    await pool.query('DROP TABLE IF EXISTS public.hotel_config CASCADE');
    console.log('Dropped hotel_config');

    // For categorias_habitaciones, we need to be careful with foreign keys
    // First, check if there are rooms using it
    const count = await pool.query('SELECT COUNT(*) FROM public.habitaciones WHERE id_categoria IS NOT NULL');
    if (count.rows[0].count > 0) {
      console.log('Cannot drop categorias_habitaciones because rooms are using it. Only adding missing columns.');
    } else {
      await pool.query('DROP TABLE IF EXISTS public.categorias_habitaciones CASCADE');
      console.log('Dropped categorias_habitaciones');
    }

    // Recreate hotel_config
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hotel_config (
        id SERIAL PRIMARY KEY,
        num_pisos INTEGER NOT NULL DEFAULT 1,
        habitaciones_por_piso INTEGER NOT NULL DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default data
    const countConfig = await pool.query('SELECT COUNT(*) FROM hotel_config');
    if (countConfig.rows[0].count == 0) {
      await pool.query('INSERT INTO hotel_config (num_pisos, habitaciones_por_piso) VALUES (1, 10)');
    }

    console.log('Recreated hotel_config');

    // Recreate categorias_habitaciones if dropped
    if (count.rows[0].count == 0) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS categorias_habitaciones (
          id_categoria SERIAL PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL UNIQUE,
          descripcion TEXT,
          capacidad INTEGER
        )
      `);

      // Insert default category
      await pool.query('INSERT INTO categorias_habitaciones (nombre, descripcion) VALUES (\'Estándar\', NULL)');
      console.log('Recreated categorias_habitaciones');
    } else {
      // Just add columns if missing
      const columns = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'categorias_habitaciones' AND table_schema = 'public'
      `);
      const colNames = columns.rows.map(r => r.column_name);

      if (!colNames.includes('descripcion')) {
        await pool.query('ALTER TABLE public.categorias_habitaciones ADD COLUMN descripcion TEXT');
        console.log('Added descripcion column');
      }
      if (!colNames.includes('capacidad')) {
        await pool.query('ALTER TABLE public.categorias_habitaciones ADD COLUMN capacidad INTEGER');
        console.log('Added capacidad column');
      }
    }

    console.log('✅ Tables recreated successfully');

  } catch (error) {
    console.error('Error recreating tables:', error);
  } finally {
    await pool.end();
  }
}

recreateTables();
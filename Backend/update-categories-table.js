const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function updateCategoriesTable() {
  try {
    console.log('🔍 Verificando estructura actual de la tabla categorias_habitaciones...');
    
    // Verificar columnas existentes
    const existingColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categorias_habitaciones' 
      AND table_schema = 'public'
    `);
    
    const columnNames = existingColumns.rows.map(row => row.column_name);
    console.log('Columnas existentes:', columnNames);
    
    // Agregar columna 'descripcion' si no existe
    if (!columnNames.includes('descripcion')) {
      console.log('➕ Agregando columna "descripcion"...');
      await pool.query(`
        ALTER TABLE public.categorias_habitaciones 
        ADD COLUMN descripcion TEXT
      `);
      console.log('✅ Columna "descripcion" agregada exitosamente');
    } else {
      console.log('✅ Columna "descripcion" ya existe');
    }
    
    // Agregar columna 'capacidad' si no existe
    if (!columnNames.includes('capacidad')) {
      console.log('➕ Agregando columna "capacidad"...');
      await pool.query(`
        ALTER TABLE public.categorias_habitaciones 
        ADD COLUMN capacidad INTEGER
      `);
      console.log('✅ Columna "capacidad" agregada exitosamente');
    } else {
      console.log('✅ Columna "capacidad" ya existe');
    }
    
    // Mostrar estructura final
    console.log('\n📋 Estructura final de la tabla:');
    const finalStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'categorias_habitaciones' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    console.table(finalStructure.rows);
    
    // Mostrar datos actuales
    console.log('\n📊 Datos actuales en la tabla:');
    const currentData = await pool.query('SELECT * FROM categorias_habitaciones ORDER BY id_categoria');
    console.table(currentData.rows);
    
    console.log('\n🎉 ¡Actualización de tabla completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error al actualizar la tabla:', error.message);
  } finally {
    await pool.end();
  }
}

updateCategoriesTable();
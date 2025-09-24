// Script para verificar categorías disponibles
require('dotenv').config();
const { pool } = require('../db');

async function checkCategories() {
  try {
    console.log('🔍 Verificando categorías en la base de datos...');
    
    const { rows } = await pool.query('SELECT * FROM categorias_habitaciones ORDER BY id_categoria_habitacion');
    console.log('\n📋 Categorías disponibles:');
    rows.forEach(cat => {
      console.log(`   - ID ${cat.id_categoria_habitacion}: ${cat.nombre}`);
    });

    console.log('\n✅ Verificación completada.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCategories();
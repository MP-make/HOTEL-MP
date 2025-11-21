// Script para crear categorías básicas en Supabase
require('dotenv').config();
const { pool } = require('../db');

async function createCategories() {
  try {
    console.log('Conectando a la base de datos...');
    
    // Insertar categorías básicas
    const categorias = [
      { nombre: 'Matrimonial' },
      { nombre: 'Simple' }, 
      { nombre: 'Doble' },
      { nombre: 'Familiar' },
      { nombre: 'Estándar' }
    ];

    for (const categoria of categorias) {
      try {
        const result = await pool.query(
          'INSERT INTO categorias_habitaciones (nombre) VALUES ($1) RETURNING id_categoria, nombre',
          [categoria.nombre]
        );
        console.log(`Categoría creada: ${result.rows[0].nombre} (ID: ${result.rows[0].id_categoria})`);
      } catch (err) {
        if (err.code === '23505') { // duplicate key error
          console.log(`ℹCategoría '${categoria.nombre}' ya existe, omitiendo...`);
        } else {
          console.error(`Error creando categoría '${categoria.nombre}':`, err.message);
        }
      }
    }

    // Verificar categorías existentes
    const { rows } = await pool.query('SELECT * FROM categorias_habitaciones ORDER BY id_categoria');
    console.log('\n Categorías disponibles:');
    rows.forEach(cat => {
      console.log(`   - ID ${cat.id_categoria}: ${cat.nombre}`);
    });

    console.log('\n Proceso completado.');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

createCategories();
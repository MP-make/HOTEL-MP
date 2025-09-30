const { pool } = require('../db');

async function createReclamosTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reclamos (
        id_reclamo SERIAL PRIMARY KEY,
        id_usuario INTEGER,
        id_habitacion INTEGER,
        descripcion TEXT NOT NULL,
        estado VARCHAR(50) DEFAULT 'pendiente',
        fecha_creacion TIMESTAMP DEFAULT now()
      );
    `);
    console.log('Tabla reclamos creada o ya existente.');
  } catch (err) {
    console.error('Error creando tabla reclamos:', err);
  } finally {
    await pool.end();
  }
}

createReclamosTable();
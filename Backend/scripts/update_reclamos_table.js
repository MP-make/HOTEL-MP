const { pool } = require('../db');

async function updateReclamosTable() {
  try {
    // Agregar columna tipo_solicitud si no existe
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'reclamos' AND column_name = 'tipo_solicitud'
        ) THEN
          ALTER TABLE reclamos 
          ADD COLUMN tipo_solicitud VARCHAR(20) DEFAULT 'reclamo' 
          CHECK (tipo_solicitud IN ('reclamo', 'pedido', 'limpieza'));
        END IF;
      END $$;
    `);
    
    // Agregar columna id_reserva si no existe
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'reclamos' AND column_name = 'id_reserva'
        ) THEN
          ALTER TABLE reclamos 
          ADD COLUMN id_reserva INTEGER REFERENCES reservas(id_reserva);
        END IF;
      END $$;
    `);
    
    console.log('✅ Tabla reclamos actualizada exitosamente.');
    console.log('   - Columna tipo_solicitud agregada (reclamo/pedido/limpieza)');
    console.log('   - Columna id_reserva agregada');
  } catch (err) {
    console.error('❌ Error actualizando tabla reclamos:', err);
  } finally {
    await pool.end();
  }
}

updateReclamosTable();
// create_pagos_table.js - Crear tabla de pagos
const { pool } = require('./db');

async function createPagosTable() {
    const client = await pool.connect();
    try {
        console.log('🔄 Creando tabla de pagos...');

        // Verificar si la tabla ya existe
        const checkTable = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'pagos'
            );
        `);

        if (checkTable.rows[0].exists) {
            console.log('⚠️  La tabla "pagos" ya existe. Verificando estructura...');
        } else {
            // Crear la tabla de pagos
            await client.query(`
                CREATE TABLE pagos (
                    id_pago SERIAL PRIMARY KEY,
                    id_reserva INTEGER NOT NULL REFERENCES reservas(id_reserva) ON DELETE CASCADE,
                    monto DECIMAL(10, 2) NOT NULL,
                    metodo_pago VARCHAR(50) NOT NULL,
                    tipo_pago VARCHAR(20) NOT NULL,
                    comprobante TEXT,
                    estado VARCHAR(20) DEFAULT 'completado',
                    fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    notas TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ Tabla "pagos" creada exitosamente');
        }

        // Mostrar estructura
        const columns = await client.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'pagos'
            ORDER BY ordinal_position
        `);

        console.log('\n📋 Estructura de la tabla pagos:');
        console.table(columns.rows);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

createPagosTable()
    .then(() => {
        console.log('✅ Proceso completado');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });

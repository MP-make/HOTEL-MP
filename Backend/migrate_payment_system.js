const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function migratePaymentSystem() {
    const client = await pool.connect();
    try {
        console.log('🔄 Iniciando migración del sistema de pagos...');

        // 1. Crear tabla de pagos
        await client.query(`
            CREATE TABLE IF NOT EXISTS pagos (
                id_pago SERIAL PRIMARY KEY,
                id_reserva INTEGER REFERENCES reservas(id_reserva) ON DELETE CASCADE,
                monto DECIMAL(10, 2) NOT NULL,
                metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('tarjeta', 'yape', 'plin')),
                tipo_pago VARCHAR(20) NOT NULL CHECK (tipo_pago IN ('adelanto', 'restante', 'completo')),
                comprobante TEXT,
                estado VARCHAR(20) DEFAULT 'completado',
                fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabla "pagos" creada/verificada');

        // 2. Agregar columnas a la tabla reservas
        const columnsToAdd = [
            { name: 'monto_total', type: 'DECIMAL(10, 2) DEFAULT 0' },
            { name: 'monto_pagado', type: 'DECIMAL(10, 2) DEFAULT 0' },
            { name: 'monto_pendiente', type: 'DECIMAL(10, 2) DEFAULT 0' },
            { name: 'porcentaje_pagado', type: 'DECIMAL(5, 2) DEFAULT 0' },
            { name: 'estado_pago', type: "VARCHAR(20) DEFAULT 'pendiente'" }
        ];

        for (const col of columnsToAdd) {
            try {
                await client.query(`ALTER TABLE reservas ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
                console.log(`✅ Columna "${col.name}" agregada/verificada`);
            } catch (err) {
                if (err.code === '42701') {
                    console.log(`⚠️  Columna "${col.name}" ya existe`);
                } else {
                    throw err;
                }
            }
        }

        console.log('✅ Migración del sistema de pagos completada!');

    } catch (error) {
        console.error('❌ Error en la migración:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migratePaymentSystem()
    .then(() => {
        console.log('✅ Script completado exitosamente');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });

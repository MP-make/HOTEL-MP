// add_payment_columns.js - Script para agregar columnas de pago
const { pool } = require('./db');

async function addPaymentColumns() {
    const client = await pool.connect();
    try {
        console.log('🔄 Iniciando migración de columnas de pago...');

        // Verificar si las columnas ya existen
        const checkColumns = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'reservas' 
            AND column_name IN ('monto_total', 'monto_pagado', 'monto_pendiente', 'porcentaje_pagado', 'estado_pago')
        `);

        const existingColumns = checkColumns.rows.map(row => row.column_name);
        console.log('✅ Columnas existentes:', existingColumns);

        // Agregar columnas faltantes
        if (!existingColumns.includes('monto_total')) {
            await client.query(`
                ALTER TABLE reservas 
                ADD COLUMN monto_total DECIMAL(10, 2) DEFAULT 0
            `);
            console.log('✅ Columna "monto_total" agregada');
        }

        if (!existingColumns.includes('monto_pagado')) {
            await client.query(`
                ALTER TABLE reservas 
                ADD COLUMN monto_pagado DECIMAL(10, 2) DEFAULT 0
            `);
            console.log('✅ Columna "monto_pagado" agregada');
        }

        if (!existingColumns.includes('monto_pendiente')) {
            await client.query(`
                ALTER TABLE reservas 
                ADD COLUMN monto_pendiente DECIMAL(10, 2) DEFAULT 0
            `);
            console.log('✅ Columna "monto_pendiente" agregada');
        }

        if (!existingColumns.includes('porcentaje_pagado')) {
            await client.query(`
                ALTER TABLE reservas 
                ADD COLUMN porcentaje_pagado DECIMAL(5, 2) DEFAULT 0
            `);
            console.log('✅ Columna "porcentaje_pagado" agregada');
        }

        if (!existingColumns.includes('estado_pago')) {
            await client.query(`
                ALTER TABLE reservas 
                ADD COLUMN estado_pago VARCHAR(20) DEFAULT 'pendiente'
            `);
            console.log('✅ Columna "estado_pago" agregada');
        }

        // Actualizar registros existentes
        console.log('🔄 Actualizando registros existentes...');
        await client.query(`
            UPDATE reservas 
            SET monto_total = precio_total,
                monto_pendiente = COALESCE(precio_total, 0) - COALESCE(monto_pagado, 0)
            WHERE monto_total = 0 OR monto_total IS NULL
        `);

        console.log('✅ Migración completada exitosamente!');
        console.log('📊 Resumen de la tabla reservas:');
        
        const summary = await client.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'reservas'
            AND column_name IN ('monto_total', 'monto_pagado', 'monto_pendiente', 'porcentaje_pagado', 'estado_pago')
            ORDER BY column_name
        `);
        
        console.table(summary.rows);

    } catch (error) {
        console.error('❌ Error en la migración:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Ejecutar migración
addPaymentColumns()
    .then(() => {
        console.log('✅ Proceso completado');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });

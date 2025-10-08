const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function addPaymentColumns() {
    const client = await pool.connect();
    try {
        console.log('🔄 Agregando columnas de pago a la tabla reservas...');

        // Verificar si las columnas ya existen
        const checkColumns = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'reservas' 
            AND column_name IN ('monto_total', 'monto_pagado', 'monto_pendiente', 'porcentaje_pagado', 'estado_pago')
        `);

        const existingColumns = checkColumns.rows.map(row => row.column_name);
        
        // Agregar columnas faltantes
        if (!existingColumns.includes('monto_total')) {
            await client.query(`ALTER TABLE reservas ADD COLUMN monto_total DECIMAL(10, 2) DEFAULT 0`);
            console.log('✅ Columna "monto_total" agregada');
        }

        if (!existingColumns.includes('monto_pagado')) {
            await client.query(`ALTER TABLE reservas ADD COLUMN monto_pagado DECIMAL(10, 2) DEFAULT 0`);
            console.log('✅ Columna "monto_pagado" agregada');
        }

        if (!existingColumns.includes('monto_pendiente')) {
            await client.query(`ALTER TABLE reservas ADD COLUMN monto_pendiente DECIMAL(10, 2) DEFAULT 0`);
            console.log('✅ Columna "monto_pendiente" agregada');
        }

        if (!existingColumns.includes('porcentaje_pagado')) {
            await client.query(`ALTER TABLE reservas ADD COLUMN porcentaje_pagado DECIMAL(5, 2) DEFAULT 0`);
            console.log('✅ Columna "porcentaje_pagado" agregada');
        }

        if (!existingColumns.includes('estado_pago')) {
            await client.query(`ALTER TABLE reservas ADD COLUMN estado_pago VARCHAR(20) DEFAULT 'pendiente'`);
            console.log('✅ Columna "estado_pago" agregada');
        }

        console.log('✅ Migración de columnas completada!');

    } catch (error) {
        console.error('❌ Error en la migración:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

addPaymentColumns()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

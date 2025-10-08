// check_reservas_columns.js - Verificar columnas de la tabla reservas
const { pool } = require('./db');

async function checkReservasColumns() {
    const client = await pool.connect();
    try {
        console.log('📋 Verificando estructura de la tabla reservas...\n');

        const result = await client.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'reservas'
            ORDER BY ordinal_position
        `);

        console.table(result.rows);
        
        // Mostrar datos de ejemplo
        const sample = await client.query('SELECT * FROM reservas LIMIT 3');
        console.log('\n📊 Datos de ejemplo:');
        console.table(sample.rows);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkReservasColumns();

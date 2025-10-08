// check_fecha_creacion.js - Verificar y corregir fechas de creación
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function verificarYCorregirFechas() {
    try {
        console.log('🔍 Verificando fechas de creación en reservas...\n');
        
        // 1. Verificar reservas con fecha_creacion NULL o inválidas
        const queryProblematicas = `
            SELECT id_reserva, fecha_checkin, fecha_checkout, fecha_creacion,
                   EXTRACT(YEAR FROM fecha_creacion) as year
            FROM reservas 
            WHERE fecha_creacion IS NULL 
               OR EXTRACT(YEAR FROM fecha_creacion) < 2020
               OR EXTRACT(YEAR FROM fecha_creacion) > 2030
            ORDER BY id_reserva;
        `;
        
        const result = await pool.query(queryProblematicas);
        
        if (result.rows.length === 0) {
            console.log('✅ No se encontraron reservas con fechas de creación problemáticas.\n');
        } else {
            console.log(`⚠️  Se encontraron ${result.rows.length} reservas con fechas de creación problemáticas:\n`);
            
            result.rows.forEach(row => {
                console.log(`  - Reserva #${row.id_reserva}:`);
                console.log(`    fecha_creacion: ${row.fecha_creacion}`);
                console.log(`    fecha_checkin: ${row.fecha_checkin}`);
                console.log(`    fecha_checkout: ${row.fecha_checkout}\n`);
            });
            
            // 2. Ofrecer corrección
            console.log('🔧 Corrigiendo fechas de creación...\n');
            
            const queryCorregir = `
                UPDATE reservas 
                SET fecha_creacion = COALESCE(fecha_checkin, NOW())
                WHERE fecha_creacion IS NULL 
                   OR EXTRACT(YEAR FROM fecha_creacion) < 2020
                   OR EXTRACT(YEAR FROM fecha_creacion) > 2030
                RETURNING id_reserva, fecha_creacion;
            `;
            
            const corregidas = await pool.query(queryCorregir);
            
            console.log(`✅ Se corrigieron ${corregidas.rows.length} registros:\n`);
            corregidas.rows.forEach(row => {
                console.log(`  - Reserva #${row.id_reserva}: nueva fecha_creacion = ${row.fecha_creacion}`);
            });
        }
        
        // 3. Mostrar un resumen de todas las reservas
        console.log('\n📊 Resumen de todas las reservas:\n');
        const queryResumen = `
            SELECT id_reserva, 
                   fecha_checkin, 
                   fecha_checkout, 
                   fecha_creacion,
                   estado_reserva
            FROM reservas 
            ORDER BY fecha_creacion DESC 
            LIMIT 10;
        `;
        
        const resumen = await pool.query(queryResumen);
        
        console.log('Últimas 10 reservas:');
        resumen.rows.forEach(row => {
            const checkin = new Date(row.fecha_checkin);
            const checkout = new Date(row.fecha_checkout);
            const creacion = new Date(row.fecha_creacion);
            
            console.log(`\n  Reserva #${row.id_reserva} (${row.estado_reserva}):`);
            console.log(`    Check-in:  ${checkin.toLocaleString('es-ES')}`);
            console.log(`    Check-out: ${checkout.toLocaleString('es-ES')}`);
            console.log(`    Creada:    ${creacion.toLocaleString('es-ES')}`);
        });
        
        console.log('\n✅ Verificación completada.');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

verificarYCorregirFechas();

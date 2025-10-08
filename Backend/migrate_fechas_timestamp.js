// migrate_fechas_timestamp.js - Migrar columnas de DATE a TIMESTAMP
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function migrarFechasATimestamp() {
    try {
        console.log('🔧 Migrando columnas de DATE a TIMESTAMP...\n');
        
        // 1. Verificar el tipo actual de las columnas
        console.log('📊 Verificando tipo actual de las columnas...\n');
        const checkTypes = await pool.query(`
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'reservas' 
            AND column_name IN ('fecha_checkin', 'fecha_checkout', 'fecha_creacion')
            ORDER BY column_name;
        `);
        
        console.log('Tipos actuales:');
        checkTypes.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });
        console.log('');
        
        // 2. Realizar la migración
        console.log('🔄 Convirtiendo columnas de DATE a TIMESTAMP...\n');
        
        await pool.query('BEGIN');
        
        try {
            // Cambiar fecha_checkin
            await pool.query(`
                ALTER TABLE reservas 
                ALTER COLUMN fecha_checkin TYPE TIMESTAMP 
                USING fecha_checkin::TIMESTAMP;
            `);
            console.log('✅ fecha_checkin convertida a TIMESTAMP');
            
            // Cambiar fecha_checkout
            await pool.query(`
                ALTER TABLE reservas 
                ALTER COLUMN fecha_checkout TYPE TIMESTAMP 
                USING fecha_checkout::TIMESTAMP;
            `);
            console.log('✅ fecha_checkout convertida a TIMESTAMP');
            
            // Verificar fecha_creacion (debería ya ser TIMESTAMP)
            const creacionType = checkTypes.rows.find(r => r.column_name === 'fecha_creacion');
            if (creacionType && creacionType.data_type === 'date') {
                await pool.query(`
                    ALTER TABLE reservas 
                    ALTER COLUMN fecha_creacion TYPE TIMESTAMP 
                    USING fecha_creacion::TIMESTAMP;
                `);
                console.log('✅ fecha_creacion convertida a TIMESTAMP');
            } else {
                console.log('ℹ️  fecha_creacion ya es TIMESTAMP o timestamp with time zone');
            }
            
            await pool.query('COMMIT');
            console.log('\n✅ Migración completada exitosamente!\n');
            
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }
        
        // 3. Verificar el resultado
        console.log('🔍 Verificando tipos después de la migración...\n');
        const checkTypesAfter = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'reservas' 
            AND column_name IN ('fecha_checkin', 'fecha_checkout', 'fecha_creacion')
            ORDER BY column_name;
        `);
        
        console.log('Tipos después de la migración:');
        checkTypesAfter.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });
        console.log('');
        
        // 4. Mostrar algunas reservas para verificar
        console.log('📋 Mostrando últimas 3 reservas:\n');
        const sample = await pool.query(`
            SELECT id_reserva, fecha_checkin, fecha_checkout, fecha_creacion
            FROM reservas 
            ORDER BY fecha_creacion DESC 
            LIMIT 3;
        `);
        
        sample.rows.forEach(row => {
            console.log(`Reserva #${row.id_reserva}:`);
            console.log(`  Check-in:  ${new Date(row.fecha_checkin).toLocaleString('es-ES')}`);
            console.log(`  Check-out: ${new Date(row.fecha_checkout).toLocaleString('es-ES')}`);
            console.log(`  Creada:    ${new Date(row.fecha_creacion).toLocaleString('es-ES')}\n`);
        });
        
        console.log('💡 Nota: Las reservas existentes mantendrán hora 00:00:00');
        console.log('   Las NUEVAS reservas ahora sí guardarán la hora correcta.\n');
        
    } catch (error) {
        console.error('❌ Error durante la migración:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

migrarFechasATimestamp();

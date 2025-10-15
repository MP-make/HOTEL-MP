// Script para verificar el timezone de la base de datos
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkDatabase() {
  try {
    console.log('=== VERIFICACION DE TIMEZONE Y RESERVAS ===\n');
    
    // 1. Verificar timezone de PostgreSQL
    const tz = await pool.query('SHOW timezone');
    console.log('1. Timezone de PostgreSQL:', tz.rows[0].timezone);
    console.log('');
    
    // 2. Verificar hora actual en diferentes timezones
    const now = await pool.query(`
      SELECT 
        NOW() as ahora_utc,
        NOW() AT TIME ZONE 'America/Lima' as ahora_peru,
        CURRENT_TIMESTAMP as current_ts
    `);
    console.log('2. Hora actual en la BD:');
    console.log('   UTC:', now.rows[0].ahora_utc);
    console.log('   Peru (UTC-5):', now.rows[0].ahora_peru);
    console.log('   CURRENT_TIMESTAMP:', now.rows[0].current_ts);
    console.log('');
    
    // 3. Verificar últimas reservas
    const reservas = await pool.query(`
      SELECT 
        id_reserva, 
        fecha_checkin, 
        fecha_checkout, 
        fecha_creacion,
        TO_CHAR(fecha_checkin, 'YYYY-MM-DD HH24:MI:SS') as checkin_formatted,
        TO_CHAR(fecha_checkout, 'YYYY-MM-DD HH24:MI:SS') as checkout_formatted,
        TO_CHAR(fecha_creacion, 'YYYY-MM-DD HH24:MI:SS') as creacion_formatted
      FROM reservas 
      ORDER BY id_reserva DESC 
      LIMIT 3
    `);
    
    console.log('3. Ultimas 3 reservas guardadas en la BD:');
    if (reservas.rows.length === 0) {
      console.log('   No hay reservas en la BD');
    } else {
      reservas.rows.forEach(r => {
        console.log(`\n  Reserva ID ${r.id_reserva}:`);
        console.log(`    Check-in (raw): ${r.fecha_checkin}`);
        console.log(`    Check-in (formatted): ${r.checkin_formatted}`);
        console.log(`    Check-out (raw): ${r.fecha_checkout}`);
        console.log(`    Check-out (formatted): ${r.checkout_formatted}`);
        console.log(`    Creacion (raw): ${r.fecha_creacion}`);
        console.log(`    Creacion (formatted): ${r.creacion_formatted}`);
      });
    }
    console.log('');
    
    // 4. Verificar tipo de dato de las columnas
    const columns = await pool.query(`
      SELECT column_name, data_type, datetime_precision 
      FROM information_schema.columns
      WHERE table_name = 'reservas' 
        AND column_name IN ('fecha_checkin', 'fecha_checkout', 'fecha_creacion')
      ORDER BY ordinal_position
    `);
    console.log('4. Tipo de dato de las columnas:');
    columns.rows.forEach(c => {
      console.log(`   ${c.column_name}: ${c.data_type}${c.datetime_precision ? `(${c.datetime_precision})` : ''}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();
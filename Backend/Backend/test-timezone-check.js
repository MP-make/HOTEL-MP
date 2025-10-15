const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function verificarTimezone() {
  try {
    console.log('=== VERIFICACION DE TIMEZONE ===\n');
    
    const tz = await pool.query('SHOW timezone');
    console.log('1. Timezone de PostgreSQL:', tz.rows[0].timezone);
    console.log('');
    
    const now = await pool.query(\SELECT NOW() as ahora_utc, NOW() AT TIME ZONE 'America/Lima' as ahora_peru\);
    console.log('2. Hora actual en BD:');
    console.log('   UTC:', now.rows[0].ahora_utc);
    console.log('   Peru:', now.rows[0].ahora_peru);
    console.log('');
    
    const reservas = await pool.query('SELECT id_reserva, fecha_checkin, fecha_checkout, fecha_creacion FROM reservas ORDER BY id_reserva DESC LIMIT 3');
    console.log('3. Ultimas 3 reservas en BD:');
    reservas.rows.forEach(r => {
      console.log(\  ID \:\);
      console.log(\    Check-in: \\);
      console.log(\    Check-out: \\);
      console.log(\    Creacion: \\);
      console.log('');
    });
    
    await pool.end();
  } catch(e) {
    console.error('Error:', e.message);
    await pool.end();
    process.exit(1);
  }
}

verificarTimezone();
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkReservasFotos() {
    const client = await pool.connect();
    try {
        console.log('Connected to DB');

        const result = await client.query(`
            SELECT r.id_reserva, h.numero_habitacion, hf.ruta_foto
            FROM reservas r
            LEFT JOIN habitaciones h ON r.id_habitacion = h.id_habitacion
            LEFT JOIN habitaciones_fotos hf ON r.id_habitacion = hf.id_habitacion
            LIMIT 10
        `);
        
        console.log('Reservas fotos:');
        result.rows.forEach(row => {
            console.log(`${row.id_reserva} - ${row.numero_habitacion}: ${row.ruta_foto || 'null'}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

checkReservasFotos();
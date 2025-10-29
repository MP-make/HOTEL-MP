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

async function checkFilenames() {
    const client = await pool.connect();
    try {
        console.log('Connected to DB');

        const result = await client.query('SELECT id_foto, ruta_foto FROM habitaciones_fotos LIMIT 10');
        
        console.log('Filenames:');
        result.rows.forEach(row => {
            console.log(`${row.id_foto}: ${row.ruta_foto}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

checkFilenames();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function fixFilenames() {
    const client = await pool.connect();
    try {
        console.log('Connected to DB');

        const habitacionesDir = path.join(__dirname, '..', '..', 'Fronted', 'Public', 'img', 'habitaciones');

        const result = await client.query('SELECT id_foto, ruta_foto FROM habitaciones_fotos');
        
        for (const row of result.rows) {
            const oldName = row.ruta_foto;
            let newName;
            try {
                // Try to decode from latin1 to utf8
                newName = Buffer.from(oldName, 'latin1').toString('utf8');
            } catch (e) {
                newName = oldName;
            }

            if (newName !== oldName) {
                const oldPath = path.join(habitacionesDir, oldName);
                const newPath = path.join(habitacionesDir, newName);

                if (fs.existsSync(oldPath)) {
                    fs.renameSync(oldPath, newPath);
                    console.log(`Renamed ${oldName} to ${newName}`);
                } else {
                    console.log(`File ${oldName} does not exist`);
                }

                // Update DB
                await client.query('UPDATE habitaciones_fotos SET ruta_foto = $1 WHERE id_foto = $2', [newName, row.id_foto]);
                console.log(`Updated DB for ${row.id_foto}`);
            }
        }

        console.log('Fix completed');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

fixFilenames();
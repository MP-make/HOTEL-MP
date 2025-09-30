const { Pool } = require("pg");
const path = require('path');
const fs = require('fs');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  schema: 'public'
});

const uploadDir = path.join(__dirname, '..', 'Fronted', 'Public', 'img', 'habitaciones');

async function fixFilenames() {
  try {
    const result = await pool.query("SELECT ruta_foto FROM habitaciones_fotos");
    for (const row of result.rows) {
      const oldName = row.ruta_foto;
      const encodedName = oldName.split('-').map((part, index) => index === 0 ? part : encodeURIComponent(part)).join('-');
      if (encodedName !== oldName) {
        const oldPath = path.join(uploadDir, oldName);
        const newPath = path.join(uploadDir, encodedName);
        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
          await pool.query("UPDATE habitaciones_fotos SET ruta_foto = $1 WHERE ruta_foto = $2", [encodedName, oldName]);
          console.log(`Renamed ${oldName} to ${encodedName}`);
        } else {
          console.log(`File ${oldName} not found`);
        }
      }
    }
    console.log('Fix completed');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

fixFilenames();
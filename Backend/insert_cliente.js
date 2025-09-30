// Script to insert a test cliente user
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function insertCliente() {
  try {
    const hashedPassword = await bcrypt.hash('cliente123', 10);
    const roleResult = await pool.query('SELECT id_rol FROM roles WHERE nombre = $1', ['cliente']);
    if (roleResult.rows.length === 0) {
      console.log('Rol cliente no encontrado');
      return;
    }
    const id_rol = roleResult.rows[0].id_rol;
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING id_usuario',
      ['Cliente User', 'cliente@casa-del-inka.com', hashedPassword, id_rol]
    );
    if (result.rows.length > 0) {
      console.log('Cliente insertado con ID:', result.rows[0].id_usuario);
    } else {
      console.log('Cliente ya existe');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

insertCliente();
// Script de inicialización de la base de datos
// Uso: node Backend/scripts/init_db.js (asegúrate de configurar .env con las credenciales DB y ADMIN_PASSWORD/ADMIN_EMAIL opcionalmente)
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('../db');

async function run() {
  try {
    // Crear tablas básicas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id_rol SERIAL PRIMARY KEY,
        nombre VARCHAR(50) UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario SERIAL PRIMARY KEY,
        nombre VARCHAR(200) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        rol INTEGER REFERENCES roles(id_rol)
      );

      CREATE TABLE IF NOT EXISTS categorias_habitaciones (
        id_categoria SERIAL PRIMARY KEY,
        nombre VARCHAR(200) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS habitaciones (
        id_habitacion SERIAL PRIMARY KEY,
        numero_habitacion VARCHAR(50),
        tipo VARCHAR(100),
        disponible BOOLEAN DEFAULT TRUE,
        id_categoria INTEGER REFERENCES categorias_habitaciones(id_categoria),
        precio_por_hora NUMERIC,
        precio_por_dia NUMERIC,
        piso VARCHAR(50),
        capacidad INTEGER
      );

      CREATE TABLE IF NOT EXISTS habitaciones_fotos (
        id SERIAL PRIMARY KEY,
        id_habitacion INTEGER REFERENCES habitaciones(id_habitacion),
        ruta_foto VARCHAR(500)
      );

      CREATE TABLE IF NOT EXISTS reservas (
        id_reserva SERIAL PRIMARY KEY,
        id_usuario INTEGER REFERENCES usuarios(id_usuario),
        id_habitacion INTEGER REFERENCES habitaciones(id_habitacion),
        fecha_creacion TIMESTAMP DEFAULT now(),
        fecha_checkin TIMESTAMP,
        fecha_checkout TIMESTAMP,
        estado_reserva VARCHAR(50) DEFAULT 'pendiente'
      );
    `);

    console.log('Tablas creadas o ya existentes.');

    // Ensure id_rol has a sequence/default (fix if table existed with id_rol NOT NULL but no DEFAULT)
    try {
      const seqCheck = await pool.query("SELECT column_default FROM information_schema.columns WHERE table_name='roles' AND column_name='id_rol'");
      const colDef = seqCheck.rows && seqCheck.rows[0] && seqCheck.rows[0].column_default;
      if (!colDef) {
        // create a sequence and set it as default for id_rol
        await pool.query("CREATE SEQUENCE IF NOT EXISTS roles_id_rol_seq;");
        await pool.query("ALTER TABLE roles ALTER COLUMN id_rol SET DEFAULT nextval('roles_id_rol_seq');");
        await pool.query("ALTER SEQUENCE roles_id_rol_seq OWNED BY roles.id_rol;");
        console.log('Ajustada columna id_rol para usar sequence roles_id_rol_seq');
      }
    } catch (e) {
      console.warn('No se pudo asegurar sequence para roles.id_rol, continuar de todas formas:', e.message || e);
    }

    // Ensure other primary id columns have sequences/defaults (usuarios.id, categorias_habitaciones.id_categoria, habitaciones.id_habitacion, habitaciones_fotos.id, reservas.id_reserva)
    try {
      const idTargets = [
        { table: 'usuarios', column: 'id_usuario', seq: 'usuarios_id_usuario_seq' },
        { table: 'categorias_habitaciones', column: 'id_categoria', seq: 'categorias_habitaciones_id_categoria_seq' },
        { table: 'habitaciones', column: 'id_habitacion', seq: 'habitaciones_id_habitacion_seq' },
        { table: 'habitaciones_fotos', column: 'id', seq: 'habitaciones_fotos_id_seq' },
        { table: 'reservas', column: 'id_reserva', seq: 'reservas_id_reserva_seq' }
      ];
      for (const t of idTargets) {
        try {
          const q = await pool.query(`SELECT column_default FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`, [t.table, t.column]);
          const def = q.rows && q.rows[0] && q.rows[0].column_default;
          if (!def) {
            await pool.query(`CREATE SEQUENCE IF NOT EXISTS ${t.seq};`);
            await pool.query(`ALTER TABLE ${t.table} ALTER COLUMN ${t.column} SET DEFAULT nextval('${t.seq}');`);
            await pool.query(`ALTER SEQUENCE ${t.seq} OWNED BY ${t.table}.${t.column};`);
            console.log(`Ajustada columna ${t.table}.${t.column} para usar sequence ${t.seq}`);
          }
        } catch (ee) {
          console.warn(`No se pudo asegurar sequence para ${t.table}.${t.column}:`, ee.message || ee);
        }
      }
    } catch (e) {
      console.warn('Error asegurando secuencias para ids:', e.message || e);
    }

    // Insertar roles si no existen
    await pool.query(`INSERT INTO roles (nombre) VALUES
      ('admin'), ('encargado'), ('cliente')
      ON CONFLICT (nombre) DO NOTHING;
    `);
    console.log('Roles inicializados.');

    // Crear admin si no existe
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    const adminName = process.env.ADMIN_NAME || 'Administrador';

    const { rows: existingAdmin } = await pool.query('SELECT id_usuario FROM usuarios WHERE email = $1', [adminEmail]);
    if (existingAdmin.length === 0) {
      // obtener id_rol admin
      const r = await pool.query("SELECT id_rol FROM roles WHERE nombre = 'admin' LIMIT 1");
      const adminRoleId = r.rows[0] ? r.rows[0].id_rol : null;
      const hash = await bcrypt.hash(adminPassword, 10);
      await pool.query('INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4)', [adminName, adminEmail, hash, adminRoleId]);
      console.log(`Usuario admin creado: ${adminEmail} (usa ADMIN_PASSWORD en .env para cambiar la contraseña)`);
    } else {
      console.log('Usuario admin ya existe, se omite la creación.');
    }

    // Insertar categoría y habitación de ejemplo si no existen
    let categoriaId;
    try {
      const ins = await pool.query("INSERT INTO categorias_habitaciones (nombre) VALUES ($1) ON CONFLICT (nombre) DO NOTHING RETURNING id_categoria", ['Estándar']);
      if (ins.rows && ins.rows[0] && ins.rows[0].id_categoria) {
        categoriaId = ins.rows[0].id_categoria;
        console.log('Categoría de ejemplo creada.');
      } else {
        const sel = await pool.query("SELECT id_categoria FROM categorias_habitaciones WHERE nombre = $1", ['Estándar']);
        if (sel.rows && sel.rows[0]) {
          categoriaId = sel.rows[0].id_categoria;
          console.log('Categoría de ejemplo ya existente.');
        } else {
          throw new Error('No se pudo obtener/crear categoría de ejemplo');
        }
      }
    } catch (e) {
      console.warn('Advertencia al crear/obtener categoría de ejemplo:', e.message || e);
      // intentar seleccionar de nuevo
      const sel2 = await pool.query("SELECT id_categoria FROM categorias_habitaciones WHERE nombre = $1", ['Estándar']);
      if (sel2.rows && sel2.rows[0]) {
        categoriaId = sel2.rows[0].id_categoria;
      } else {
        categoriaId = null;
      }
    }

    if (categoriaId) {
      const { rows: habRows } = await pool.query("SELECT id_habitacion FROM habitaciones WHERE numero_habitacion = $1", ['101']);
      if (habRows.length === 0) {
        try {
          await pool.query(
            `INSERT INTO habitaciones (numero_habitacion, tipo, disponible, id_categoria, precio_por_dia, piso, capacidad)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            ['101', 'Individual', true, categoriaId, 120.00, '1', 1]
          );
          console.log('Habitación de ejemplo creada.');
        } catch (e) {
          // si falla por conflicto de PK/unique, ignorar
          console.warn('No se pudo crear la habitación de ejemplo (posible conflicto):', e.message || e);
        }
      } else {
        console.log('Habitación de ejemplo ya existente.');
      }
    } else {
      console.warn('No se dispone de categoriaId; se omite creación de habitación de ejemplo.');
    }

    // Crear carpeta de carrusel en Fronted si no existe
    const carouselDir = path.join(__dirname, '..', '..', 'Fronted', 'Public', 'img', 'carousel');
    if (!fs.existsSync(carouselDir)) {
      fs.mkdirSync(carouselDir, { recursive: true });
      console.log('Directorio de carrusel creado en Fronted/Public/img/carousel');
    } else {
      console.log('Directorio de carrusel ya existe.');
    }

    console.log('Inicialización completada.');
  } catch (err) {
    console.error('Error durante la inicialización:', err);
    process.exitCode = 1;
  } finally {
    // cerrar pool
    try { await pool.end(); } catch (e) { /* ignore */ }
  }
}

run();

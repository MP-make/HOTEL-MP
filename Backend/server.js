// server.js (completo, mejorado)
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// SSE clients
const sseClients = new Set();

function sendSseEvent(eventName, payload) {
  const dataStr = JSON.stringify({ event: eventName, payload });
  for (const res of sseClients) {
    try {
      res.write(`data: ${dataStr}\n\n`);
    } catch (err) {
      console.error('Error enviando SSE a cliente:', err.message);
    }
  }
}

// Middleware para autenticar token JWT si está presente
function authenticateTokenOptional(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return next();
  const token = authHeader.split(' ')[1];
  if (!token) return next();
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return next();
    req.user = user; // { id, nombre, rol }
    next();
  });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.query.token;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
}

// Middleware para roles: requiere admin
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Token requerido' });
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso restringido a administradores' });
  next();
}

// Util: validar email simple y campos
function isValidEmail(email) {
  return typeof email === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function sanitizeBoolean(val) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return ['1','true','yes','y'].includes(val.toLowerCase());
  return false;
}

// Agregamos manejadores de errores globales para depuración
process.on('uncaughtException', (err) => {
console.error('Error no detectado (Uncaught Exception):', err);
//process.exit(1);<----------- no olvidar sacarlo 
});

process.on('unhandledRejection', (reason, promise) => {
console.error('Rechazo de promesa no manejado (Unhandled Rejection) en:', promise, 'razón:', reason);
});

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
user: process.env.DB_USER,
host: process.env.DB_HOST,
database: process.env.DB_DATABASE,
password: process.env.DB_PASSWORD,
port: process.env.DB_PORT,
});

// Helper: small sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: ejecutar consultas con reintentos para cubrir errores transitorios de red/DNS
async function queryWithRetry(queryText, params = [], retries = 4, delayMs = 500) {
  let attempt = 0;
  while (true) {
    try {
      attempt++;
      return await pool.query(queryText, params);
    } catch (err) {
      const transient = err && (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN' || err.code === 'ECONNREFUSED' || err.code === 'ENETUNREACH' || (err.message && err.message.includes('getaddrinfo')));
      if (!transient || attempt > retries) {
        // No es transitorio o se agotaron reintentos
        throw err;
      }
      const wait = delayMs * Math.pow(2, attempt - 1);
      console.warn(`Query attempt ${attempt} failed with transient error (${err.code || err.message}). Retrying in ${wait}ms...`);
      await sleep(wait);
    }
  }
}

// Reemplazar la verificación inicial de la BD por una versión con reintentos
queryWithRetry('SELECT NOW()', [], 6, 500)
  .then(() => {
    console.log('Conexión a la base de datos verificada correctamente.');
    // Iniciar el servidor SOLO si la BD está lista
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error CRÍTICO al conectar a la base de datos (después de reintentos):', err.message);
    process.exit(1); // Salir si no se puede conectar a la BD
  });

// Define la ruta absoluta para guardar las fotos
// La carpeta de destino será 'Fronted/Public/img/habitaciones' para coincidir con las rutas guardadas en DB
const uploadDir = path.join(__dirname, '..', 'Fronted', 'Public', 'img', 'habitaciones');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento de imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      console.log("Directorio de destino para multer:", uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    }
  });


const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());

// Sirve archivos estáticos del front-end desde la carpeta 'Frontend/Public/Principal'
const staticPath = path.join(__dirname, '..', 'Fronted', 'Public', 'Principal');
console.log('Sirviendo archivos estáticos desde:', staticPath);
app.use(express.static(staticPath));

// Servir imágenes públicas (ruta /img/...)
const imgStatic = path.join(__dirname, '..', 'Fronted', 'Public', 'img');
app.use('/img', express.static(imgStatic));

// Evitar 404 en /favicon.ico: servir favicon si existe o una imagen por defecto
app.get('/favicon.ico', (req, res) => {
  try {
    const faviconPath = path.join(imgStatic, 'favicon.ico');
    if (fs.existsSync(faviconPath)) return res.sendFile(faviconPath);
    const fallback = path.join(imgStatic, 'logo_pequeño.png');
    if (fs.existsSync(fallback)) return res.sendFile(fallback);
    return res.status(204).end();
  } catch (err) {
    console.error('Error sirviendo favicon:', err);
    return res.status(500).end();
  }
});

/**
 * RUTAS DE AUTENTICACIÓN (mantenidas tal y como las tenías)
 */

// Helper: ensure roles existen (cliente, encargado, admin)
async function ensureDefaultRoles() {
  try {
    const needed = ['cliente','encargado','admin'];
    const res = await queryWithRetry(`SELECT nombre FROM public.roles WHERE nombre = ANY($1)`, [needed]);
    const existing = res.rows.map(r => r.nombre);
    const toInsert = needed.filter(n => !existing.includes(n));
    for (const nombre of toInsert) {
      await queryWithRetry(`INSERT INTO public.roles (nombre) VALUES ($1)`, [nombre]);
      console.log('Rol creado por defecto:', nombre);
    }
  } catch (err) {
    console.error('Error al asegurar roles por defecto:', err.message);
  }
}

// Ejecutar aseguramiento de roles al arrancar (no bloquear inicio)
ensureDefaultRoles();

/**
 * @route POST /api/login
 * @desc Iniciar sesión del usuario
 */
app.post("/api/login", async (req, res) => {
const { email, password } = req.body;
try {
    const result = await pool.query(
    "SELECT u.id, u.nombre, u.email, u.password, r.nombre AS rol FROM public.usuarios u JOIN public.roles r ON u.rol = r.id_rol WHERE u.email = $1",
    [email]
    );

    if (result.rows.length === 0) {
    return res.status(401).json({ error: "Credenciales inválidas." });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
    return res.status(401).json({ error: "Credenciales inválidas." });
    }

    delete user.password;

    // Generar token JWT
    const token = jwt.sign({ id: user.id, nombre: user.nombre, rol: user.rol }, JWT_SECRET, { expiresIn: '8h' });

    let redirectUrl;
    if (user.rol === 'cliente') {
    redirectUrl = '/index.html';
    } else if (user.rol === 'encargado') {
    redirectUrl = '/PanelEncargado.html';
    } else if (user.rol === 'admin') {
    redirectUrl = '/PanelAdmin.html';
    } else {
    return res.status(403).json({ error: "Rol de usuario desconocido." });
    }

    res.json({ user, redirectUrl, token });

} catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ error: "Error al iniciar sesión." });
}
});



/**
 * @route POST /api/register
 * @desc Registrar un nuevo usuario con rol de 'cliente' por defecto
 */
app.post("/api/register", async (req, res) => {
const { nombre, email, password } = req.body;
try {
    // asegurar rol 'cliente' exista
    const roleRes = await pool.query("SELECT id_rol FROM public.roles WHERE nombre = 'cliente'");
    if (roleRes.rows.length === 0) {
      return res.status(500).json({ error: "Rol 'cliente' no está configurado en la base de datos. Contacta al administrador." });
    }
    const clienteRolId = roleRes.rows[0].id_rol;

    const existingUser = await pool.query("SELECT * FROM public.usuarios WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
    return res.status(409).json({ error: "El correo electrónico ya está en uso." });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const queryText = `
    INSERT INTO public.usuarios(nombre, email, password, rol)
    VALUES($1, $2, $3, $4)
    RETURNING *;
    `;
    const result = await pool.query(queryText, [nombre, email, passwordHash, clienteRolId]);
    const newUser = result.rows[0];
    delete newUser.password;
    res.status(201).json({ user: newUser, message: 'Usuario registrado con éxito.' });
} catch (err) {
    console.error("Error en registro (mejorado):", err);
    res.status(500).json({ error: "Error al registrar el usuario. Inténtalo de nuevo.", detalle: err.message });
}
});

/**
 * =========================
 * RUTAS AUXILIARES (categorías)
 * =========================
 */
app.get("/api/admin/categorias", authenticateToken, requireAdmin, async (req, res) => {
try {
    const result = await queryWithRetry("SELECT * FROM public.categorias_habitaciones ORDER BY id_categoria");
    res.json(result.rows);
} catch (err) {
    console.error("Error al obtener categorías:", err);
    res.status(500).json({ error: "Error al obtener categorías" });
}
});

/**
 * =========================
 * RUTAS CLIENTE
 * =========================
 */

/**
 * @route GET /api/cliente/habitaciones
 * @desc Ver habitaciones disponibles para los clientes (pública)
 */
app.get("/api/cliente/habitaciones", async (req, res) => {
  try {
      const { page = 1, pageSize = 20, q } = req.query;
      const offset = (parseInt(page,10) - 1) * parseInt(pageSize,10);
      const params = [];
      let where = '';
      if (q) {
        params.push('%' + q + '%');
        where = `WHERE (h.numero_habitacion::text ILIKE $${params.length} OR c.nombre ILIKE $${params.length})`;
      }

      const dataQ = `
        SELECT
            h.id_habitacion,
            h.numero_habitacion,
            h.tipo,
            h.piso,
            h.capacidad,
            h.precio_por_dia,
            h.precio_por_hora,
            c.nombre AS categoria,
            COALESCE(ARRAY_AGG(f.ruta_foto) FILTER (WHERE f.ruta_foto IS NOT NULL), '{}') AS fotos
        FROM public.habitaciones h
        INNER JOIN public.categorias_habitaciones c ON h.id_categoria = c.id_categoria
        LEFT JOIN public.habitaciones_fotos f ON h.id_habitacion = f.id_habitacion
        ${where} AND h.disponible = true
        GROUP BY h.id_habitacion, c.nombre
        ORDER BY h.numero_habitacion ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2};
      `;
      params.push(parseInt(pageSize,10));
      params.push(offset);

      const result = await queryWithRetry(dataQ, params);
      if (!result.rows || result.rows.length === 0) return res.status(200).json({ message: "No hay habitaciones disponibles", habitaciones: [] });
      res.json({ habitaciones: result.rows });
  } catch (err) {
      console.error("Error al obtener habitaciones disponibles para el cliente:", err);
      res.status(500).json({ error: "Error al obtener habitaciones disponibles", code: 500 });
  }
});

/**
 * @route POST /api/cliente/reservas
 * @desc Crear una reserva
 */
app.post("/api/cliente/reservas", authenticateTokenOptional, async (req, res) => {
const { id_usuario: bodyUserId, id_habitacion, fecha_checkin, fecha_checkout } = req.body;
try {
    console.log('[POST /api/cliente/reservas] payload:', { bodyUserId, id_habitacion, fecha_checkin, fecha_checkout, authUser: req.user && { id: req.user.id, rol: req.user.rol } });

    // If token present, use req.user.id as user id
    const id_usuario = req.user ? req.user.id : bodyUserId;

    // Validaciones básicas
    if (!id_usuario) return res.status(400).json({ error: 'id_usuario es obligatorio (o envía un token válido).' });
    if (!id_habitacion) return res.status(400).json({ error: 'id_habitacion es obligatorio.' });
    if (!fecha_checkin || !fecha_checkout) return res.status(400).json({ error: 'fecha_checkin y fecha_checkout son obligatorias.' });

    const parsedHabId = parseInt(id_habitacion, 10);
    if (Number.isNaN(parsedHabId)) return res.status(400).json({ error: 'id_habitacion debe ser un número entero válido.' });

    const checkIn = new Date(fecha_checkin);
    const checkOut = new Date(fecha_checkout);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return res.status(400).json({ error: 'Fechas inválidas. Usa un formato ISO/compatible con datetime-local.' });
    }
    if (checkOut <= checkIn) {
      return res.status(400).json({ error: 'La fecha de check-out debe ser posterior al check-in.' });
    }

    // Verificar existencia del usuario
    const userQ = await queryWithRetry('SELECT id FROM public.usuarios WHERE id = $1', [id_usuario]);
    if (userQ.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });

    // Verificar existencia de la habitación
    const habRes = await queryWithRetry('SELECT disponible FROM public.habitaciones WHERE id_habitacion = $1', [parsedHabId]);
    if (habRes.rows.length === 0) return res.status(404).json({ error: 'Habitación no encontrada.' });

    // Comprobar solapamiento con reservas existentes (solo considerar reservas que no estén completadas)
    const conflictQ = `
      SELECT 1 FROM public.reservas r
      WHERE r.id_habitacion = $1
        AND r.estado_reserva <> 'completada'
        AND NOT (r.fecha_checkout <= $2 OR r.fecha_checkin >= $3)
      LIMIT 1
    `;
    const conflictRes = await queryWithRetry(conflictQ, [parsedHabId, checkIn.toISOString(), checkOut.toISOString()]);
    if (conflictRes.rows.length > 0) {
      return res.status(409).json({ error: 'La habitación no está disponible en las fechas seleccionadas.' });
    }

    // Insertar reserva
    const result = await queryWithRetry(
    "INSERT INTO public.reservas (id_usuario, id_habitacion, fecha_checkin, fecha_checkout, estado_reserva, fecha_creacion) VALUES ($1, $2, $3, $4, 'pendiente', NOW()) RETURNING *",
    [id_usuario, parsedHabId, checkIn.toISOString(), checkOut.toISOString()]
    );

    // Marcar la habitación como no disponible (regla de negocio: al crear reserva la habitación queda ocupada)
    await queryWithRetry('UPDATE public.habitaciones SET disponible = false WHERE id_habitacion = $1', [parsedHabId]);

    const nuevaReserva = result.rows[0];

    // Notificar via SSE a encargados conectados
    try { sendSseEvent('nueva_reserva', { reserva: nuevaReserva }); } catch (sseErr) { console.error('Error enviando SSE tras crear reserva:', sseErr); }

    res.status(201).json(nuevaReserva);
} catch (err) {
    console.error("Error al crear reserva (mejorado, catch):", err);
    // Responder con detalle para facilitar debugging (no recomendado en producción sin control)
    res.status(500).json({ error: "Error al crear reserva", detalle: err && err.message ? err.message : String(err) });
}
});

/**
 * =========================
 * RUTAS DEL ADMIN - HABITACIONES (CRUD con campos extendidos)
 * =========================
 */

/**
 * @route GET /api/admin/habitaciones
 * @desc Obtener todas las habitaciones con sus categorías (incluye campos extendidos)
 */
app.get("/api/admin/habitaciones", authenticateToken, requireAdmin, async (req, res) => {
try {
    const { page = 1, pageSize = 20, q, categoria, piso, capacidad, disponible } = req.query;
    const offset = (parseInt(page,10) -1) * parseInt(pageSize,10);

    const where = [];
    const params = [];
    let idx = 1;

    if (q) {
      where.push(`(h.numero_habitacion::text ILIKE $${idx} OR c.nombre ILIKE $${idx} OR h.tipo ILIKE $${idx} OR h.id_habitacion::text ILIKE $${idx})`);
      params.push('%' + q + '%');
      idx++;
    }
    if (categoria) {
      where.push(`c.nombre ILIKE $${idx}`);
      params.push('%' + categoria + '%');
      idx++;
    }
    if (piso) {
      where.push(`h.piso = $${idx}`);
      params.push(parseInt(piso, 10));
      idx++;
    }
    if (capacidad) {
      where.push(`h.capacidad = $${idx}`);
      params.push(parseInt(capacidad, 10));
      idx++;
    }
    if (disponible === 'true' || disponible === 'false') {
      where.push(`h.disponible = $${idx}`);
      params.push(disponible === 'true');
      idx++;
    }

    const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

    // total
    const totalParams = [...params];
    const totalRes = await queryWithRetry(`SELECT COUNT(*)::int AS total FROM public.habitaciones h LEFT JOIN public.categorias_habitaciones c ON h.id_categoria = c.id_categoria ${whereSQL}`, totalParams);
    const total = totalRes.rows[0].total || 0;

    // data
    const dataParams = [...params, parseInt(pageSize,10), offset];
    const dataQ = `
      SELECT
        h.id_habitacion, h.numero_habitacion, h.tipo, h.precio_por_dia, h.precio_por_hora, h.piso, h.capacidad, h.disponible, c.nombre AS categoria, h.id_categoria
      FROM public.habitaciones h
      LEFT JOIN public.categorias_habitaciones c ON h.id_categoria = c.id_categoria
      ${whereSQL}
      ORDER BY h.id_habitacion ASC
      LIMIT $${idx} OFFSET $${idx+1};
    `;

    const result = await queryWithRetry(dataQ, dataParams);
    // Return direct array for compatibility with frontend that expects an array
    res.json(result.rows);
} catch (err) {
    console.error("Error al obtener habitaciones:", err);
    res.status(500).json({ error: "Error al obtener habitaciones" });
}
});

/**
 * @route POST /api/admin/habitaciones
 * @desc Crear una nueva habitación
 */
app.post('/api/admin/habitaciones', authenticateToken, requireAdmin, upload.array("fotos", 10), async (req, res) => {
  try {
    console.log("👉 Datos recibidos en req.body:", req.body);
    console.log("👉 Archivos recibidos en req.files:", req.files);

    const {
      numero_habitacion,
      tipo,
      piso,
      capacidad,
      disponible = 'true',
      id_categoria,
      precio_por_hora,
      precio_por_dia
    } = req.body;

    if (!numero_habitacion || !tipo || !id_categoria) {
      return res.status(400).json({ error: "Faltan datos obligatorios: numero_habitacion, tipo o id_categoria" });
    }

    // insertar habitación
    const result = await queryWithRetry(
      `INSERT INTO public.habitaciones
      (numero_habitacion, tipo, disponible, id_categoria, precio_por_hora, precio_por_dia, piso, capacidad)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id_habitacion`,
      [numero_habitacion, tipo, sanitizeBoolean(disponible), id_categoria, precio_por_hora || null, precio_por_dia || null, piso || null, capacidad || null]
    );

    const habitacionId = result.rows[0].id_habitacion;

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fotoPath = '/img/habitaciones/' + file.filename; // siempre con slash inicial
        await queryWithRetry(
          `INSERT INTO public.habitaciones_fotos (id_habitacion, ruta_foto) VALUES ($1, $2)`,
          [habitacionId, fotoPath]
        );
      }
    }

    res.status(201).json({ message: "Habitación creada con éxito", id: habitacionId });

  } catch (err) {
    console.error("❌ Error al crear habitación:", err);
    res.status(500).json({ error: "Error interno del servidor", detalle: err.message });
  }
});

/**
 * @route PUT /api/admin/habitaciones/:id
 * @desc Actualizar una habitación
 */
app.put("/api/admin/habitaciones/:id", authenticateToken, requireAdmin, upload.array("fotos", 10), async (req, res) => {
const { id } = req.params;
const {
    numero_habitacion,
    id_categoria,
    tipo,
    precio_por_hora,
    precio_por_dia,
    piso,
    capacidad,
    disponible
} = req.body;

try {
  // verificar existencia
  const exist = await queryWithRetry('SELECT id_habitacion FROM public.habitaciones WHERE id_habitacion = $1', [id]);
  if (exist.rows.length === 0) return res.status(404).json({ error: 'Habitación no encontrada' });

  await queryWithRetry(
    `UPDATE public.habitaciones SET
      numero_habitacion=$1,
      id_categoria=$2,
      tipo=$3,
      precio_por_hora=$4,
      precio_por_dia=$5,
      piso=$6,
      capacidad=$7,
      disponible=$8
    WHERE id_habitacion=$9`,
    [numero_habitacion, id_categoria, tipo, precio_por_hora || null, precio_por_dia || null, piso || null, capacidad || null, sanitizeBoolean(disponible), id]
  );

  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const fotoPath = '/img/habitaciones/' + file.filename;
      await queryWithRetry(
        `INSERT INTO public.habitaciones_fotos (id_habitacion, ruta_foto) VALUES ($1, $2)`,
        [id, fotoPath]
      );
    }
  }

  res.json({ message: "Habitación actualizada con éxito" });

} catch (err) {
  console.error("Error al actualizar habitación:", err);
  res.status(500).json({ error: "Error al actualizar habitación", detalle: err.message });
}});

/**
 * @route DELETE /api/admin/habitaciones/:id
 * @desc Eliminar una habitación
 */
app.delete("/api/admin/habitaciones/:id", authenticateToken, requireAdmin, async (req, res) => {
const { id } = req.params;
try {
    await queryWithRetry("DELETE FROM public.habitaciones WHERE id_habitacion=$1", [id]);
    res.status(204).send();
} catch (err) {
    console.error("Error al eliminar habitación:", err);
    res.status(500).json({ error: "Error al eliminar habitación" });
}
});

/**
 * =========================
 * RUTAS DEL ADMIN - ENCARGADOS
 * =========================
 */

/**
 * @route GET /api/admin/encargados
 * @desc Obtener todos los encargados y administradores
 */
app.get("/api/admin/encargados", authenticateToken, requireAdmin, async (req, res) => {
try {
    const { page = 1, pageSize = 50, q } = req.query;
    const offset = (parseInt(page,10)-1)*parseInt(pageSize,10);
    const params = [];
    let where = '';
    if (q) {
      params.push('%' + q + '%');
      where = `WHERE u.nombre ILIKE $1 OR u.email ILIKE $1`;
    }
    const totalQ = `SELECT COUNT(*)::int AS total FROM public.usuarios u JOIN public.roles r ON u.rol = r.id_rol ${where} AND r.nombre IN ('encargado','admin')`;
    // if where is '', SQL will be malformed with AND; build carefully
    let totalRes;
    if (where) totalRes = await queryWithRetry(totalQ, params);
    else totalRes = await queryWithRetry("SELECT COUNT(*)::int AS total FROM public.usuarios u JOIN public.roles r ON u.rol = r.id_rol WHERE r.nombre IN ('encargado','admin')");
    const total = totalRes.rows[0].total || 0;

    // build data query
    let dataQ;
    let dataParams = [];
    if (where) {
      dataQ = `SELECT u.id, u.nombre, u.email, r.nombre AS rol FROM public.usuarios u JOIN public.roles r ON u.rol = r.id_rol ${where} AND r.nombre IN ('encargado','admin') ORDER BY u.nombre LIMIT $2 OFFSET $3`;
      dataParams = [params[0], parseInt(pageSize,10), offset];
    } else {
      dataQ = `SELECT u.id, u.nombre, u.email, r.nombre AS rol FROM public.usuarios u JOIN public.roles r ON u.rol = r.id_rol WHERE r.nombre IN ('encargado','admin') ORDER BY u.nombre LIMIT $1 OFFSET $2`;
      dataParams = [parseInt(pageSize,10), offset];
    }

    const result = await queryWithRetry(dataQ, dataParams);
    // Return direct array so frontend can map over the response
    res.json(result.rows);
} catch (err) {
    console.error("Error al obtener encargados:", err);
    res.status(500).json({ error: "Error al obtener encargados" });
}
});

/**
 * @route POST /api/admin/encargados
 * @desc Crear un nuevo encargado (crea usuario en usuarios con rol 'encargado')
 */
app.post("/api/admin/encargados", authenticateToken, requireAdmin, async (req, res) => {
const { nombre, email, password } = req.body;
try {
    if (!nombre || !email || !password) return res.status(400).json({ error: 'nombre, email y password son obligatorios' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Email inválido' });
    if (String(password).length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

    // revisar duplicado
    const exists = await queryWithRetry('SELECT id FROM public.usuarios WHERE email = $1', [email]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'El email ya está registrado' });

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const query = `INSERT INTO public.usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, (SELECT id_rol FROM public.roles WHERE nombre = 'encargado')) RETURNING id, nombre, email`;
    const result = await queryWithRetry(query, [nombre, email, passwordHash]);
    const newEncargado = result.rows[0];
    res.status(201).json({ user: newEncargado });
} catch (err) {
    console.error("Error al crear encargado:", err);
    res.status(500).json({ error: "Error al crear encargado", detalle: err.message });
}
});

/**
 * @route POST /api/admin/assign-encargado
 * @desc Buscar usuario por email y asignarle rol 'encargado' (si existe)
 *       Body: { email: "usuario@domain" }
 */
app.post("/api/admin/assign-encargado", authenticateToken, requireAdmin, async (req, res) => {
  const { email } = req.body;
  try {
      // 1. Buscar al usuario y verificar su rol actual
      const userRes = await queryWithRetry(
          "SELECT u.id, u.nombre, r.nombre as rol FROM public.usuarios u JOIN public.roles r ON u.rol = r.id_rol WHERE u.email = $1",
          [email]
      );

      if (userRes.rows.length === 0) {
          return res.status(404).json({ error: "Usuario no encontrado." });
      }
      const user = userRes.rows[0];

      if (user.rol !== 'cliente') {
          return res.status(400).json({ error: `El usuario ya tiene el rol '${user.rol}'. Solo se puede asignar a clientes.` });
      }

      // 2. Actualizar el rol del usuario a 'encargado'
      await queryWithRetry(
          `UPDATE public.usuarios
          SET rol = (SELECT id_rol FROM public.roles WHERE nombre = 'encargado')
          WHERE id = $1`,
          [user.id]
      );

      // 3. Devolver los datos actualizados del usuario
      const updatedUserRes = await queryWithRetry(
          `SELECT u.id, u.nombre, u.email, r.nombre as rol
          FROM public.usuarios u JOIN public.roles r ON u.rol = r.id_rol WHERE u.id = $1`,
          [user.id]
      );

      res.json({ user: updatedUserRes.rows[0], message: "Usuario asignado como encargado con éxito." });
  } catch (err) {
      console.error("Error al asignar encargado:", err);
      res.status(500).json({ error: "Error al asignar encargado." });
  }
});

// Actualizar encargado (nombre, email y opcionalmente password)
app.put("/api/admin/encargados/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre, email, password } = req.body;
  try {
    const exist = await queryWithRetry("SELECT id, email FROM public.usuarios WHERE id = $1", [id]);
    if (exist.rows.length === 0) return res.status(404).json({ error: 'Encargado no encontrado' });

    if (email && !isValidEmail(email)) return res.status(400).json({ error: 'Email inválido' });
    // si email se modifica, verificar duplicado
    if (email && email !== exist.rows[0].email) {
      const dup = await queryWithRetry('SELECT id FROM public.usuarios WHERE email = $1', [email]);
      if (dup.rows.length > 0) return res.status(409).json({ error: 'El email ya está en uso' });
    }

    if (password) {
      if (String(password).length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      await queryWithRetry(`UPDATE public.usuarios SET nombre = $1, email = $2, password = $3 WHERE id = $4`, [nombre, email, passwordHash, id]);
    } else {
      await queryWithRetry(`UPDATE public.usuarios SET nombre = $1, email = $2 WHERE id = $3`, [nombre, email, id]);
    }

    const updated = await queryWithRetry(`SELECT u.id, u.nombre, u.email, r.nombre AS rol FROM public.usuarios u JOIN public.roles r ON u.rol = r.id_rol WHERE u.id = $1`, [id]);
    res.json({ user: updated.rows[0] });
  } catch (err) {
    console.error('Error al actualizar encargado:', err);
    res.status(500).json({ error: 'Error al actualizar encargado', detalle: err.message });
  }
});

// Eliminar encargado
app.delete("/api/admin/encargados/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await queryWithRetry("DELETE FROM public.usuarios WHERE id = $1", [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Error al eliminar encargado:', err);
    res.status(500).json({ error: 'Error al eliminar encargado' });
  }
});

/**
 * =========================
 * RUTAS DE RESERVAS (ADMIN / ENCARGADO)
 * =========================
 */

/**
 * @route GET /api/admin/reservas
 * @desc Obtener todas las reservas (admin)
 */
app.get("/api/admin/reservas", authenticateToken, requireAdmin, async (req, res) => {
try {
    const { page = 1, pageSize = 20, q } = req.query;
    const offset = (parseInt(page,10)-1)*parseInt(pageSize,10);
    const params = [];
    let where = '';
    if (q) {
      params.push('%' + q + '%');
      where = `WHERE u.nombre ILIKE $1 OR u.email ILIKE $1 OR h.numero_habitacion::text ILIKE $1`;
    }
    const totalQ = where ? `SELECT COUNT(*)::int AS total FROM public.reservas r JOIN public.usuarios u ON r.id_usuario = u.id JOIN public.habitaciones h ON r.id_habitacion = h.id_habitacion ${where}` : `SELECT COUNT(*)::int AS total FROM public.reservas r JOIN public.usuarios u ON r.id_usuario = u.id JOIN public.habitaciones h ON r.id_habitacion = h.id_habitacion`;
    const totalRes = await queryWithRetry(totalQ, params);
    const total = totalRes.rows[0].total || 0;

    if (where) params.push(parseInt(pageSize,10), offset);
    else params.push(parseInt(pageSize,10), offset);

    const dataQ = where ? `
    SELECT
        r.id_reserva, r.fecha_creacion, r.estado_reserva, r.fecha_checkin, r.fecha_checkout,
        u.nombre AS cliente_nombre, u.email AS cliente_email,
        h.id_habitacion, h.numero_habitacion
    FROM public.reservas r
    JOIN public.usuarios u ON r.id_usuario = u.id
    JOIN public.habitaciones h ON r.id_habitacion = h.id_habitacion
    ${where}
    ORDER BY r.fecha_creacion DESC
    LIMIT $${params.length-1} OFFSET $${params.length};
    ` : `
    SELECT
        r.id_reserva, r.fecha_creacion, r.estado_reserva, r.fecha_checkin, r.fecha_checkout,
        u.nombre AS cliente_nombre, u.email AS cliente_email,
        h.id_habitacion, h.numero_habitacion
    FROM public.reservas r
    JOIN public.usuarios u ON r.id_usuario = u.id
    JOIN public.habitaciones h ON r.id_habitacion = h.id_habitacion
    ORDER BY r.fecha_creacion DESC
    LIMIT $1 OFFSET $2;
    `;

    const result = await queryWithRetry(dataQ, params);
    // Return direct array so frontend can map over the response
    res.json(result.rows);
} catch (err) {
    console.error("Error al obtener reservas (admin):", err);
    res.status(500).json({ error: "Error al obtener reservas" });
}
});

/**
 * @route DELETE /api/admin/reservas/:id
 * @desc Eliminar una reserva (admin)
 */
app.delete("/api/admin/reservas/:id", authenticateToken, requireAdmin, async (req, res) => {
const { id } = req.params;
try {
    await queryWithRetry("DELETE FROM public.reservas WHERE id_reserva = $1", [id]);
    res.status(204).send();
} catch (err) {
    console.error("Error al eliminar reserva:", err);
    res.status(500).json({ error: "Error al eliminar reserva" });
}
});

/**
 * @route PUT /api/admin/reservas/:id/completar
 * @desc Marcar reserva como completada (admin)
 */
app.put("/api/admin/reservas/:id/completar", authenticateToken, requireAdmin, async (req, res) => {
const { id } = req.params;
try {
    const r = await queryWithRetry('SELECT id_habitacion FROM public.reservas WHERE id_reserva = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Reserva no encontrada' });
    const id_habitacion = r.rows[0].id_habitacion;

    const result = await queryWithRetry("UPDATE public.reservas SET estado_reserva = 'completada' WHERE id_reserva = $1 RETURNING *", [id]);

    await queryWithRetry('UPDATE public.habitaciones SET disponible = true WHERE id_habitacion = $1', [id_habitacion]);

    const updated = result.rows[0];
    sendSseEvent('reserva_completada', { reserva: updated, id_habitacion });
    res.json(updated);
} catch (err) {
    console.error("Error al completar reserva (admin):", err);
    res.status(500).json({ error: "Error al completar reserva" });
}
});

/**
 * =========================
 * RUTAS DEL ENCARGADO (ya tenías una)
 * =========================
 */

/**
 * @route GET /api/encargado/reservas
 * @desc Ver reservas con información detallada de usuario y habitación
 */
app.get('/api/encargado/reservas', authenticateToken, async (req, res) => {
  try {
    // Sólo encargados o admins
    if (!(req.user.rol === 'encargado' || req.user.rol === 'admin')) return res.status(403).json({ error: 'Acceso no autorizado' });

    const { page = 1, pageSize = 10, fecha_inicio, fecha_fin, id_habitacion, cliente } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);

    const whereClauses = [];
    const params = [];
    let idx = 1;

    if (fecha_inicio) {
      whereClauses.push(`r.fecha_checkin >= $${idx++}`);
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      whereClauses.push(`r.fecha_checkout <= $${idx++}`);
      params.push(fecha_fin);
    }
    if (id_habitacion) {
      whereClauses.push(`r.id_habitacion = $${idx++}`);
      params.push(id_habitacion);
    }
    if (cliente) {
      whereClauses.push(`u.nombre ILIKE $${idx++}`);
      params.push('%' + cliente + '%');
    }

    const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const totalQ = `SELECT COUNT(*)::int AS total FROM public.reservas r JOIN public.usuarios u ON r.id_usuario = u.id ${whereSQL}`;
    const totalRes = await queryWithRetry(totalQ, params);
    const total = totalRes.rows[0].total || 0;

    const dataQ = `
      SELECT
        r.id_reserva, r.fecha_creacion, r.estado_reserva, r.fecha_checkin, r.fecha_checkout,
        u.nombre AS cliente_nombre, u.email AS cliente_email, h.numero_habitacion
      FROM public.reservas r
      JOIN public.usuarios u ON r.id_usuario = u.id
      JOIN public.habitaciones h ON r.id_habitacion = h.id_habitacion
      ${whereSQL}
      ORDER BY r.fecha_creacion DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(parseInt(pageSize, 10));
    params.push(offset);

    const result = await queryWithRetry(dataQ, params);
    res.json({ total, page: parseInt(page,10), pageSize: parseInt(pageSize,10), reservas: result.rows });
  } catch (err) {
    console.error('Error GET /api/encargado/reservas paginado:', err);
    res.status(500).json({ error: 'Error al obtener reservas', detalle: err.message });
  }
});

/**
 * @route PUT /api/encargado/reservas/:id/completar
 * @desc Completar una reserva (protegida para encargados/admins)
 */
app.put("/api/encargado/reservas/:id/completar", authenticateToken, async (req, res) => {
const { id } = req.params;
try {
    // Sólo encargados o admins pueden completar reservas
    if (!(req.user && (req.user.rol === 'encargado' || req.user.rol === 'admin'))) {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    // Obtener la reserva para conocer la habitación
    const r = await queryWithRetry('SELECT id_habitacion FROM public.reservas WHERE id_reserva = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Reserva no encontrada' });
    const id_habitacion = r.rows[0].id_habitacion;

    const result = await queryWithRetry(
    "UPDATE public.reservas SET estado_reserva = 'completada' WHERE id_reserva = $1 RETURNING *",
    [id]
    );

    // Marcar la habitación como disponible nuevamente
    await queryWithRetry('UPDATE public.habitaciones SET disponible = true WHERE id_habitacion = $1', [id_habitacion]);

    const updated = result.rows[0];

    // Notificar a los clientes SSE que la reserva fue completada y habitación liberada
    sendSseEvent('reserva_completada', { reserva: updated, id_habitacion });

    res.json(updated);
} catch (err) {
    console.error("Error al completar reserva (encargado):", err);
    res.status(500).json({ error: "Error al completar reserva" });
}
});

// SSE endpoint para encargados/admins
app.get('/api/encargado/reservas/stream', (req, res) => {
  // Accept token via query param or Authorization header
  const token = req.query.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
  if (!token) return res.status(401).end('Token requerido');
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).end('Token inválido');
    if (!(user.rol === 'encargado' || user.rol === 'admin')) return res.status(403).end('Acceso no autorizado');

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write('\n');
    sseClients.add(res);

    // remove on close
    req.on('close', () => {
      sseClients.delete(res);
    });
  });
});

// Ruta para que encargados puedan listar habitaciones (misma salida que admin pero permitida para encargados)
app.get("/api/encargado/habitaciones", authenticateToken, async (req, res) => {
  // Solo encargados o admins
  if (!(req.user && (req.user.rol === 'encargado' || req.user.rol === 'admin'))) {
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }

  try {
    const { page = 1, pageSize = 20, q } = req.query;
    const offset = (parseInt(page,10) -1) * parseInt(pageSize,10);
    const params = [];
    const where = [];
    let idx = 1;
    if (q) {
      where.push(`(h.numero_habitacion::text ILIKE $${idx} OR c.nombre ILIKE $${idx} OR h.tipo ILIKE $${idx})`);
      params.push('%' + q + '%');
      idx++;
    }
    const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

    // calcular total (opcional pero mantiene paridad con admin endpoint)
    const totalRes = await queryWithRetry(`SELECT COUNT(*)::int AS total FROM public.habitaciones h LEFT JOIN public.categorias_habitaciones c ON h.id_categoria = c.id_categoria ${whereSQL}`, params);
    const total = totalRes.rows[0].total || 0;

    params.push(parseInt(pageSize,10));
    params.push(offset);

    const dataQ = `
      SELECT
        h.id_habitacion, h.numero_habitacion, h.tipo, h.precio_por_dia, h.precio_por_hora, h.piso, h.capacidad, h.disponible, c.nombre AS categoria, h.id_categoria
      FROM public.habitaciones h
      LEFT JOIN public.categorias_habitaciones c ON h.id_categoria = c.id_categoria
      ${whereSQL}
      ORDER BY h.id_habitacion ASC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    const result = await queryWithRetry(dataQ, params);
    // Devolver arreglo directo para compatibilidad con el frontend del encargado
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener habitaciones (encargado):", err);
    res.status(500).json({ error: "Error al obtener habitaciones" });
  }
});

/**
 * =========================
 * DASHBOARD METRICS (ADMIN)
 * =========================
 *
 * Retorna:
 *  - total_habitaciones
 *  - habitaciones_disponibles
 *  - total_encargados
 *  - total_reservas
 *  - reservas_pendientes
 *  - reservas_completadas
 *  - ingresos_est (suma aproximada de precio_por_dia * noches para reservas completadas)
 */
app.get("/api/admin/dashboard", authenticateToken, requireAdmin, async (req, res) => {
try {
    // Métricas básicas
    const totalHabitRes = await pool.query("SELECT COUNT(*)::int AS total FROM public.habitaciones");
    const disponibleRes = await pool.query("SELECT COUNT(*)::int AS disponibles FROM public.habitaciones WHERE disponible = true");
    const encargadosRes = await pool.query(`
    SELECT COUNT(*)::int AS total_encargados
    FROM public.usuarios u
    JOIN public.roles r ON u.rol = r.id_rol
    WHERE r.nombre IN ('encargado', 'admin')
    `);
    const reservasRes = await pool.query("SELECT COUNT(*)::int AS total_reservas FROM public.reservas");
    const pendientesRes = await pool.query("SELECT COUNT(*)::int AS pendientes FROM public.reservas WHERE estado_reserva = 'pendiente'");
    const completadasRes = await pool.query("SELECT COUNT(*)::int AS completadas FROM public.reservas WHERE estado_reserva = 'completada'");

    // Ingresos estimados: sum over completed reservations:
    // use precio_por_dia if exists otherwise precio (legacy). nights = GREATEST(1, ceil((checkout - checkin)))
        const ingresosQ = `
    SELECT COALESCE(SUM(
    (COALESCE(h.precio_por_dia, 0)::numeric) *
    GREATEST(1, CEIL(EXTRACT(EPOCH FROM (r.fecha_checkout::timestamp - r.fecha_checkin::timestamp))/86400.0))
    ),0) AS ingresos_est
    FROM public.reservas r
    JOIN public.habitaciones h ON r.id_habitacion = h.id_habitacion
    WHERE r.estado_reserva = 'completada'
    `;
    const ingresosRes = await pool.query(ingresosQ);

    res.json({
    total_habitaciones: totalHabitRes.rows[0].total,
    habitaciones_disponibles: disponibleRes.rows[0].disponibles,
    total_encargados: encargadosRes.rows[0].total_encargados,
    total_reservas: reservasRes.rows[0].total_reservas,
    reservas_pendientes: pendientesRes.rows[0].pendientes,
    reservas_completadas: completadasRes.rows[0].completadas,
    ingresos_est: parseFloat(ingresosRes.rows[0].ingresos_est)
    });
} catch (err) {
    console.error("Error al obtener dashboard metrics:", err);
    res.status(500).json({ error: "Error al obtener métricas" });
}
});

// CARRUSEL: listar imágenes y administración (protegida)
const carouselDir = path.join(__dirname, '..', 'Fronted', 'Public', 'img', 'carousel');
if (!fs.existsSync(carouselDir)) fs.mkdirSync(carouselDir, { recursive: true });

// Ajustar multer para carrusel (puede reutilizar storage but place files in carouselDir)
const carouselStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, carouselDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const uploadCarousel = multer({ storage: carouselStorage });

// GET /api/carrusel - lista pública
app.get('/api/carrusel', async (req, res) => {
    try {
        const files = fs.readdirSync(carouselDir).filter(f => !f.startsWith('.'));
        const images = files.map(f => ({ url: '/img/carousel/' + f, descripcion: f }));
        if (images.length === 0) {
            const defaultImages = [
                { url: '/img/carousel/1758185301931-Casa del inka - vista principal.png', descripcion: 'Vista principal' },
                { url: '/img/carousel/1758185310826-Casa del inka - vista entrada.png', descripcion: 'Vista entrada' },
                { url: '/img/carousel/1758596592120-37b93177.webp', descripcion: 'Instalaciones' }
            ];
            return res.json({ images: defaultImages });
        }
        res.json({ images });
    } catch (error) {
        console.error('Error en endpoint de carrusel:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// RUTA PROTEGIDA PARA ADMIN: GET /api/admin/carrusel - lista para el panel de administración
app.get('/api/admin/carrusel', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const files = fs.readdirSync(carouselDir).filter(f => !f.startsWith('.'));
    const urls = files.map(f => '/img/carousel/' + f);
    res.json({ images: urls });
  } catch (err) {
    console.error('Error leyendo carrusel (admin):', err);
    res.status(500).json({ error: 'Error al leer imágenes del carrusel' });
  }
});

// POST /api/admin/carrusel - subir imagen al carrusel
// Acepta token en Authorization header, en query param 'token' o en form-data 'token'
// Ahora acepta tanto field 'image' (single) como 'fotos' (multiple)
app.post('/api/admin/carrusel', uploadCarousel.fields([{ name: 'image', maxCount: 1 }, { name: 'fotos', maxCount: 20 }]), async (req, res) => {
  try {
    // Extraer token: preferir Authorization header, luego query token, luego form-data token
    const headerAuth = req.headers['authorization'];
    const tokenFromQuery = req.query && req.query.token;
    const tokenFromBody = req.body && req.body.token; // multer-filled
    const authSource = headerAuth || tokenFromQuery || tokenFromBody;
    const token = authSource && typeof authSource === 'string' && authSource.startsWith('Bearer ') ? authSource.split(' ')[1] : authSource;
    if (!token) return res.status(401).json({ error: 'Token requerido' });

    let user;
    try {
      user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    if (!user || user.rol !== 'admin') return res.status(403).json({ error: 'Acceso restringido a administradores' });

    // recolectar archivos recibidos en cualquiera de los campos
    const uploadedFiles = [];
    if (req.files) {
      if (req.files['image'] && req.files['image'].length) uploadedFiles.push(...req.files['image']);
      if (req.files['fotos'] && req.files['fotos'].length) uploadedFiles.push(...req.files['fotos']);
    }

    if (!uploadedFiles.length) return res.status(400).json({ error: 'Falta el archivo (campo: image o fotos)' });

    const urls = uploadedFiles.map(f => '/img/carousel/' + f.filename);
    // devolver array de urls
    res.status(201).json({ images: urls });
  } catch (err) {
    console.error('Error subiendo imagen al carrusel (handler modificado para múltiples campos):', err);
    res.status(500).json({ error: 'Error al subir imagen' });
  }
});

// DELETE /api/admin/carrusel/:name - eliminar por nombre de archivo
app.delete('/api/admin/carrusel/:name', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const name = req.params.name;
    const filePath = path.join(carouselDir, name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado' });
    fs.unlinkSync(filePath);
    res.status(204).send();
  } catch (err) {
    console.error('Error eliminando imagen del carrusel:', err);
    res.status(500).json({ error: 'Error al eliminar imagen' });
  }
});

/**
 * =========================
 * RUTAS DEL ADMIN - CATEGORÍAS (CRUD)
 * =========================
 */

/**
 * @route POST /api/admin/categorias
 * @desc Crear una nueva categoría de habitación
 */
app.post("/api/admin/categorias", authenticateToken, requireAdmin, async (req, res) => {
    const { nombre, descripcion } = req.body;
    try {
        if (!nombre) {
            return res.status(400).json({ error: "El nombre de la categoría es obligatorio" });
        }

        // Verificar que no existe una categoría con el mismo nombre
        const exists = await queryWithRetry("SELECT id_categoria FROM public.categorias_habitaciones WHERE LOWER(nombre) = LOWER($1)", [nombre]);
        if (exists.rows.length > 0) {
            return res.status(409).json({ error: "Ya existe una categoría con ese nombre" });
        }

        const result = await queryWithRetry(
            "INSERT INTO public.categorias_habitaciones (nombre, descripcion) VALUES ($1, $2) RETURNING *",
            [nombre, descripcion || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error al crear categoría:", err);
        res.status(500).json({ error: "Error al crear categoría", detalle: err.message });
    }
});

/**
 * @route PUT /api/admin/categorias/:id
 * @desc Actualizar una categoría de habitación
 */
app.put("/api/admin/categorias/:id", authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    try {
        if (!nombre) {
            return res.status(400).json({ error: "El nombre de la categoría es obligatorio" });
        }

        // Verificar que la categoría existe
        const exists = await queryWithRetry("SELECT id_categoria FROM public.categorias_habitaciones WHERE id_categoria = $1", [id]);
        if (exists.rows.length === 0) {
            return res.status(404).json({ error: "Categoría no encontrada" });
        }

        // Verificar que no existe otra categoría con el mismo nombre
        const duplicate = await queryWithRetry(
            "SELECT id_categoria FROM public.categorias_habitaciones WHERE LOWER(nombre) = LOWER($1) AND id_categoria != $2", 
            [nombre, id]
        );
        if (duplicate.rows.length > 0) {
            return res.status(409).json({ error: "Ya existe otra categoría con ese nombre" });
        }

        const result = await queryWithRetry(
            "UPDATE public.categorias_habitaciones SET nombre = $1, descripcion = $2 WHERE id_categoria = $3 RETURNING *",
            [nombre, descripcion || null, id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error al actualizar categoría:", err);
        res.status(500).json({ error: "Error al actualizar categoría", detalle: err.message });
    }
});

/**
 * @route DELETE /api/admin/categorias/:id
 * @desc Eliminar una categoría de habitación
 */
app.delete("/api/admin/categorias/:id", authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        // Verificar que la categoría existe
        const exists = await queryWithRetry("SELECT id_categoria FROM public.categorias_habitaciones WHERE id_categoria = $1", [id]);
        if (exists.rows.length === 0) {
            return res.status(404).json({ error: "Categoría no encontrada" });
        }

        // Verificar que no hay habitaciones usando esta categoría
        const habitacionesUsando = await queryWithRetry("SELECT COUNT(*)::int AS count FROM public.habitaciones WHERE id_categoria = $1", [id]);
        if (habitacionesUsando.rows[0].count > 0) {
            return res.status(409).json({ 
                error: `No se puede eliminar la categoría porque ${habitacionesUsando.rows[0].count} habitación(es) la están usando` 
            });
        }

        await queryWithRetry("DELETE FROM public.categorias_habitaciones WHERE id_categoria = $1", [id]);
        res.status(204).send();
    } catch (err) {
        console.error("Error al eliminar categoría:", err);
        res.status(500).json({ error: "Error al eliminar categoría", detalle: err.message });
    }
});

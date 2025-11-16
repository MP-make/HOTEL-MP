// server.js (completo, mejorado)
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require("dotenv").config({ path: path.join(__dirname, '.env') });

console.log('Server DB_DATABASE:', process.env.DB_DATABASE);
console.log('Server DB_HOST:', process.env.DB_HOST);
console.log('Server DB_USER:', process.env.DB_USER);

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

// Middleware para roles: requiere encargado o admin
function requireEncargado(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Token requerido' });
  if (req.user.rol !== 'encargado' && req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso restringido a encargados o administradores' });
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
schema: 'public',
ssl: { rejectUnauthorized: false },
family: 4
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

// Verificar conexión a BD de forma no bloqueante
queryWithRetry('SELECT NOW()', [], 3, 500)
  .then(() => {
    console.log('Conexión a la base de datos verificada correctamente.');
  })
  .catch(err => {
    console.warn('Advertencia: No se pudo conectar a la base de datos:', err.message);
    console.warn('El servidor se iniciará de todos modos, pero las funcionalidades que requieren BD no funcionarán.');
  });

// Iniciar el servidor inmediatamente
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Define la ruta absoluta para guardar las fotos
// La carpeta de destino será 'Fronted/Public/img/habitaciones' para coincidir con las rutas guardadas en DB
const uploadDir = path.join(__dirname, '..', 'Fronted', 'Public', 'img', 'habitaciones');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento de imágenes para habitaciones
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      console.log("Directorio de destino para multer:", uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${encodeURIComponent(file.originalname)}`;
      cb(null, uniqueName);
    }
  });

const upload = multer({ storage });

// Configuración para carrusel
const carouselDir = path.join(__dirname, '..', 'Fronted', 'Public', 'img', 'carousel');

if (!fs.existsSync(carouselDir)) {
  fs.mkdirSync(carouselDir, { recursive: true });
}

const carouselStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, carouselDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${encodeURIComponent(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const uploadCarousel = multer({ storage: carouselStorage });

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
    redirectUrl = '/PanelAdmin.html';  // CAMBIO: Encargado va al Panel Admin
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

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

/**
 * =========================
 * RUTAS AUXILIARES (categorías)
 * =========================
 */
app.get("/api/admin/categorias", authenticateToken, requireEncargado, async (req, res) => {
try {
    const result = await queryWithRetry("SELECT * FROM public.categorias_habitaciones ORDER BY id_categoria");
    res.json(result.rows);
} catch (err) {
    console.error("Error al obtener categorías:", err);
    res.status(500).json({ error: "Error al obtener categorías" });
}
});

/**
 * @route GET /api/categorias
 * @desc Obtener todas las categorías de habitaciones (público)
 */
app.get("/api/categorias", async (req, res) => {
  try {
    const result = await queryWithRetry("SELECT * FROM public.categorias_habitaciones ORDER BY nombre");
    res.json({ categorias: result.rows });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 * @route GET /api/habitaciones
 * @desc Obtener habitaciones disponibles (público - sin autenticación)
 */
app.get("/api/habitaciones", async (req, res) => {
  try {
    const dataQ = `
      SELECT
          h.id_habitacion,
          h.numero_habitacion,
          h.piso,
          h.capacidad,
          h.precio_por_dia,
          h.precio_por_hora,
          h.disponible,
          c.nombre AS categoria
      FROM public.habitaciones h
      INNER JOIN public.categorias_habitaciones c ON h.id_categoria = c.id_categoria
      WHERE h.disponible = true
      GROUP BY h.id_habitacion, c.nombre
      ORDER BY h.numero_habitacion ASC;
    `;

    const result = await queryWithRetry(dataQ);
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener habitaciones públicas:", err);
    res.status(500).json({ error: "Error al obtener habitaciones", code: 500 });
  }
});

/**
 * @route GET /api/habitaciones/:id/fotos
 * @desc Obtener fotos de una habitación específica (público)
 */
app.get("/api/habitaciones/:id/fotos", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await queryWithRetry("SELECT ruta_foto FROM habitaciones_fotos WHERE id_habitacion = $1", [parseInt(id)]);
    res.json(result.rows.map(r => r.ruta_foto));
  } catch (err) {
    console.error("Error obteniendo fotos:", err);
    res.status(500).json({ error: "Error al obtener fotos" });
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
            h.piso,
            h.capacidad,
            h.precio_por_dia,
            h.precio_por_hora,
            h.disponible,
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

    // Parsear fechas y RESTAR 5 HORAS (conversión a UTC-5 / Hora de Perú)
    const checkIn = new Date(fecha_checkin);
    const checkOut = new Date(fecha_checkout);
    
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return res.status(400).json({ error: 'Fechas inválidas. Usa un formato ISO/compatible con datetime-local.' });
    }
    
    // RESTAR 5 HORAS para convertir a hora de Perú
    checkIn.setHours(checkIn.getHours() - 5);
    checkOut.setHours(checkOut.getHours() - 5);
    
    if (checkOut <= checkIn) {
      return res.status(400).json({ error: 'La fecha de check-out debe ser posterior al check-in.' });
    }

    // Verificar existencia del usuario
    const userQ = await queryWithRetry('SELECT id FROM public.usuarios WHERE id = $1', [id_usuario]);
    if (userQ.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });

    // Verificar existencia de la habitación
    const habRes = await queryWithRetry('SELECT disponible FROM public.habitaciones WHERE id_habitacion = $1', [parsedHabId]);
    if (habRes.rows.length === 0) return res.status(404).json({ error: 'Habitación no encontrada.' });

    // VALIDACIÓN 1: Verificar si ESTE USUARIO ya tiene una reserva activa en ESTA HABITACIÓN
    const userRoomReservation = await queryWithRetry(
      `SELECT id_reserva FROM public.reservas 
       WHERE id_usuario = $1 
         AND id_habitacion = $2 
         AND estado_reserva <> 'completada'
       LIMIT 1`,
      [id_usuario, parsedHabId]
    );
    
    if (userRoomReservation.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Ya tienes una reserva activa en esta habitación. No puedes reservar la misma habitación nuevamente hasta que tu reserva actual sea completada.' 
      });
    }

    // VALIDACIÓN 2: Comprobar solapamiento de fechas con CUALQUIER reserva activa en esta habitación
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

    const nuevaReserva = result.rows[0];

    // Notificar via SSE a encargados conectados
    try { sendSseEvent('nueva_reserva', { reserva: nuevaReserva }); } catch (sseErr) { console.error('Error enviando SSE tras crear reserva:', sseErr); }

    res.status(201).json(nuevaReserva);
} catch (err) {
    console.error("Error al crear reserva (mejorado, catch):", err);
    res.status(500).json({ error: "Error al crear reserva", detalle: err && err.message ? err.message : String(err) });
}
});

/**
 * @route GET /api/cliente/reservas
 * @desc Obtener reservas del cliente autenticado
 */
app.get("/api/cliente/reservas", authenticateToken, async (req, res) => {
  try {
    const result = await queryWithRetry(
      `SELECT r.id_reserva, r.fecha_checkin, r.fecha_checkout, r.estado_reserva, r.fecha_creacion,
              h.numero_habitacion, h.id_habitacion, c.nombre AS categoria,
              COALESCE(ARRAY_AGG(f.ruta_foto) FILTER (WHERE f.ruta_foto IS NOT NULL), '{}') AS fotos
       FROM public.reservas r
       JOIN public.habitaciones h ON r.id_habitacion = h.id_habitacion
       JOIN public.categorias_habitaciones c ON h.id_categoria = c.id_categoria
       LEFT JOIN public.habitaciones_fotos f ON h.id_habitacion = f.id_habitacion
       WHERE r.id_usuario = $1
       GROUP BY r.id_reserva, h.numero_habitacion, h.id_habitacion, c.nombre
       ORDER BY r.fecha_creacion DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo reservas del cliente:", err);
    res.status(500).json({ error: "Error al obtener reservas" });
  }
});

/**
 * @route GET /api/cliente/reclamos
 * @desc Obtener reclamos del cliente autenticado
 */
app.get("/api/cliente/reclamos", authenticateToken, async (req, res) => {
  try {
    const result = await queryWithRetry(
      `SELECT r.id_reclamo, r.descripcion, r.estado, r.fecha_creacion,
              h.numero_habitacion, c.nombre AS categoria
       FROM public.reclamos r
       LEFT JOIN public.habitaciones h ON r.id_habitacion = h.id_habitacion
       LEFT JOIN public.categorias_habitaciones c ON h.id_categoria = c.id_categoria
       WHERE r.id_usuario = $1
       ORDER BY r.fecha_creacion DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo reclamos del cliente:", err);
    res.status(500).json({ error: "Error al obtener reclamos" });
  }
});

/**
 * @route POST /api/cliente/reclamos
 * @desc Crear un nuevo reclamo
 */
app.post("/api/cliente/reclamos", authenticateToken, async (req, res) => {
  const { descripcion, id_habitacion } = req.body;
  if (!descripcion) {
    return res.status(400).json({ error: "Descripción requerida" });
  }
  const parsedIdHabitacion = id_habitacion && id_habitacion !== 'undefined' && !isNaN(parseInt(id_habitacion)) ? parseInt(id_habitacion) : null;
  try {
    const result = await queryWithRetry(
      `INSERT INTO public.reclamos (id_usuario, id_habitacion, descripcion)
       VALUES ($1, $2, $3) RETURNING id_reclamo, fecha_creacion`,
      [req.user.id, parsedIdHabitacion, descripcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creando reclamo:", err);
    res.status(500).json({ error: "Error al crear reclamo" });
  }
});

/**
 * @route POST /api/cliente/reservas/con-calculo
 * @desc Crear una reserva con cálculo automático del monto total
 */
app.post("/api/cliente/reservas/con-calculo", authenticateTokenOptional, async (req, res) => {
  const { id_usuario: bodyUserId, id_habitacion, fecha_checkin, fecha_checkout, servicios_adicionales } = req.body;
  
  try {
    const id_usuario = req.user ? req.user.id : bodyUserId;

    // Validaciones básicas
    if (!id_usuario) return res.status(400).json({ error: 'id_usuario es obligatorio' });
    if (!id_habitacion) return res.status(400).json({ error: 'id_habitacion es obligatorio' });
    if (!fecha_checkin || !fecha_checkout) return res.status(400).json({ error: 'Fechas obligatorias' });

    const parsedHabId = parseInt(id_habitacion, 10);
    const checkIn = new Date(fecha_checkin);
    const checkOut = new Date(fecha_checkout);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return res.status(400).json({ error: 'Fechas inválidas' });
    }
    
    // RESTAR 5 HORAS para convertir a hora de Perú
    checkIn.setHours(checkIn.getHours() - 5);
    checkOut.setHours(checkOut.getHours() - 5);
    
    if (checkOut <= checkIn) {
      return res.status(400).json({ error: 'Check-out debe ser posterior al check-in' });
    }

    // Obtener precio de la habitación
    const habRes = await queryWithRetry(
      'SELECT disponible, precio_por_dia FROM public.habitaciones WHERE id_habitacion = $1',
      [parsedHabId]
    );
    
    if (habRes.rows.length === 0) {
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }

    const precioPorDia = parseFloat(habRes.rows[0].precio_por_dia);

    // Calcular monto total
    const montoTotal = paymentService.calcularMontoTotal(
      precioPorDia,
      checkIn,
      checkOut,
      servicios_adicionales || []
    );

    // VALIDACIÓN 1: Verificar si ESTE USUARIO ya tiene una reserva activa en ESTA HABITACIÓN
    const userRoomReservation = await queryWithRetry(
      `SELECT id_reserva FROM public.reservas 
       WHERE id_usuario = $1 
         AND id_habitacion = $2 
         AND estado_reserva <> 'completada'
       LIMIT 1`,
      [id_usuario, parsedHabId]
    );
    
    if (userRoomReservation.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Ya tienes una reserva activa en esta habitación. No puedes reservar la misma habitación nuevamente hasta que tu reserva actual sea completada.' 
      });
    }

    // VALIDACIÓN 2: Verificar solapamiento de fechas con CUALQUIER reserva activa
    const conflictQ = `
      SELECT 1 FROM public.reservas r
      WHERE r.id_habitacion = $1
        AND r.estado_reserva <> 'completada'
        AND NOT (r.fecha_checkout <= $2 OR r.fecha_checkin >= $3)
      LIMIT 1
    `;
    const conflictRes = await queryWithRetry(conflictQ, [parsedHabId, checkIn.toISOString(), checkOut.toISOString()]);
    if (conflictRes.rows.length > 0) {
      return res.status(409).json({ error: 'Habitación no disponible en esas fechas' });
    }

    // Insertar reserva con monto total calculado
    const result = await queryWithRetry(
      `INSERT INTO public.reservas 
       (id_usuario, id_habitacion, fecha_checkin, fecha_checkout, estado_reserva, 
        monto_total, monto_pagado, monto_pendiente, porcentaje_pagado, estado_pago, fecha_creacion) 
       VALUES ($1, $2, $3, $4, 'pendiente', $5, 0, $5, 0, 'pendiente', NOW()) 
       RETURNING *`,
      [id_usuario, parsedHabId, checkIn.toISOString(), checkOut.toISOString(), montoTotal]
    );

    const nuevaReserva = result.rows[0];

    // Notificar via SSE
    try { 
      sendSseEvent('nueva_reserva', { reserva: nuevaReserva }); 
    } catch (sseErr) { 
      console.error('Error enviando SSE:', sseErr); 
    }

    res.status(201).json({
      ...nuevaReserva,
      montoMinimoPago: (montoTotal * 0.5).toFixed(2)
    });

  } catch (err) {
    console.error("Error al crear reserva con cálculo:", err);
    res.status(500).json({ error: "Error al crear reserva", detalle: err.message });
  }
});

/**
 * =========================
 * RUTAS DE PERFIL
 * =========================
 */

/**
 * @route GET /api/perfil
 * @desc Obtener datos del perfil del usuario autenticado
 */
app.get("/api/perfil", authenticateToken, async (req, res) => {
  try {
    const result = await queryWithRetry(
      "SELECT id, nombre, email FROM public.usuarios WHERE id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error obteniendo perfil:", err);
    res.status(500).json({ error: "Error al obtener perfil" });
  }
});

/**
 * @route PUT /api/perfil
 * @desc Actualizar perfil del usuario autenticado
 */
app.put("/api/perfil", authenticateToken, async (req, res) => {
  const { nombre, email } = req.body;
  try {
    if (!nombre || !email) {
      return res.status(400).json({ error: "Nombre y email son obligatorios" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Email inválido" });
    }

    // Verificar que el email no esté usado por otro usuario
    const emailExists = await queryWithRetry(
      "SELECT id FROM public.usuarios WHERE email = $1 AND id != $2",
      [email, req.user.id]
    );
    if (emailExists.rows.length > 0) {
      return res.status(409).json({ error: "El email ya está en uso por otro usuario" });
    }

    const result = await queryWithRetry(
      "UPDATE public.usuarios SET nombre = $1, email = $2 WHERE id = $3 RETURNING id, nombre, email",
      [nombre, email, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error actualizando perfil:", err);
    res.status(500).json({ error: "Error al actualizar perfil" });
  }
});

/**
 * @route DELETE /api/perfil
 * @desc Eliminar cuenta del usuario autenticado
 */
app.delete("/api/perfil", authenticateToken, async (req, res) => {
  try {
    // Opcional: Verificar si tiene reservas pendientes
    const reservasPendientes = await queryWithRetry(
      "SELECT COUNT(*)::int AS count FROM public.reservas WHERE id_usuario = $1 AND estado_reserva = 'pendiente'",
      [req.user.id]
    );
    if (reservasPendientes.rows[0].count > 0) {
      return res.status(409).json({ error: "No se puede eliminar la cuenta porque tienes reservas pendientes" });
    }

    // Eliminar usuario
    await queryWithRetry("DELETE FROM public.usuarios WHERE id = $1", [req.user.id]);
    res.json({ message: "Cuenta eliminada exitosamente" });
  } catch (err) {
    console.error("Error eliminando cuenta:", err);
    res.status(500).json({ error: "Error al eliminar cuenta" });
  }
});

/**
 * =========================
 * RUTAS DEL ADMIN - CATEGORÍAS (CRUD)
 * =========================
 */
app.get("/api/admin/categorias", authenticateToken, requireEncargado, async (req, res) => {
try {
    const result = await queryWithRetry("SELECT * FROM public.categorias_habitaciones ORDER BY id_categoria");
    res.json(result.rows);
} catch (err) {
    console.error("Error al obtener categorías:", err);
    res.status(500).json({ error: "Error al obtener categorías" });
}
});

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

/**
 * @route GET /api/admin/hotel-config
 * @desc Obtener la configuración del hotel (pisos y habitaciones por piso) - ACCESO PARA ENCARGADOS Y ADMIN
 */
app.get("/api/admin/hotel-config", authenticateToken, requireEncargado, async (req, res) => {
    try {
        const result = await queryWithRetry("SELECT * FROM public.hotel_config LIMIT 1");
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Configuración del hotel no encontrada" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error al obtener configuración del hotel:", err);
        res.status(500).json({ error: "Error al obtener configuración del hotel" });
    }
});

/**
 * @route PUT /api/admin/hotel-config
 * @desc Actualizar la configuración del hotel
 */
app.put("/api/admin/hotel-config", authenticateToken, requireAdmin, async (req, res) => {
    const { num_pisos, habitaciones_por_piso } = req.body;
    try {
        if (num_pisos < 1 || habitaciones_por_piso < 1) {
            return res.status(400).json({ error: "Los valores deben ser mayores a 0" });
        }

        const result = await queryWithRetry(
            "UPDATE public.hotel_config SET num_pisos = $1, habitaciones_por_piso = $2, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM public.hotel_config LIMIT 1) RETURNING *",
            [num_pisos, habitaciones_por_piso]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Configuración del hotel no encontrada" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error al actualizar configuración del hotel:", err);
        res.status(500).json({ error: "Error al actualizar configuración del hotel", detalle: err.message });
    }
});

/**
 * =========================
 * RUTAS DEL ADMIN - DASHBOARD Y OTROS
 * =========================
 */

/**
 * @route GET /api/admin/dashboard
 * @desc Obtener métricas del dashboard
 */
app.get("/api/admin/dashboard", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalHabitaciones = await queryWithRetry("SELECT COUNT(*)::int AS count FROM habitaciones");
    const habitacionesDisponibles = await queryWithRetry("SELECT COUNT(*)::int AS count FROM habitaciones WHERE disponible = true");
    const totalEncargados = await queryWithRetry("SELECT COUNT(*)::int AS count FROM usuarios u JOIN roles r ON u.rol = r.id_rol WHERE r.nombre = 'encargado'");
    const totalReservas = await queryWithRetry("SELECT COUNT(*)::int AS count FROM reservas");
    const reservasPendientes = await queryWithRetry("SELECT COUNT(*)::int AS count FROM reservas WHERE estado_reserva = 'pendiente'");
    const reservasCompletadas = await queryWithRetry("SELECT COUNT(*)::int AS count FROM reservas WHERE estado_reserva = 'completada'");
    const ingresos = await queryWithRetry(`
      SELECT COALESCE(SUM(h.precio_por_dia * (r.fecha_checkout::date - r.fecha_checkin::date)), 0)::float AS total
      FROM reservas r JOIN habitaciones h ON r.id_habitacion = h.id_habitacion
      WHERE r.estado_reserva = 'completada'
    `);

    // Ingresos mensuales (últimos 12 meses)
    const ingresosMensuales = await queryWithRetry(`
      SELECT TO_CHAR(r.fecha_checkout, 'YYYY-MM') as month, COALESCE(SUM(h.precio_por_dia * (r.fecha_checkout::date - r.fecha_checkin::date)), 0)::float as total
      FROM reservas r JOIN habitaciones h ON r.id_habitacion = h.id_habitacion
      WHERE r.estado_reserva = 'completada' AND r.fecha_checkout >= NOW() - INTERVAL '12 months'
      GROUP BY month ORDER BY month
    `);

    // Check-ins diarios (últimos 30 días)
    const checkinsDiarios = await queryWithRetry(`
      SELECT r.fecha_checkin::date as date, COUNT(*)::int as count
      FROM reservas r
      WHERE r.fecha_checkin >= NOW() - INTERVAL '30 days'
      GROUP BY date ORDER BY date
    `);

    // Distribución ingresos por categoría
    const distribucionIngresos = await queryWithRetry(`
      SELECT c.nombre as categoria, COALESCE(SUM(h.precio_por_dia * (r.fecha_checkout::date - r.fecha_checkin::date)), 0)::float as total
      FROM reservas r JOIN habitaciones h ON r.id_habitacion = h.id_habitacion
      JOIN categorias_habitaciones c ON h.id_categoria = c.id_categoria
      WHERE r.estado_reserva = 'completada'
      GROUP BY c.nombre ORDER BY total DESC
    `);

    res.json({
      total_habitaciones: totalHabitaciones.rows[0].count,
      habitaciones_disponibles: habitacionesDisponibles.rows[0].count,
      total_encargados: totalEncargados.rows[0].count,
      total_reservas: totalReservas.rows[0].count,
      reservas_pendientes: reservasPendientes.rows[0].count,
      reservas_completadas: reservasCompletadas.rows[0].count,
      ingresos_est: ingresos.rows[0].total,
      ingresos_mensuales: ingresosMensuales.rows,
      checkins_diarios: checkinsDiarios.rows,
      distribucion_ingresos: distribucionIngresos.rows,
      chart_ingresos_mensuales: ingresosMensuales.rows,
      chart_distribucion_pagos: distribucionIngresos.rows,
      chart_servicios_rentables: [],
      chart_picos_checkin_checkout: checkinsDiarios.rows
    });
  } catch (err) {
    console.error("Error obteniendo métricas del dashboard:", err);
    res.status(500).json({ error: "Error al obtener métricas" });
  }
});

/**
 * @route GET /api/admin/habitaciones
 * @desc Obtener todas las habitaciones (Admin y Encargado)
 */
app.get("/api/admin/habitaciones", authenticateToken, requireEncargado, async (req, res) => {
  try {
    const result = await queryWithRetry("SELECT h.*, c.nombre as categoria FROM habitaciones h JOIN categorias_habitaciones c ON h.id_categoria = c.id_categoria ORDER BY h.numero_habitacion");
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo habitaciones:", err);
    res.status(500).json({ error: "Error al obtener habitaciones" });
  }
});

/**
 * @route GET /api/admin/carrusel
 * @desc Obtener imágenes del carrusel (Admin y Encargado)
 */
app.get("/api/admin/carrusel", authenticateToken, requireEncargado, async (req, res) => {
  try {
    const carouselDir = path.join(__dirname, '..', 'Fronted', 'Public', 'img', 'carousel');
    if (!fs.existsSync(carouselDir)) {
      return res.json([]);
    }
    const files = fs.readdirSync(carouselDir).filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.webp'));
    const images = files.map(file => ({ url: `/img/carousel/${file}`, filename: file }));
    res.json(images);
  } catch (err) {
    console.error("Error obteniendo carrusel:", err);
    res.status(500).json({ error: "Error al obtener carrusel" });
  }
});

/**
 * @route POST /api/admin/carrusel
 * @desc Subir imágenes al carrusel (Admin y Encargado)
 */
app.post("/api/admin/carrusel", authenticateToken, requireEncargado, uploadCarousel.array('fotos'), async (req, res) => {
  try {
    res.status(201).json({ message: 'Imágenes subidas correctamente' });
  } catch (err) {
    console.error("Error subiendo carrusel:", err);
    res.status(500).json({ error: "Error al subir imágenes" });
  }
});

/**
 * @route DELETE /api/admin/carrusel/:filename
 * @desc Eliminar imagen del carrusel (Admin y Encargado)
 */
app.delete("/api/admin/carrusel/:filename", authenticateToken, requireEncargado, async (req, res) => {
  const { filename } = req.params;
  try {
    const filePath = path.join(carouselDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: 'Imagen eliminada' });
    } else {
      res.status(404).json({ error: 'Imagen no encontrada' });
    }
  } catch (err) {
    console.error("Error eliminando imagen del carrusel:", err);
    res.status(500).json({ error: "Error al eliminar imagen" });
  }
});

/**
 * @route GET /api/carrusel
 * @desc Obtener imágenes del carrusel público
 */
app.get("/api/carrusel", async (req, res) => {
  try {
    const carouselDir = path.join(__dirname, '..', 'Fronted', 'Public', 'img', 'carousel');
    if (!fs.existsSync(carouselDir)) {
      return res.json({ images: [] });
    }
    const files = fs.readdirSync(carouselDir).filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.webp'));
    const images = files.map((file, index) => ({ url: `/img/carousel/${file}`, descripcion: `Imagen ${file.split('-')[1].split('.')[0]}` }));
    res.json({ images });
  } catch (err) {
    console.error("Error obteniendo carrusel público:", err);
    res.status(500).json({ error: "Error al obtener carrusel" });
  }
});

/**
 * @route GET /api/admin/reservas
 * @desc Obtener todas las reservas (Admin y Encargado)
 */
app.get("/api/admin/reservas", authenticateToken, requireEncargado, async (req, res) => {
  try {
    const result = await queryWithRetry("SELECT r.*, h.numero_habitacion, u.nombre as cliente_nombre, u.email as cliente_email FROM reservas r JOIN habitaciones h ON r.id_habitacion = h.id_habitacion JOIN usuarios u ON r.id_usuario = u.id ORDER BY r.fecha_creacion DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo reservas:", err);
    res.status(500).json({ error: "Error al obtener reservas" });
  }
});

/**
 * @route PUT /api/admin/reservas/:id/completar
 * @desc Completar reserva (Admin y Encargado)
 */
app.put("/api/admin/reservas/:id/completar", authenticateToken, requireEncargado, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await queryWithRetry("UPDATE reservas SET estado_reserva = 'completada' WHERE id_reserva = $1 RETURNING id_habitacion", [parseInt(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }
    const id_habitacion = result.rows[0].id_habitacion;
    await queryWithRetry("UPDATE habitaciones SET disponible = true WHERE id_habitacion = $1", [id_habitacion]);
    res.json({ message: "Reserva completada" });
  } catch (err) {
    console.error("Error completando reserva:", err);
    res.status(500).json({ error: "Error al completar reserva" });
  }
});

/**
 * @route DELETE /api/admin/reservas/:id
 * @desc Eliminar reserva (Admin y Encargado)
 */
app.delete("/api/admin/reservas/:id", authenticateToken, requireEncargado, async (req, res) => {
  const { id } = req.params;
  try {
    await queryWithRetry("DELETE FROM reservas WHERE id_reserva = $1", [parseInt(id)]);
    res.status(204).send();
  } catch (err) {
    console.error("Error eliminando reserva:", err);
    res.status(500).json({ error: "Error al eliminar reserva" });
  }
});

/**
 * @route GET /api/admin/encargados
 * @desc Obtener encargados
 */
app.get("/api/admin/encargados", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await queryWithRetry("SELECT u.id, u.nombre, u.email, r.nombre as rol FROM usuarios u JOIN roles r ON u.rol = r.id_rol WHERE r.nombre = 'encargado'");
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo encargados:", err);
    res.status(500).json({ error: "Error al obtener encargados" });
  }
});

/**
 * @route POST /api/admin/encargados
 * @desc Crear un nuevo encargado
 */
app.post("/api/admin/encargados", authenticateToken, requireAdmin, async (req, res) => {
  const { nombre, email, password } = req.body;
  
  try {
    // Validaciones básicas
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Email inválido" });
    }

    // Verificar que el email no existe
    const existingUser = await queryWithRetry("SELECT id FROM usuarios WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "El email ya está en uso" });
    }

    // Obtener el ID del rol 'encargado'
    const roleRes = await queryWithRetry("SELECT id_rol FROM roles WHERE nombre = 'encargado'");
    if (roleRes.rows.length === 0) {
      return res.status(500).json({ error: "Rol 'encargado' no configurado en la base de datos" });
    }
    const encargadoRolId = roleRes.rows[0].id_rol;

    // Hash de la contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insertar usuario
    const result = await queryWithRetry(
      "INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email",
      [nombre, email, passwordHash, encargadoRolId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creando encargado:", err);
    res.status(500).json({ error: "Error al crear encargado", detalle: err.message });
  }
});

/**
 * @route PUT /api/admin/encargados/:id
 * @desc Actualizar un encargado
 */
app.put("/api/admin/encargados/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre, email, password } = req.body;
  
  try {
    // Validaciones básicas
    if (!nombre || !email) {
      return res.status(400).json({ error: "Nombre y email son obligatorios" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Email inválido" });
    }

    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    // Verificar que el usuario existe y es encargado
    const userExists = await queryWithRetry(
      "SELECT u.id FROM usuarios u JOIN roles r ON u.rol = r.id_rol WHERE u.id = $1 AND r.nombre = 'encargado'",
      [userId]
    );
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: "Encargado no encontrado" });
    }

    // Verificar que el email no esté usado por otro usuario
    const emailExists = await queryWithRetry(
      "SELECT id FROM usuarios WHERE email = $1 AND id != $2",
      [email, userId]
    );
    if (emailExists.rows.length > 0) {
      return res.status(409).json({ error: "El email ya está en uso por otro usuario" });
    }

    // Si se proporciona contraseña, hashearla
    let updateQuery, params;
    if (password) {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      updateQuery = "UPDATE usuarios SET nombre = $1, email = $2, password = $3 WHERE id = $4 RETURNING id, nombre, email";
      params = [nombre, email, passwordHash, userId];
    } else {
      updateQuery = "UPDATE usuarios SET nombre = $1, email = $2 WHERE id = $3 RETURNING id, nombre, email";
      params = [nombre, email, userId];
    }

    const result = await queryWithRetry(updateQuery, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error actualizando encargado:", err);
    res.status(500).json({ error: "Error al actualizar encargado", detalle: err.message });
  }
});

/**
 * @route DELETE /api/admin/encargados/:id
 * @desc Eliminar un encargado
 */
app.delete("/api/admin/encargados/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    // Verificar que el usuario existe y es encargado
    const userExists = await queryWithRetry(
      "SELECT u.id FROM usuarios u JOIN roles r ON u.rol = r.id_rol WHERE u.id = $1 AND r.nombre = 'encargado'",
      [userId]
    );
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: "Encargado no encontrado" });
    }

    // Eliminar usuario
    await queryWithRetry("DELETE FROM usuarios WHERE id = $1", [userId]);
    res.status(204).send();
  } catch (err) {
    console.error("Error eliminando encargado:", err);
    res.status(500).json({ error: "Error al eliminar encargado", detalle: err.message });
  }
});

/**
 * @route POST /api/admin/assign-encargado
 * @desc Asignar rol de encargado a un usuario existente por email
 */
app.post("/api/admin/assign-encargado", authenticateToken, requireAdmin, async (req, res) => {
  const { email } = req.body;
  
  try {
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Email válido requerido" });
    }

    // Verificar que el usuario existe
    const user = await queryWithRetry("SELECT id, rol FROM usuarios WHERE email = $1", [email]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Obtener el ID del rol encargado
    const roleRes = await queryWithRetry("SELECT id_rol FROM roles WHERE nombre = 'encargado'");
    if (roleRes.rows.length === 0) {
      return res.status(500).json({ error: "Rol 'encargado' no configurado" });
    }
    const encargadoRolId = roleRes.rows[0].id_rol;

    // Actualizar rol del usuario
    await queryWithRetry("UPDATE usuarios SET rol = $1 WHERE id = $2", [encargadoRolId, user.rows[0].id]);
    
    res.json({ message: "Usuario asignado como encargado exitosamente" });
  } catch (err) {
    console.error("Error asignando encargado:", err);
    res.status(500).json({ error: "Error al asignar encargado", detalle: err.message });
  }
});

/**
 * @route POST /api/admin/habitaciones
 * @desc Crear una nueva habitación (Admin y Encargado)
 */
app.post("/api/admin/habitaciones", authenticateToken, requireEncargado, upload.array('fotos'), async (req, res) => {
  try {
    const { numero_habitacion, piso, id_categoria, precio_por_dia, precio_por_hora, capacidad, descripcion } = req.body;
    const disponible = req.body.disponible !== undefined ? sanitizeBoolean(req.body.disponible) : true;

    // Validaciones básicas
    if (!numero_habitacion || !id_categoria) {
      return res.status(400).json({ error: "Número de habitación e ID de categoría son obligatorios" });
    }

    const numHab = parseInt(numero_habitacion, 10);
    if (isNaN(numHab) || numHab <= 0) {
      return res.status(400).json({ error: "Número de habitación debe ser un entero positivo" });
    }

    // Verificar que el número de habitación no existe
    const exists = await queryWithRetry("SELECT id_habitacion FROM habitaciones WHERE numero_habitacion = $1", [numHab]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: "Ya existe una habitación con ese número" });
    }

    // Verificar que la categoría existe
    const catExists = await queryWithRetry("SELECT id_categoria FROM categorias_habitaciones WHERE id_categoria = $1", [id_categoria]);
    if (catExists.rows.length === 0) {
      return res.status(400).json({ error: "Categoría no encontrada" });
    }

    // Insertar habitación
    const insertQuery = `
      INSERT INTO habitaciones (numero_habitacion, piso, id_categoria, precio_por_dia, precio_por_hora, capacidad, descripcion, disponible)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const params = [
      numHab,
      piso ? parseInt(piso, 10) : null,
      id_categoria,
      precio_por_dia ? parseFloat(precio_por_dia) : null,
      precio_por_hora ? parseFloat(precio_por_hora) : null,
      capacidad ? parseInt(capacidad, 10) : null,
      descripcion || null,
      disponible
    ];

    const result = await queryWithRetry(insertQuery, params);
    const nuevaHabitacion = result.rows[0];

    // Si hay fotos, insertarlas
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const rutaFoto = file.filename;
        await queryWithRetry("INSERT INTO habitaciones_fotos (id_habitacion, ruta_foto) VALUES ($1, $2)", [nuevaHabitacion.id_habitacion, rutaFoto]);
      }
    }

    res.status(201).json(nuevaHabitacion);
  } catch (err) {
    console.error("Error creando habitación:", err);
    res.status(500).json({ error: "Error al crear habitación", detalle: err.message });
  }
});

/**
 * @route PUT /api/admin/habitaciones/:id
 * @desc Actualizar una habitación existente (Admin y Encargado)
 */
app.put("/api/admin/habitaciones/:id", authenticateToken, requireEncargado, upload.array('fotos'), async (req, res) => {
  try {
    const { id } = req.params;
    const { numero_habitacion, piso, id_categoria, precio_por_dia, precio_por_hora, capacidad, descripcion } = req.body;
    const disponible = req.body.disponible !== undefined ? sanitizeBoolean(req.body.disponible) : true;

    // Validaciones básicas
    if (!numero_habitacion || !id_categoria) {
      return res.status(400).json({ error: "Número de habitación e ID de categoría son obligatorios" });
    }

    const habitacionId = parseInt(id, 10);
    const numHab = parseInt(numero_habitacion, 10);
    
    if (isNaN(habitacionId) || isNaN(numHab) || numHab <= 0) {
      return res.status(400).json({ error: "IDs deben ser enteros positivos válidos" });
    }

    // Verificar que la habitación existe
    const habitacionExists = await queryWithRetry("SELECT id_habitacion FROM habitaciones WHERE id_habitacion = $1", [habitacionId]);
    if (habitacionExists.rows.length === 0) {
      return res.status(404).json({ error: "Habitación no encontrada" });
    }

    // Verificar que el número de habitación no esté usado por otra habitación
    const numExists = await queryWithRetry("SELECT id_habitacion FROM habitaciones WHERE numero_habitacion = $1 AND id_habitacion != $2", [numHab, habitacionId]);
    if (numExists.rows.length > 0) {
      return res.status(409).json({ error: "Ya existe otra habitación con ese número" });
    }

    // Verificar que la categoría existe
    const catExists = await queryWithRetry("SELECT id_categoria FROM categorias_habitaciones WHERE id_categoria = $1", [id_categoria]);
    if (catExists.rows.length === 0) {
      return res.status(400).json({ error: "Categoría no encontrada" });
    }

    // Actualizar habitación
    const updateQuery = `
      UPDATE habitaciones 
      SET numero_habitacion = $1, piso = $2, id_categoria = $3, precio_por_dia = $4, 
          precio_por_hora = $5, capacidad = $6, descripcion = $7, disponible = $8
      WHERE id_habitacion = $9
      RETURNING *
    `;
    const params = [
      numHab,
      piso ? parseInt(piso, 10) : null,
      id_categoria,
      precio_por_dia ? parseFloat(precio_por_dia) : null,
      precio_por_hora ? parseFloat(precio_por_hora) : null,
      capacidad ? parseInt(capacidad, 10) : null,
      descripcion || null,
      disponible,
      habitacionId
    ];

    const result = await queryWithRetry(updateQuery, params);
    const habitacionActualizada = result.rows[0];

    // Si hay fotos nuevas, agregarlas
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const rutaFoto = file.filename;
        await queryWithRetry("INSERT INTO habitaciones_fotos (id_habitacion, ruta_foto) VALUES ($1, $2)", [habitacionId, rutaFoto]);
      }
    }

    res.json(habitacionActualizada);
  } catch (err) {
    console.error("Error actualizando habitación:", err);
    res.status(500).json({ error: "Error al actualizar habitación", detalle: err.message });
  }
});

/**
 * @route DELETE /api/admin/habitaciones/:id
 * @desc Eliminar una habitación (Admin y Encargado)
 */
app.delete("/api/admin/habitaciones/:id", authenticateToken, requireEncargado, async (req, res) => {
  try {
    const { id } = req.params;
    const habitacionId = parseInt(id, 10);

    // Verificar que no hay reservas pendientes para esta habitación
    const reservasPendientes = await queryWithRetry(
      "SELECT COUNT(*)::int AS count FROM reservas WHERE id_habitacion = $1 AND estado_reserva = 'pendiente'",
      [habitacionId]
    );

    if (reservasPendientes.rows[0].count > 0) {
      return res.status(409).json({ 
        error: "No se puede eliminar la habitación porque tiene reservas pendientes" 
      });
    }

    // Eliminar fotos asociadas
    const fotos = await queryWithRetry("SELECT ruta_foto FROM habitaciones_fotos WHERE id_habitacion = $1", [habitacionId]);
    for (const foto of fotos.rows) {
      const filePath = path.join(uploadDir, foto.ruta_foto);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    await queryWithRetry("DELETE FROM habitaciones_fotos WHERE id_habitacion = $1", [habitacionId]);

    // Eliminar habitación
    await queryWithRetry("DELETE FROM habitaciones WHERE id_habitacion = $1", [habitacionId]);

    res.status(204).send();
  } catch (err) {
    console.error("Error eliminando habitación:", err);
    res.status(500).json({ error: "Error al eliminar habitación", detalle: err.message });
  }
});

/**
 * =========================
 * RUTAS DEL ENCARGADO
 * =========================
 */

/**
 * @route GET /api/encargado/habitaciones
 * @desc Obtener habitaciones con filtros
 */
app.get("/api/encargado/habitaciones", authenticateToken, requireEncargado, async (req, res) => {
  try {
    const { numero, categoria, piso, disponible } = req.query;
    let query = "SELECT h.*, c.nombre as categoria FROM habitaciones h JOIN categorias_habitaciones c ON h.id_categoria = c.id_categoria WHERE 1=1";
    const params = [];
    if (numero) {
      params.push(parseInt(numero));
      query += ` AND h.numero_habitacion = $${params.length}`;
    }
    if (categoria) {
      params.push('%' + categoria + '%');
      query += ` AND c.nombre ILIKE $${params.length}`;
    }
    if (piso) {
      params.push(parseInt(piso));
      query += ` AND h.piso = $${params.length}`;
    }
    if (disponible !== undefined) {
      params.push(disponible === 'true');
      query += ` AND h.disponible = $${params.length}`;
    }
    query += " ORDER BY h.numero_habitacion";
    const result = await queryWithRetry(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo habitaciones para encargado:", err);
    res.status(500).json({ error: "Error al cargar habitaciones" });
  }
});

/**
 * @route GET /api/encargado/reservas
 * @desc Obtener reservas con filtros y paginación
 */
app.get("/api/encargado/reservas", authenticateToken, requireEncargado, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, cliente, id_habitacion, fecha_inicio, fecha_fin } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    let query = `
      SELECT r.*, h.numero_habitacion, u.nombre as cliente_nombre, u.email as cliente_email
      FROM reservas r
      JOIN habitaciones h ON r.id_habitacion = h.id_habitacion
      JOIN usuarios u ON r.id_usuario = u.id
      WHERE 1=1
    `;
    const params = [];
    if (cliente) {
      params.push('%' + cliente + '%');
      query += ` AND (u.nombre ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }
    if (id_habitacion) {
      params.push(parseInt(id_habitacion));
      query += ` AND r.id_habitacion = $${params.length}`;
    }
    if (fecha_inicio) {
      params.push(fecha_inicio);
      query += ` AND r.fecha_checkin >= $${params.length}`;
    }
    if (fecha_fin) {
      params.push(fecha_fin);
      query += ` AND r.fecha_checkout <= $${params.length}`;
    }
    query += ` ORDER BY r.fecha_creacion DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(pageSize), offset);
    const result = await queryWithRetry(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo reservas para encargado:", err);
    res.status(500).json({ error: "Error al cargar reservas" });
  }
});

/**
 * @route GET /api/encargado/reclamos
 * @desc Obtener reclamos con filtros
 */
app.get("/api/encargado/reclamos", authenticateToken, requireEncargado, async (req, res) => {
  try {
    const { texto, habitacion, estado } = req.query;
    let query = `
      SELECT r.*, h.numero_habitacion, u.nombre as cliente
      FROM reclamos r
      LEFT JOIN habitaciones h ON r.id_habitacion = h.id_habitacion
      LEFT JOIN usuarios u ON r.id_usuario = u.id
      WHERE 1=1
    `;
    const params = [];
    if (texto) {
      params.push('%' + texto + '%');
      query += ` AND r.descripcion ILIKE $${params.length}`;
    }
    if (habitacion) {
      params.push(parseInt(habitacion));
      query += ` AND h.numero_habitacion = $${params.length}`;
    }
    if (estado) {
      params.push(estado);
      query += ` AND r.estado = $${params.length}`;
    }
    query += " ORDER BY r.fecha_creacion DESC";
    const result = await queryWithRetry(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo reclamos para encargado:", err);
    res.status(500).json({ error: "Error al cargar reclamos" });
  }
});

/**
 * @route POST /api/encargado/reclamos
 * @desc Crear reclamo
 */
app.post("/api/encargado/reclamos", authenticateToken, requireEncargado, async (req, res) => {
  const { descripcion, numero_habitacion } = req.body;
  if (!descripcion) {
    return res.status(400).json({ error: "Descripción requerida" });
  }
  try {
    let id_habitacion = null;
    if (numero_habitacion) {
      const hab = await queryWithRetry("SELECT id_habitacion FROM habitaciones WHERE numero_habitacion = $1", [parseInt(numero_habitacion)]);
      if (hab.rows.length === 0) {
        return res.status(404).json({ error: "Habitación no encontrada" });
      }
      id_habitacion = hab.rows[0].id_habitacion;
    }
    const result = await queryWithRetry(
      "INSERT INTO reclamos (id_usuario, id_habitacion, descripcion) VALUES ($1, $2, $3) RETURNING *",
      [req.user.id, id_habitacion, descripcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creando reclamo:", err);
    res.status(500).json({ error: "Error al crear reclamo" });
  }
});

/**
 * @route PUT /api/encargado/reservas/:id/completar
 * @desc Completar reserva
 */
app.put("/api/encargado/reservas/:id/completar", authenticateToken, requireEncargado, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await queryWithRetry("UPDATE reservas SET estado_reserva = 'completada' WHERE id_reserva = $1 RETURNING id_habitacion", [parseInt(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }
    const id_habitacion = result.rows[0].id_habitacion;
    await queryWithRetry("UPDATE habitaciones SET disponible = true WHERE id_habitacion = $1", [id_habitacion]);
    res.json({ message: "Reserva completada" });
  } catch (err) {
    console.error("Error completando reserva:", err);
    res.status(500).json({ error: "Error al completar reserva" });
  }
});

/**
 * @route PUT /api/encargado/reclamos/:id/resolver
 * @desc Resolver reclamo
 */
app.put("/api/encargado/reclamos/:id/resolver", authenticateToken, requireEncargado, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await queryWithRetry("UPDATE reclamos SET estado = 'resuelto' WHERE id_reclamo = $1 RETURNING *", [parseInt(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reclamo no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error resolviendo reclamo:", err);
    res.status(500).json({ error: "Error al resolver reclamo" });
  }
});

/**
 * @route GET /api/encargado/habitaciones/:id/fotos
 * @desc Obtener fotos de habitación
 */
app.get("/api/encargado/habitaciones/:id/fotos", authenticateToken, requireEncargado, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await queryWithRetry("SELECT ruta_foto FROM habitaciones_fotos WHERE id_habitacion = $1", [parseInt(id)]);
    res.json(result.rows.map(r => r.ruta_foto));
  } catch (err) {
    console.error("Error obteniendo fotos:", err);
    res.status(500).json({ error: "Error al obtener fotos" });
  }
});

/**
 * @route POST /api/encargado/habitaciones/:id/fotos
 * @desc Subir foto a habitación
 */
app.post("/api/encargado/habitaciones/:id/fotos", authenticateToken, requireEncargado, upload.single('foto'), async (req, res) => {
  const { id } = req.params;
  if (!req.file) {
    return res.status(400).json({ error: "Foto requerida" });
  }
  try {
    const ruta_foto = req.file.filename;
    await queryWithRetry("INSERT INTO habitaciones_fotos (id_habitacion, ruta_foto) VALUES ($1, $2)", [parseInt(id), ruta_foto]);
    res.status(201).json({ ruta_foto });
  } catch (err) {
    console.error("Error subiendo foto:", err);
    res.status(500).json({ error: "Error al subir foto" });
  }
});

/**
 * @route DELETE /api/encargado/habitaciones/:id/fotos
 * @desc Eliminar foto de habitación
 */
app.delete("/api/encargado/habitaciones/:id/fotos", authenticateToken, requireEncargado, async (req, res) => {
  const { id } = req.params;
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "URL requerida" });
  }
  try {
    await queryWithRetry("DELETE FROM habitaciones_fotos WHERE id_habitacion = $1 AND ruta_foto = $2", [parseInt(id), url]);
    const filePath = path.join(uploadDir, url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({ message: "Foto eliminada" });
  } catch (err) {
    console.error("Error eliminando foto:", err);
    res.status(500).json({ error: "Error al eliminar foto" });
  }
});

/**
 * @route POST /api/encargado/habitaciones/:id/fotos/delete
 * @desc Eliminar foto (alternativo)
 */
app.post("/api/encargado/habitaciones/:id/fotos/delete", authenticateToken, requireEncargado, async (req, res) => {
  const { id } = req.params;
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL requerida" });
  }
  try {
    await queryWithRetry("DELETE FROM habitaciones_fotos WHERE id_habitacion = $1 AND ruta_foto = $2", [parseInt(id), url]);
    const filePath = path.join(uploadDir, url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({ message: "Foto eliminada" });
  } catch (err) {
    console.error("Error eliminando foto:", err);
    res.status(500).json({ error: "Error al eliminar foto" });
  }
});

/**
 * @route GET /api/encargado/reservas/stream
 * @desc SSE stream for reservas
 */
app.get("/api/encargado/reservas/stream", authenticateToken, requireEncargado, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

/**
 * =========================
 * RUTAS DEL SISTEMA DE PAGOS
 * =========================
 */

// Importar servicio de pagos
const paymentService = require('./payment_service');

// Iniciar actualizador automático de estados (cada 5 minutos)
setInterval(() => {
  paymentService.actualizarEstadosReservas().catch(err => {
    console.error('Error en actualizador automático:', err);
  });
}, 5 * 60 * 1000);

/**
 * @route POST /api/pagos/procesar
 * @desc Procesar un pago para una reserva
 */
app.post("/api/pagos/procesar", authenticateToken, async (req, res) => {
  const { id_reserva, monto, metodo_pago, tipo_pago, comprobante } = req.body;
  
  try {
    // Validaciones
    if (!id_reserva || !monto || !metodo_pago || !tipo_pago) {
      return res.status(400).json({ 
        error: "Faltan campos obligatorios: id_reserva, monto, metodo_pago, tipo_pago" 
      });
    }

    // Validar método de pago
    if (!['tarjeta', 'yape', 'plin'].includes(metodo_pago)) {
      return res.status(400).json({ 
        error: "Método de pago inválido. Use: tarjeta, yape o plin" 
      });
    }

    // Validar tipo de pago
    if (!['adelanto', 'restante', 'completo'].includes(tipo_pago)) {
      return res.status(400).json({ 
        error: "Tipo de pago inválido. Use: adelanto, restante o completo" 
      });
    }

    // Validar monto mínimo del 50% si es adelanto
    if (tipo_pago === 'adelanto') {
      const reserva = await queryWithRetry(
        'SELECT monto_total FROM reservas WHERE id_reserva = $1',
        [id_reserva]
      );
      
      if (reserva.rows.length === 0) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }

      const montoTotal = parseFloat(reserva.rows[0].monto_total);
      const porcentaje = (parseFloat(monto) / montoTotal) * 100;

      if (porcentaje < 50) {
        return res.status(400).json({ 
          error: `El adelanto debe ser mínimo el 50% del total (${(montoTotal * 0.5).toFixed(2)}). Monto recibido: ${monto}`,
          montoMinimo: (montoTotal * 0.5).toFixed(2)
        });
      }
    }

    // Procesar el pago
    const resultado = await paymentService.procesarPago(
      id_reserva,
      monto,
      metodo_pago,
      tipo_pago,
      comprobante
    );

    res.json({
      message: 'Pago procesado exitosamente',
      ...resultado
    });

  } catch (err) {
    console.error("Error procesando pago:", err);
    res.status(500).json({ 
      error: "Error al procesar pago", 
      detalle: err.message 
    });
  }
});

/**
 * @route GET /api/pagos/reserva/:id
 * @desc Obtener historial de pagos de una reserva
 */
app.get("/api/pagos/reserva/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const historial = await paymentService.obtenerHistorialPagos(parseInt(id));
    res.json(historial);
  } catch (err) {
    console.error("Error obteniendo historial de pagos:", err);
    res.status(500).json({ error: "Error al obtener historial de pagos" });
  }
});

/**
 * @route GET /api/cliente/reservas/con-pagos
 * @desc Obtener reservas del cliente con información de pagos
 */
app.get("/api/cliente/reservas/con-pagos", authenticateToken, async (req, res) => {
  try {
    const result = await queryWithRetry(
      `SELECT r.id_reserva, r.fecha_checkin, r.fecha_checkout, r.estado_reserva, 
              r.estado_pago, r.monto_total, r.monto_pagado, r.monto_pendiente, 
              r.porcentaje_pagado, r.fecha_creacion,
              h.numero_habitacion, h.id_habitacion, h.precio_por_dia,
              c.nombre AS categoria,
              COALESCE(ARRAY_AGG(f.ruta_foto) FILTER (WHERE f.ruta_foto IS NOT NULL), '{}') AS fotos
       FROM public.reservas r
       JOIN public.habitaciones h ON r.id_habitacion = h.id_habitacion
       JOIN public.categorias_habitaciones c ON h.id_categoria = c.id_categoria
       LEFT JOIN public.habitaciones_fotos f ON h.id_habitacion = f.id_habitacion
       WHERE r.id_usuario = $1
       GROUP BY r.id_reserva, h.numero_habitacion, h.id_habitacion, h.precio_por_dia, c.nombre
       ORDER BY r.fecha_creacion DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo reservas con pagos:", err);
    res.status(500).json({ error: "Error al obtener reservas" });
  }
});

/**
 * @route GET /api/admin/reservas/con-pagos
 * @desc Obtener todas las reservas con información de pagos (Admin/Encargado)
 */
app.get("/api/admin/reservas/con-pagos", authenticateToken, requireEncargado, async (req, res) => {
  try {
    const result = await queryWithRetry(
      `SELECT r.*, r.estado_pago, r.monto_total, r.monto_pagado, 
              r.monto_pendiente, r.porcentaje_pagado,
              h.numero_habitacion, h.precio_por_dia,
              u.nombre as cliente_nombre, u.email as cliente_email
       FROM reservas r 
       JOIN habitaciones h ON r.id_habitacion = h.id_habitacion 
       JOIN usuarios u ON r.id_usuario = u.id 
       ORDER BY r.fecha_creacion DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo reservas con pagos:", err);
    res.status(500).json({ error: "Error al obtener reservas" });
  }
});

/**
 * @route POST /api/chat
 * @desc Chat con IA local (Ollama) para usuarios autenticados
 */
app.post("/api/chat", authenticateToken, async (req, res) => {
  const { pregunta } = req.body;

  // Paso A: Validar pregunta
  if (!pregunta || typeof pregunta !== 'string' || pregunta.trim().length === 0) {
    return res.status(400).json({ error: 'Pregunta requerida' });
  }

  // Respuesta rápida para saludos
  const preguntaLower = pregunta.trim().toLowerCase();
  if (['hola', 'Hola', 'Holi', 'holi' , 'Hello', 'hello', 'Hi' , 'Buenas tardes','Buenas noches', 'buenas noches', 'buenos días', 'buenas tardes' , 'hi', 'buenos días'].includes(preguntaLower)) {
    return res.json({ respuesta: "¡Hola! Bienvenido a HotelBot. ¿En qué puedo ayudarte hoy?" });
  }

  try {
    // Paso B: Buscar contexto relevante en faq_hotel
    const palabrasClave = pregunta.trim().toLowerCase().split(/\s+/);
    let contexto = '';
    for (const palabra of palabrasClave) {
      if (palabra.length > 2) { // Ignorar palabras muy cortas
        const result = await queryWithRetry(
          "SELECT respuesta FROM faq_hotel WHERE LOWER(pregunta) ILIKE $1 OR LOWER(respuesta) ILIKE $1 LIMIT 3",
          [`%${palabra}%`]
        );
        for (const row of result.rows) {
          if (!contexto.includes(row.respuesta)) {
            contexto += row.respuesta + '\n';
          }
        }
      }
    }

    // Paso C: Armar el Súper-Prompt
    const superPrompt = `Eres 'HotelBot', el asistente virtual amigable y profesional del Hotel JW Marriott.

Información del hotel:
- Ubicación: Av. Malecón de la Reserva 615, Miraflores, Lima, Perú
- Servicios: Wi-Fi de alta velocidad, spa, gimnasio, restaurantes, salones para eventos
- Categorías de habitaciones: Estándar, Matrimonial, Deluxe, Junior Suite
- Horario de check-in: 15:00, check-out: 12:00

Contexto relevante de la base de conocimientos:
${contexto || 'No hay información específica disponible.'}

Pregunta del usuario: "${pregunta.trim()}"

Mantén TODAS tus respuestas breves y concisas. Nunca uses más de 3 frases, a menos que el usuario te pida explícitamente más detalles.`;

    // Paso D: Enviar a Ollama
    const ollamaResponse = await axios.post('http://localhost:11434/api/chat', {
      model: 'llama3',
      messages: [{ role: 'user', content: superPrompt }],
      stream: false
    });

    // Paso E: Procesar respuesta
    const respuesta = ollamaResponse.data?.message?.content?.trim() || 'Lo siento, no pude generar una respuesta.';

    res.json({ respuesta });
  } catch (error) {
    console.error('Error en chat con Ollama:', error);

    // Respuestas de fallback en caso de error
    const fallbacks = [
      "Lo siento, estoy teniendo dificultades técnicas. Por favor, contacta directamente con el hotel al teléfono (999-999-999) o por email a Teycketan@gmail.com.",
      "Disculpa, mi sistema de IA no está disponible en este momento. Te recomiendo visitar nuestra sección de contacto para más información.",
      "Hay un problema con mi conexión. Para asistencia inmediata, puedes llamar al (999-999-999) o escribir a Teycketan@gmail.com."
    ];

    const respuesta = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    res.json({ respuesta });
  }
});

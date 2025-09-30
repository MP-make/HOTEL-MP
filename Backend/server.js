// server.js (completo, mejorado)
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
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
schema: 'public'
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

// Configuración de almacenamiento de imágenes para habitaciones
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
    const uniqueName = `${Date.now()}-${file.originalname}`;
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
 * @route GET /api/cliente/reservas
 * @desc Obtener reservas del cliente autenticado
 */
app.get("/api/cliente/reservas", authenticateToken, async (req, res) => {
  try {
    const result = await queryWithRetry(
      `SELECT r.id_reserva, r.fecha_checkin, r.fecha_checkout, r.estado_reserva, r.fecha_creacion,
              h.numero_habitacion, c.nombre AS categoria
       FROM public.reservas r
       JOIN public.habitaciones h ON r.id_habitacion = h.id_habitacion
       JOIN public.categorias_habitaciones c ON h.id_categoria = c.id_categoria
       WHERE r.id_usuario = $1
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
 * =========================
 * RUTAS DEL ADMIN - CATEGORÍAS (CRUD)
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
 * @desc Obtener la configuración del hotel (pisos y habitaciones por piso)
 */
app.get("/api/admin/hotel-config", authenticateToken, requireAdmin, async (req, res) => {
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
 * @desc Obtener todas las habitaciones
 */
app.get("/api/admin/habitaciones", authenticateToken, requireAdmin, async (req, res) => {
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
 * @desc Obtener imágenes del carrusel
 */
app.get("/api/admin/carrusel", authenticateToken, requireAdmin, async (req, res) => {
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
 * @desc Subir imágenes al carrusel
 */
app.post("/api/admin/carrusel", authenticateToken, requireAdmin, uploadCarousel.array('fotos'), async (req, res) => {
  try {
    res.status(201).json({ message: 'Imágenes subidas correctamente' });
  } catch (err) {
    console.error("Error subiendo carrusel:", err);
    res.status(500).json({ error: "Error al subir imágenes" });
  }
});

/**
 * @route DELETE /api/admin/carrusel/:filename
 * @desc Eliminar imagen del carrusel
 */
app.delete("/api/admin/carrusel/:filename", authenticateToken, requireAdmin, async (req, res) => {
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
    const images = files.map(file => ({ url: `/img/carousel/${file}`, descripcion: '' }));
    res.json({ images });
  } catch (err) {
    console.error("Error obteniendo carrusel público:", err);
    res.status(500).json({ error: "Error al obtener carrusel" });
  }
});

/**
 * @route GET /api/admin/reservas
 * @desc Obtener todas las reservas
 */
app.get("/api/admin/reservas", authenticateToken, requireAdmin, async (req, res) => {
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
 * @desc Completar reserva
 */
app.put("/api/admin/reservas/:id/completar", authenticateToken, requireAdmin, async (req, res) => {
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
 * @route GET /api/admin/encargados
 * @desc Obtener encargados
 */
app.get("/api/admin/encargados", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await queryWithRetry("SELECT id, nombre, email FROM usuarios WHERE rol = (SELECT id_rol FROM roles WHERE nombre = 'encargado')");
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo encargados:", err);
    res.status(500).json({ error: "Error al obtener encargados" });
  }
});

/**
 * @route POST /api/admin/habitaciones
 * @desc Crear una nueva habitación
 */
app.post("/api/admin/habitaciones", authenticateToken, requireAdmin, upload.array('fotos'), async (req, res) => {
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

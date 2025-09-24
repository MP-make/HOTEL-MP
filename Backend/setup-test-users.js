// Script para crear usuarios de prueba y verificar la base de datos
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function createTestUsers() {
  console.log('🔧 CONFIGURANDO USUARIOS DE PRUEBA...\n');
  
  try {
    // 1. Verificar y crear roles necesarios
    console.log('📋 PASO 1: Verificando roles...');
    const rolesNeeded = ['cliente', 'encargado', 'admin'];
    
    for (const roleName of rolesNeeded) {
      const roleExists = await pool.query('SELECT id_rol FROM public.roles WHERE nombre = $1', [roleName]);
      
      if (roleExists.rows.length === 0) {
        await pool.query('INSERT INTO public.roles (nombre) VALUES ($1)', [roleName]);
        console.log(`✅ Rol creado: ${roleName}`);
      } else {
        console.log(`✅ Rol ya existe: ${roleName} (ID: ${roleExists.rows[0].id_rol})`);
      }
    }

    // 2. Obtener ID del rol admin
    const adminRoleRes = await pool.query('SELECT id_rol FROM public.roles WHERE nombre = $1', ['admin']);
    const adminRoleId = adminRoleRes.rows[0].id_rol;

    // 3. Verificar si el usuario admin ya existe
    console.log('\n👤 PASO 2: Verificando usuario admin...');
    const adminExists = await pool.query('SELECT id, email FROM public.usuarios WHERE email = $1', ['admin@test.com']);
    
    if (adminExists.rows.length === 0) {
      // Crear usuario admin
      console.log('🔨 Creando usuario admin...');
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash('admin123', saltRounds);
      
      const result = await pool.query(
        'INSERT INTO public.usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email',
        ['Administrador', 'admin@test.com', passwordHash, adminRoleId]
      );
      
      console.log('✅ Usuario admin creado exitosamente:');
      console.log('   - ID:', result.rows[0].id);
      console.log('   - Nombre:', result.rows[0].nombre);
      console.log('   - Email:', result.rows[0].email);
    } else {
      console.log('✅ Usuario admin ya existe (ID:', adminExists.rows[0].id, ')');
      
      // Verificar que tenga el rol correcto
      const userRole = await pool.query(`
        SELECT r.nombre as rol 
        FROM public.usuarios u 
        JOIN public.roles r ON u.rol = r.id_rol 
        WHERE u.email = $1
      `, ['admin@test.com']);
      
      if (userRole.rows[0].rol !== 'admin') {
        console.log('🔄 Actualizando rol del usuario a admin...');
        await pool.query('UPDATE public.usuarios SET rol = $1 WHERE email = $2', [adminRoleId, 'admin@test.com']);
        console.log('✅ Rol actualizado a admin');
      }
    }

    // 4. Verificar categorías de habitaciones
    console.log('\n🏷️  PASO 3: Verificando categorías de habitaciones...');
    const categorias = await pool.query('SELECT * FROM public.categorias_habitaciones ORDER BY id_categoria');
    
    if (categorias.rows.length === 0) {
      console.log('🔨 Creando categorías de ejemplo...');
      const categoriasEjemplo = [
        { nombre: 'Estándar', descripcion: 'Habitación básica con todas las comodidades' },
        { nombre: 'Matrimonial', descripcion: 'Habitación espaciosa para parejas' },
        { nombre: 'Suite', descripcion: 'Habitación de lujo con sala independiente' },
        { nombre: 'Familiar', descripcion: 'Habitación amplia ideal para familias' }
      ];
      
      for (const cat of categoriasEjemplo) {
        const result = await pool.query(
          'INSERT INTO public.categorias_habitaciones (nombre, descripcion) VALUES ($1, $2) RETURNING *',
          [cat.nombre, cat.descripcion]
        );
        console.log(`✅ Categoría creada: ${result.rows[0].nombre} (ID: ${result.rows[0].id_categoria})`);
      }
    } else {
      console.log(`✅ ${categorias.rows.length} categorías ya existen:`);
      categorias.rows.forEach(cat => {
        console.log(`   - ${cat.nombre} (ID: ${cat.id_categoria})`);
      });
    }

    console.log('\n🎉 ¡CONFIGURACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('🔑 Credenciales del admin:');
    console.log('   Email: admin@test.com');
    console.log('   Password: admin123');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error configurando usuarios:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createTestUsers().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { createTestUsers };
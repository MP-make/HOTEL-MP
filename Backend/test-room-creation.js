// Test completo para diagnosticar el problema de crear habitaciones
const fetch = require('node-fetch').default || require('node-fetch');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:4000';

async function runCompleteRoomCreationTest() {
  console.log('🧪 INICIANDO TEST COMPLETO DE CREACIÓN DE HABITACIONES\n');
  
  try {
    // Paso 1: Login como admin
    console.log('🔐 PASO 1: Login como admin...');
    const loginRes = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'admin123'
      })
    });

    if (!loginRes.ok) {
      const loginError = await loginRes.text();
      console.error('❌ Error en login:', loginError);
      return false;
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ Login exitoso - Token obtenido');

    // Paso 2: Obtener categorías disponibles
    console.log('\n📋 PASO 2: Obteniendo categorías...');
    const categoriasRes = await fetch(`${BASE_URL}/api/admin/categorias`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!categoriasRes.ok) {
      const categoriaError = await categoriasRes.text();
      console.error('❌ Error obteniendo categorías:', categoriaError);
      return false;
    }

    const categorias = await categoriasRes.json();
    console.log(`✅ ${categorias.length} categorías obtenidas:`);
    categorias.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.nombre} (ID: ${cat.id_categoria})`);
    });

    if (categorias.length === 0) {
      console.error('❌ No hay categorías disponibles. Creando una categoría de prueba...');
      
      const nuevaCategoriaRes = await fetch(`${BASE_URL}/api/admin/categorias`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: 'Categoria de Prueba',
          descripcion: 'Categoria creada automáticamente para testing'
        })
      });

      if (nuevaCategoriaRes.ok) {
        const nuevaCategoria = await nuevaCategoriaRes.json();
        categorias.push(nuevaCategoria);
        console.log('✅ Categoría de prueba creada:', nuevaCategoria.nombre);
      } else {
        const error = await nuevaCategoriaRes.text();
        console.error('❌ Error creando categoría de prueba:', error);
        return false;
      }
    }

    // Paso 3: Crear habitación usando FormData (método correcto para multer)
    console.log('\n🏠 PASO 3: Creando habitación con FormData...');
    const formData = new FormData();
    const numeroHabitacion = `TEST-${Date.now()}`;
    
    formData.append('numero_habitacion', numeroHabitacion);
    formData.append('id_categoria', categorias[0].id_categoria.toString());
    formData.append('precio_por_dia', '99.99');
    formData.append('precio_por_hora', '19.99');
    formData.append('piso', '2');
    formData.append('capacidad', '4');
    formData.append('disponible', 'true');

    console.log('📤 Datos que se enviarán:');
    console.log('   - numero_habitacion:', numeroHabitacion);
    console.log('   - id_categoria:', categorias[0].id_categoria);
    console.log('   - precio_por_dia: 99.99');
    console.log('   - precio_por_hora: 19.99');
    console.log('   - piso: 2');
    console.log('   - capacidad: 4');

    const createRes = await fetch(`${BASE_URL}/api/admin/habitaciones`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    console.log('\n📨 Respuesta del servidor:');
    console.log('   Status:', createRes.status);
    console.log('   Status Text:', createRes.statusText);

    const responseText = await createRes.text();
    console.log('   Body:', responseText);

    if (createRes.ok) {
      console.log('\n🎉 ¡ÉXITO! Habitación creada correctamente');
      const result = JSON.parse(responseText);
      console.log('✅ Respuesta:', result);

      // Paso 4: Verificar que la habitación se guardó en la base de datos
      console.log('\n🔍 PASO 4: Verificando en la base de datos...');
      const habitacionesRes = await fetch(`${BASE_URL}/api/admin/habitaciones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (habitacionesRes.ok) {
        const habitaciones = await habitacionesRes.json();
        const nuevaHabitacion = habitaciones.find(h => h.numero_habitacion === numeroHabitacion);
        
        if (nuevaHabitacion) {
          console.log('✅ Habitación encontrada en la base de datos:');
          console.log('   - ID:', nuevaHabitacion.id_habitacion);
          console.log('   - Número:', nuevaHabitacion.numero_habitacion);
          console.log('   - Categoría:', nuevaHabitacion.categoria);
          console.log('   - Precio por día:', nuevaHabitacion.precio_por_dia);
          console.log('   - Disponible:', nuevaHabitacion.disponible);
        } else {
          console.error('❌ La habitación no se encontró en la base de datos');
          return false;
        }
      }

      return true;
    } else {
      console.error('\n❌ ERROR AL CREAR HABITACIÓN');
      console.error('Status:', createRes.status);
      
      try {
        const errorData = JSON.parse(responseText);
        console.error('Error:', errorData.error || errorData.message || 'Error desconocido');
        if (errorData.detalle) {
          console.error('Detalle:', errorData.detalle);
        }
      } catch (e) {
        console.error('Respuesta del servidor:', responseText);
      }
      
      return false;
    }

  } catch (error) {
    console.error('\n💥 ERROR CRÍTICO EN EL TEST:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Función para probar diferentes métodos si el primero falla
async function testAlternativeMethods(token, categorias) {
  console.log('\n🔄 PROBANDO MÉTODOS ALTERNATIVOS...');
  
  // Método 2: JSON directo (sin FormData)
  console.log('\n📋 Método 2: Enviando datos como JSON...');
  const jsonRes = await fetch(`${BASE_URL}/api/admin/habitaciones`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      numero_habitacion: `JSON-TEST-${Date.now()}`,
      id_categoria: categorias[0].id_categoria,
      precio_por_dia: '75.50',
      precio_por_hora: '15.00',
      piso: 1,
      capacidad: 2,
      disponible: true
    })
  });

  console.log('Status JSON:', jsonRes.status);
  const jsonResponse = await jsonRes.text();
  console.log('Response JSON:', jsonResponse);
}

// Ejecutar el test
if (require.main === module) {
  runCompleteRoomCreationTest().then(success => {
    if (success) {
      console.log('\n🏆 ¡TEST COMPLETADO EXITOSAMENTE!');
      console.log('✨ El sistema de creación de habitaciones funciona correctamente.');
    } else {
      console.log('\n💔 EL TEST FALLÓ - Investigando causas posibles...');
      console.log('\n🔧 POSIBLES SOLUCIONES:');
      console.log('1. Verificar que el servidor esté corriendo en http://localhost:4000');
      console.log('2. Verificar que existe el usuario admin@test.com con password admin123');
      console.log('3. Verificar que multer esté instalado correctamente');
      console.log('4. Verificar la conexión a la base de datos');
      console.log('5. Revisar los logs del servidor para más detalles');
    }
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runCompleteRoomCreationTest };
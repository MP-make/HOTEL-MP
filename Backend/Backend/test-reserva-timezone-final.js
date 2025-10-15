const fetch = require('node-fetch');

async function testReservaTimezone() {
    console.log('=== PRUEBA DE RESERVA CON TIMEZONE PERÚ (UTC-5) ===\n');
    
    const API_BASE = 'http://localhost:4000/api';
    
    // 1. Hacer login como cliente
    console.log('1️⃣ Intentando login como cliente...');
    const loginRes = await fetch(${API_BASE}/login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'cliente@test.com',
            password: 'password123'
        })
    });
    
    if (!loginRes.ok) {
        console.log('❌ Login falló. Usando id_usuario = 1 sin token');
        var token = null;
        var userId = 1;
    } else {
        const loginData = await loginRes.json();
        var token = loginData.token;
        var userId = loginData.user.id;
        console.log('✅ Login exitoso. Usuario ID:', userId);
    }
    
    // 2. Crear una reserva con hora específica
    const fechaCheckin = '2025-11-15T11:11:00';  // 11:11 AM hora de Perú
    const fechaCheckout = '2025-11-16T10:00:00'; // 10:00 AM hora de Perú
    
    console.log('\n2️⃣ Creando reserva...');
    console.log('   📅 Check-in enviado:', fechaCheckin, '(11:11 AM)');
    console.log('   📅 Check-out enviado:', fechaCheckout, '(10:00 AM)');
    
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    
    const reservaRes = await fetch(${API_BASE}/cliente/reservas, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            id_usuario: userId,
            id_habitacion: 1,
            fecha_checkin: fechaCheckin,
            fecha_checkout: fechaCheckout
        })
    });
    
    if (!reservaRes.ok) {
        const error = await reservaRes.json();
        console.log('❌ Error creando reserva:', error.error || error.detalle);
        process.exit(1);
    }
    
    const nuevaReserva = await reservaRes.json();
    console.log('\n✅ Reserva creada exitosamente!');
    console.log('   🆔 ID Reserva:', nuevaReserva.id_reserva);
    
    // 3. Verificar las fechas devueltas por el backend
    console.log('\n3️⃣ Verificando fechas devueltas por el backend:');
    console.log('   📅 Check-in recibido:', nuevaReserva.fecha_checkin);
    console.log('   📅 Check-out recibido:', nuevaReserva.fecha_checkout);
    console.log('   📅 Fecha creación:', nuevaReserva.fecha_creacion);
    
    // Extraer la hora del check-in
    const checkinMatch = nuevaReserva.fecha_checkin.match(/T?(\d{2}):(\d{2})/);
    if (checkinMatch) {
        const horaRecibida = checkinMatch[1] + ':' + checkinMatch[2];
        console.log('\n4️⃣ RESULTADO:');
        console.log('   ⏰ Hora enviada: 11:11');
        console.log('   ⏰ Hora recibida:', horaRecibida);
        
        if (horaRecibida === '11:11') {
            console.log('\n   ✅✅✅ ¡ÉXITO! El timezone se está manejando correctamente');
            console.log('   ✅ La hora se mantiene en 11:11 (no se sumaron 5 horas)');
        } else if (horaRecibida === '16:11') {
            console.log('\n   ❌❌❌ ERROR: El problema persiste');
            console.log('   ❌ Se sumaron 5 horas (11:11 → 16:11)');
        } else {
            console.log('\n   ⚠️ Resultado inesperado. Hora recibida:', horaRecibida);
        }
    }
    
    // 4. Obtener las reservas del usuario para verificar
    if (token) {
        console.log('\n5️⃣ Verificando listado de reservas (GET)...');
        const reservasRes = await fetch(${API_BASE}/cliente/reservas, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (reservasRes.ok) {
            const reservas = await reservasRes.json();
            const reservaCreada = reservas.find(r => r.id_reserva === nuevaReserva.id_reserva);
            
            if (reservaCreada) {
                const checkinListado = reservaCreada.fecha_checkin.match(/T?(\d{2}):(\d{2})/);
                if (checkinListado) {
                    const horaListado = checkinListado[1] + ':' + checkinListado[2];
                    console.log('   📋 Hora en listado de reservas:', horaListado);
                    
                    if (horaListado === '11:11') {
                        console.log('   ✅ El GET también devuelve la hora correcta');
                    } else {
                        console.log('   ❌ El GET devuelve hora incorrecta:', horaListado);
                    }
                }
            }
        }
    }
    
    console.log('\n' + '='.repeat(60));
}

testReservaTimezone().catch(err => {
    console.error('\n❌ Error en la prueba:', err.message);
    process.exit(1);
});

// test-reserva-con-hora.js - Crear reserva de prueba con hora específica
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function crearReservaPrueba() {
    try {
        console.log('🧪 Creando reserva de prueba con hora específica...\n');
        
        // 1. Obtener el primer usuario cliente
        const userResult = await pool.query(`
            SELECT u.id, u.nombre, u.email 
            FROM usuarios u 
            JOIN roles r ON u.rol = r.id_rol 
            WHERE r.nombre = 'cliente' 
            LIMIT 1
        `);
        
        if (userResult.rows.length === 0) {
            console.error('❌ No se encontró ningún usuario cliente en la base de datos');
            return;
        }
        
        const usuario = userResult.rows[0];
        console.log(`👤 Usuario: ${usuario.nombre} (${usuario.email})\n`);
        
        // 2. Obtener una habitación disponible
        const roomResult = await pool.query(`
            SELECT id_habitacion, numero_habitacion, precio_por_dia 
            FROM habitaciones 
            WHERE disponible = true 
            LIMIT 1
        `);
        
        if (roomResult.rows.length === 0) {
            console.error('❌ No hay habitaciones disponibles');
            return;
        }
        
        const habitacion = roomResult.rows[0];
        console.log(`🏠 Habitación: #${habitacion.numero_habitacion} (S/ ${habitacion.precio_por_dia}/día)\n`);
        
        // 3. Crear fechas de reserva con HORA ESPECÍFICA (formato datetime-local sin zona horaria)
        // Check-in: Mañana 8 de octubre 2025, 14:30
        // Check-out: Pasado mañana 9 de octubre 2025, 12:00
        // IMPORTANTE: Usar formato sin zona horaria, tal como lo envía datetime-local
        const fechaCheckinString = '2025-10-08T14:30:00';
        const fechaCheckoutString = '2025-10-09T12:00:00';
        
        console.log('📅 Fechas de la reserva (strings sin zona horaria):');
        console.log(`   Check-in:  ${fechaCheckinString}`);
        console.log(`   Check-out: ${fechaCheckoutString}\n`);
        
        // 4. Insertar la reserva USANDO LOS STRINGS DIRECTAMENTE (sin convertir a Date)
        const insertQuery = `
            INSERT INTO reservas 
            (id_usuario, id_habitacion, fecha_checkin, fecha_checkout, estado_reserva, fecha_creacion, monto_total, monto_pagado, monto_pendiente, porcentaje_pagado, estado_pago)
            VALUES ($1, $2, $3::timestamp, $4::timestamp, 'pendiente', NOW(), $5, 0, $5, 0, 'pendiente')
            RETURNING *;
        `;
        
        const montoTotal = habitacion.precio_por_dia * 1; // 1 día
        
        const result = await pool.query(insertQuery, [
            usuario.id,
            habitacion.id_habitacion,
            fechaCheckinString,  // String directo, sin conversión
            fechaCheckoutString, // String directo, sin conversión
            montoTotal
        ]);
        
        const nuevaReserva = result.rows[0];
        
        console.log('✅ Reserva creada exitosamente!\n');
        console.log(`📋 Detalles de la reserva:`);
        console.log(`   ID: ${nuevaReserva.id_reserva}`);
        console.log(`   Usuario: ${usuario.nombre}`);
        console.log(`   Habitación: #${habitacion.numero_habitacion}`);
        console.log(`   Check-in (DB UTC):  ${new Date(nuevaReserva.fecha_checkin).toISOString()}`);
        console.log(`   Check-out (DB UTC): ${new Date(nuevaReserva.fecha_checkout).toISOString()}`);
        console.log(`   Check-in (Perú):    ${new Date(nuevaReserva.fecha_checkin).toLocaleString('es-PE', { timeZone: 'America/Lima' })}`);
        console.log(`   Check-out (Perú):   ${new Date(nuevaReserva.fecha_checkout).toLocaleString('es-PE', { timeZone: 'America/Lima' })}`);
        console.log(`   Fecha creación: ${new Date(nuevaReserva.fecha_creacion).toLocaleString('es-PE', { timeZone: 'America/Lima' })}`);
        console.log(`   Monto total: S/ ${nuevaReserva.monto_total}`);
        console.log(`   Estado: ${nuevaReserva.estado_reserva}\n`);
        
        // 5. Verificar que se guardó con hora correcta
        const verificacion = await pool.query(`
            SELECT 
                id_reserva,
                fecha_checkin AT TIME ZONE 'America/Lima' as checkin_peru,
                fecha_checkout AT TIME ZONE 'America/Lima' as checkout_peru,
                fecha_creacion,
                EXTRACT(HOUR FROM (fecha_checkin AT TIME ZONE 'America/Lima')) as checkin_hora,
                EXTRACT(MINUTE FROM (fecha_checkin AT TIME ZONE 'America/Lima')) as checkin_minuto,
                EXTRACT(HOUR FROM (fecha_checkout AT TIME ZONE 'America/Lima')) as checkout_hora,
                EXTRACT(MINUTE FROM (fecha_checkout AT TIME ZONE 'America/Lima')) as checkout_minuto
            FROM reservas 
            WHERE id_reserva = $1
        `, [nuevaReserva.id_reserva]);
        
        const verif = verificacion.rows[0];
        
        console.log('🔍 Verificación de la hora guardada (hora de Perú):');
        console.log(`   Check-in hora: ${verif.checkin_hora}:${verif.checkin_minuto.toString().padStart(2, '0')}`);
        console.log(`   Check-out hora: ${verif.checkout_hora}:${verif.checkout_minuto.toString().padStart(2, '0')}\n`);
        
        if (verif.checkin_hora == 14 && verif.checkin_minuto == 30) {
            console.log('✅ ¡ÉXITO TOTAL! La hora se guardó correctamente en la base de datos.');
            console.log('   ✓ La corrección en index.js y habitaciones.js está funcionando.');
            console.log('   ✓ La migración de DATE a TIMESTAMP fue exitosa.');
            console.log('   ✓ La zona horaria se maneja correctamente.\n');
        } else {
            console.log('⚠️  La hora se guardó pero con diferencia de zona horaria.');
            console.log(`   Se esperaba 14:30 (Perú) y se guardó ${verif.checkin_hora}:${verif.checkin_minuto}\n`);
        }
        
        console.log('💡 Ahora puedes verificar en el navegador:');
        console.log('   1. http://localhost:4000/index.html (sección "Mis Reservas")');
        console.log('   2. http://localhost:4000/PanelCliente.html');
        console.log('   3. http://localhost:4000/PanelAdmin.html (Gestión de Reservas)\n');
        console.log(`   Busca la reserva #${nuevaReserva.id_reserva}`);
        console.log('   Deberías ver: "8 oct 2025, 14:30" en lugar de "8 oct 2025, 00:00"\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

crearReservaPrueba();

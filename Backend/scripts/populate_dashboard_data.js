const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

async function populateDashboardData() {
  try {
    console.log('🔄 Actualizando datos para el Dashboard del 24 de noviembre de 2025...\n');

    // FECHAS IMPORTANTES (HOY = 24 nov 2025)
    const hoy = new Date('2025-11-24T10:00:00Z');
    const ayer = new Date('2025-11-23T10:00:00Z');
    const manana = new Date('2025-11-25T12:00:00Z');
    const en3Dias = new Date('2025-11-27T12:00:00Z');
    const en7Dias = new Date('2025-12-01T12:00:00Z');
    const mesAnterior = new Date('2025-10-24T10:00:00Z');

    // 1. ACTUALIZAR RESERVAS PARA HOY (CHECK-INS HOY)
    console.log('1️⃣ Configurando reservas con check-in HOY...');
    
    await pool.query(`
      UPDATE reservas 
      SET estado_reserva = 'confirmada',
          fecha_checkin = $1,
          fecha_checkout = $2,
          monto_total = 180,
          monto_pagado = 90,
          monto_pendiente = 90,
          estado_pago = 'parcial',
          porcentaje_pagado = 50
      WHERE id_reserva IN (
        SELECT id_reserva FROM reservas ORDER BY id_reserva DESC LIMIT 3
      )
    `, [hoy, manana]);
    
    const checkinsHoy = await pool.query(`
      SELECT COUNT(*) as count FROM reservas 
      WHERE DATE(fecha_checkin) = DATE($1) AND estado_reserva != 'cancelada'
    `, [hoy]);
    console.log(`   ✓ Check-ins configurados para hoy: ${checkinsHoy.rows[0].count}`);

    // 2. ACTUALIZAR RESERVAS ACTIVAS (OCUPACIÓN ACTUAL)
    console.log('\n2️⃣ Configurando habitaciones OCUPADAS actualmente...');
    
    await pool.query(`
      UPDATE reservas 
      SET estado_reserva = 'confirmada',
          fecha_checkin = $1,
          fecha_checkout = $2,
          monto_total = 200,
          monto_pagado = 200,
          monto_pendiente = 0,
          estado_pago = 'completado',
          porcentaje_pagado = 100
      WHERE id_reserva IN (
        SELECT id_reserva FROM reservas ORDER BY id_reserva DESC OFFSET 3 LIMIT 5
      )
    `, [ayer, en3Dias]);
    
    const ocupadas = await pool.query(`
      SELECT COUNT(DISTINCT id_habitacion) as count FROM reservas
      WHERE estado_reserva = 'confirmada'
        AND fecha_checkin <= $1
        AND fecha_checkout > $1
    `, [hoy]);
    console.log(`   ✓ Habitaciones ocupadas ahora: ${ocupadas.rows[0].count}`);

    // 3. ACTUALIZAR PAGOS DE HOY
    console.log('\n3️⃣ Registrando pagos de HOY...');
    
    await pool.query(`
      UPDATE pagos 
      SET fecha_pago = $1,
          monto = 90
      WHERE id_pago IN (
        SELECT id_pago FROM pagos ORDER BY id_pago DESC LIMIT 5
      )
    `, [hoy]);
    
    const ingresosHoy = await pool.query(`
      SELECT COALESCE(SUM(monto), 0) as total FROM pagos
      WHERE DATE(fecha_pago) = DATE($1)
    `, [hoy]);
    console.log(`   ✓ Ingresos del día: $${ingresosHoy.rows[0].total}`);

    // 4. CREAR RESERVAS FUTURAS (PRÓXIMOS 7 DÍAS)
    console.log('\n4️⃣ Configurando reservas para los próximos 7 días...');
    
    await pool.query(`
      UPDATE reservas 
      SET estado_reserva = 'pendiente',
          fecha_checkin = $1,
          fecha_checkout = $2,
          monto_total = 250,
          monto_pagado = 0,
          monto_pendiente = 250,
          estado_pago = 'pendiente',
          porcentaje_pagado = 0
      WHERE id_reserva IN (
        SELECT id_reserva FROM reservas ORDER BY id_reserva DESC OFFSET 8 LIMIT 4
      )
    `, [en3Dias, en7Dias]);
    
    const futuras = await pool.query(`
      SELECT COUNT(*) as count FROM reservas
      WHERE fecha_checkin BETWEEN $1 AND $2
        AND estado_reserva IN ('confirmada', 'pendiente')
    `, [hoy, en7Dias]);
    console.log(`   ✓ Reservas próximos 7 días: ${futuras.rows[0].count}`);

    // 5. ACTUALIZAR PAGOS DEL MES (PARA GRÁFICOS)
    console.log('\n5️⃣ Actualizando historial de pagos mensuales...');
    
    await pool.query(`
      UPDATE pagos 
      SET fecha_pago = $1,
          monto = 150
      WHERE id_pago IN (
        SELECT id_pago FROM pagos ORDER BY id_pago DESC OFFSET 5 LIMIT 10
      )
    `, [mesAnterior]);
    
    const pagosMes = await pool.query(`
      SELECT COUNT(*) as count FROM pagos
      WHERE fecha_pago >= DATE_TRUNC('month', CAST($1 AS TIMESTAMP))
    `, [hoy]);
    console.log(`   ✓ Pagos registrados este mes: ${pagosMes.rows[0].count}`);

    // 6. CONFIGURAR RESERVAS COMPLETADAS (PARA MÉTRICAS HISTÓRICAS)
    console.log('\n6️⃣ Configurando reservas completadas...');
    
    await pool.query(`
      UPDATE reservas 
      SET estado_reserva = 'completada',
          fecha_checkin = $1,
          fecha_checkout = $2,
          monto_total = 180,
          monto_pagado = 180,
          monto_pendiente = 0,
          estado_pago = 'completado',
          porcentaje_pagado = 100
      WHERE id_reserva IN (
        SELECT id_reserva FROM reservas ORDER BY id_reserva LIMIT 5
      )
    `, [mesAnterior, ayer]);
    
    const completadas = await pool.query(`
      SELECT COUNT(*) as count FROM reservas
      WHERE estado_reserva = 'completada'
    `);
    console.log(`   ✓ Reservas completadas históricas: ${completadas.rows[0].count}`);

    // 7. CREAR ALGUNOS RECLAMOS PENDIENTES
    console.log('\n7️⃣ Verificando reclamos pendientes...');
    
    const reclamos = await pool.query(`
      SELECT COUNT(*) as count FROM reclamos
      WHERE estado = 'pendiente' AND tipo_solicitud = 'reclamo'
    `);
    console.log(`   ✓ Reclamos pendientes: ${reclamos.rows[0].count}`);

    // RESUMEN FINAL
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE DATOS CONFIGURADOS PARA EL DASHBOARD');
    console.log('='.repeat(60));
    
    const resumen = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM reservas WHERE DATE(fecha_checkin) = DATE($1) AND estado_reserva != 'cancelada') as checkins_hoy,
        (SELECT COUNT(DISTINCT id_habitacion) FROM reservas WHERE estado_reserva = 'confirmada' AND fecha_checkin <= $1 AND fecha_checkout > $1) as ocupadas,
        (SELECT COUNT(*) FROM habitaciones) as total_habitaciones,
        (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE DATE(fecha_pago) = DATE($1)) as ingresos_hoy,
        (SELECT COUNT(*) FROM reservas WHERE fecha_checkin BETWEEN $1 AND ($1 + INTERVAL '7 days') AND estado_reserva IN ('confirmada', 'pendiente')) as reservas_7dias,
        (SELECT COUNT(*) FROM reclamos WHERE estado = 'pendiente') as reclamos_pendientes
    `, [hoy]);
    
    const r = resumen.rows[0];
    console.log(`\n✅ Check-ins HOY: ${r.checkins_hoy}`);
    console.log(`✅ Habitaciones Ocupadas: ${r.ocupadas} de ${r.total_habitaciones} (${((r.ocupadas/r.total_habitaciones)*100).toFixed(1)}%)`);
    console.log(`✅ Ingresos del Día: $${parseFloat(r.ingresos_hoy).toFixed(2)}`);
    console.log(`✅ Reservas Próximos 7 Días: ${r.reservas_7dias}`);
    console.log(`✅ Reclamos Pendientes: ${r.reclamos_pendientes}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ¡DASHBOARD LISTO! Recarga la página en el navegador.');
    console.log('='.repeat(60) + '\n');

    await pool.end();
    process.exit(0);

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error('Stack:', err.stack);
    await pool.end();
    process.exit(1);
  }
}

// Ejecutar
populateDashboardData();

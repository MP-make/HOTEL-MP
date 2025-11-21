const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Servicio para actualizar estados automáticamente
async function actualizarEstadosReservas() {
    const client = await pool.connect();
    try {
        // 1. Cambiar a 'en_curso' cuando llega el check-in
        await client.query(`
            UPDATE reservas
            SET estado_reserva = 'en_curso'
            WHERE estado_reserva = 'confirmada'
            AND fecha_checkin <= NOW()
            AND fecha_checkout > NOW()
        `);
        
        // 2. Cambiar a 'completada' cuando pasa el check-out
        await client.query(`
            UPDATE reservas
            SET estado_reserva = 'completada'
            WHERE estado_reserva IN ('en_curso', 'confirmada')
            AND fecha_checkout <= NOW()
        `);
        
        // 3. Liberar habitaciones de reservas completadas
        await client.query(`
            UPDATE habitaciones h
            SET disponible = true
            WHERE id_habitacion IN (
                SELECT id_habitacion FROM reservas
                WHERE estado_reserva = 'completada'
                AND fecha_checkout <= NOW()
            )
        `);
        
        console.log('Estados de reservas actualizados automáticamente');
    } catch (error) {
        console.error('Error actualizando estados:', error);
    } finally {
        client.release();
    }
}

// Función para calcular monto total de una reserva
function calcularMontoTotal(precioPorDia, fechaCheckin, fechaCheckout, serviciosAdicionales = []) {
    const dias = Math.ceil((new Date(fechaCheckout) - new Date(fechaCheckin)) / (1000 * 60 * 60 * 24));
    let total = precioPorDia * dias;
    
    // Agregar servicios adicionales
    const costosServicios = {
        'desayuno': 20,
        'romantico': 50,
        'spa': 30,
        'late-checkout': 15
    };
    
    if (serviciosAdicionales && serviciosAdicionales.length > 0) {
        serviciosAdicionales.forEach(servicio => {
            if (costosServicios[servicio]) {
                total += costosServicios[servicio] * dias;
            }
        });
    }
    
    return total;
}

// Función para procesar un pago
async function procesarPago(idReserva, monto, metodoPago, tipoPago, comprobante = null) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Obtener información de la reserva
        const reservaResult = await client.query(
            'SELECT monto_total, monto_pagado, monto_pendiente FROM reservas WHERE id_reserva = $1',
            [idReserva]
        );
        
        if (reservaResult.rows.length === 0) {
            throw new Error('Reserva no encontrada');
        }
        
        const reserva = reservaResult.rows[0];
        const nuevoMontoPagado = parseFloat(reserva.monto_pagado || 0) + parseFloat(monto);
        const montoTotal = parseFloat(reserva.monto_total);
        const nuevoMontoPendiente = montoTotal - nuevoMontoPagado;
        const nuevoPorcentajePagado = (nuevoMontoPagado / montoTotal) * 100;
        
        // Validar que no se pague más del total
        if (nuevoMontoPagado > montoTotal) {
            throw new Error('El monto pagado excede el total de la reserva');
        }
        
        // Insertar el pago en la tabla de pagos
        await client.query(
            `INSERT INTO pagos (id_reserva, monto, metodo_pago, tipo_pago, comprobante, estado)
             VALUES ($1, $2, $3, $4, $5, 'completado')`,
            [idReserva, monto, metodoPago, tipoPago, comprobante]
        );
        
        // Determinar nuevo estado de pago y reserva
        let nuevoEstadoPago = 'pendiente';
        let nuevoEstadoReserva = 'pendiente';
        
        if (nuevoPorcentajePagado >= 100) {
            nuevoEstadoPago = 'completado';
            nuevoEstadoReserva = 'confirmada';
        } else if (nuevoPorcentajePagado >= 50) {
            nuevoEstadoPago = 'parcial';
            nuevoEstadoReserva = 'confirmada';
        }
        
        // Actualizar la reserva
        await client.query(
            `UPDATE reservas 
             SET monto_pagado = $1, 
                 monto_pendiente = $2, 
                 porcentaje_pagado = $3,
                 estado_pago = $4,
                 estado_reserva = $5
             WHERE id_reserva = $6`,
            [nuevoMontoPagado, nuevoMontoPendiente, nuevoPorcentajePagado, nuevoEstadoPago, nuevoEstadoReserva, idReserva]
        );
        
        await client.query('COMMIT');
        
        return {
            success: true,
            montoPagado: nuevoMontoPagado,
            montoPendiente: nuevoMontoPendiente,
            porcentajePagado: nuevoPorcentajePagado,
            estadoPago: nuevoEstadoPago,
            estadoReserva: nuevoEstadoReserva
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Función para obtener historial de pagos de una reserva
async function obtenerHistorialPagos(idReserva) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT * FROM pagos WHERE id_reserva = $1 ORDER BY fecha_pago DESC',
            [idReserva]
        );
        return result.rows;
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    actualizarEstadosReservas,
    calcularMontoTotal,
    procesarPago,
    obtenerHistorialPagos
};

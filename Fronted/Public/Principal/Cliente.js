document.addEventListener('DOMContentLoaded', () => {
    // Variables globales
    let usuarioActual = null;

    // Función para verificar sesión
    function verificarSesion() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (!token || !user) {
            window.location.href = 'index.html';
            return false;
        }
        
        try {
            usuarioActual = JSON.parse(user);
            return true;
        } catch (error) {
            console.error('Error al parsear usuario:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
            return false;
        }
    }

    // Función para cerrar sesión
    function cerrarSesion() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }

    // Event listener para cerrar sesión
    document.getElementById('logoutBtn').addEventListener('click', cerrarSesion);

    // Event listener para regresar al índice
    document.getElementById('backToIndexBtn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // Función para cambiar sección
    function cambiarSeccion(seccionId) {
        // Ocultar todas las secciones
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Remover clase active de todos los enlaces
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Mostrar la sección seleccionada
        document.getElementById(seccionId).classList.add('active');
        
        // Agregar clase active al enlace correspondiente
        document.querySelector(`[data-section="${seccionId}"]`).classList.add('active');
        
        // Cargar contenido de la sección si es necesario
        switch(seccionId) {
            case 'estado-notificaciones':
                cargarNotificaciones();
                break;
            case 'mis-reservas':
                cargarReservas();
                break;
            case 'mi-perfil':
                cargarPerfil();
                break;
            case 'mis-reclamos':
                cargarReclamos();
                break;
        }
    }

    // Event listeners para los enlaces del sidebar
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const seccionId = e.currentTarget.getAttribute('data-section');
            cambiarSeccion(seccionId);
        });
    });

    // Función para cargar notificaciones
    async function cargarNotificaciones() {
        const notificationsList = document.querySelector('.notifications-list');
        notificationsList.innerHTML = '<div class="notification-item"><div class="notification-icon"><i class="fas fa-spinner fa-spin"></i></div><div class="notification-content"><h4>Cargando...</h4></div></div>';
        
        try {
            const token = localStorage.getItem('token');
            const [reservasResponse, reclamosResponse] = await Promise.all([
                fetch('/api/cliente/reservas', { headers: { 'Authorization': 'Bearer ' + token } }),
                fetch('/api/cliente/reclamos', { headers: { 'Authorization': 'Bearer ' + token } })
            ]);
            
            const reservas = reservasResponse.ok ? await reservasResponse.json() : [];
            const reclamos = reclamosResponse.ok ? await reclamosResponse.json() : [];
            
            let notifications = [];
            
            // Notificaciones específicas de reservas
            reservas.forEach(reserva => {
                const fechaCheckin = new Date(reserva.fecha_checkin);
                const fechaCheckout = new Date(reserva.fecha_checkout);
                const ahora = new Date();
                const tiempoHastaCheckin = fechaCheckin - ahora;
                const tiempoHastaCheckout = fechaCheckout - ahora;
                const horasHastaCheckin = tiempoHastaCheckin / (1000 * 60 * 60);
                const horasHastaCheckout = tiempoHastaCheckout / (1000 * 60 * 60);
                
                const fechaCheckinStr = fechaCheckin.toLocaleDateString('es-ES');
                const fechaCheckoutStr = fechaCheckout.toLocaleDateString('es-ES');
                
                if (reserva.estado_reserva === 'pendiente') {
                    notifications.push({
                        icon: 'fas fa-clock',
                        title: `Reserva Pendiente (${fechaCheckinStr})`,
                        message: `Tu reserva para la Habitación ${reserva.numero_habitacion} está pendiente de confirmación. Check-in: ${fechaCheckinStr}, Check-out: ${fechaCheckoutStr}.`
                    });
                } else if (reserva.estado_reserva === 'confirmada') {
                    if (horasHastaCheckin <= 24 && horasHastaCheckin > 0) {
                        notifications.push({
                            icon: 'fas fa-exclamation-triangle',
                            title: `Check-in Próximo (${fechaCheckinStr})`,
                            message: `Tu check-in para la Habitación ${reserva.numero_habitacion} es en menos de 24 horas. Fecha: ${fechaCheckin.toLocaleString('es-ES')}.`
                        });
                    } else {
                        notifications.push({
                            icon: 'fas fa-check-circle',
                            title: `Reserva Confirmada (${fechaCheckinStr})`,
                            message: `Tu reserva para la Habitación ${reserva.numero_habitacion} está confirmada. Check-in: ${fechaCheckinStr}, Check-out: ${fechaCheckoutStr}.`
                        });
                    }
                } else if (reserva.estado_reserva === 'activa') {
                    if (horasHastaCheckout <= 24 && horasHastaCheckout > 0) {
                        notifications.push({
                            icon: 'fas fa-exclamation-triangle',
                            title: `Check-out Próximo (${fechaCheckoutStr})`,
                            message: `Tu check-out para la Habitación ${reserva.numero_habitacion} es en menos de 24 horas. Fecha: ${fechaCheckout.toLocaleString('es-ES')}.`
                        });
                    } else {
                        notifications.push({
                            icon: 'fas fa-calendar-day',
                            title: `Reserva Activa (${fechaCheckinStr})`,
                            message: `Estás hospedado en la Habitación ${reserva.numero_habitacion}. Check-out: ${fechaCheckoutStr}.`
                        });
                    }
                } else if (reserva.estado_reserva === 'completada') {
                    notifications.push({
                        icon: 'fas fa-check',
                        title: `Reserva Completada (${fechaCheckoutStr})`,
                        message: `Tu estadía en la Habitación ${reserva.numero_habitacion} ha finalizado. ¡Gracias por visitarnos!`
                    });
                }
            });
            
            // Notificaciones de reclamos
            reclamos.forEach(reclamo => {
                const fechaReclamo = new Date(reclamo.fecha_creacion).toLocaleDateString('es-ES');
                if (reclamo.estado === 'resuelto') {
                    notifications.push({
                        icon: 'fas fa-check',
                        title: `Reclamo (${fechaReclamo})`,
                        message: `Su reclamo ha sido resuelto.`
                    });
                } else if (reclamo.estado === 'pendiente') {
                    notifications.push({
                        icon: 'fas fa-clock',
                        title: `Reclamo (${fechaReclamo})`,
                        message: `Su reclamo está siendo procesado.`
                    });
                }
            });
            
            // Notificación de bienvenida si no hay otras
            if (notifications.length === 0) {
                notifications.push({
                    icon: 'fas fa-smile',
                    title: '¡Bienvenido!',
                    message: 'Tu cuenta está al día. Revisa tus reservas y perfil.'
                });
            }
            
            notificationsList.innerHTML = notifications.map(notification => `
                <div class="notification-item">
                    <div class="notification-icon"><i class="${notification.icon}"></i></div>
                    <div class="notification-content">
                        <h4>${notification.title}</h4>
                        <p>${notification.message}</p>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Error cargando notificaciones:', error);
            notificationsList.innerHTML = '<div class="notification-item"><div class="notification-icon"><i class="fas fa-exclamation-circle"></i></div><div class="notification-content"><h4>Error</h4><p>No se pudieron cargar las notificaciones.</p></div></div>';
        }
    }

    // Función para cargar reservas
    async function cargarReservas() {
        const container = document.getElementById('reservasGrid');
        container.innerHTML = '<div class="loading">Cargando reservas...</div>';
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/cliente/reservas', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const reservas = await response.json();
            
            if (!reservas || reservas.length === 0) {
                container.innerHTML = `
                    <div class="no-reservas">
                        <h3>No tienes reservas</h3>
                        <p>Realiza una reserva para ver tus habitaciones aquí.</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = reservas.map(reserva => {
                const fotoSrc = reserva.fotos && reserva.fotos.length > 0 
                    ? (reserva.fotos[0].startsWith('/') ? reserva.fotos[0] : '/img/habitaciones/' + encodeURIComponent(reserva.fotos[0])) 
                    : 'https://source.unsplash.com/featured/?luxury-hotel-room';
                
                const checkin = new Date(reserva.fecha_checkin).toLocaleString('es-ES', { 
                    timeZone: 'America/Lima', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                });
                const checkout = new Date(reserva.fecha_checkout).toLocaleString('es-ES', { 
                    timeZone: 'America/Lima', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                });
                
                return `
                <div class="reserva-card">
                    <img src="${fotoSrc}" alt="Habitación ${reserva.numero_habitacion}" class="reserva-imagen" onerror="this.src='https://source.unsplash.com/featured/?luxury-hotel-room'">
                    <div class="reserva-info">
                        <h3>Habitación ${reserva.numero_habitacion}</h3>
                        <p>${reserva.categoria}</p>
                        <p>Check-in: ${checkin}</p>
                        <p>Check-out: ${checkout}</p>
                        <p>Estado: ${reserva.estado_reserva}</p>
                        <button class="btn-detalles" data-reserva='${JSON.stringify(reserva).replace(/'/g, "&apos;")}'>Ver Detalles</button>
                    </div>
                </div>
                `;
            }).join('');
            
            // Event listeners para botones de detalles
            document.querySelectorAll('.btn-detalles').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const reserva = JSON.parse(e.currentTarget.getAttribute('data-reserva').replace(/&apos;/g, "'"));
                    mostrarDetallesReserva(reserva);
                });
            });
            
        } catch (error) {
            console.error('Error cargando reservas:', error);
            container.innerHTML = '<div class="error">Error al cargar las reservas. Inténtalo de nuevo.</div>';
        }
    }

    // Función para cargar perfil
    async function cargarPerfil() {
        try {
            document.getElementById('perfilNombre').value = usuarioActual.nombre;
            document.getElementById('perfilEmail').value = usuarioActual.email;
            document.getElementById('perfilTelefono').value = usuarioActual.telefono || '';
            document.getElementById('perfilUbicacion').value = usuarioActual.ubicacion || '';
            document.getElementById('perfilTipoHabitacion').value = usuarioActual.tipo_habitacion || '';
            document.getElementById('perfilPreferenciaPiso').value = usuarioActual.preferencia_piso || '';
            document.getElementById('perfilNecesidadesEspeciales').value = usuarioActual.necesidades_especiales || '';
            document.getElementById('perfilCurrentPassword').value = '';
            document.getElementById('perfilNewPassword').value = '';
            document.getElementById('perfilConfirmPassword').value = '';
        } catch (error) {
            console.error('Error cargando perfil:', error);
        }
    }

    // Función para actualizar perfil
    async function actualizarPerfil(e) {
        e.preventDefault();
        
        const nombre = document.getElementById('perfilNombre').value;
        const email = document.getElementById('perfilEmail').value;
        const telefono = document.getElementById('perfilTelefono').value;
        const ubicacion = document.getElementById('perfilUbicacion').value;
        const tipoHabitacion = document.getElementById('perfilTipoHabitacion').value;
        const preferenciaPiso = document.getElementById('perfilPreferenciaPiso').value;
        const necesidadesEspeciales = document.getElementById('perfilNecesidadesEspeciales').value;
        const currentPassword = document.getElementById('perfilCurrentPassword').value;
        const newPassword = document.getElementById('perfilNewPassword').value;
        const confirmPassword = document.getElementById('perfilConfirmPassword').value;
        
        const token = localStorage.getItem('token');
        const messageElement = document.getElementById('perfilMessage');
        
        // Validar contraseñas
        if (newPassword && newPassword !== confirmPassword) {
            messageElement.textContent = 'Las contraseñas nuevas no coinciden';
            messageElement.style.color = 'red';
            return;
        }
        
        if (!currentPassword && (newPassword || confirmPassword)) {
            messageElement.textContent = 'Debes ingresar la contraseña actual para cambiarla';
            messageElement.style.color = 'red';
            return;
        }
        
        try {
            const response = await fetch('/api/cliente/perfil', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ 
                    nombre, 
                    email, 
                    telefono, 
                    ubicacion,
                    tipo_habitacion: tipoHabitacion,
                    preferencia_piso: preferenciaPiso,
                    necesidades_especiales: necesidadesEspeciales,
                    currentPassword: currentPassword || undefined,
                    newPassword: newPassword || undefined
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('user', JSON.stringify(data.user));
                usuarioActual = data.user;
                messageElement.textContent = 'Perfil actualizado exitosamente';
                messageElement.style.color = 'green';
                // Limpiar campos de contraseña
                document.getElementById('perfilCurrentPassword').value = '';
                document.getElementById('perfilNewPassword').value = '';
                document.getElementById('perfilConfirmPassword').value = '';
            } else {
                const error = await response.json();
                messageElement.textContent = error.error || 'Error al actualizar perfil';
                messageElement.style.color = 'red';
            }
        } catch (error) {
            console.error('Error actualizando perfil:', error);
            messageElement.textContent = 'Error de conexión';
            messageElement.style.color = 'red';
        }
    }

    // Event listener para formulario de perfil
    document.getElementById('perfilForm').addEventListener('submit', actualizarPerfil);

    // Event listener para eliminar cuenta
    document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')) {
            const token = localStorage.getItem('token');
            try {
                const response = await fetch('/api/cliente/perfil', {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (response.ok) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                } else {
                    const error = await response.json();
                    alert(error.error || 'Error al eliminar la cuenta');
                }
            } catch (error) {
                console.error('Error eliminando cuenta:', error);
                alert('Error de conexión');
            }
        }
    });

    // Función para cargar reclamos
    async function cargarReclamos() {
        const container = document.getElementById('reclamosGrid');
        container.innerHTML = '<div class="loading">Cargando solicitudes...</div>';
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/cliente/reclamos', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const reclamos = await response.json();
            
            // Función para obtener emoji y color según tipo
            function getTipoInfo(tipo) {
                const tipos = {
                    'reclamo': { emoji: '⚠️', color: '#dc3545', bgColor: '#f8d7da', label: 'Reclamo' },
                    'pedido': { emoji: '🛎️', color: '#0d6efd', bgColor: '#cfe2ff', label: 'Pedido' },
                    'limpieza': { emoji: '🧹', color: '#198754', bgColor: '#d1e7dd', label: 'Limpieza' }
                };
                return tipos[tipo] || { emoji: '📝', color: '#6c757d', bgColor: '#e9ecef', label: tipo || 'Desconocido' };
            }
            
            if (!reclamos || reclamos.length === 0) {
                container.innerHTML = '<div class="no-reclamos"><h3>No tienes solicitudes</h3><p>Si tienes algún problema o necesitas algo, puedes enviar una solicitud.</p></div>';
            } else {
                container.innerHTML = reclamos.map(reclamo => {
                    const tipoInfo = getTipoInfo(reclamo.tipo_solicitud);
                    return `
                    <div class="reclamo-card" style="border-left: 4px solid ${tipoInfo.color};">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <h4 style="margin: 0; color: #333; font-size: 1.1rem;">
                                ${tipoInfo.emoji} ${tipoInfo.label}
                            </h4>
                            <span style="display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; color: ${tipoInfo.color}; background-color: ${tipoInfo.bgColor};">
                                ${reclamo.estado === 'pendiente' ? 'Pendiente' : 'Resuelto'}
                            </span>
                        </div>
                        <p><strong>Habitación:</strong> ${reclamo.numero_habitacion || 'N/A'}</p>
                        <p><strong>Descripción:</strong> ${reclamo.descripcion}</p>
                        <p><strong>Fecha:</strong> ${new Date(reclamo.fecha_creacion).toLocaleDateString('es-ES', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</p>
                    </div>
                `}).join('');
            }
            
            // Cargar habitaciones para el formulario de nuevo reclamo
            await cargarHabitacionesParaReclamo();
            
        } catch (error) {
            console.error('Error cargando solicitudes:', error);
            container.innerHTML = '<div class="error">Error al cargar las solicitudes. Inténtalo de nuevo.</div>';
        }
    }

    // Función para cargar habitaciones para reclamo
    async function cargarHabitacionesParaReclamo() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/cliente/habitaciones', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            
            if (response.ok) {
                const data = await response.json();
                const select = document.getElementById('reclamoHabitacion');
                select.innerHTML = '<option value="">Selecciona una habitación</option>';
                data.habitaciones.forEach(habitacion => {
                    const option = document.createElement('option');
                    option.value = habitacion.id_habitacion;
                    option.textContent = `Habitación ${habitacion.numero_habitacion} - ${habitacion.categoria}`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error cargando habitaciones para reclamo:', error);
        }
    }

    // Función para mostrar/ocultar formulario de nuevo reclamo
    document.getElementById('btnNuevoReclamo').addEventListener('click', () => {
        document.getElementById('nuevoReclamoModal').style.display = 'block';
    });

    // Función para enviar nuevo reclamo
    async function enviarReclamo(e) {
        e.preventDefault();
        
        const tipo_solicitud = document.getElementById('nuevoReclamoTipo').value;
        const id_habitacion = document.getElementById('reclamoHabitacion').value;
        const descripcion = document.getElementById('reclamoDescripcion').value;
        
        const token = localStorage.getItem('token');
        const messageElement = document.getElementById('reclamoMessage');
        
        try {
            const response = await fetch('/api/cliente/reclamos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ 
                    tipo_solicitud,
                    id_habitacion: parseInt(id_habitacion), 
                    descripcion 
                })
            });
            
            if (response.ok) {
                messageElement.textContent = 'Solicitud enviada exitosamente';
                messageElement.style.color = 'green';
                document.getElementById('nuevoReclamoForm').reset();
                document.getElementById('nuevoReclamoModal').style.display = 'none';
                cargarReclamos(); // Recargar la lista
            } else {
                const error = await response.json();
                messageElement.textContent = error.error || 'Error al enviar solicitud';
                messageElement.style.color = 'red';
            }
        } catch (error) {
            console.error('Error enviando solicitud:', error);
            messageElement.textContent = 'Error de conexión';
            messageElement.style.color = 'red';
        }
    }

    // Event listener para formulario de reclamo
    document.getElementById('nuevoReclamoForm').addEventListener('submit', enviarReclamo);

    // Función para mostrar detalles de reserva
    function mostrarDetallesReserva(reserva) {
        document.getElementById('detalleCategoria').textContent = reserva.categoria;
        document.getElementById('detalleEstado').textContent = reserva.estado_reserva;
        
        const checkin = new Date(reserva.fecha_checkin).toLocaleString('es-ES', { 
            timeZone: 'America/Lima', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        const checkout = new Date(reserva.fecha_checkout).toLocaleString('es-ES', { 
            timeZone: 'America/Lima', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        const fechaCreacion = new Date(reserva.fecha_creacion).toLocaleString('es-ES', { 
            timeZone: 'America/Lima', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        
        document.getElementById('detalleFechaCheckin').textContent = checkin;
        document.getElementById('detalleFechaCheckout').textContent = checkout;
        document.getElementById('detalleFechaCreacion').textContent = fechaCreacion;
        
        const fotoSrc = reserva.fotos && reserva.fotos.length > 0 
            ? (reserva.fotos[0].startsWith('/') ? reserva.fotos[0] : '/img/habitaciones/' + encodeURIComponent(reserva.fotos[0])) 
            : 'https://source.unsplash.com/featured/?luxury-hotel-room';
        document.getElementById('detalleHabitacionImagen').src = fotoSrc;
        
        document.getElementById('reclamoHabitacionId').value = reserva.id_habitacion;
        document.getElementById('reclamoReservaId').value = reserva.id_reserva;
        
        // Limpiar formulario de reclamo
        document.getElementById('reclamoReservaForm').reset();
        document.getElementById('reclamoMessage').textContent = '';
        
        // Obtener datos de pagos
        obtenerDatosPagos(reserva.id_reserva).then(pagos => {
            const pagado = pagos.totalPagado || 0;
            const total = pagos.totalReserva || 0;
            const falta = total - pagado;
            
            // Actualizar valores
            document.getElementById('detallePagado').textContent = `S/ ${pagado.toFixed(2)}`;
            document.getElementById('detalleFaltaPagar').textContent = `S/ ${falta.toFixed(2)}`;
            document.getElementById('detalleTotal').textContent = `S/ ${total.toFixed(2)}`;
            
            // Actualizar barra de progreso
            const porcentajePagado = total > 0 ? (pagado / total) * 100 : 0;
            const progressFill = document.getElementById('pagoProgressFill');
            if (progressFill) {
                progressFill.style.width = '0%';
                setTimeout(() => {
                    progressFill.style.width = `${porcentajePagado}%`;
                }, 100);
            }
            
            // CORREGIDO: Asignar onclick correctamente a los botones
            const btnPago = document.getElementById('btnCompletarPago');
            if (btnPago) {
                if (falta > 0.01) {
                    btnPago.style.display = 'block';
                    btnPago.textContent = 'Completar Pago';
                    btnPago.className = 'btn-completar-pago';
                    // IMPORTANTE: Asignar onclick para abrir modal de confirmación
                    btnPago.onclick = () => mostrarModalConfirmarPago(reserva.id_reserva, falta, total, pagado, reserva);
                } else {
                    btnPago.style.display = 'block';
                    btnPago.textContent = 'Ver Boleta';
                    btnPago.className = 'btn-success';
                    // IMPORTANTE: Asignar onclick para generar boleta
                    btnPago.onclick = () => generarBoletaElectronica(reserva.id_reserva, total, reserva);
                }
            }
        }).catch(error => {
            console.error('Error obteniendo datos de pagos:', error);
        });
        
        // Mostrar modal
        document.getElementById('detallesReservaModal').style.display = 'block';
    }

    // Función para obtener datos de pagos
    async function obtenerDatosPagos(idReserva) {
        const token = localStorage.getItem('token');
        try {
            const responseReserva = await fetch(`/api/cliente/reservas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!responseReserva.ok) {
                throw new Error('Error al obtener reservas');
            }
            
            const todasReservas = await responseReserva.json();
            const reserva = todasReservas.find(r => r.id_reserva === parseInt(idReserva));
            
            if (!reserva) {
                throw new Error('Reserva no encontrada');
            }
            
            const totalReserva = parseFloat(reserva.monto_total) || 0;
            const totalPagado = parseFloat(reserva.monto_pagado) || 0;

            return { totalPagado, totalReserva };
        } catch (error) {
            console.error('Error obteniendo datos de pagos:', error);
            return { totalPagado: 0, totalReserva: 0 };
        }
    }

    // NUEVO: Función para completar el pago pendiente
    async function completarPago(idReserva, montoPendiente, montoTotal, reserva) {
        const token = localStorage.getItem('token');
        const btnCompletarPago = document.getElementById('btnCompletarPago');
        if (btnCompletarPago) {
            btnCompletarPago.disabled = true;
            btnCompletarPago.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        }
        
        try {
            const response = await fetch(`/api/pagos/procesar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    id_reserva: idReserva,
                    monto: montoPendiente,
                    metodo_pago: 'tarjeta',
                    tipo_pago: 'completo',
                    comprobante: null
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al procesar pago');
            }
            
            const pagoData = await response.json();
            
            // Actualizar la vista
            document.getElementById('detallePagado').textContent = `S/ ${montoTotal.toFixed(2)}`;
            document.getElementById('detalleFaltaPagar').textContent = `S/ 0.00`;
            document.getElementById('detalleTotal').textContent = `S/ ${montoTotal.toFixed(2)}`;
            
            const progressFill = document.getElementById('pagoProgressFill');
            if (progressFill) {
                progressFill.style.width = '100%';
            }
            
            if (btnCompletarPago) {
                btnCompletarPago.textContent = 'Ver Boleta';
                btnCompletarPago.className = 'btn-success';
                btnCompletarPago.disabled = false;
                btnCompletarPago.innerHTML = '<i class="fas fa-receipt"></i> Ver Boleta';
                btnCompletarPago.onclick = () => generarBoletaElectronica(idReserva, montoTotal, reserva);
            }
            
            await generarBoletaElectronica(idReserva, montoTotal, reserva);
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error al completar el pago: ' + error.message);
            if (btnCompletarPago) {
                btnCompletarPago.disabled = false;
                btnCompletarPago.innerHTML = '<i class="fas fa-credit-card"></i> Completar Pago';
            }
        }
    }
    
    // NUEVO: Función para mostrar modal de confirmación de pago
    function mostrarModalConfirmarPago(idReserva, montoPendiente, montoTotal, yaPagado, reserva) {
        document.getElementById('montoPendienteModal').textContent = `S/ ${montoPendiente.toFixed(2)}`;
        document.getElementById('totalReservaModal').textContent = `S/ ${montoTotal.toFixed(2)}`;
        document.getElementById('yaPagadoModal').textContent = `S/ ${yaPagado.toFixed(2)}`;
        document.getElementById('pendientePagarModal').textContent = `S/ ${montoPendiente.toFixed(2)}`;
        
        document.getElementById('confirmarPagoCompletoModal').style.display = 'block';
        
        const btnConfirmar = document.getElementById('btnConfirmarPagoCompleto');
        if (btnConfirmar) {
            btnConfirmar.onclick = async () => {
                document.getElementById('confirmarPagoCompletoModal').style.display = 'none';
                await completarPago(idReserva, montoPendiente, montoTotal, reserva);
            };
        }
        
        const btnCancelar = document.getElementById('btnCancelarPagoCompleto');
        if (btnCancelar) {
            btnCancelar.onclick = () => {
                document.getElementById('confirmarPagoCompletoModal').style.display = 'none';
            };
        }
    }

    // NUEVO: Función para generar boleta electrónica
    async function generarBoletaElectronica(idReserva, montoTotal, reserva) {
        try {
            const token = localStorage.getItem('token');
            
            let datosReserva = reserva;
            if (!datosReserva.fecha_checkin) {
                const response = await fetch(`/api/cliente/reservas`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (response.ok) {
                    const todasReservas = await response.json();
                    datosReserva = todasReservas.find(r => r.id_reserva === parseInt(idReserva)) || reserva;
                }
            }
            
            const datosBoleta = {
                hotel: "JW Marriott Hotel Lima",
                ruc: "20123456789",
                direccion: "Av. Malecón de la Reserva 615, Miraflores, Lima, Perú",
                telefono: "(01) 217-7000",
                email: "info@jwmarriottlima.com",
                numeroBoleta: String(idReserva).padStart(8, '0'),
                fechaEmision: new Date().toLocaleString('es-ES', { timeZone: 'America/Lima' }),
                cliente: {
                    nombre: usuarioActual?.nombre || 'N/A',
                    email: usuarioActual?.email || 'N/A'
                },
                reserva: {
                    habitacion: datosReserva.numero_habitacion,
                    categoria: datosReserva.categoria,
                    checkin: new Date(datosReserva.fecha_checkin).toLocaleString('es-ES', { timeZone: 'America/Lima' }),
                    checkout: new Date(datosReserva.fecha_checkout).toLocaleString('es-ES', { timeZone: 'America/Lima' }),
                    estado: datosReserva.estado_reserva || 'Confirmada'
                },
                total: montoTotal.toFixed(2)
            };
            
            mostrarBoletaA5(datosBoleta);
            document.getElementById('boletaModal').style.display = 'block';
            configurarBotonesBoleta(idReserva, montoTotal, reserva, datosReserva);
            
        } catch (error) {
            console.error('Error generando boleta:', error);
            alert('Pago completado, pero hubo un error al generar la boleta.');
        }
    }

    // NUEVO: Configurar botones del modal de boleta
    function configurarBotonesBoleta(idReserva, montoTotal, reserva, datosReserva) {
        const datosBoleta = {
            hotel: "JW Marriott Hotel Lima",
            ruc: "20123456789",
            direccion: "Av. Malecón de la Reserva 615, Miraflores, Lima, Perú",
            telefono: "(01) 217-7000",
            email: "info@jwmarriottlima.com",
            numeroBoleta: String(idReserva).padStart(8, '0'),
            fechaEmision: new Date().toLocaleString('es-ES', { timeZone: 'America/Lima' }),
            cliente: {
                nombre: usuarioActual?.nombre || 'N/A',
                email: usuarioActual?.email || 'N/A'
            },
            reserva: {
                habitacion: datosReserva.numero_habitacion,
                categoria: datosReserva.categoria,
                checkin: new Date(datosReserva.fecha_checkin).toLocaleString('es-ES', { timeZone: 'America/Lima' }),
                checkout: new Date(datosReserva.fecha_checkout).toLocaleString('es-ES', { timeZone: 'America/Lima' }),
                estado: datosReserva.estado_reserva || 'Confirmada'
            },
            total: montoTotal.toFixed(2)
        };
        
        const btnFormatoA5 = document.getElementById('btnFormatoA5');
        const btnFormatoTicket = document.getElementById('btnFormatoTicket');
        const btnImprimir = document.getElementById('btnImprimirBoleta');
        const btnCerrar = document.getElementById('btnCerrarBoleta');
        
        if (btnFormatoA5) btnFormatoA5.onclick = () => mostrarBoletaA5(datosBoleta);
        if (btnFormatoTicket) btnFormatoTicket.onclick = () => mostrarBoletaTicket(datosBoleta);
        if (btnImprimir) btnImprimir.onclick = () => imprimirBoleta(datosBoleta);
        if (btnCerrar) btnCerrar.onclick = () => document.getElementById('boletaModal').style.display = 'none';
    }

    // NUEVO: Mostrar boleta en formato A5
    function mostrarBoletaA5(datosBoleta) {
        const boletaContent = document.getElementById('boletaContent');
        if (!boletaContent) return;
        
        boletaContent.className = 'boleta-content boleta-a5';
        boletaContent.innerHTML = `
            <div class="boleta-header">
                <div class="boleta-logo">
                    <img src="/img/logo_2.png" alt="Logo JW Marriott" style="max-width: 120px; height: auto;">
                </div>
                <div class="boleta-title">BOLETA ELECTRÓNICA</div>
                <div class="boleta-numero">N° ${datosBoleta.numeroBoleta}</div>
                <div class="empresa-info">
                    <strong>${datosBoleta.hotel}</strong><br>
                    RUC: ${datosBoleta.ruc}<br>
                    ${datosBoleta.direccion}<br>
                    Teléfono: ${datosBoleta.telefono} | Email: ${datosBoleta.email}
                </div>
            </div>
            
            <div class="boleta-section">
                <div class="section-title">DATOS DEL CLIENTE</div>
                <div class="info-row">
                    <span class="info-label">Nombre:</span>
                    <span class="info-value">${datosBoleta.cliente.nombre}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${datosBoleta.cliente.email}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Fecha de Emisión:</span>
                    <span class="info-value">${datosBoleta.fechaEmision}</span>
                </div>
            </div>
            
            <div class="boleta-section">
                <div class="section-title">DETALLES DE LA RESERVA</div>
                <div class="info-row">
                    <span class="info-label">Habitación:</span>
                    <span class="info-value">${datosBoleta.reserva.habitacion}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Categoría:</span>
                    <span class="info-value">${datosBoleta.reserva.categoria}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Check-in:</span>
                    <span class="info-value">${datosBoleta.reserva.checkin}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Check-out:</span>
                    <span class="info-value">${datosBoleta.reserva.checkout}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Estado:</span>
                    <span class="info-value">${datosBoleta.reserva.estado}</span>
                </div>
            </div>
            
            <div class="boleta-stamp">
                ✓ PAGO COMPLETO REALIZADO
            </div>
            
            <div class="boleta-total">
                <div class="total-label">MONTO TOTAL PAGADO</div>
                <div class="total-amount">S/ ${datosBoleta.total}</div>
            </div>
            
            <div class="boleta-footer">
                <p>Este documento constituye un comprobante de pago válido.</p>
                <p>Gracias por su preferencia. ¡Esperamos que disfrute su estadía!</p>
                <p><strong>${datosBoleta.hotel}</strong> - Excelencia en Hospitalidad</p>
            </div>
        `;
    }

    // NUEVO: Mostrar boleta en formato Ticket
    function mostrarBoletaTicket(datosBoleta) {
        const boletaContent = document.getElementById('boletaContent');
        if (!boletaContent) return;
        
        boletaContent.className = 'boleta-content boleta-ticket';
        boletaContent.innerHTML = `
            <div class="boleta-header">
                <div class="boleta-logo">
                    <img src="/img/logo_2.png" alt="Logo JW Marriott" style="max-width: 80px; height: auto;">
                </div>
                <div class="boleta-title">BOLETA ELECTRÓNICA</div>
                <div class="boleta-numero">N° ${datosBoleta.numeroBoleta}</div>
                <div class="empresa-info">
                    <strong>${datosBoleta.hotel}</strong><br>
                    RUC: ${datosBoleta.ruc}<br>
                    ${datosBoleta.direccion}<br>
                    Tel: ${datosBoleta.telefono}
                </div>
            </div>
            
            <div class="boleta-section">
                <div class="section-title">CLIENTE</div>
                <div class="info-row">
                    <span class="info-label">Nombre:</span>
                    <span class="info-value">${datosBoleta.cliente.nombre}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${datosBoleta.cliente.email}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Fecha:</span>
                    <span class="info-value">${datosBoleta.fechaEmision}</span>
                </div>
            </div>
            
            <div class="boleta-section">
                <div class="section-title">DETALLES</div>
                <div class="info-row">
                    <span class="info-label">Hab:</span>
                    <span class="info-value">${datosBoleta.reserva.habitacion}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Cat:</span>
                    <span class="info-value">${datosBoleta.reserva.categoria}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Check-in:</span>
                    <span class="info-value">${datosBoleta.reserva.checkin}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Check-out:</span>
                    <span class="info-value">${datosBoleta.reserva.checkout}</span>
                </div>
            </div>
            
            <div class="boleta-stamp">
                ✓ PAGO COMPLETO
            </div>
            
            <div class="boleta-total">
                <div class="total-label">TOTAL PAGADO</div>
                <div class="total-amount">S/ ${datosBoleta.total}</div>
            </div>
            
            <div class="boleta-footer">
                <p>Comprobante válido - Gracias por su preferencia</p>
                <p><strong>${datosBoleta.hotel}</strong></p>
            </div>
        `;
    }

    // NUEVO: Imprimir boleta
    function imprimirBoleta(datosBoleta) {
        const boletaContent = document.getElementById('boletaContent');
        if (!boletaContent) return;
        
        const ventanaBoleta = window.open('', '_blank');
        ventanaBoleta.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Boleta Electrónica - ${datosBoleta.hotel}</title>
                <link rel="stylesheet" href="pago-modal.css">
                <style>
                    @media print {
                        body { padding: 0; margin: 0; }
                        .boleta-container { border: none; margin: 0; }
                    }
                </style>
            </head>
            <body>
                ${boletaContent.outerHTML}
            </body>
            </html>
        `);
        ventanaBoleta.document.close();
        
        setTimeout(() => {
            ventanaBoleta.print();
        }, 500);
    }

    // Event listeners para modal
    document.querySelectorAll('[data-modal-close]').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modalId = closeBtn.getAttribute('data-modal-close');
            document.getElementById(modalId).style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Event listener para formulario de reclamo en modal
    document.getElementById('reclamoReservaForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const tipo_solicitud = document.getElementById('reclamoTipo').value;
        const descripcion = document.getElementById('reclamoDescripcion').value.trim();
        const id_habitacion = document.getElementById('reclamoHabitacionId').value;
        
        if (!descripcion) {
            document.getElementById('reclamoMessage').textContent = 'Por favor, describe la solicitud.';
            return;
        }
        
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch('/api/cliente/reclamos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    tipo_solicitud, 
                    descripcion, 
                    id_habitacion: parseInt(id_habitacion) 
                })
            });
            
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'index.html';
                return;
            }
            
            if (response.ok) {
                alert('Solicitud enviada exitosamente.');
                document.getElementById('reclamoReservaForm').reset();
                document.getElementById('detallesReservaModal').style.display = 'none';
                cargarReclamos(); // Recargar la lista de reclamos
            } else {
                const error = await response.json();
                document.getElementById('reclamoMessage').textContent = 'Error al enviar solicitud: ' + (error.error || 'Desconocido');
            }
        } catch (error) {
            console.error('Error enviando solicitud:', error);
            document.getElementById('reclamoMessage').textContent = 'Error al enviar solicitud.';
        }
    });

    // Función para cargar información del usuario
    async function loadUserInfo() {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'index.html';
                return;
            }
            if (response.ok) {
                try {
                    const user = await response.json();
                    document.getElementById('sidebarUserName').textContent = user.nombre || 'Cliente';
                    
                    // Calcular progreso basado en reservas completadas
                    const responseReservas = await fetch('/api/cliente/reservas', { headers: { 'Authorization': 'Bearer ' + token } });
                    if (responseReservas.ok) {
                        const reservas = await responseReservas.json();
                        console.log('Reservas obtenidas:', reservas); // Agrega esto para ver los datos
                        const completadas = reservas.filter(r => r.estado_reserva === 'completada').length;
                        const total = reservas.length;
                        console.log('Completadas:', completadas, 'Total:', total); // Agrega esto
                        const progreso = total > 0 ? (completadas / total) * 100 : 0;
                        console.log('Progreso calculado:', progreso + '%'); // Agrega esto
                        document.getElementById('progressFill').style.width = progreso + '%';
                    } else {
                        console.error('Error cargando reservas para progreso:', responseReservas.status);
                    }
                } catch (error) {
                    console.error('Error parsing user info:', error);
                }
            } else {
                console.error('Error cargando info del usuario');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // Inicializar
    if (verificarSesion()) {
        cambiarSeccion('mi-perfil'); // Mostrar sección inicial
        loadUserInfo(); // Cargar información del usuario
    }
});
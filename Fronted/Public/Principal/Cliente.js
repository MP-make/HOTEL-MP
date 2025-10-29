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
            document.getElementById('perfilPassword').value = '';
        } catch (error) {
            console.error('Error cargando perfil:', error);
        }
    }

    // Función para actualizar perfil
    async function actualizarPerfil(e) {
        e.preventDefault();
        
        const nombre = document.getElementById('perfilNombre').value;
        const email = document.getElementById('perfilEmail').value;
        const password = document.getElementById('perfilPassword').value;
        
        const token = localStorage.getItem('token');
        const messageElement = document.getElementById('perfilMessage');
        
        try {
            const response = await fetch('/api/cliente/perfil', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ nombre, email, password: password || undefined })
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('user', JSON.stringify(data.user));
                usuarioActual = data.user;
                messageElement.textContent = 'Perfil actualizado exitosamente';
                messageElement.style.color = 'green';
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

    // Función para cargar reclamos
    async function cargarReclamos() {
        const container = document.getElementById('reclamosGrid');
        container.innerHTML = '<div class="loading">Cargando reclamos...</div>';
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/cliente/reclamos', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const reclamos = await response.json();
            
            if (!reclamos || reclamos.length === 0) {
                container.innerHTML = '<div class="no-reclamos"><h3>No tienes reclamos</h3><p>Si tienes algún problema, puedes enviar un reclamo.</p></div>';
            } else {
                container.innerHTML = reclamos.map(reclamo => `
                    <div class="reclamo-card">
                        <h4>Reclamo (Fecha: ${new Date(reclamo.fecha_creacion).toLocaleDateString('es-ES')})</h4>
                        <p><strong>Habitación:</strong> ${reclamo.numero_habitacion}</p>
                        <p><strong>Descripción:</strong> ${reclamo.descripcion}</p>
                        <p><strong>Estado:</strong> ${reclamo.estado}</p>
                        <p><strong>Fecha:</strong> ${new Date(reclamo.fecha_creacion).toLocaleDateString('es-ES')}</p>
                    </div>
                `).join('');
            }
            
            // Cargar habitaciones para el formulario de nuevo reclamo
            await cargarHabitacionesParaReclamo();
            
        } catch (error) {
            console.error('Error cargando reclamos:', error);
            container.innerHTML = '<div class="error">Error al cargar los reclamos. Inténtalo de nuevo.</div>';
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
                body: JSON.stringify({ id_habitacion: parseInt(id_habitacion), descripcion })
            });
            
            if (response.ok) {
                messageElement.textContent = 'Reclamo enviado exitosamente';
                messageElement.style.color = 'green';
                document.getElementById('nuevoReclamoForm').reset();
                document.getElementById('nuevoReclamoModal').style.display = 'none';
                cargarReclamos(); // Recargar la lista
            } else {
                const error = await response.json();
                messageElement.textContent = error.error || 'Error al enviar reclamo';
                messageElement.style.color = 'red';
            }
        } catch (error) {
            console.error('Error enviando reclamo:', error);
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
        
        // Obtener datos de pagos
        obtenerDatosPagos(reserva.id_reserva).then(pagos => {
            document.getElementById('detallePagado').textContent = `S/ ${pagos.totalPagado.toFixed(2)}`;
            document.getElementById('detalleFaltaPagar').textContent = `S/ ${pagos.faltaPagar.toFixed(2)}`;
        });
        
        const fotoSrc = reserva.fotos && reserva.fotos.length > 0 
            ? (reserva.fotos[0].startsWith('/') ? reserva.fotos[0] : '/img/habitaciones/' + encodeURIComponent(reserva.fotos[0])) 
            : 'https://source.unsplash.com/featured/?luxury-hotel-room';
        document.getElementById('detalleHabitacionImagen').src = fotoSrc;
        
        document.getElementById('reclamoHabitacionId').value = reserva.id_habitacion;
        
        // Limpiar formulario de reclamo
        document.getElementById('reclamoReservaForm').reset();
        document.getElementById('reclamoMessage').textContent = '';
        
        // Mostrar modal
        document.getElementById('detallesReservaModal').style.display = 'block';
    }

    // Función para obtener datos de pagos
    async function obtenerDatosPagos(idReserva) {
        const token = localStorage.getItem('token');
        try {
            const responseReserva = await fetch(`/api/cliente/reservas/${idReserva}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!responseReserva.ok) throw new Error('Error al obtener reserva');
            const reserva = await responseReserva.json();
            const totalReserva = reserva.monto_total || 0;

            const responsePagos = await fetch(`/api/pagos/reserva/${idReserva}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!responsePagos.ok) throw new Error('Error al obtener pagos');
            const pagos = await responsePagos.json();
            const totalPagado = pagos.reduce((sum, pago) => sum + parseFloat(pago.monto || 0), 0);

            return { totalPagado, faltaPagar: totalReserva - totalPagado };
        } catch (error) {
            console.error('Error obteniendo datos de pagos:', error);
            return { totalPagado: 0, faltaPagar: 0 };
        }
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
        
        const descripcion = document.getElementById('reclamoDescripcion').value.trim();
        const id_habitacion = document.getElementById('reclamoHabitacionId').value;
        
        if (!descripcion) {
            document.getElementById('reclamoMessage').textContent = 'Por favor, describe el reclamo.';
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
                body: JSON.stringify({ descripcion, id_habitacion: parseInt(id_habitacion) })
            });
            
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'index.html';
                return;
            }
            
            if (response.ok) {
                alert('Reclamo enviado exitosamente.');
                document.getElementById('reclamoReservaForm').reset();
                document.getElementById('detallesReservaModal').style.display = 'none';
                cargarReclamos(); // Recargar la lista de reclamos
            } else {
                const error = await response.json();
                document.getElementById('reclamoMessage').textContent = 'Error al enviar reclamo: ' + (error.error || 'Desconocido');
            }
        } catch (error) {
            console.error('Error enviando reclamo:', error);
            document.getElementById('reclamoMessage').textContent = 'Error al enviar reclamo.';
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
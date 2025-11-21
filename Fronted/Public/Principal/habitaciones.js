// habitaciones.js
document.addEventListener('DOMContentLoaded', () => {
    // Variables globales
    let habitacionesData = [];
    let reservasData = [];
    let categoriasData = [];
    let usuarioActual = null;
    let currentHabitacionId = null;

    // API Base URL
    const API_BASE = '/api';

    // Funciones para modales
    const openModal = (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'flex';
    };

    const closeModal = (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
    };

    const switchModal = (currentId, nextId) => {
        closeModal(currentId);
        openModal(nextId);
    };

    // Event listeners para modales
    document.querySelectorAll('[data-modal-target]').forEach(button => {
        button.addEventListener('click', (e) => {
            const modalId = e.currentTarget.getAttribute('data-modal-target');
            openModal(modalId);
        });
    });

    document.querySelectorAll('[data-modal-close]').forEach(span => {
        span.addEventListener('click', (e) => {
            const modalId = e.currentTarget.getAttribute('data-modal-close');
            closeModal(modalId);
        });
    });

    document.querySelectorAll('[data-switch-modal-current]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const currentId = e.currentTarget.getAttribute('data-switch-modal-current');
            const nextId = e.currentTarget.getAttribute('data-switch-modal-next');
            switchModal(currentId, nextId);
        });
    });

    window.addEventListener('click', (e) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (e.target === modal) modal.style.display = 'none';
        });
    });

    // Verificar sesión
    function verificarSesion() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        if (token && user) {
            try {
                usuarioActual = JSON.parse(user);
                mostrarUsuarioLogueado();
            } catch (error) {
                console.error('Error al parsear usuario:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                mostrarBotonesLogin();
            }
        } else {
            mostrarBotonesLogin();
        }
    }

    function mostrarBotonesLogin() {
        document.getElementById('authButtons').classList.remove('hidden');
        document.getElementById('userProfile').classList.add('hidden');
    }

    function mostrarUsuarioLogueado() {
        document.getElementById('authButtons').classList.add('hidden');
        document.getElementById('userProfile').classList.remove('hidden');
        document.getElementById('userName').textContent = usuarioActual.nombre;
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        usuarioActual = null;
        mostrarBotonesLogin();
        window.location.href = 'index.html';
    });

    // Manejar login
    async function manejarLogin(email, password) {
        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                usuarioActual = data.user;
                closeModal('loginModal');
                mostrarUsuarioLogueado();
                document.getElementById('loginMessage').textContent = '';
                // Recargar datos después del login
                await cargarDatos();
            } else {
                document.getElementById('loginMessage').textContent = data.error || 'Error al iniciar sesión';
            }
        } catch (error) {
            console.error('Error en login:', error);
            document.getElementById('loginMessage').textContent = 'Error de conexión';
        }
    }

    // Manejar registro
    async function manejarRegistro(nombre, email, password) {
        try {
            const response = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, email, password }),
            });
            const data = await response.json();
            if (response.ok) {
                document.getElementById('registerMessage').textContent = 'Usuario registrado con éxito.';
                document.getElementById('registerMessage').classList.remove('text-red-500');
                document.getElementById('registerMessage').classList.add('text-green-500');
                document.getElementById('registerForm').reset();
                setTimeout(() => {
                    switchModal('registerModal', 'loginModal');
                    document.getElementById('registerMessage').textContent = '';
                    document.getElementById('registerMessage').classList.remove('text-green-500');
                    document.getElementById('registerMessage').classList.add('text-red-500');
                }, 2000);
            } else {
                document.getElementById('registerMessage').textContent = data.error || 'Error al registrar';
            }
        } catch (error) {
            console.error('Error en registro:', error);
            document.getElementById('registerMessage').textContent = 'Error de conexión';
        }
    }

    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        manejarLogin(email, password);
    });

    document.getElementById('registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const nombre = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        manejarRegistro(nombre, email, password);
    });

    // Cargar categorías
    async function cargarCategorias() {
        try {
            const response = await fetch(`${API_BASE}/categorias`);
            if (!response.ok) throw new Error('Error al cargar categorías');
            const data = await response.json();
            // El endpoint /api/categorias devuelve { categorias: [...] }
            categoriasData = data.categorias || [];
            const select = document.getElementById('categoria');
            select.innerHTML = '<option value="">Todas</option>';
            categoriasData.forEach(cat => {
                select.innerHTML += `<option value="${cat.nombre}">${cat.nombre}</option>`;
            });
            console.log('Categorías cargadas:', categoriasData);
        } catch (error) {
            console.error('Error cargando categorías:', error);
            categoriasData = [];
        }
    }

    // Cargar habitaciones y reservas
    async function cargarDatos() {
        try {
            // Cargar habitaciones disponibles
            const habResponse = await fetch(`${API_BASE}/habitaciones`);
            if (!habResponse.ok) throw new Error('Error al cargar habitaciones');
            const habData = await habResponse.json();
            habitacionesData = Array.isArray(habData) ? habData : (habData.habitaciones || []);
            
            console.log('Habitaciones cargadas:', habitacionesData.map(h => ({
                numero: h.numero_habitacion,
                capacidad: h.capacidad,
                tipo_capacidad: typeof h.capacidad
            })));
            
            // Agregar fotos de las habitaciones
            for (let habitacion of habitacionesData) {
                try {
                    const fotosResponse = await fetch(`${API_BASE}/habitaciones/${habitacion.id_habitacion}/fotos`);
                    if (fotosResponse.ok) {
                        const fotosData = await fotosResponse.json();
                        habitacion.fotos = Array.isArray(fotosData) ? fotosData : [];
                    } else {
                        habitacion.fotos = [];
                    }
                } catch (err) {
                    console.error(`Error cargando fotos de habitación ${habitacion.id_habitacion}:`, err);
                    habitacion.fotos = [];
                }
            }

            // Si hay usuario logueado, cargar sus reservas
            const token = localStorage.getItem('token');
            if (token && usuarioActual) {
                try {
                    const resResponse = await fetch(`${API_BASE}/cliente/reservas`, {
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                    if (resResponse.ok) {
                        const resData = await resResponse.json();
                        reservasData = Array.isArray(resData) ? resData : (resData.reservas || []);
                    } else {
                        reservasData = [];
                    }
                } catch (err) {
                    console.error('Error cargando reservas:', err);
                    reservasData = [];
                }
            } else {
                reservasData = [];
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
            habitacionesData = [];
            reservasData = [];
        }
    }

    // Función para verificar disponibilidad con las 12 horas de limpieza
    function estaDisponible(habitacionId, fechaCheckin, fechaCheckout) {
        const habitacion = habitacionesData.find(h => h.id_habitacion === habitacionId);
        if (!habitacion) return false;
        
        // Si no hay filtro de fechas, usar el campo disponible de la habitación
        if (!fechaCheckin || !fechaCheckout) {
            return habitacion.disponible !== false;
        }
        
        const checkin = new Date(fechaCheckin);
        const checkout = new Date(fechaCheckout);
        
        // Verificar si hay conflictos con reservas existentes
        // IMPORTANTE: Agregar 12 horas después del checkout para limpieza
        const reservasHabitacion = reservasData.filter(r => 
            r.id_habitacion === habitacionId && 
            r.estado_reserva !== 'cancelada' &&
            r.estado_reserva !== 'completada'
        );
        //¡IMPORTANTE! Considerar 12 horas de limpieza después del checkout
        for (const reserva of reservasHabitacion) {
            const resCheckin = new Date(reserva.fecha_checkin);
            const resCheckout = new Date(reserva.fecha_checkout);
            
            // Agregar 12 horas de limpieza después del checkout
            const resCheckoutConLimpieza = new Date(resCheckout.getTime() + (12 * 60 * 60 * 1000));
            
            // Hay conflicto si las fechas se solapan (considerando el tiempo de limpieza)
            if (checkin < resCheckoutConLimpieza && checkout > resCheckin) {
                return false;
            }
        }
        
        return habitacion.disponible !== false;
    }

    // Filtrar habitaciones
    function filtrarHabitaciones() {
        const categoria = document.getElementById('categoria').value;
        const fechaCheckin = document.getElementById('fechaCheckin').value;
        const fechaCheckout = document.getElementById('fechaCheckout').value;
        const precioMin = parseFloat(document.getElementById('precioMin').value) || 0;
        const precioMax = parseFloat(document.getElementById('precioMax').value) || Infinity;
        const capacidad = document.getElementById('capacidad').value;

        console.log('Filtros aplicados:', { categoria, fechaCheckin, fechaCheckout, precioMin, precioMax, capacidad });

        const filtradas = habitacionesData.filter(hab => {
            // Filtrar por categoría
            if (categoria && hab.categoria !== categoria) {
                console.log(`Habitación ${hab.numero_habitacion} descartada por categoría`);
                return false;
            }
            
            // Filtrar por rango de precio
            if (hab.precio_por_dia < precioMin || hab.precio_por_dia > precioMax) {
                console.log(`Habitación ${hab.numero_habitacion} descartada por precio`);
                return false;
            }
            
            // Filtrar por capacidad (debe ser mayor o igual a la capacidad solicitada)
            if (capacidad && hab.capacidad < parseInt(capacidad)) {
                console.log(`Habitación ${hab.numero_habitacion} descartada por capacidad (tiene ${hab.capacidad}, necesita ${capacidad})`);
                return false;
            }
            
            // Filtrar por disponibilidad y fechas
            if (!estaDisponible(hab.id_habitacion, fechaCheckin, fechaCheckout)) {
                console.log(`Habitación ${hab.numero_habitacion} descartada por disponibilidad`);
                return false;
            }
            
            return true;
        });

        console.log(`Se encontraron ${filtradas.length} habitaciones que cumplen los filtros`);
        mostrarHabitaciones(filtradas);
    }

    // Mostrar habitaciones
    function mostrarHabitaciones(habitaciones) {
        const contenedor = document.getElementById('habitacionGrid');
        if (!contenedor) return;

        if (!habitaciones || habitaciones.length === 0) {
            contenedor.innerHTML = `
                <div class="no-habitaciones">
                    <h3>No hay habitaciones disponibles con esos filtros</h3>
                    <p>Intenta cambiar los criterios de búsqueda.</p>
                </div>
            `;
            return;
        }

        contenedor.innerHTML = habitaciones.map(habitacion => {
            // Determinar la imagen a mostrar
            let imagenSrc = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400';
            if (habitacion.fotos && habitacion.fotos.length > 0) {
                imagenSrc = `/img/habitaciones/${habitacion.fotos[0]}`;
            }

            // NUEVO: Verificar si el cliente ya tiene una reserva activa de esta habitación
            const yaLaReserve = reservasData.some(r => 
                r.id_habitacion === habitacion.id_habitacion && 
                r.estado_reserva !== 'completada' &&
                r.estado_reserva !== 'cancelada'
            );

            return `
                <div class="habitacion-card">
                    <img src="${imagenSrc}" 
                        alt="Habitación ${habitacion.numero_habitacion}" 
                        class="habitacion-imagen"
                        onerror="this.src='https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400'">
                    <div class="habitacion-info">
                        <h3 class="habitacion-titulo">Habitación ${habitacion.numero_habitacion}</h3>
                        <p class="habitacion-descripcion">${habitacion.categoria || 'Estándar'} - Piso ${habitacion.piso || 'N/A'} - Capacidad ${habitacion.capacidad || 2} personas</p>
                        <div class="habitacion-precio">S/ ${parseFloat(habitacion.precio_por_dia).toFixed(2)} / día</div>
                        <div class="habitacion-disponibilidad disponible">
                            Disponible
                        </div>
                        <button class="btn-reservar" 
                                data-id="${habitacion.id_habitacion}"
                                data-nombre="Habitación ${habitacion.numero_habitacion}">
                            ${yaLaReserve ? 'Ver Mi Reserva' : 'Reservar Ahora'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Event listeners para reservar
        document.querySelectorAll('.btn-reservar').forEach(btn => {
            btn.addEventListener('click', () => {
                const habitacionId = parseInt(btn.getAttribute('data-id'));
                const nombre = btn.getAttribute('data-nombre');
                reservarHabitacion(habitacionId, nombre);
            });
        });
    }

    // NUEVO: Función para mostrar boleta en formato A5
    function mostrarBoletaA5(datosBoleta) {
        const boletaContent = document.getElementById('boletaContent');
        if (!boletaContent) return;
        
        boletaContent.className = 'boleta-content boleta-a5';
        
        const boletaHTML = `
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
        
        boletaContent.innerHTML = boletaHTML;
    }

    // NUEVO: Función para mostrar boleta en formato Ticket
    function mostrarBoletaTicket(datosBoleta) {
        const boletaContent = document.getElementById('boletaContent');
        if (!boletaContent) return;
        
        boletaContent.className = 'boleta-content boleta-ticket';
        
        const boletaHTML = `
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
        
        boletaContent.innerHTML = boletaHTML;
    }

    // NUEVO: Función para imprimir la boleta
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

    // Inicializar
    async function inicializar() {
        verificarSesion();
        await cargarCategorias();
        await cargarDatos();
        
        // Leer parámetros de URL y aplicar filtros si existen
        const urlParams = new URLSearchParams(window.location.search);
        const checkin = urlParams.get('checkin');
        const checkout = urlParams.get('checkout');
        const huespedes = urlParams.get('huespedes');
        const categoria = urlParams.get('categoria');
        const roomId = urlParams.get('room');
        
        if (checkin) document.getElementById('fechaCheckin').value = checkin;
        if (checkout) document.getElementById('fechaCheckout').value = checkout;
        if (huespedes) document.getElementById('capacidad').value = huespedes;
        if (categoria) document.getElementById('categoria').value = categoria;
        
        if (checkin || checkout || huespedes || categoria) {
            filtrarHabitaciones();
        } else {
            mostrarHabitaciones(habitacionesData); // Mostrar todas inicialmente
        }

        // Si hay parámetro 'room', abrir modal de reserva para esa habitación
        if (roomId) {
            const habitacionId = parseInt(roomId);
            const habitacion = habitacionesData.find(h => h.id_habitacion === habitacionId);
            if (habitacion) {
                // Esperar un poco para que se carguen los datos
                setTimeout(() => {
                    reservarHabitacion(habitacionId, `Habitación ${habitacion.numero_habitacion}`);
                }, 500);
            }
        }
    }

    inicializar();

    // Función para mostrar detalles de una reserva
    function mostrarDetallesReserva(reserva) {
        // Llenar los datos del modal
        document.getElementById('detalleCategoria').textContent = reserva.categoria;
        document.getElementById('detalleEstado').textContent = reserva.estado;
        
        // Formatear fechas
        const checkin = new Date(reserva.checkin).toLocaleString('es-ES', { 
            timeZone: 'America/Lima', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        const checkout = new Date(reserva.checkout).toLocaleString('es-ES', { 
            timeZone: 'America/Lima', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        const fechaCreacion = new Date(reserva.fechaCreacion).toLocaleString('es-ES', { 
            timeZone: 'America/Lima', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        
        document.getElementById('detalleFechaCheckin').textContent = checkin;
        document.getElementById('detalleFechaCheckout').textContent = checkout;
        document.getElementById('detalleFechaCreacion').textContent = fechaCreacion;
        
        // Guardar ID de la reserva para el botón de completar pago
        document.getElementById('reclamoReservaId').value = reserva.id;
        
        // NUEVO: Si ya tenemos los datos de pago (reserva recién creada), usarlos directamente
        if (reserva.totalPagado !== undefined && reserva.totalReserva !== undefined) {
            const pagado = reserva.totalPagado || 0;
            const total = reserva.totalReserva || 0;
            const falta = reserva.montoPendiente !== undefined ? reserva.montoPendiente : (total - pagado);
            
            actualizarDatosPago(pagado, total, falta, reserva);
        } else {
            // Obtener datos de pagos desde la API
            obtenerDatosPagos(reserva.id).then(pagos => {
                const pagado = pagos.totalPagado || 0;
                const total = pagos.totalReserva || 0;
                const falta = total - pagado;
                
                actualizarDatosPago(pagado, total, falta, reserva);
            }).catch(error => {
                console.error('Error obteniendo datos de pagos:', error);
                document.getElementById('detallePagado').textContent = 'N/A';
                document.getElementById('detalleFaltaPagar').textContent = 'N/A';
                document.getElementById('detalleTotal').textContent = 'N/A';
                
                // Resetear barra de progreso
                const progressFill = document.getElementById('pagoProgressFill');
                if (progressFill) {
                    progressFill.style.width = '0%';
                }
                
                // Ocultar botón de completar pago
                document.getElementById('btnCompletarPago').style.display = 'none';
            });
        }
        
        // Establecer la imagen
        document.getElementById('detalleHabitacionImagen').src = reserva.foto;
        
        // Guardar el ID de la habitación para el reclamo
        document.getElementById('reclamoHabitacionId').value = reserva.idHabitacion;
        
        // Limpiar el formulario de reclamo
        document.getElementById('reclamoReservaForm').reset();
        document.getElementById('reclamoMessage').textContent = '';
        
        // Abrir el modal
        openModal('detallesReservaModal');
    }
    
    // NUEVA FUNCIÓN: Actualizar datos de pago en el modal
    function actualizarDatosPago(pagado, total, falta, reserva) {
        console.log('Actualizando datos de pago:', { pagado, total, falta });
        
        // Actualizar valores
        document.getElementById('detallePagado').textContent = `S/ ${pagado.toFixed(2)}`;
        document.getElementById('detalleFaltaPagar').textContent = `S/ ${falta.toFixed(2)}`;
        document.getElementById('detalleTotal').textContent = `S/ ${total.toFixed(2)}`;
        
        // Actualizar barra de progreso
        const porcentajePagado = total > 0 ? (pagado / total) * 100 : 0;
        console.log('Porcentaje pagado:', porcentajePagado + '%');
        
        const progressFill = document.getElementById('pagoProgressFill');
        if (progressFill) {
            // Resetear primero
            progressFill.style.width = '0%';
            
            // Usar setTimeout para asegurar que la animación se vea
            setTimeout(() => {
                progressFill.style.width = `${porcentajePagado}%`;
                console.log('Barra de progreso actualizada a:', porcentajePagado + '%');
            }, 100);
        } else {
            console.error('No se encontró el elemento pagoProgressFill');
        }
        
        // Mostrar botón según estado de pago
        const btnPago = document.getElementById('btnCompletarPago');
        if (falta > 0.01) { // Usar 0.01 para evitar problemas de redondeo
            btnPago.style.display = 'block';
            btnPago.textContent = 'Completar Pago';
            btnPago.className = 'btn-primary'; // Asegurar clase correcta
            // NUEVO: Usar onclick en lugar de asignar directamente
            btnPago.onclick = () => mostrarModalConfirmarPago(reserva.id, falta, total, pagado, reserva);
            console.log('Botón de completar pago mostrado');
        } else {
            btnPago.style.display = 'block';
            btnPago.textContent = 'Ver Boleta';
            btnPago.className = 'btn-success'; // Cambiar a clase verde para consistencia
            // onclick para mostrar boleta
            btnPago.onclick = () => generarBoletaElectronica(reserva.id, total, reserva);
            console.log('Botón de ver boleta mostrado (pago completo)');
        }
    }
    
    // NUEVA FUNCIÓN: Mostrar modal de confirmación de pago
    function mostrarModalConfirmarPago(idReserva, montoPendiente, montoTotal, yaPagado, reserva) {
        // Llenar datos del modal
        document.getElementById('montoPendienteModal').textContent = `S/ ${montoPendiente.toFixed(2)}`;
        document.getElementById('totalReservaModal').textContent = `S/ ${montoTotal.toFixed(2)}`;
        document.getElementById('yaPagadoModal').textContent = `S/ ${yaPagado.toFixed(2)}`;
        document.getElementById('pendientePagarModal').textContent = `S/ ${montoPendiente.toFixed(2)}`;
        
        // Abrir el modal
        openModal('confirmarPagoCompletoModal');
        
        // Event listener para el botón Confirmar
        const btnConfirmar = document.getElementById('btnConfirmarPagoCompleto');
        btnConfirmar.onclick = async () => {
            closeModal('confirmarPagoCompletoModal');
            await completarPago(idReserva, montoPendiente, montoTotal, reserva);
        };
        
        // Event listener para el botón Cancelar
        const btnCancelar = document.getElementById('btnCancelarPagoCompleto');
        btnCancelar.onclick = () => {
            closeModal('confirmarPagoCompletoModal');
        };
    }

    // Función para obtener datos de pagos de una reserva
    async function obtenerDatosPagos(idReserva) {
        const token = localStorage.getItem('token');
        console.log('Obteniendo datos de pagos para reserva ID:', idReserva);
        
        try {
            // Obtener la reserva para el total
            const responseReserva = await fetch(`${API_BASE}/cliente/reservas/${idReserva}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('Response de reserva:', responseReserva.status, responseReserva.statusText);
            
            if (!responseReserva.ok) {
                // Si falla, intentar obtener desde el listado general
                console.warn('No se pudo obtener reserva individual, intentando desde listado general...');
                const responseTodasReservas = await fetch(`${API_BASE}/cliente/reservas`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!responseTodasReservas.ok) {
                    throw new Error('Error al obtener reservas');
                }
                
                const todasReservas = await responseTodasReservas.json();
                const reserva = todasReservas.find(r => r.id_reserva === parseInt(idReserva));
                
                if (!reserva) {
                    throw new Error('Reserva no encontrada');
                }
                
                // CONVERTIR a número
                const totalReserva = parseFloat(reserva.monto_total) || 0;
                console.log('Total de reserva desde listado:', totalReserva);
                
                // Obtener historial de pagos
                const responsePagos = await fetch(`${API_BASE}/pagos/reserva/${idReserva}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!responsePagos.ok) {
                    console.warn('No se pudo obtener historial de pagos');
                    return { totalPagado: 0, totalReserva };
                }
                
                const pagos = await responsePagos.json();
                const totalPagado = pagos.reduce((sum, pago) => sum + parseFloat(pago.monto || 0), 0);
                
                console.log('Datos de pago obtenidos:', { totalPagado, totalReserva });
                return { totalPagado, totalReserva };
            }
            
            const reserva = await responseReserva.json();
            // CONVERTIR a número
            const totalReserva = parseFloat(reserva.monto_total) || 0;
            console.log('Total de reserva:', totalReserva);

            // Obtener historial de pagos
            const responsePagos = await fetch(`${API_BASE}/pagos/reserva/${idReserva}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!responsePagos.ok) {
                console.warn('No se pudo obtener historial de pagos');
                return { totalPagado: 0, totalReserva };
            }
            
            const pagos = await responsePagos.json();
            const totalPagado = pagos.reduce((sum, pago) => sum + parseFloat(pago.monto || 0), 0);

            console.log('Datos de pago obtenidos:', { totalPagado, totalReserva });
            return { totalPagado, totalReserva };
        } catch (error) {
            console.error('Error obteniendo datos de pagos:', error);
            return { totalPagado: 0, totalReserva: 0 };
        }
    }

    // Función para completar el pago pendiente
    async function completarPago(idReserva, montoPendiente, montoTotal, reserva) {
        const confirmar = confirm(`¿Desea completar el pago de S/ ${montoPendiente.toFixed(2)}?`);
        if (!confirmar) return;
        
        const token = localStorage.getItem('token');
        const btnCompletarPago = document.getElementById('btnCompletarPago');
        btnCompletarPago.disabled = true;
        btnCompletarPago.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        
        try {
            // Procesar el pago del saldo pendiente
            const response = await fetch(`${API_BASE}/pagos/procesar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    id_reserva: idReserva,
                    monto: montoPendiente,
                    metodo_pago: 'tarjeta', // Por defecto, puede modificarse
                    tipo_pago: 'completo',
                    comprobante: null
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al procesar pago');
            }
            
            const pagoData = await responsePago.json();
            
            // Actualizar la vista
            document.getElementById('detallePagado').textContent = `S/ ${montoTotal.toFixed(2)}`;
            document.getElementById('detalleFaltaPagar').textContent = `S/ 0.00`;
            document.getElementById('detalleTotal').textContent = `S/ ${montoTotal.toFixed(2)}`;
            
            // Actualizar barra de progreso al 100%
            const progressFill = document.getElementById('pagoProgressFill');
            if (progressFill) {
                progressFill.style.width = '100%';
            }
            
            // Cambiar botón a "Ver Boleta" en lugar de ocultarlo
            btnCompletarPago.textContent = 'Ver Boleta';
            btnCompletarPago.className = 'btn-success'; // Cambiar a clase secundaria
            btnCompletarPago.disabled = false;
            btnCompletarPago.innerHTML = '<i class="fas fa-receipt"></i> Ver Boleta';
            btnCompletarPago.onclick = () => generarBoletaElectronica(idReserva, montoTotal, reserva);
            
            // Generar boleta electrónica
            await generarBoletaElectronica(idReserva, montoTotal, reserva);
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error al completar el pago: ' + error.message);
            btnCompletarPago.disabled = false;
            btnCompletarPago.innerHTML = '<i class="fas fa-credit-card"></i> Completar Pago';
        }
    }
    
    // Función para generar boleta electrónica en PDF
    async function generarBoletaElectronica(idReserva, montoTotal, reserva) {
        try {
            const token = localStorage.getItem('token');
            
            // Obtener datos completos de la reserva si no los tenemos
            let datosReserva = reserva;
            if (!datosReserva.checkin) {
                const response = await fetch(`${API_BASE}/cliente/reservas/${idReserva}`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (response.ok) {
                    datosReserva = await response.json();
                }
            }
            
            // Crear contenido HTML para la boleta
            const boletaHTML = `
                <div class="boleta-header">
                    <div class="boleta-title">BOLETA ELECTRÓNICA</div>
                    <div class="boleta-numero">N° ${String(idReserva).padStart(8, '0')}</div>
                    <div class="empresa-info">
                        <strong>JW Marriott Hotel Lima</strong><br>
                        RUC: 20123456789<br>
                        Av. Malecón de la Reserva 615, Miraflores, Lima, Perú<br>
                        Teléfono: (01) 217-7000 | Email: info@jwmarriottlima.com
                    </div>
                </div>
                
                <!-- Información del Cliente -->
                <div class="boleta-section">
                    <div class="section-title">DATOS DEL CLIENTE</div>
                    <div class="info-row">
                        <span class="info-label">Nombre:</span>
                        <span class="info-value">${usuarioActual?.nombre || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Email:</span>
                        <span class="info-value">${usuarioActual?.email || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Fecha de Emisión:</span>
                        <span class="info-value">${new Date().toLocaleString('es-ES', { timeZone: 'America/Lima' })}</span>
                    </div>
                </div>
                
                <!-- Detalles de la Reserva -->
                <div class="boleta-section">
                    <div class="section-title">DETALLES DE LA RESERVA</div>
                    <div class="info-row">
                        <span class="info-label">Habitación:</span>
                        <span class="info-value">${reserva.habitacion || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Categoría:</span>
                        <span class="info-value">${reserva.categoria || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Check-in:</span>
                        <span class="info-value">${new Date(datosReserva.checkin || reserva.checkin).toLocaleString('es-ES', { timeZone: 'America/Lima' })}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Check-out:</span>
                        <span class="info-value">${new Date(datosReserva.checkout || reserva.checkout).toLocaleString('es-ES', { timeZone: 'America/Lima' })}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Estado:</span>
                        <span class="info-value">${reserva.estado || 'Confirmada'}</span>
                    </div>
                </div>
                
                <!-- Sello de pago completo -->
                <div class="boleta-stamp">
                    ✓ PAGO COMPLETO REALIZADO
                </div>
                
                <!-- Total -->
                <div class="boleta-total">
                    <div class="total-label">MONTO TOTAL PAGADO</div>
                    <div class="total-amount">S/ ${montoTotal.toFixed(2)}</div>
                </div>
                
                <!-- Footer -->
                <div class="boleta-footer">
                    <p>Este documento constituye un comprobante de pago válido.</p>
                    <p>Gracias por su preferencia. ¡Esperamos que disfrute su estadía!</p>
                    <p><strong>JW Marriott Hotel Lima</strong> - Excelencia en Hospitalidad</p>
                </div>
            `;
            
            // Mostrar en el modal
            const boletaContent = document.getElementById('boletaContent');
            boletaContent.innerHTML = boletaHTML;
            
            // Mostrar modal
            openModal('boletaModal');
            
            // Configurar event listeners para los botones
            configurarBotonesBoleta(idReserva, montoTotal, reserva, datosReserva);
            
        } catch (error) {
            console.error('Error generando boleta:', error);
            alert('Pago completado, pero hubo un error al generar la boleta. Por favor, contacte con recepción.');
        }
    }

    // Función para configurar los botones del modal de boleta
    function configurarBotonesBoleta(idReserva, montoTotal, reserva, datosReserva) {
        const btnFormatoA5 = document.getElementById('btnFormatoA5');
        const btnFormatoTicket = document.getElementById('btnFormatoTicket');
        const btnImprimir = document.getElementById('btnImprimirBoleta');
        const btnCerrar = document.getElementById('btnCerrarBoleta');
        
        // Crear objeto datosBoleta
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
                habitacion: reserva.habitacion,
                categoria: reserva.categoria,
                checkin: new Date(datosReserva.checkin || reserva.checkin).toLocaleString('es-ES', { timeZone: 'America/Lima' }),
                checkout: new Date(datosReserva.checkout || reserva.checkout).toLocaleString('es-ES', { timeZone: 'America/Lima' }),
                estado: reserva.estado || 'Confirmada'
            },
            total: montoTotal.toFixed(2)
        };
        
        // Mostrar formato A5 inicialmente
        mostrarBoletaA5(datosBoleta);
        
        // Event listeners
        btnFormatoA5.addEventListener('click', () => {
            mostrarBoletaA5(datosBoleta);
        });
        
        btnFormatoTicket.addEventListener('click', () => {
            mostrarBoletaTicket(datosBoleta);
        });
        
        btnImprimir.addEventListener('click', () => {
            imprimirBoleta(datosBoleta);
        });
        
        btnCerrar.addEventListener('click', () => {
            closeModal('boletaModal');
        });
    }

    // Función para reservar habitación
    function reservarHabitacion(habitacionId, nombreHabitacion) {
        if (!usuarioActual) {
            alert('Debe iniciar sesión para realizar una reserva');
            openModal('loginModal');
            return;
        }
        
        if (usuarioActual.rol !== 'cliente') {
            alert('Solo los clientes pueden realizar reservas.');
            return;
        }

        // VALIDACIÓN CRÍTICA: Verificar si el cliente ya tiene una reserva activa de esta habitación
        const reservaExistente = reservasData.find(r => 
            r.id_habitacion === habitacionId && 
            r.estado_reserva !== 'completada' &&
            r.estado_reserva !== 'cancelada'
        );
        
        if (reservaExistente) {
            // MOSTRAR MODAL CON DETALLES DE LA RESERVA EXISTENTE en lugar del formulario
            const reservaData = {
                id: reservaExistente.id_reserva,
                habitacion: reservaExistente.numero_habitacion,
                categoria: habitacionesData.find(h => h.id_habitacion === habitacionId)?.categoria || 'N/A',
                checkin: reservaExistente.fecha_checkin,
                checkout: reservaExistente.fecha_checkout,
                estado: reservaExistente.estado_reserva,
                fechaCreacion: reservaExistente.fecha_creacion,
                idHabitacion: habitacionId,
                foto: habitacionesData.find(h => h.id_habitacion === habitacionId)?.fotos?.[0] 
                    ? (habitacionesData.find(h => h.id_habitacion === habitacionId).fotos[0].startsWith('/') 
                        ? habitacionesData.find(h => h.id_habitacion === habitacionId).fotos[0] 
                        : '/img/habitaciones/' + habitacionesData.find(h => h.id_habitacion === habitacionId).fotos[0])
                    : 'https://source.unsplash.com/featured/?luxury-hotel-room'
            };
            
            mostrarDetallesReserva(reservaData);
            return; // NO abrir el modal de reserva
        }

        // Si NO tiene reserva activa, continuar con el flujo normal de reserva
        currentHabitacionId = habitacionId;
        const habitacion = habitacionesData.find(h => h.id_habitacion === habitacionId);
        if (habitacion) {
            document.getElementById('reservaHabitacionNombre').textContent = nombreHabitacion;
            document.getElementById('reservaHabitacionCategoria').textContent = `Categoría: ${habitacion.categoria}`;
            document.getElementById('reservaHabitacionPiso').textContent = `Piso: ${habitacion.piso}`;
            document.getElementById('reservaHabitacionCapacidad').textContent = `Capacidad: ${habitacion.capacidad} personas`;
            document.getElementById('reservaHabitacionPrecioDia').textContent = `Precio por día: S/ ${habitacion.precio_por_dia}`;
            
            // Manejar la visualización de imagen
            const imagenElement = document.getElementById('reservaHabitacionImagen');
            if (imagenElement) {
                let fotoSrc = 'https://source.unsplash.com/featured/?luxury-hotel-room';
                
                if (habitacion.fotos && habitacion.fotos.length > 0) {
                    fotoSrc = habitacion.fotos[0].startsWith('/') ? habitacion.fotos[0] : '/img/habitaciones/' + habitacion.fotos[0];
                }
                
                imagenElement.src = fotoSrc;
                imagenElement.alt = nombreHabitacion;
                imagenElement.style.display = 'block';
                
                imagenElement.onerror = function() {
                    this.onerror = null;
                    this.src = 'https://source.unsplash.com/featured/?luxury-hotel-room';
                };
            }
        }
        document.getElementById('reservaMessage').textContent = '';
        checkForm();
        openModal('reservaModal');
    }
});
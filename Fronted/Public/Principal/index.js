//Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {
        // Functions to handle the modals
        const openModal = (id) => {
            const modal = document.getElementById(id);
            if (modal) {
                modal.style.display = 'flex';
            }
        };
    
        const closeModal = (id) => {
            const modal = document.getElementById(id);
            if (modal) {
                modal.style.display = 'none';
            }
        };
    
        const switchModal = (currentId, nextId) => {
            closeModal(currentId);
            openModal(nextId);
        };
    
        // Attach event listeners to buttons
        document.querySelectorAll('[data-modal-target]').forEach(button => {
            button.addEventListener('click', (e) => {
                const modalId = e.currentTarget.getAttribute('data-modal-target');
                openModal(modalId);
            });
        });
    
        // Attach event listeners to close buttons
        document.querySelectorAll('[data-modal-close]').forEach(span => {
            span.addEventListener('click', (e) => {
                const modalId = e.currentTarget.getAttribute('data-modal-close');
                closeModal(modalId);
            });
        });
    
        // Attach event listeners to modal switch links
        document.querySelectorAll('[data-switch-modal-current]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default link behavior
                const currentId = e.currentTarget.getAttribute('data-switch-modal-current');
                const nextId = e.currentTarget.getAttribute('data-switch-modal-next');
                switchModal(currentId, nextId);
            });
        });
    
        // Close modal if user clicks outside the modal content
        window.addEventListener('click', (e) => {
            document.querySelectorAll('.modal').forEach(modal => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
        
        // Variables globales para el carrusel principal
        let currentSlide = 0;
        let carouselImages = [];
        let carouselInterval;

        // Función para cargar y mostrar el carrusel principal
        async function cargarCarruselPrincipal() {
            try {
                const response = await fetch('/api/carrusel');
                const data = await response.json();
                
                if (data.images && data.images.length > 0) {
                    carouselImages = data.images;
                    mostrarCarrusel();
                    iniciarCarruselAutomatico();
                } else {
                    console.log('No hay imágenes para el carrusel, usando imágenes por defecto');
                    carouselImages = [
                        { url: 'https://source.unsplash.com/featured/?luxury-hotel-lobby', descripcion: 'Vista principal de JW Marriott Hotel Lima' },
                        { url: 'https://source.unsplash.com/featured/?luxury-hotel-entrance', descripcion: 'Entrada principal del hotel' },
                        { url: 'https://source.unsplash.com/featured/?luxury-hotel-facilities', descripcion: 'Instalaciones del hotel' }
                    ];
                    mostrarCarrusel();
                    iniciarCarruselAutomatico();
                }
            } catch (error) {
                console.error('Error al cargar el carrusel:', error);
                // Usar imágenes por defecto en caso de error
                carouselImages = [
                    { url: '/img/carousel/1759217839989-3.jpg', descripcion: 'Vista principal del hotel' },
                    { url: '/img/carousel/1759868840216-6.jpg', descripcion: 'Entrada principal del hotel' },
                    { url: '/img/carousel/1761353310583-7.png', descripcion: 'Instalaciones del hotel' }
                ];
                mostrarCarrusel();
                iniciarCarruselAutomatico();
            }
        }

        // Función para mostrar el carrusel en el DOM
        function mostrarCarrusel() {
            const carouselTrack = document.getElementById('carouselTrack');
            const carouselIndicators = document.getElementById('carouselIndicators');
            if (!carouselTrack || !carouselIndicators) return;

            carouselTrack.innerHTML = carouselImages.map((image, index) => `
                <div class="carousel-slide">
                    <img src="${image.url}" alt="${image.descripcion || 'Imagen de Casa del Inka'}" 
                         loading="lazy" onerror="this.onerror=null; this.src='/img/carousel/1759217839989-3.jpg'">
                </div>
            `).join('');

            carouselIndicators.innerHTML = carouselImages.map((_, index) => `
                <div class="carousel-dot ${index === 0 ? 'active' : ''}" data-slide="${index}"></div>
            `).join('');

            // Add event listeners
            document.querySelectorAll('.carousel-dot').forEach(dot => {
                dot.addEventListener('click', (e) => {
                    const slide = parseInt(e.target.getAttribute('data-slide'));
                    irASlide(slide);
                });
            });

            // Add touch support for swiping
            let touchStartX = 0;
            let touchEndX = 0;
            carouselTrack.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });
            carouselTrack.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                handleSwipe();
            });
            function handleSwipe() {
                const swipeThreshold = 50;
                if (touchEndX < touchStartX - swipeThreshold) {
                    // Swipe left, next slide
                    cambiarSlide(1);
                }
                if (touchEndX > touchStartX + swipeThreshold) {
                    // Swipe right, prev slide
                    cambiarSlide(-1);
                }
            }
        }

        // Función para cambiar de slide
        function cambiarSlide(direccion) {
            if (carouselImages.length <= 1) return;
            
            const carouselTrack = document.getElementById('carouselTrack');
            const indicators = document.querySelectorAll('.carousel-dot');
            
            indicators[currentSlide].classList.remove('active');
            
            currentSlide += direccion;
            if (currentSlide >= carouselImages.length) currentSlide = 0;
            if (currentSlide < 0) currentSlide = carouselImages.length - 1;
            
            carouselTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
            indicators[currentSlide].classList.add('active');
        }

        // Función para ir a un slide específico
        function irASlide(index) {
            if (carouselImages.length <= 1) return;
            
            const carouselTrack = document.getElementById('carouselTrack');
            const indicators = document.querySelectorAll('.carousel-dot');
            
            indicators[currentSlide].classList.remove('active');
            
            currentSlide = index;
            
            carouselTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
            indicators[currentSlide].classList.add('active');
        }

        // Función para iniciar el carrusel automático
        function iniciarCarruselAutomatico() {
            if (carouselImages.length <= 1) return;
            
            if (carouselInterval) clearInterval(carouselInterval);
            
            carouselInterval = setInterval(() => {
                cambiarSlide(1);
            }, 4000);
        }

        // Variable global para las habitaciones
        let habitacionesData = [];
        let misReservasActivas = []; // CORREGIDO: Solo las reservas del cliente actual

        // FUNCIÓN CORREGIDA: Cargar las reservas del cliente actual
        async function cargarMisReservas() {
            // VERIFICAR PRIMERO si hay usuario logueado
            const token = localStorage.getItem('token');
            if (!token || !usuarioActual) {
                misReservasActivas = [];
                console.log('No hay usuario logueado, no se cargan reservas');
                return;
            }
            
            try {
                const response = await fetch('/api/cliente/reservas', { 
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (response.ok) {
                    misReservasActivas = await response.json();
                    console.log('Mis reservas cargadas:', misReservasActivas.length);
                } else {
                    misReservasActivas = [];
                    console.log('No se pudieron cargar las reservas del cliente');
                }
            } catch (error) {
                console.error('Error al cargar reservas del cliente:', error);
                misReservasActivas = [];
            }
        }

        // FUNCIÓN CORREGIDA: Verificar si el cliente ya tiene una reserva activa de esta habitación
        function clienteTieneReservaActiva(habitacionId) {
            if (!misReservasActivas || misReservasActivas.length === 0) {
                return false;
            }

            // Verificar si el cliente tiene una reserva activa de esta habitación específica
            return misReservasActivas.some(r => 
                r.id_habitacion === habitacionId && 
                r.estado_reserva !== 'completada' &&
                r.estado_reserva !== 'cancelada'
            );
        }

        // Función mejorada para cargar habitaciones
        async function cargarHabitaciones() {
            try {
                // PRIMERO: Cargar las reservas del cliente actual
                await cargarMisReservas();

                const response = await fetch('/api/cliente/habitaciones');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Habitaciones cargadas:', data);
                
                habitacionesData = data.habitaciones; // Guardar globalmente
                
                const contenedor = document.getElementById('habitacionGrid');
                if (!contenedor) {
                    console.error('No se encontró el contenedor de habitaciones');
                    return;
                }

                if (!data.habitaciones || data.habitaciones.length === 0) {
                    contenedor.innerHTML = `
                        <div class="no-habitaciones">
                            <h3>No hay habitaciones disponibles en este momento</h3>
                            <p>Por favor, vuelva más tarde o contacte con nosotros para más información.</p>
                        </div>
                    `;
                    return;
                }

                contenedor.innerHTML = `
                    <div class="habitaciones-grid">
                        ${data.habitaciones.slice(0, 4).map(habitacion => {
                            const fotoSrc = habitacion.fotos && habitacion.fotos.length > 0 
                                ? (habitacion.fotos[0].startsWith('/') ? habitacion.fotos[0] : '/img/habitaciones/' + habitacion.fotos[0]) 
                                : 'https://source.unsplash.com/featured/?luxury-hotel-room';
                            
                            // VERIFICAR si el cliente ya tiene una reserva activa de esta habitación
                            const yaLaReserve = clienteTieneReservaActiva(habitacion.id_habitacion);
                            
                            return `
                            <div class="habitacion-card">
                                <img src="${fotoSrc}" 
                                     alt="${habitacion.numero_habitacion}" 
                                     class="habitacion-imagen"
                                     onerror="this.onerror=null; this.src='https://source.unsplash.com/featured/?luxury-hotel-room';">
                                <div class="habitacion-info">
                                    <h3 class="habitacion-titulo">Habitación ${habitacion.numero_habitacion}</h3>
                                    <p class="habitacion-descripcion">${habitacion.categoria} - Piso ${habitacion.piso} - Capacidad ${habitacion.capacidad}</p>
                                    <div class="habitacion-precio">S/ ${habitacion.precio_por_dia} / día</div>
                                    <div class="packages">
                                        <h4>Paquetes Disponibles</h4>
                                        <ul>
                                            <li>Paquete Romántico: +S/50 (Champagne y flores)</li>
                                            <li>Upgrade a Suite: +S/100</li>
                                            <li>Late Check-out: +S/15</li>
                                        </ul>
                                    </div>
                                    <div class="habitacion-disponibilidad ${habitacion.disponible ? 'disponible' : 'no-disponible'}">
                                        ${habitacion.disponible ? 'Disponible' : 'No disponible'}
                                    </div>
                                    <button class="btn-reservar" 
                                            data-id="${habitacion.id_habitacion}"
                                            data-nombre="Habitación ${habitacion.numero_habitacion}">
                                        ${yaLaReserve ? 'Ver Mi Reserva' : 'Reservar Ahora'}
                                    </button>
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                `;

                // Agregar event listeners a los botones de reservar
                document.querySelectorAll('.btn-reservar').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const habitacionId = parseInt(btn.getAttribute('data-id'));
                        const nombre = btn.getAttribute('data-nombre');
                        reservarHabitacion(habitacionId, nombre);
                    });
                });

            } catch (error) {
                console.error('Error al cargar habitaciones:', error);
                const contenedor = document.getElementById('habitaciones-lista');
                if (contenedor) {
                    contenedor.innerHTML = `
                        <div class="no-habitaciones">
                            <h3>Error al cargar las habitaciones</h3>
                            <p>Ha ocurrido un problema al cargar la información. Por favor, recargue la página o contacte con nosotros.</p>
                            <button class="btn-principal" onclick="cargarHabitaciones()">Reintentar</button>
                        </div>
                    `;
                }
            }
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
            const reservaExistente = misReservasActivas.find(r => 
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
                
                // Handle image display
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

        // Función para manejar la reserva
        async function manejarReserva(e) {
            e.preventDefault();
            
            const checkin = document.getElementById('fechaCheckin').value;
            const checkout = document.getElementById('fechaCheckout').value;
            
            if (!checkin || !checkout) {
                document.getElementById('reservaMessage').textContent = 'Por favor, selecciona las fechas y horas';
                return;
            }
            
            // CORRECCIÓN MEJORADA: No usar Date(), enviar el string directamente
            // El input datetime-local devuelve: "2025-10-09T01:20"
            // Lo convertimos a formato que PostgreSQL entienda sin zona horaria
            
            // Validar formato básico
            if (!checkin.includes('T') || !checkout.includes('T')) {
                document.getElementById('reservaMessage').textContent = 'Por favor, selecciona fecha Y hora.';
                return;
            }
            
            // Crear Date solo para validaciones
            const checkinDate = new Date(checkin);
            const checkoutDate = new Date(checkout);
            
            if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
                document.getElementById('reservaMessage').textContent = 'Fechas inválidas.';
                return;
            }
            
            if (checkoutDate <= checkinDate) {
                document.getElementById('reservaMessage').textContent = 'La fecha de checkout debe ser posterior al checkin';
                return;
            }
            
            // Verificar que haya al menos 1 hora de diferencia
            const diffHours = (checkoutDate - checkinDate) / (1000 * 60 * 60);
            if (diffHours < 1) {
                document.getElementById('reservaMessage').textContent = 'La reserva debe ser de al menos 1 hora';
                return;
            }
            
            // Collect upsells
            const upsells = [];
            if (document.getElementById('upsell-desayuno')?.checked) upsells.push('desayuno');
            if (document.getElementById('upsell-romantico')?.checked) upsells.push('romantico');
            if (document.getElementById('upsell-spa')?.checked) upsells.push('spa');
            if (document.getElementById('upsell-late-checkout')?.checked) upsells.push('late-checkout');
            
            // Calcular monto total
            const habitacion = habitacionesData.find(h => h.id_habitacion === currentHabitacionId);
            if (!habitacion) {
                document.getElementById('reservaMessage').textContent = 'Error: habitación no encontrada';
                return;
            }
            
            const dias = Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
            let montoTotal = habitacion.precio_por_dia * dias;
            
            // Agregar costos de servicios adicionales
            const costosServicios = {
                'desayuno': 20,
                'romantico': 50,
                'spa': 30,
                'late-checkout': 15
            };
            
            upsells.forEach(servicio => {
                if (costosServicios[servicio]) {
                    montoTotal += costosServicios[servicio] * dias;
                }
            });
            
            const montoMinimo = (montoTotal * 0.5).toFixed(2);
            
            // CLAVE: Enviar el string directamente con :00 para los segundos
            // Formato: "2025-10-09T01:20:00" sin timezone
            window.datosReserva = {
                id_habitacion: currentHabitacionId,
                fecha_checkin: checkin + ':00-05:00',  // Agregar segundos y zona horaria, NO convertir a ISO
                fecha_checkout: checkout + ':00-05:00', // Agregar segundos y zona horaria, NO convertir a ISO
                servicios_adicionales: upsells,
                monto_total: montoTotal,
                monto_minimo: montoMinimo,
                dias: dias
            };
            
            console.log('✅ Datos de reserva (hora exacta del cliente):', {
                checkin: checkin + ':00',
                checkout: checkout + ':00'
            });
            
            // Mostrar modal de pago
            mostrarModalPago(montoTotal, montoMinimo, dias);
        }

        // Función para verificar si el formulario de reserva está completo
        function checkForm() {
            const checkinInput = document.getElementById('fechaCheckin');
            const checkoutInput = document.getElementById('fechaCheckout');
            const btnConfirmar = document.getElementById('btnConfirmarReserva');
            
            if (checkinInput.value && checkoutInput.value) {
                btnConfirmar.disabled = false;
            } else {
                btnConfirmar.disabled = true;
            }
        }

        // Event listeners para los inputs del formulario de reserva
        document.getElementById('fechaCheckin').addEventListener('input', checkForm);
        document.getElementById('fechaCheckout').addEventListener('input', checkForm);

        // Variable global para el usuario actual
        let usuarioActual = null;

        // Variable para la habitación actual en reserva
        let currentHabitacionId = null;

        // Función para verificar si hay una sesión activa
        function verificarSesion() {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            
            if (token && user) {
                try {
                    usuarioActual = JSON.parse(user);
                    mostrarUsuarioLogueado();
                } catch (error) {
                    console.error('Error al parsear usuario del localStorage:', error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    mostrarBotonesLogin();
                }
            } else {
                mostrarBotonesLogin();
            }
        }

        // Función para mostrar los botones de login cuando no hay sesión
        function mostrarBotonesLogin() {
            document.getElementById('authButtons').classList.remove('hidden');
            document.getElementById('userProfile').classList.add('hidden');
            // Ocultar sección de reservas
            document.getElementById('mis-reservas').style.display = 'none';
            // Remover enlace de nav si existe
            const misReservasLink = document.getElementById('mis-reservas-link');
            if (misReservasLink) {
                misReservasLink.remove();
            }
        }

        // Función para mostrar el perfil del usuario cuando está logueado
        function mostrarUsuarioLogueado() {
            document.getElementById('authButtons').classList.add('hidden');
            document.getElementById('userProfile').classList.remove('hidden');
            document.getElementById('userName').textContent = usuarioActual.nombre;
            // Si es cliente, mostrar sección de reservas y agregar enlace al nav
            if (usuarioActual.rol === 'cliente') {
                document.getElementById('mis-reservas').style.display = 'block';
                const navLinks = document.querySelector('.nav-links');
                if (!document.getElementById('mis-reservas-link')) {
                    const li = document.createElement('li');
                    li.id = 'mis-reservas-link';
                    li.innerHTML = '<a href="#mis-reservas">Mis reservas</a>';
                    navLinks.appendChild(li);
                }
            } else {
                document.getElementById('mis-reservas').style.display = 'none';
            }
        }

        // Función para cerrar sesión
        function cerrarSesion() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            usuarioActual = null;
            mostrarBotonesLogin();
            // Redireccionar a la página principal si no estamos en ella
            if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
                window.location.href = '/index.html';
            }
        }

        // Event listener para el botón de cerrar sesión
        document.getElementById('logoutBtn').addEventListener('click', cerrarSesion);

        // Función para manejar el login
        async function manejarLogin(email, password) {
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    // Login exitoso
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    usuarioActual = data.user;
                    
                    // Cerrar modal
                    closeModal('loginModal');
                    
                    // Mostrar usuario logueado
                    mostrarUsuarioLogueado();
                    
                    if (usuarioActual && usuarioActual.rol === 'cliente') {
                        cargarReservasCliente();
                    }
                    
                    // Redireccionar según el rol
                    if (data.redirectUrl) {
                        window.location.href = data.redirectUrl;
                    }
                } else {
                    // Error en login
                    document.getElementById('loginMessage').textContent = data.error || 'Error al iniciar sesión';
                }
            } catch (error) {
                console.error('Error en login:', error);
                document.getElementById('loginMessage').textContent = 'Error de conexión. Inténtalo de nuevo.';
            }
        }

        // Función para manejar el registro
        async function manejarRegistro(nombre, email, password) {
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ nombre, email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    // Registro exitoso
                    document.getElementById('registerMessage').textContent = 'Usuario registrado con éxito. Ahora puedes iniciar sesión.';
                    document.getElementById('registerMessage').classList.remove('text-red-500');
                    document.getElementById('registerMessage').classList.add('text-green-500');
                    
                    // Limpiar formulario
                    document.getElementById('registerForm').reset();
                    
                    // Cambiar a modal de login después de un tiempo
                    setTimeout(() => {
                        switchModal('registerModal', 'loginModal');
                        document.getElementById('registerMessage').textContent = '';
                        document.getElementById('registerMessage').classList.remove('text-green-500');
                        document.getElementById('registerMessage').classList.add('text-red-500');
                    }, 2000);
                } else {
                    // Error en registro
                    document.getElementById('registerMessage').textContent = data.error || 'Error al registrar usuario';
                }
            } catch (error) {
                console.error('Error en registro:', error);
                document.getElementById('registerMessage').textContent = 'Error de conexión. Inténtalo de nuevo.';
            }
        }

        // Event listeners para los formularios
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

        document.getElementById('reservaForm').addEventListener('submit', manejarReserva);

        // Función para mostrar el modal de pago
        function mostrarModalPago(montoTotal, montoMinimo, dias) {
            // Redondear a la décima más cercana (sistema peruano)
            montoTotal = Math.round(montoTotal * 10) / 10;
            montoMinimo = Math.round(parseFloat(montoMinimo) * 10) / 10;
            
            document.getElementById('pagoMontoTotal').textContent = montoTotal.toFixed(1);
            document.getElementById('pagoMontoMinimo').textContent = montoMinimo.toFixed(1);
            document.getElementById('pagoDias').textContent = dias;
            document.getElementById('pagoMonto').value = montoMinimo.toFixed(1);
            document.getElementById('pagoMonto').setAttribute('min', montoMinimo.toFixed(1));
            document.getElementById('pagoMonto').setAttribute('max', montoTotal.toFixed(1));
            document.getElementById('pagoMessage').textContent = '';
            
            closeModal('reservaModal');
            openModal('pagoModal');
        }

        // Función para procesar el pago y crear la reserva
        async function procesarPagoYReserva(e) {
            e.preventDefault();
            
            let monto = parseFloat(document.getElementById('pagoMonto').value);
            // Redondear a la décima más cercana (sistema peruano)
            monto = Math.round(monto * 10) / 10;
            
            const metodoPago = document.getElementById('pagoMetodo').value;
            const comprobante = document.getElementById('pagoComprobante').value.trim();
            
            if (!metodoPago) {
                document.getElementById('pagoMessage').textContent = 'Selecciona un método de pago';
                return;
            }
            
            if (monto < window.datosReserva.monto_minimo) {
                document.getElementById('pagoMessage').textContent = `El monto mínimo es S/ ${window.datosReserva.monto_minimo.toFixed(1)}`;
                return;
            }
            
            if (monto > window.datosReserva.monto_total) {
                document.getElementById('pagoMessage').textContent = `El monto no puede exceder el total: S/ ${window.datosReserva.monto_total.toFixed(1)}`;
                return;
            }
            
            const token = localStorage.getItem('token');
            const btnPagar = document.getElementById('btnPagar');
            btnPagar.disabled = true;
            btnPagar.textContent = 'Procesando...';
            
            try {
                // 1. Crear la reserva con cálculo automático
                const responseReserva = await fetch('/api/cliente/reservas/con-calculo', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({
                        id_habitacion: window.datosReserva.id_habitacion,
                        fecha_checkin: window.datosReserva.fecha_checkin,
                        fecha_checkout: window.datosReserva.fecha_checkout,
                        servicios_adicionales: window.datosReserva.servicios_adicionales
                    })
                });
                
                if (!responseReserva.ok) {
                    const errorData = await responseReserva.json();
                    throw new Error(errorData.error || 'Error al crear reserva');
                }
                
                const reservaData = await responseReserva.json();
                const idReserva = reservaData.id_reserva;
                
                // 2. Procesar el pago
                const tipoPago = monto >= window.datosReserva.monto_total ? 'completo' : 'adelanto';
                
                const responsePago = await fetch('/api/pagos/procesar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({
                        id_reserva: idReserva,
                        monto: monto,
                        metodo_pago: metodoPago,
                        tipo_pago: tipoPago,
                        comprobante: comprobante || null
                    })
                });
                
                if (!responsePago.ok) {
                    const errorData = await responsePago.json();
                    throw new Error(errorData.error || 'Error al procesar pago');
                }
                
                const pagoData = await responsePago.json();
                
                // Mostrar mensaje de éxito
                alert(`¡Reserva confirmada exitosamente!\n\nMonto pagado: S/ ${pagoData.montoPagado.toFixed(2)}\nMonto pendiente: S/ ${pagoData.montoPendiente.toFixed(2)}\nEstado: ${pagoData.estadoReserva}\n\nPuedes ver tus reservas en "Mis Reservas"`);
                
                closeModal('pagoModal');
                await cargarHabitaciones(); // Recargar habitaciones
                
                if (usuarioActual && usuarioActual.rol === 'cliente') {
                    cargarReservasCliente(); // Recargar reservas
                }
                
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('pagoMessage').textContent = error.message || 'Error al procesar. Intenta nuevamente.';
            } finally {
                btnPagar.disabled = false;
                btnPagar.textContent = 'Confirmar Pago';
            }
        }

        document.getElementById('reservaForm').addEventListener('submit', manejarReserva);
        document.getElementById('pagoForm')?.addEventListener('submit', procesarPagoYReserva);

        // Función para cargar reservas del cliente
        async function cargarReservasCliente() {
            if (!usuarioActual || usuarioActual.rol !== 'cliente') return;
            
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/cliente/reservas', {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const reservas = await response.json();
                console.log('Reservas cargadas:', reservas);
                
                const contenedor = document.getElementById('reservasGrid');
                if (!contenedor) {
                    console.error('No se encontró el contenedor de reservas');
                    return;
                }

                if (!reservas || reservas.length === 0) {
                    contenedor.innerHTML = `
                        <div class="no-reservas">
                            <h3>No tienes reservas activas</h3>
                            <p>Realiza una reserva para ver tus habitaciones aquí.</p>
                        </div>
                    `;
                    return;
                }

                // Mostrar máximo 4 reservas
                contenedor.innerHTML = `
                    <div class="reservas-grid">
                        ${reservas.slice(0, 4).map(reserva => {
                            const fotoSrc = reserva.fotos && reserva.fotos.length > 0 
                                ? (reserva.fotos[0].startsWith('/') ? reserva.fotos[0] : '/img/habitaciones/' + reserva.fotos[0]) 
                                : 'https://source.unsplash.com/featured/?luxury-hotel-room';
                            // CORREGIDO: Mostrar fecha CON hora
                            const checkin = new Date(reserva.fecha_checkin).toLocaleString('es-ES', { 
                                timeZone: 'America/Lima', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                            });
                            const checkout = new Date(reserva.fecha_checkout).toLocaleString('es-ES', { 
                                timeZone: 'America/Lima', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                            });
                            return `
                            <div class="reserva-card">
                                <img src="${fotoSrc}" 
                                     alt="Habitación ${reserva.numero_habitacion}" 
                                     class="reserva-imagen">
                                <div class="reserva-info">
                                    <h3 class="reserva-titulo">Reserva #${reserva.id_reserva}</h3>
                                    <p class="reserva-descripcion">Habitación ${reserva.numero_habitacion} - ${reserva.categoria}</p>
                                    <p class="reserva-fechas">Check-in: ${checkin} | Check-out: ${checkout}</p>
                                    <p class="reserva-estado">Estado: ${reserva.estado_reserva}</p>
                                    <button class="btn-detalles" 
                                            data-id="${reserva.id_reserva}"
                                            data-habitacion="${reserva.numero_habitacion}"
                                            data-categoria="${reserva.categoria}"
                                            data-checkin="${reserva.fecha_checkin}"
                                            data-checkout="${reserva.fecha_checkout}"
                                            data-estado="${reserva.estado_reserva}"
                                            data-fecha-creacion="${reserva.fecha_creacion}"
                                            data-id-habitacion="${reserva.id_habitacion}"
                                            data-foto="${fotoSrc}">
                                        Ver Detalles
                                    </button>
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                `;

                // Agregar botón "Ver Todas Mis Reservas" después del grid
                const section = document.getElementById('mis-reservas');
                const existingButton = section.querySelector('.btn-ver-todas');
                if (!existingButton) {
                    const buttonDiv = document.createElement('div');
                    buttonDiv.className = 'text-center mt-8';
                    buttonDiv.innerHTML = '<a href="PanelCliente.html" class="btn-primary btn-ver-mas">Ver Todas Mis Reservas</a>';
                    section.appendChild(buttonDiv);
                }

                // Agregar event listeners a los botones de detalles
                document.querySelectorAll('.btn-detalles').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const reservaData = {
                            id: btn.getAttribute('data-id'),
                            habitacion: btn.getAttribute('data-habitacion'),
                            categoria: btn.getAttribute('data-categoria'),
                            checkin: btn.getAttribute('data-checkin'),
                            checkout: btn.getAttribute('data-checkout'),
                            estado: btn.getAttribute('data-estado'),
                            fechaCreacion: btn.getAttribute('data-fecha-creacion'),
                            idHabitacion: btn.getAttribute('data-id-habitacion'),
                            foto: btn.getAttribute('data-foto')
                        };
                        mostrarDetallesReserva(reservaData);
                    });
                });

            } catch (error) {
                console.error('Error al cargar reservas:', error);
                const contenedor = document.getElementById('reservasGrid');
                if (contenedor) {
                    contenedor.innerHTML = `
                        <div class="no-reservas">
                            <h3>Error al cargar las reservas</h3>
                            <p>Ha ocurrido un problema al cargar la información. Por favor, recargue la página.</p>
                        </div>
                    `;
                }
            }
        }

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
            
            // Obtener datos de pagos
            obtenerDatosPagos(reserva.id).then(pagos => {
                const pagado = pagos.totalPagado || 0;
                const total = pagos.totalReserva || 0;
                const falta = total - pagado;
                
                document.getElementById('detallePagado').textContent = `S/ ${pagado.toFixed(2)}`;
                document.getElementById('detalleFaltaPagar').textContent = `S/ ${falta.toFixed(2)}`;
            }).catch(error => {
                console.error('Error obteniendo datos de pagos:', error);
                document.getElementById('detallePagado').textContent = 'N/A';
                document.getElementById('detalleFaltaPagar').textContent = 'N/A';
            });
            
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

        // Manejar el envío del formulario de reclamo desde el modal de detalles
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
                    closeModal('detallesReservaModal');
                } else {
                    const error = await response.json();
                    document.getElementById('reclamoMessage').textContent = 'Error al enviar reclamo: ' + (error.error || 'Desconocido');
                }
            } catch (error) {
                console.error('Error enviando reclamo:', error);
                document.getElementById('reclamoMessage').textContent = 'Error al enviar reclamo.';
            }
        });

        // Función para obtener datos de pagos de una reserva
        async function obtenerDatosPagos(idReserva) {
            const token = localStorage.getItem('token');
            try {
                // Obtener la reserva para el total
                const responseReserva = await fetch(`/api/cliente/reservas/${idReserva}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!responseReserva.ok) {
                    throw new Error('Error al obtener reserva');
                }
                const reserva = await responseReserva.json();
                const totalReserva = reserva.monto_total || 0;

                // Obtener historial de pagos
                const responsePagos = await fetch(`/api/pagos/reserva/${idReserva}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!responsePagos.ok) {
                    throw new Error('Error al obtener pagos');
                }
                const pagos = await responsePagos.json();
                const totalPagado = pagos.reduce((sum, pago) => sum + parseFloat(pago.monto || 0), 0);

                return { totalPagado, totalReserva };
            } catch (error) {
                console.error('Error obteniendo datos de pagos:', error);
                return { totalPagado: 0, totalReserva: 0 };
            }
        }

        // Función para inicializar todo el sistema
        async function inicializarSistema() {
            try {
                // PRIMERO: Verificar si hay un usuario logueado
                verificarSesion();
                
                await cargarCarruselPrincipal();
                await cargarCategoriasBusqueda(); // Cargar categorías para el filtro de búsqueda
                await cargarHabitaciones();
                
                if (usuarioActual && usuarioActual.rol === 'cliente') {
                    cargarReservasCliente();
                }
                
                console.log('Sistema inicializado correctamente');
            } catch (error) {
                console.error('Error al inicializar el sistema:', error);
            }
        }

        // Asegurarse de que el DOM esté cargado antes de inicializar
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', inicializarSistema);
        } else {
            inicializarSistema();
        }

        // Event listener para el formulario de búsqueda flotante
        document.getElementById('searchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const checkin = document.getElementById('search-checkin').value;
            const checkout = document.getElementById('search-checkout').value;
            const huespedes = document.getElementById('search-guests').value;
            const categoria = document.getElementById('search-room').value;
            
            // Convertir fechas a formato datetime-local
            const checkinDT = checkin + 'T00:00';
            const checkoutDT = checkout + 'T00:00';
            
            const params = new URLSearchParams({
                checkin: checkinDT,
                checkout: checkoutDT,
                huespedes: huespedes,
                categoria: categoria
            });
            
            window.location.href = 'habitaciones.html?' + params.toString();
        });

        // Función para cargar categorías dinámicamente en el filtro de búsqueda
        async function cargarCategoriasBusqueda() {
            try {
                const response = await fetch('/api/categorias');
                const data = await response.json();
                const select = document.getElementById('search-room');
                select.innerHTML = '<option value="">Todas</option>';
                data.categorias.forEach(categoria => {
                    const option = document.createElement('option');
                    option.value = categoria.nombre;
                    option.textContent = categoria.nombre;
                    select.appendChild(option);
                });
                console.log('Categorías cargadas para búsqueda:', data.categorias);
            } catch (error) {
                console.error('Error cargando categorías para búsqueda:', error);
                // Mantener opciones por defecto si falla
                select.innerHTML = `
                    <option value="">Todas</option>
                    <option value="estandar">Estándar</option>
                    <option value="matrimonial">Matrimonial</option>
                    <option value="deluxe">Deluxe</option>
                    <option value="junior-suite">Junior Suite</option>
                `;
            }
        }
});

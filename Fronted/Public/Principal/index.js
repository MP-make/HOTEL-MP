//Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {
        // Funciones para manejar los modales
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
    
        // Agregar event listeners a los botones
        document.querySelectorAll('[data-modal-target]').forEach(button => {
            button.addEventListener('click', (e) => {
                const modalId = e.currentTarget.getAttribute('data-modal-target');
                openModal(modalId);
            });
        });
    
        // Agregar event listeners a los botones de cerrar
        document.querySelectorAll('[data-modal-close]').forEach(span => {
            span.addEventListener('click', (e) => {
                const modalId = e.currentTarget.getAttribute('data-modal-close');
                closeModal(modalId);
            });
        });
    
        // Agregar event listeners a los enlaces de cambio de modal
        document.querySelectorAll('[data-switch-modal-current]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault(); // Prevenir el comportamiento predeterminado del enlace
                const currentId = e.currentTarget.getAttribute('data-switch-modal-current');
                const nextId = e.currentTarget.getAttribute('data-switch-modal-next');
                switchModal(currentId, nextId);
            });
        });
    
        // Cerrar modal si el usuario hace clic fuera del contenido del modal
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

            // Textos para cada slide del carrusel
            const carouselTexts = [
                {
                    title: 'Bienvenidos a JW Marriott',
                    subtitle: 'Tu hotel ideal en el corazón de Lima',
                    cta: 'Descubre Más',
                    link: '#habitaciones'
                },
                {
                    title: 'Experiencia de Lujo',
                    subtitle: 'Habitaciones diseñadas para tu confort',
                    cta: 'Ver Habitaciones',
                    link: '#habitaciones'
                },
                {
                    title: 'Instalaciones Premium',
                    subtitle: 'Servicios de clase mundial te esperan',
                    cta: 'Explorar Servicios',
                    link: '#servicios'
                }
            ];

            carouselTrack.innerHTML = carouselImages.map((image, index) => `
                <div class="carousel-slide">
                    <img src="${image.url}" alt="${image.descripcion || 'Imagen del hotel'}" 
                         loading="lazy" onerror="this.onerror=null; this.src='/img/carousel/1759217839989-3.jpg'">
                    <div class="carousel-content">
                        <h1 class="carousel-title">${carouselTexts[index % carouselTexts.length].title}</h1>
                        <p class="carousel-subtitle">${carouselTexts[index % carouselTexts.length].subtitle}</p>
                        <a href="${carouselTexts[index % carouselTexts.length].link}" class="carousel-cta">
                            ${carouselTexts[index % carouselTexts.length].cta}
                        </a>
                    </div>
                </div>
            `).join('');

            carouselIndicators.innerHTML = carouselImages.map((_, index) => `
                <div class="carousel-dot ${index === 0 ? 'active' : ''}" data-slide="${index}"></div>
            `).join('');

            // Agregar event listeners a los puntos
            document.querySelectorAll('.carousel-dot').forEach(dot => {
                dot.addEventListener('click', (e) => {
                    const slide = parseInt(e.target.getAttribute('data-slide'));
                    irASlide(slide);
                });
            });

            // Agregar event listeners a los botones de flecha
            const prevBtn = document.getElementById('prevSlide');
            const nextBtn = document.getElementById('nextSlide');
            
            if (prevBtn) {
                prevBtn.addEventListener('click', () => cambiarSlide(-1));
            }
            
            if (nextBtn) {
                nextBtn.addEventListener('click', () => cambiarSlide(1));
            }

            // Agregar navegación por teclado
            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') {
                    cambiarSlide(-1);
                } else if (e.key === 'ArrowRight') {
                    cambiarSlide(1);
                }
            });

            // Agregar soporte táctil para deslizar
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
                        ${data.habitaciones.slice(0, 6).map(habitacion => {
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

        // Función para mostrar habitaciones filtradas
        function mostrarHabitacionesFiltradas(habitaciones) {
            const contenedor = document.getElementById('habitacionGrid');
            if (!contenedor) {
                console.error('No se encontró el contenedor de habitaciones');
                return;
            }

            if (habitaciones.length === 0) {
                contenedor.innerHTML = `
                    <div class="no-habitaciones">
                        <h3>No se encontraron habitaciones con esos criterios</h3>
                        <p>Por favor, intenta con otros filtros de búsqueda.</p>
                    </div>
                `;
                return;
            }

            contenedor.innerHTML = `
                <div class="habitaciones-grid">
                    ${habitaciones.map(habitacion => {
                        const fotoSrc = habitacion.fotos && habitacion.fotos.length > 0 
                            ? (habitacion.fotos[0].startsWith('/') ? habitacion.fotos[0] : '/img/habitaciones/' + habitacion.fotos[0]) 
                            : 'https://source.unsplash.com/featured/?luxury-hotel-room';
                        
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
                const responseReserva = await fetch(`/api/cliente/reservas/${idReserva}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                console.log('Response de reserva:', responseReserva.status, responseReserva.statusText);
                
                if (!responseReserva.ok) {
                    // Si falla, intentar obtener desde el listado general
                    console.warn('No se pudo obtener reserva individual, intentando desde listado general...');
                    const responseTodasReservas = await fetch('/api/cliente/reservas', {
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
                    const responsePagos = await fetch(`/api/pagos/reserva/${idReserva}`, {
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
                const responsePagos = await fetch(`/api/pagos/reserva/${idReserva}`, {
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

        // Hacer la función disponible globalmente para el chat
        window.reservarHabitacion = reservarHabitacion;

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
            
            // Recopilar upsells
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
            
            console.log('Datos de reserva (hora exacta del cliente):', {
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
                    // Insert after the first li (Habitaciones)
                    const firstLi = navLinks.querySelector('li');
                    navLinks.insertBefore(li, firstLi.nextSibling);
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
            
            // Actualizar visibilidad del chatbot
            if (window.actualizarVisibilidadChatbot) {
                window.actualizarVisibilidadChatbot();
            }
            
            // Redireccionar a la página principal si no estamos en ella
            if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
                window.location.href = '/index.html';
            }
        }

        // Event listener para el botón de cerrar sesión
        document.getElementById('logoutBtn').addEventListener('click', cerrarSesion);

        // Event listener para el botón de perfil
        document.getElementById('profileBtn').addEventListener('click', () => {
            window.location.href = 'PanelCliente.html';
        });

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
                    
                    // Actualizar visibilidad del chatbot
                    if (window.actualizarVisibilidadChatbot) {
                        window.actualizarVisibilidadChatbot();
                    }
                    
                    // Mostrar popup de bienvenida después del login
                    const popup = document.getElementById('chatWelcomePopup');
                    if (popup && usuarioActual && usuarioActual.rol === 'cliente') {
                        popup.style.opacity = '1';
                        setTimeout(() => {
                            popup.style.opacity = '0';
                        }, 5000);
                    }
                    
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
                
                // CAMBIADO: Cerrar modal de pago primero
                closeModal('pagoModal');
                
                // NUEVO: Obtener datos completos de la reserva para mostrar en el modal
                const habitacion = habitacionesData.find(h => h.id_habitacion === window.datosReserva.id_habitacion);
                const fotoSrc = habitacion?.fotos?.[0] 
                    ? (habitacion.fotos[0].startsWith('/') ? habitacion.fotos[0] : '/img/habitaciones/' + habitacion.fotos[0])
                    : 'https://source.unsplash.com/featured/?luxury-hotel-room';
                
                const reservaDetalles = {
                    id: idReserva,
                    habitacion: habitacion?.numero_habitacion || 'N/A',
                    categoria: habitacion?.categoria || 'N/A',
                    checkin: window.datosReserva.fecha_checkin,
                    checkout: window.datosReserva.fecha_checkout,
                    estado: pagoData.estadoReserva || 'confirmada',
                    fechaCreacion: new Date().toISOString(),
                    idHabitacion: window.datosReserva.id_habitacion,
                    foto: fotoSrc,
                    totalPagado: pagoData.montoPagado || monto,
                    totalReserva: pagoData.montoTotal || window.datosReserva.monto_total,
                    montoPendiente: pagoData.montoPendiente || (window.datosReserva.monto_total - monto)
                };
                
                // NUEVO: Mostrar el modal de detalles de reserva con los datos de pago
                mostrarDetallesReserva(reservaDetalles);
                
                // Recargar habitaciones y reservas
                await cargarHabitaciones();
                
                if (usuarioActual && usuarioActual.rol === 'cliente') {
                    cargarReservasCliente();
                }
                
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('pagoMessage').textContent = error.message || 'Error al procesar. Intenta nuevamente.';
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

                // Mostrar máximo 6 reservas
                contenedor.innerHTML = `
                    <div class="reservas-grid">
                        ${reservas.slice(0, 6).map(reserva => {
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
                                    <h3 class="reserva-titulo">Habitación ${reserva.numero_habitacion}</h3>
                                    <p class="reserva-descripcion">${reserva.categoria}</p>
                                    <p class="reserva-fechas">Check-in: ${checkin}</p>
                                    <p class="reserva-fechas">Check-out: ${checkout}</p>
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
                    buttonDiv.innerHTML = '<a href="PanelCliente#Reservas.html" class="btn-primary btn-ver-mas">Ver Todas Mis Reservas</a>';
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
                const response = await fetch('/api/pagos/procesar', {
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
                
                const pagoData = await response.json();
                
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
                    const response = await fetch(`/api/cliente/reservas/${idReserva}`, {
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

        // Función para mostrar boleta en formato A5
        function mostrarBoletaA5(datosBoleta) {
            const boletaContent = document.getElementById('boletaContent');
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
                
                <!-- Información del Cliente -->
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
                
                <!-- Detalles de la Reserva -->
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
                
                <!-- Sello de pago completo -->
                <div class="boleta-stamp">
                    ✓ PAGO COMPLETO REALIZADO
                </div>
                
                <!-- Total -->
                <div class="boleta-total">
                    <div class="total-label">MONTO TOTAL PAGADO</div>
                    <div class="total-amount">S/ ${datosBoleta.total}</div>
                </div>
                
                <!-- Footer -->
                <div class="boleta-footer">
                    <p>Este documento constituye un comprobante de pago válido.</p>
                    <p>Gracias por su preferencia. ¡Esperamos que disfrute su estadía!</p>
                    <p><strong>${datosBoleta.hotel}</strong> - Excelencia en Hospitalidad</p>
                </div>
            `;
            
            boletaContent.innerHTML = boletaHTML;
        }

        // Función para mostrar boleta en formato Ticket
        function mostrarBoletaTicket(datosBoleta) {
            const boletaContent = document.getElementById('boletaContent');
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
                
                <!-- Información del Cliente -->
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
                
                <!-- Detalles de la Reserva -->
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
                
                <!-- Sello de pago completo -->
                <div class="boleta-stamp">
                    ✓ PAGO COMPLETO
                </div>
                
                <!-- Total -->
                <div class="boleta-total">
                    <div class="total-label">TOTAL PAGADO</div>
                    <div class="total-amount">S/ ${datosBoleta.total}</div>
                </div>
                
                <!-- Footer -->
                <div class="boleta-footer">
                    <p>Comprobante válido - Gracias por su preferencia</p>
                    <p><strong>${datosBoleta.hotel}</strong></p>
                </div>
            `;
            
            boletaContent.innerHTML = boletaHTML;
        }

        // Función para imprimir la boleta
        function imprimirBoleta(datosBoleta) {
            const formato = document.getElementById('boletaContent').classList.contains('boleta-ticket') ? 'ticket' : 'a5';
            
            const boletaHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Boleta Electrónica - ${datosBoleta.hotel}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 10px;
                            background: white;
                        }
                        .boleta-container {
                            ${formato === 'ticket' ? 
                                'width: 80mm; max-width: 80mm; font-size: 10px;' : 
                                'width: 148mm; max-width: 148mm; font-size: 12px;'
                            }
                            margin: 0 auto;
                            border: 1px solid #333;
                            padding: 10px;
                        }
                        .boleta-header {
                            text-align: center;
                            background: #000;
                            color: white;
                            padding: 8px;
                            margin: -10px -10px 10px -10px;
                            border-bottom: 2px solid #333;
                        }
                        .boleta-title {
                            font-size: ${formato === 'ticket' ? '14px' : '18px'};
                            font-weight: bold;
                            margin: 5px 0;
                        }
                        .boleta-numero {
                            font-size: ${formato === 'ticket' ? '10px' : '12px'};
                            margin-bottom: 5px;
                        }
                        .empresa-info {
                            font-size: ${formato === 'ticket' ? '8px' : '10px'};
                            line-height: 1.2;
                            margin-top: 5px;
                        }
                        .boleta-section {
                            margin: 8px 0;
                            padding: 5px;
                            background: #f8f9fa;
                            border-radius: 4px;
                        }
                        .section-title {
                            font-weight: bold;
                            font-size: ${formato === 'ticket' ? '10px' : '12px'};
                            margin-bottom: 5px;
                            color: #333;
                        }
                        .info-row {
                            display: flex;
                            justify-content: space-between;
                            margin: 3px 0;
                            font-size: ${formato === 'ticket' ? '9px' : '11px'};
                        }
                        .info-label {
                            font-weight: bold;
                            color: #666;
                        }
                        .info-value {
                            color: #333;
                        }
                        .boleta-stamp {
                            text-align: center;
                            margin: 8px 0;
                            padding: 5px;
                            border: 1px dashed #28a745;
                            border-radius: 4px;
                            color: #28a745;
                            font-weight: bold;
                            font-size: ${formato === 'ticket' ? '9px' : '11px'};
                        }
                        .boleta-total {
                            background: #28a745;
                            color: white;
                            padding: 8px;
                            border-radius: 4px;
                            margin: 10px 0;
                            text-align: center;
                        }
                        .total-label {
                            font-size: ${formato === 'ticket' ? '10px' : '14px'};
                            font-weight: bold;
                            margin-bottom: 5px;
                        }
                        .total-amount {
                            font-size: ${formato === 'ticket' ? '16px' : '24px'};
                            font-weight: bold;
                        }
                        .boleta-footer {
                            text-align: center;
                            margin-top: 10px;
                            padding-top: 8px;
                            border-top: 1px solid #333;
                            font-size: ${formato === 'ticket' ? '8px' : '10px'};
                            color: #666;
                            line-height: 1.2;
                        }
                        @media print {
                            body { padding: 0; margin: 0; }
                            .boleta-container { border: none; margin: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="boleta-container">
                        ${formato === 'ticket' ? 
                            // Formato Ticket
                            `
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
                            ` :
                            // Formato A5
                            `
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
                            `
                        }
                    </div>
                </body>
                </html>
            `;
            
            // Abrir en nueva ventana para imprimir
            const ventanaBoleta = window.open('', '_blank');
            ventanaBoleta.document.write(boletaHTML);
            ventanaBoleta.document.close();
            
            // Esperar un momento y mostrar diálogo de impresión
            setTimeout(() => {
                ventanaBoleta.print();
            }, 500);
        }

        // Event listener para el formulario de búsqueda flotante
        document.getElementById('searchForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const checkin = document.getElementById('search-checkin').value;
            const checkout = document.getElementById('search-checkout').value;
            const huespedes = document.getElementById('search-guests').value;
            const categoria = document.getElementById('search-room').value;
            const precioMin = document.getElementById('search-precio-min').value;
            const precioMax = document.getElementById('search-precio-max').value;
            
            // Si hay fechas, verificar disponibilidad en el servidor
            let habitacionesDisponibles = [...habitacionesData];
            
            if (checkin && checkout) {
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch('/api/cliente/habitaciones/disponibles', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': token ? `Bearer ${token}` : ''
                        },
                        body: JSON.stringify({
                            fecha_checkin: checkin + 'T14:00:00',
                            fecha_checkout: checkout + 'T12:00:00'
                        })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        habitacionesDisponibles = data.habitaciones || [];
                        console.log('Habitaciones disponibles en esas fechas:', habitacionesDisponibles.length);
                    } else {
                        console.error('Error al verificar disponibilidad');
                        alert('Error al verificar disponibilidad. Mostrando todas las habitaciones.');
                    }
                } catch (error) {
                    console.error('Error al verificar disponibilidad:', error);
                    alert('Error al verificar disponibilidad. Mostrando todas las habitaciones.');
                }
            }
            
            // Filtrar por categoría
            if (categoria) {
                habitacionesDisponibles = habitacionesDisponibles.filter(h => 
                    h.categoria.toLowerCase() === categoria.toLowerCase()
                );
            }
            
            // Filtrar por precio mínimo
            if (precioMin) {
                habitacionesDisponibles = habitacionesDisponibles.filter(h => 
                    parseFloat(h.precio_por_dia) >= parseFloat(precioMin)
                );
            }
            
            // Filtrar por precio máximo
            if (precioMax) {
                habitacionesDisponibles = habitacionesDisponibles.filter(h => 
                    parseFloat(h.precio_por_dia) <= parseFloat(precioMax)
                );
            }
            
            // Filtrar por capacidad (huéspedes)
            if (huespedes) {
                habitacionesDisponibles = habitacionesDisponibles.filter(h => 
                    parseInt(h.capacidad) >= parseInt(huespedes)
                );
            }
            
            // IMPORTANTE: Excluir habitaciones que el cliente YA tiene reservadas
            if (usuarioActual && misReservasActivas && misReservasActivas.length > 0) {
                const idsReservados = misReservasActivas
                    .filter(r => r.estado_reserva !== 'completada' && r.estado_reserva !== 'cancelada')
                    .map(r => r.id_habitacion);
                
                habitacionesDisponibles = habitacionesDisponibles.filter(h => 
                    !idsReservados.includes(h.id_habitacion)
                );
                
                console.log('Habitaciones del cliente excluidas:', idsReservados);
            }
            
            // Mostrar resultados filtrados en la sección de habitaciones populares
            mostrarHabitacionesFiltradas(habitacionesDisponibles);
            
            // Hacer scroll a la sección de habitaciones
            document.getElementById('habitaciones').scrollIntoView({ behavior: 'smooth' });
        });

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

        // ELIMINADO: inicializarChatbot() - Ahora se maneja en chat-ia.js
});

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
                        { url: '/img/carousel/' + encodeURIComponent('1758185301931-Casa del inka - vista principal.png'), descripcion: 'Vista principal de Casa del Inka' },
                        { url: '/img/carousel/' + encodeURIComponent('1758185310826-Casa del inka - vista entrada.png'), descripcion: 'Entrada principal del hotel' },
                        { url: '/img/carousel/' + encodeURIComponent('1758596592120-37b93177.webp'), descripcion: 'Instalaciones del hotel' }
                    ];
                    mostrarCarrusel();
                    iniciarCarruselAutomatico();
                }
            } catch (error) {
                console.error('Error al cargar el carrusel:', error);
                // Usar imágenes por defecto en caso de error
                carouselImages = [
                    { url: '/img/carousel/' + encodeURIComponent('1758185301931-Casa del inka - vista principal.png'), descripcion: 'Vista principal de Casa del Inka' },
                    { url: '/img/carousel/' + encodeURIComponent('1758185310826-Casa del inka - vista entrada.png'), descripcion: 'Entrada principal del hotel' }
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
                         onerror="this.src='/img/carousel/${encodeURIComponent('1758185301931-Casa del inka - vista principal.png')}'">
                </div>
            `).join('');

            carouselIndicators.innerHTML = carouselImages.map((_, index) => `
                <div class="carousel-dot ${index === 0 ? 'active' : ''}" data-slide="${index}"></div>
            `).join('');

            // Add event listeners
            document.querySelector('.carousel-arrow.prev').addEventListener('click', () => cambiarSlide(-1));
            document.querySelector('.carousel-arrow.next').addEventListener('click', () => cambiarSlide(1));
            document.querySelectorAll('.carousel-dot').forEach(dot => {
                dot.addEventListener('click', (e) => {
                    const slide = parseInt(e.target.getAttribute('data-slide'));
                    irASlide(slide);
                });
            });
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

        // Función mejorada para cargar habitaciones
        async function cargarHabitaciones() {
            try {
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
                        ${data.habitaciones.map(habitacion => `
                            <div class="habitacion-card">
                                <img src="${habitacion.fotos && habitacion.fotos.length > 0 ? habitacion.fotos[0] : '/img/habitaciones/default-room.jpg'}" 
                                     alt="${habitacion.numero_habitacion}" 
                                     class="habitacion-imagen"
                                     onerror="this.src='/img/habitaciones/default-room.jpg'">
                                <div class="habitacion-info">
                                    <h3 class="habitacion-titulo">Habitación ${habitacion.numero_habitacion}</h3>
                                    <p class="habitacion-descripcion">${habitacion.categoria} - Piso ${habitacion.piso} - Capacidad ${habitacion.capacidad}</p>
                                    <div class="habitacion-precio">S/ ${habitacion.precio_por_dia} / día</div>
                                    <div class="habitacion-disponibilidad ${habitacion.disponible ? 'disponible' : 'no-disponible'}">
                                        ${habitacion.disponible ? 'Disponible' : 'No disponible'}
                                    </div>
                                    <button class="btn-reservar" 
                                            data-id="${habitacion.id_habitacion}"
                                            data-nombre="Habitación ${habitacion.numero_habitacion}"
                                            ${!habitacion.disponible ? 'disabled' : ''}>
                                        ${habitacion.disponible ? 'Reservar Ahora' : 'No disponible'}
                                    </button>
                                </div>
                            </div>
                        `).join('')}
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

            currentHabitacionId = habitacionId;
            const habitacion = habitacionesData.find(h => h.id_habitacion === habitacionId);
            if (habitacion) {
                document.getElementById('reservaHabitacionNombre').textContent = nombreHabitacion;
                document.getElementById('reservaHabitacionCategoria').textContent = `Categoría: ${habitacion.categoria}`;
                document.getElementById('reservaHabitacionPiso').textContent = `Piso: ${habitacion.piso}`;
                document.getElementById('reservaHabitacionCapacidad').textContent = `Capacidad: ${habitacion.capacidad} personas`;
                document.getElementById('reservaHabitacionPrecioDia').textContent = `Precio por día: S/ ${habitacion.precio_por_dia}`;
                
                // Handle image carousel
                const imagenContainer = document.querySelector('.reserva-imagen');
                if (habitacion.fotos && habitacion.fotos.length > 1) {
                    imagenContainer.innerHTML = `
                        <div class="reserva-carousel">
                            ${habitacion.fotos.map((foto, index) => `<img src="${foto}" alt="Habitación" class="reserva-img" style="display: ${index === 0 ? 'block' : 'none'};">`).join('')}
                            <button class="reserva-arrow prev">&lt;</button>
                            <button class="reserva-arrow next">&gt;</button>
                        </div>
                    `;
                    // Carousel logic
                    let currentImg = 0;
                    const imgs = imagenContainer.querySelectorAll('.reserva-img');
                    const prevBtn = imagenContainer.querySelector('.reserva-arrow.prev');
                    const nextBtn = imagenContainer.querySelector('.reserva-arrow.next');
                    function showImg(index) {
                        imgs.forEach((img, i) => img.style.display = i === index ? 'block' : 'none');
                    }
                    prevBtn.addEventListener('click', () => {
                        currentImg = (currentImg - 1 + imgs.length) % imgs.length;
                        showImg(currentImg);
                    });
                    nextBtn.addEventListener('click', () => {
                        currentImg = (currentImg + 1) % imgs.length;
                        showImg(currentImg);
                    });
                } else {
                    imagenContainer.innerHTML = `<img id="reservaHabitacionImagen" src="${habitacion.fotos && habitacion.fotos.length > 0 ? habitacion.fotos[0] : '/img/habitaciones/default-room.jpg'}" alt="Habitación" class="reserva-img">`;
                }
            }
            document.getElementById('reservaMessage').textContent = '';
            checkForm(); // Check if button should be enabled
            openModal('reservaModal');
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
        }

        // Función para mostrar el perfil del usuario cuando está logueado
        function mostrarUsuarioLogueado() {
            document.getElementById('authButtons').classList.add('hidden');
            document.getElementById('userProfile').classList.remove('hidden');
            document.getElementById('userName').textContent = usuarioActual.nombre;
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

        // Función para manejar la reserva
        async function manejarReserva(e) {
            e.preventDefault();
            
            const checkin = document.getElementById('fechaCheckin').value;
            const checkout = document.getElementById('fechaCheckout').value;
            
            if (!checkin || !checkout) {
                document.getElementById('reservaMessage').textContent = 'Por favor, selecciona las fechas';
                return;
            }
            
            const token = localStorage.getItem('token');
            
            try {
                const response = await fetch('/api/cliente/reservas', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({
                        id_habitacion: currentHabitacionId,
                        fecha_checkin: checkin,
                        fecha_checkout: checkout
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    alert('Reserva creada exitosamente');
                    closeModal('reservaModal');
                    cargarHabitaciones(); // reload to update availability
                } else {
                    document.getElementById('reservaMessage').textContent = data.error || 'Error al crear reserva';
                }
            } catch (error) {
                console.error('Error en reserva:', error);
                document.getElementById('reservaMessage').textContent = 'Error de conexión';
            }
        }

        // Función para inicializar todo el sistema
        async function inicializarSistema() {
            try {
                await cargarCarruselPrincipal();
                await cargarHabitaciones();
                
                // Verificar si hay un usuario logueado
                verificarSesion();
                
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
});

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
                        { url: '/img/carousel/1758185301931-Casa del inka - vista principal.png', descripcion: 'Vista principal de Casa del Inka' },
                        { url: '/img/carousel/1758185310826-Casa del inka - vista entrada.png', descripcion: 'Entrada principal del hotel' },
                        { url: '/img/carousel/1758596592120-37b93177.webp', descripcion: 'Instalaciones del hotel' }
                    ];
                    mostrarCarrusel();
                    iniciarCarruselAutomatico();
                }
            } catch (error) {
                console.error('Error al cargar el carrusel:', error);
                // Usar imágenes por defecto en caso de error
                carouselImages = [
                    { url: '/img/carousel/1758185301931-Casa del inka - vista principal.png', descripcion: 'Vista principal de Casa del Inka' },
                    { url: '/img/carousel/1758185310826-Casa del inka - vista entrada.png', descripcion: 'Entrada principal del hotel' }
                ];
                mostrarCarrusel();
                iniciarCarruselAutomatico();
            }
        }

        // Función para mostrar el carrusel en el DOM
        function mostrarCarrusel() {
            const carouselContainer = document.getElementById('hero-carousel');
            if (!carouselContainer) return;

            carouselContainer.innerHTML = `
                <div class="carousel-container">
                    ${carouselImages.map((image, index) => `
                        <div class="carousel-slide ${index === 0 ? 'active' : ''}">
                            <img src="${image.url}" alt="${image.descripcion || 'Imagen de Casa del Inka'}" 
                                 onerror="this.src='/img/carousel/1758185301931-Casa del inka - vista principal.png'">
                            <div class="carousel-overlay">
                                <p>${image.descripcion || 'Casa del Inka'}</p>
                            </div>
                        </div>
                    `).join('')}
                    
                    ${carouselImages.length > 1 ? `
                        <button class="carousel-controls carousel-prev" onclick="cambiarSlide(-1)">‹</button>
                        <button class="carousel-controls carousel-next" onclick="cambiarSlide(1)">›</button>
                        
                        <div class="carousel-indicators">
                            ${carouselImages.map((_, index) => `
                                <div class="indicator ${index === 0 ? 'active' : ''}" onclick="irASlide(${index})"></div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Función para cambiar de slide
        function cambiarSlide(direccion) {
            if (carouselImages.length <= 1) return;
            
            const slides = document.querySelectorAll('.carousel-slide');
            const indicators = document.querySelectorAll('.indicator');
            
            slides[currentSlide].classList.remove('active');
            indicators[currentSlide].classList.remove('active');
            
            currentSlide += direccion;
            if (currentSlide >= carouselImages.length) currentSlide = 0;
            if (currentSlide < 0) currentSlide = carouselImages.length - 1;
            
            slides[currentSlide].classList.add('active');
            indicators[currentSlide].classList.add('active');
        }

        // Función para ir a un slide específico
        function irASlide(index) {
            if (carouselImages.length <= 1) return;
            
            const slides = document.querySelectorAll('.carousel-slide');
            const indicators = document.querySelectorAll('.indicator');
            
            slides[currentSlide].classList.remove('active');
            indicators[currentSlide].classList.remove('active');
            
            currentSlide = index;
            
            slides[currentSlide].classList.add('active');
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

        // Función mejorada para cargar habitaciones
        async function cargarHabitaciones() {
            try {
                const response = await fetch('/api/habitaciones');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Habitaciones cargadas:', data);
                
                const contenedor = document.getElementById('habitaciones-lista');
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
                                <img src="${habitacion.imagen || '/img/habitaciones/default-room.jpg'}" 
                                     alt="${habitacion.nombre}" 
                                     class="habitacion-imagen"
                                     onerror="this.src='/img/habitaciones/default-room.jpg'">
                                <div class="habitacion-info">
                                    <h3 class="habitacion-titulo">${habitacion.nombre}</h3>
                                    <p class="habitacion-descripcion">${habitacion.descripcion || 'Habitación cómoda y acogedora'}</p>
                                    <div class="habitacion-precio">S/ ${habitacion.precio_noche} / noche</div>
                                    <div class="habitacion-disponibilidad ${habitacion.disponible ? 'disponible' : 'no-disponible'}">
                                        ${habitacion.disponible ? 'Disponible' : 'No disponible'}
                                    </div>
                                    <button class="btn-reservar" 
                                            ${!habitacion.disponible ? 'disabled' : ''} 
                                            onclick="reservarHabitacion(${habitacion.id}, '${habitacion.nombre}')">
                                        ${habitacion.disponible ? 'Reservar Ahora' : 'No disponible'}
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;

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
                document.getElementById('loginModal').style.display = 'flex';
                return;
            }
            
            // Aquí puedes implementar la lógica de reserva
            alert(`Iniciando reserva para la habitación: ${nombreHabitacion}\nEsta funcionalidad se completará próximamente.`);
            // Redireccionar a una página de reserva o abrir un modal de reserva
            // window.location.href = `/reservar.html?habitacion=${habitacionId}`;
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

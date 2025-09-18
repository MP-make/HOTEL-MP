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
        
        // --- Lógica de Cargar Habitaciones ---
        const renderHabitaciones = async () => {
            const habitacionGrid = document.getElementById('habitacionGrid');
            if (!habitacionGrid) {
                console.error("No se encontró el elemento 'habitacionGrid'.");
                return;
            }
    
            try {
                const response = await fetch('/api/cliente/habitaciones');
                if (!response.ok) throw new Error('No se pudo obtener la información de las habitaciones.');
    
                const data = await response.json();
                const habitaciones = data.habitaciones;
    
                console.log("Habitaciones recibidas:", habitaciones);
    
                habitacionGrid.innerHTML = ''; // Limpiar el contenedor
    
                if (!habitaciones || habitaciones.length === 0) {
                    habitacionGrid.innerHTML = `<p class="text-gray-600 text-center text-lg">No hay habitaciones disponibles en este momento.</p>`;
                    return;
                }
    
                habitaciones.forEach(habitacion => {
                    const card = document.createElement('div');
                    card.className = 'tarjeta-habitacion';
    
                    // Determinar imagen referencial (primera foto si existe)
                    let imgSrc = '/img/placeholder-room.jpg'; // placeholder por defecto (puedes cambiarlo)
                    if (habitacion.fotos && Array.isArray(habitacion.fotos) && habitacion.fotos.length > 0) {
                        const ruta = habitacion.fotos[0] || '';
                        imgSrc = ruta.startsWith('/') ? ruta : '/' + ruta; // normalizar con slash inicial
                    }
    
                    let precioTexto = '';
                    if (habitacion.precio_por_dia) {
                        precioTexto = `$${habitacion.precio_por_dia}/noche`;
                    } else if (habitacion.precio_por_hora) {
                        precioTexto = `$${habitacion.precio_por_hora}/hora`;
                    } else {
                        precioTexto = 'Consultar precio';
                    }
    
                    // Mostrar características y foto referencial
                    card.innerHTML = `
                        <img src="${imgSrc}" alt="Habitación ${habitacion.categoria}" class="tarjeta-img">
                        <div class="tarjeta-cuerpo">
                            <h3>Habitación ${habitacion.numero_habitacion}</h3>
                            <p>Categoría: ${habitacion.categoria}</p>
                            <p>Piso: ${habitacion.piso || 'N/A'}</p>
                            <p>Capacidad: ${habitacion.capacidad || 'N/A'} personas</p>
                            <p>Precio: ${precioTexto}</p>
                            <p class="text-green-600 font-bold">${habitacion.disponible ? 'Disponible' : 'No disponible'}</p>
                            <div class="mt-2">
                                <button class="btn-principal reservar-btn" data-id="${habitacion.id_habitacion}">Reservar</button>
                            </div>
                        </div>
                    `;
                    habitacionGrid.appendChild(card);
                });
            } catch (error) {
                console.error('Error al cargar las habitaciones:', error);
                habitacionGrid.innerHTML = `<p class="text-red-500 text-center">Error al cargar las habitaciones. Asegúrate de que el servidor esté funcionando.</p>`;
            }
        };
        renderHabitaciones();

        // --- Funcionalidad de Reservas ---
        function openReservationModal(habitacionId) {
            // Crear modal dinámico
            const existing = document.getElementById('reservationModalDynamic');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'reservationModalDynamic';
            modal.className = 'modal';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-content" style="max-width:520px; width:90%;">
                    <span class="close-modal" id="closeReservationModal">&times;</span>
                    <h2>Reservar Habitación</h2>
                    <form id="reservationForm">
                        <input type="hidden" name="id_habitacion" value="${habitacionId}">
                        <label>Fecha y hora de check-in</label>
                        <input type="datetime-local" name="fecha_checkin" required class="form-input">
                        <label>Fecha y hora de check-out</label>
                        <input type="datetime-local" name="fecha_checkout" required class="form-input">
                        <p id="reservationMessage" class="text-red-500 my-2"></p>
                        <button type="submit" class="btn-submit">Confirmar Reserva</button>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('closeReservationModal').addEventListener('click', () => modal.remove());

            document.getElementById('reservationForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = JSON.parse(localStorage.getItem('user'));
                const msgEl = document.getElementById('reservationMessage');
                msgEl.textContent = '';
                if (!user) {
                    msgEl.textContent = 'Debes iniciar sesión para realizar una reserva.';
                    return;
                }
                // validar rol
                if (user.rol && user.rol !== 'cliente') {
                    msgEl.textContent = 'Solo los clientes pueden hacer reservas.';
                    return;
                }

                const fd = new FormData(e.target);
                const id_habitacion = fd.get('id_habitacion');
                const fecha_checkin = fd.get('fecha_checkin');
                const fecha_checkout = fd.get('fecha_checkout');

                if (!fecha_checkin || !fecha_checkout) {
                    msgEl.textContent = 'Selecciona fecha de check-in y check-out.';
                    return;
                }
                if (new Date(fecha_checkout) <= new Date(fecha_checkin)) {
                    msgEl.textContent = 'La fecha de check-out debe ser posterior al check-in.';
                    return;
                }

                try {
                    const payload = {
                        id_usuario: user.id,
                        id_habitacion: parseInt(id_habitacion, 10),
                        fecha_checkin,
                        fecha_checkout
                    };
                    const headers = { 'Content-Type': 'application/json' };
                    const token = localStorage.getItem('token');
                    if (token) headers['Authorization'] = 'Bearer ' + token;
                    const res = await fetch('/api/cliente/reservas', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    if (!res.ok) {
                        msgEl.textContent = data.error || 'Error al crear reserva.';
                        return;
                    }
                    // éxito
                    modal.remove();
                    // refrescar grid de habitaciones para reflejar cambios de disponibilidad
                    renderHabitaciones();
                    // mostrar mensaje amigable
                    alert('Reserva creada correctamente. ID: ' + (data.id_reserva || data.id || '')); // mostrar id si viene
                } catch (err) {
                    console.error('Error al crear reserva:', err);
                    msgEl.textContent = 'Error de red al crear la reserva.';
                }
            });
        }

        // Delegación para botones reservar
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('.reservar-btn');
            if (!btn) return;
            const id = btn.getAttribute('data-id');
            openReservationModal(id);
        });
        
        // Elementos del DOM para el manejo de la sesión
        const authButtons = document.getElementById('authButtons');
        const userProfile = document.getElementById('userProfile');
        const userName = document.getElementById('userName');
        const logoutBtn = document.getElementById('logoutBtn');
        const dashboardSection = document.getElementById('dashboardSection');
        const welcomeMessage = document.getElementById('welcomeMessage');
        const userRoleMessage = document.getElementById('userRoleMessage');
        const loginForm = document.getElementById('loginForm');
        const loginMessage = document.getElementById('loginMessage');
        const registerForm = document.getElementById('registerForm');
        const registerMessage = document.getElementById('registerMessage');
        const updateUIForUser = (user) => {
            // Usar comprobaciones defensivas por si elementos no existen en la página
            if (user) {
                if (authButtons) authButtons.classList.add('hidden');
                if (userProfile) userProfile.classList.remove('hidden');
                if (userName) userName.textContent = `Bienvenido, ${user.nombre}`;
                if (dashboardSection) dashboardSection.classList.remove('hidden');
                if (welcomeMessage) welcomeMessage.textContent = user.nombre;
                if (userRoleMessage) userRoleMessage.textContent = `Tu rol es: ${user.rol}`;
            } else {
                if (authButtons) authButtons.classList.remove('hidden');
                if (userProfile) userProfile.classList.add('hidden');
                if (dashboardSection) dashboardSection.classList.add('hidden');
            }
        };
        const handleLogin = async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            loginMessage.textContent = '';
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                if (response.ok) {
                    // Guardar usuario y token
                    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
                    if (data.token) localStorage.setItem('token', data.token);
                    loginMessage.textContent = 'Inicio de sesión exitoso.';
                    loginMessage.classList.remove('text-red-500');
                    loginMessage.classList.add('text-green-500');
                    closeModal('loginModal');
                    // Corregido: Usa la URL de redirección que viene del servidor
                    if (data.redirectUrl) {
                        window.location.href = data.redirectUrl;
                    } else {
                        // Si no hay URL de redirección, simplemente actualiza la interfaz de usuario
                        updateUIForUser(data.user);
                    }
                } else {
                    loginMessage.textContent = data.error || 'Error al iniciar sesión.';
                    loginMessage.classList.remove('text-green-500');
                    loginMessage.classList.add('text-red-500');
                }
            } catch (error) {
                console.error('Error de red:', error);
                loginMessage.textContent = 'Ocurrió un error de red. Inténtalo de nuevo.';
                loginMessage.classList.remove('text-green-500');
                loginMessage.classList.add('text-red-500');
            }
        };
    
        
        // Función de validación de contraseña
        const validatePassword = (password) => {
            // Requisitos: 6+ dígitos, 1 número, 1 mayúscula, 1 signo
            const minLength = 6;
            const hasNumber = /\d/.test(password);
            const hasUpperCase = /[A-Z]/.test(password);
            const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password);
            if (password.length < minLength) {
                return 'La contraseña debe tener al menos 6 caracteres.';
            }
            if (!hasNumber) {
                return 'La contraseña debe contener al menos un número.';
            }
            if (!hasUpperCase) {
                return 'La contraseña debe contener al menos una letra mayúscula.';
            }
            if (!hasSpecialChar) {
                return 'La contraseña debe contener al menos un signo.';
            }
            return ''; // Retorna una cadena vacía si la contraseña es válida
        };
        const handleRegister = async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            registerMessage.textContent = '';
            // Validar la contraseña antes de enviar la solicitud
            const passwordValidationMessage = validatePassword(password);
            if (passwordValidationMessage) {
                registerMessage.textContent = passwordValidationMessage;
                registerMessage.classList.remove('text-green-500');
                registerMessage.classList.add('text-red-500');
                return; // Detiene el proceso si la contraseña no es válida
            }
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, email, password })
                });
                const data = await response.json();
                if (response.ok) {
                    registerMessage.textContent = 'Registro exitoso. Serás redirigido para iniciar sesión.';
                    registerMessage.classList.remove('text-red-500');
                    registerMessage.classList.add('text-green-500');
                    // Redirige al modal de inicio de sesión después de 2 segundos
                    setTimeout(() => {
                        switchModal('registerModal', 'loginModal');
                    }, 2000);
                } else {
                    // Maneja el error de email duplicado u otros errores del servidor
                    registerMessage.textContent = data.error || 'Error al registrar el usuario.';
                    registerMessage.classList.remove('text-green-500');
                    registerMessage.classList.add('text-red-500');
                }
            } catch (error) {
                console.error('Error de red:', error);
                registerMessage.textContent = 'Ocurrió un error de red. Inténtalo de nuevo.';
                registerMessage.classList.remove('text-green-500');
                registerMessage.classList.add('text-red-500');
            }
        };
        const handleLogout = () => {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            updateUIForUser(null);
            window.location.href = '/'; // Redirige a la página principal
        };
        // Asignar listeners a los formularios y botones
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
        if (registerForm) {
            registerForm.addEventListener('submit', handleRegister);
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        // Verificar el estado de la sesión al cargar la página
        const checkSession = () => {
            const user = JSON.parse(localStorage.getItem('user'));
            updateUIForUser(user);
        };
        checkSession();
    
        // --- CARRUSEL DINÁMICO ---
        async function loadCarousel() {
            const track = document.getElementById('carouselTrack');
            const indicators = document.getElementById('carouselIndicators');
            const prevBtn = document.querySelector('#heroCarousel .prev');
            const nextBtn = document.querySelector('#heroCarousel .next');
            if (!track || !indicators) return;
            try {
                const res = await fetch('/api/carrusel');
                if (!res.ok) throw new Error('No se pudo cargar el carrusel');
                const data = await res.json();
                const images = data.images || [];
                track.innerHTML = '';
                indicators.innerHTML = '';

                if (images.length === 0) {
                    // Si no hay imágenes, mostrar una imagen por defecto
                    const slide = document.createElement('div');
                    slide.className = 'carousel-slide active';
                    slide.innerHTML = `<img src="/img/logo_pequeño.png" alt="Casa del Inka" class="carousel-image">`;
                    track.appendChild(slide);
                    return;
                }

                images.forEach((src, idx) => {
                    const slide = document.createElement('div');
                    slide.className = 'carousel-slide' + (idx === 0 ? ' active' : '');
                    const imgSrc = src.startsWith('/') ? src : '/' + src;
                    slide.innerHTML = `<img src="${imgSrc}" alt="Slide ${idx+1}" class="carousel-image">`;
                    track.appendChild(slide);

                    const dot = document.createElement('button');
                    dot.className = 'carousel-dot' + (idx === 0 ? ' active' : '');
                    dot.setAttribute('data-slide', idx.toString());
                    indicators.appendChild(dot);
                });

                let current = 0;
                const slides = Array.from(track.querySelectorAll('.carousel-slide'));
                const dots = Array.from(indicators.querySelectorAll('.carousel-dot'));

                function goTo(index) {
                    slides.forEach((s, i) => s.classList.toggle('active', i === index));
                    dots.forEach((d, i) => d.classList.toggle('active', i === index));
                    current = index;
                }

                function next() { goTo((current + 1) % slides.length); }
                function prev() { goTo((current - 1 + slides.length) % slides.length); }

                if (nextBtn) nextBtn.addEventListener('click', () => { next(); resetAutoplay(); });
                if (prevBtn) prevBtn.addEventListener('click', () => { prev(); resetAutoplay(); });

                dots.forEach(d => d.addEventListener('click', (e) => { const idx = parseInt(e.currentTarget.getAttribute('data-slide'),10); goTo(idx); resetAutoplay(); }));

                // Autoplay
                let autoplayId = null;
                function startAutoplay() { autoplayId = setInterval(next, 5000); }
                function stopAutoplay() { if (autoplayId) { clearInterval(autoplayId); autoplayId = null; } }
                function resetAutoplay() { stopAutoplay(); startAutoplay(); }

                // Iniciar autoplay si hay más de 1 slide
                if (slides.length > 1) startAutoplay();

                // Pausar autoplay al entrar con el mouse
                const carousel = document.getElementById('heroCarousel');
                if (carousel) {
                    carousel.addEventListener('mouseenter', stopAutoplay);
                    carousel.addEventListener('mouseleave', startAutoplay);
                }

            } catch (err) {
                console.error('Error cargando carrusel:', err);
            }
        }
        // Cargar carrusel al inicio
        loadCarousel();
});

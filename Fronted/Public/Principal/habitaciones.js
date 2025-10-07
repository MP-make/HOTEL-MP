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

    // Función para verificar disponibilidad
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
        const reservasHabitacion = reservasData.filter(r => 
            r.id_habitacion === habitacionId && 
            r.estado_reserva !== 'cancelada' &&
            r.estado_reserva !== 'completada'
        );
        
        for (const reserva of reservasHabitacion) {
            const resCheckin = new Date(reserva.fecha_checkin);
            const resCheckout = new Date(reserva.fecha_checkout);
            
            // Hay conflicto si las fechas se solapan
            if (checkin < resCheckout && checkout > resCheckin) {
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
                            Reservar Ahora
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
            document.getElementById('reservaHabitacionCategoria').textContent = `Categoría: ${habitacion.categoria || 'Estándar'}`;
            document.getElementById('reservaHabitacionPiso').textContent = `Piso: ${habitacion.piso || 'N/A'}`;
            document.getElementById('reservaHabitacionCapacidad').textContent = `Capacidad: ${habitacion.capacidad || 2} personas`;
            document.getElementById('reservaHabitacionPrecioDia').textContent = `Precio por día: S/ ${parseFloat(habitacion.precio_por_dia).toFixed(2)}`;
            
            // Handle image carousel
            const imagenContainer = document.querySelector('.reserva-imagen');
            if (habitacion.fotos && habitacion.fotos.length > 1) {
                imagenContainer.innerHTML = `
                    <div class="reserva-carousel">
                        ${habitacion.fotos.map((foto, index) => {
                            return `<img src="/img/habitaciones/${foto}" alt="Habitación" class="reserva-img" style="display: ${index === 0 ? 'block' : 'none'};" onerror="this.src='https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600'">`;
                        }).join('')}
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
                let fotoSrc = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600';
                if (habitacion.fotos && habitacion.fotos.length > 0) {
                    fotoSrc = `/img/habitaciones/${habitacion.fotos[0]}`;
                }
                imagenContainer.innerHTML = `<img id="reservaHabitacionImagen" src="${fotoSrc}" alt="Habitación" class="reserva-img" onerror="this.src='https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600'">`;
            }
        }
        
        // Limpiar el formulario
        document.getElementById('reservaForm').reset();
        document.getElementById('reservaMessage').textContent = '';
        
        // Establecer fecha mínima como hoy
        const now = new Date();
        const minDate = now.toISOString().slice(0, 16);
        document.querySelector('#reservaModal #fechaCheckin').setAttribute('min', minDate);
        document.querySelector('#reservaModal #fechaCheckout').setAttribute('min', minDate);
        
        checkForm();
        openModal('reservaModal');
    }

    // Función para verificar si el formulario de reserva está completo
    function checkForm() {
        const checkinInput = document.querySelector('#reservaModal #fechaCheckin');
        const checkoutInput = document.querySelector('#reservaModal #fechaCheckout');
        const btnConfirmar = document.getElementById('btnConfirmarReserva');
        
        if (checkinInput && checkoutInput && checkinInput.value && checkoutInput.value) {
            const checkin = new Date(checkinInput.value);
            const checkout = new Date(checkoutInput.value);
            
            if (checkout > checkin) {
                btnConfirmar.disabled = false;
            } else {
                btnConfirmar.disabled = true;
            }
        } else {
            btnConfirmar.disabled = true;
        }
    }

    // Función para manejar la reserva
    async function manejarReserva(e) {
        e.preventDefault();
        
        const checkin = document.querySelector('#reservaModal #fechaCheckin').value;
        const checkout = document.querySelector('#reservaModal #fechaCheckout').value;
        
        if (!checkin || !checkout) {
            document.getElementById('reservaMessage').textContent = 'Por favor, selecciona las fechas';
            return;
        }
        
        const checkinDate = new Date(checkin);
        const checkoutDate = new Date(checkout);
        
        if (checkoutDate <= checkinDate) {
            document.getElementById('reservaMessage').textContent = 'La fecha de checkout debe ser posterior al checkin';
            return;
        }
        
        const token = localStorage.getItem('token');
        
        // Collect upsells
        const upsells = [];
        if (document.getElementById('upsell-desayuno').checked) upsells.push('desayuno');
        if (document.getElementById('upsell-romantico').checked) upsells.push('romantico');
        if (document.getElementById('upsell-spa').checked) upsells.push('spa');
        if (document.getElementById('upsell-late-checkout').checked) upsells.push('late-checkout');
        
        try {
            const response = await fetch(`${API_BASE}/cliente/reservas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    id_habitacion: currentHabitacionId,
                    fecha_checkin: checkin,
                    fecha_checkout: checkout,
                    upsells: upsells
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('¡Reserva creada exitosamente! Puedes ver tus reservas en "Mis Reservas"');
                closeModal('reservaModal');
                await cargarDatos(); // Recargar datos
                mostrarHabitaciones(habitacionesData); // Actualizar vista
            } else {
                document.getElementById('reservaMessage').textContent = data.error || 'Error al crear reserva';
            }
        } catch (error) {
            console.error('Error en reserva:', error);
            document.getElementById('reservaMessage').textContent = 'Error de conexión. Intenta nuevamente.';
        }
    }

    document.getElementById('reservaForm').addEventListener('submit', manejarReserva);

    // Event listeners para los inputs del formulario de reserva
    const reservaCheckin = document.querySelector('#reservaModal #fechaCheckin');
    const reservaCheckout = document.querySelector('#reservaModal #fechaCheckout');
    
    if (reservaCheckin) reservaCheckin.addEventListener('input', checkForm);
    if (reservaCheckout) reservaCheckout.addEventListener('input', checkForm);

    // Event listeners para filtros
    document.getElementById('btnBuscar').addEventListener('click', filtrarHabitaciones);
    document.getElementById('btnLimpiar').addEventListener('click', () => {
        document.getElementById('categoria').value = '';
        document.getElementById('fechaCheckin').value = '';
        document.getElementById('fechaCheckout').value = '';
        document.getElementById('precioMin').value = '';
        document.getElementById('precioMax').value = '';
        document.getElementById('capacidad').value = '';
        mostrarHabitaciones(habitacionesData);
    });

    // Inicializar
    async function inicializar() {
        verificarSesion();
        await cargarCategorias();
        await cargarDatos();
        mostrarHabitaciones(habitacionesData); // Mostrar todas inicialmente
    }

    inicializar();
});
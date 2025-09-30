// habitaciones.js
document.addEventListener('DOMContentLoaded', () => {
    // Variables globales
    let habitacionesData = [];
    let reservasData = [];
    let categoriasData = [];
    let usuarioActual = null;

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
            const response = await fetch('/api/login', {
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
                if (data.redirectUrl) window.location.href = data.redirectUrl;
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
            const response = await fetch('/api/register', {
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
            const response = await fetch('/api/categorias');
            const data = await response.json();
            categoriasData = data.categorias || [];
            const select = document.getElementById('categoria');
            select.innerHTML = '<option value="">Todas</option>';
            categoriasData.forEach(cat => {
                select.innerHTML += `<option value="${cat.nombre}">${cat.nombre}</option>`;
            });
        } catch (error) {
            console.error('Error cargando categorías:', error);
        }
    }

    // Cargar habitaciones y reservas
    async function cargarDatos() {
        try {
            const [habResponse, resResponse] = await Promise.all([
                fetch('/api/cliente/habitaciones'),
                fetch('/api/reservas') // Asumiendo que hay un endpoint para reservas, o usar token si necesario
            ]);
            const habData = await habResponse.json();
            const resData = await resResponse.json();
            habitacionesData = habData.habitaciones || [];
            reservasData = resData.reservas || [];
        } catch (error) {
            console.error('Error cargando datos:', error);
        }
    }

    // Función para verificar disponibilidad
    function estaDisponible(habitacionId, fechaCheckin, fechaCheckout) {
        if (!fechaCheckin || !fechaCheckout) return habitacionesData.find(h => h.id_habitacion === habitacionId)?.disponible || false;
        const checkin = new Date(fechaCheckin);
        const checkout = new Date(fechaCheckout);
        const reservasHabitacion = reservasData.filter(r => r.id_habitacion === habitacionId && r.estado_reserva !== 'cancelada');
        for (const reserva of reservasHabitacion) {
            const resCheckin = new Date(reserva.fecha_checkin);
            const resCheckout = new Date(reserva.fecha_checkout);
            if (checkin < resCheckout && checkout > resCheckin) {
                return false;
            }
        }
        return true;
    }

    // Filtrar habitaciones
    function filtrarHabitaciones() {
        const categoria = document.getElementById('categoria').value;
        const fechaCheckin = document.getElementById('fechaCheckin').value;
        const fechaCheckout = document.getElementById('fechaCheckout').value;
        const precioMin = parseFloat(document.getElementById('precioMin').value) || 0;
        const precioMax = parseFloat(document.getElementById('precioMax').value) || Infinity;
        const capacidad = document.getElementById('capacidad').value;

        const filtradas = habitacionesData.filter(hab => {
            if (categoria && hab.categoria !== categoria) return false;
            if (hab.precio_por_dia < precioMin || hab.precio_por_dia > precioMax) return false;
            if (capacidad && hab.capacidad < parseInt(capacidad)) return false;
            if (!estaDisponible(hab.id_habitacion, fechaCheckin, fechaCheckout)) return false;
            return true;
        });

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

        contenedor.innerHTML = habitaciones.map(habitacion => `
            <div class="habitacion-card">
                <img src="${habitacion.fotos && habitacion.fotos.length > 0 ? habitacion.fotos[0] : '/img/habitaciones/default-room.jpg'}" 
                     alt="${habitacion.numero_habitacion}" 
                     class="habitacion-imagen"
                     onerror="this.src='https://source.unsplash.com/featured/?luxury-hotel-room'">
                <div class="habitacion-info">
                    <h3 class="habitacion-titulo">Habitación ${habitacion.numero_habitacion}</h3>
                    <p class="habitacion-descripcion">${habitacion.categoria} - Piso ${habitacion.piso} - Capacidad ${habitacion.capacidad}</p>
                    <div class="habitacion-precio">S/ ${habitacion.precio_por_dia} / día</div>
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
        `).join('');

        // Event listeners para reservar
        document.querySelectorAll('.btn-reservar').forEach(btn => {
            btn.addEventListener('click', () => {
                const habitacionId = parseInt(btn.getAttribute('data-id'));
                const nombre = btn.getAttribute('data-nombre');
                reservarHabitacion(habitacionId, nombre);
            });
        });
    }

    // Función para reservar
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
        // Similar to index.js, open reserva modal
        // For simplicity, redirect to index or implement modal
        window.location.href = 'index.html'; // Or implement modal
    }

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
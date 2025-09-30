// habitaciones.js
document.addEventListener('DOMContentLoaded', () => {
    // Variables globales
    let habitacionesData = [];
    let reservasData = [];
    let categoriasData = [];
    let usuarioActual = null;
    let currentHabitacionId = null;

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
            const token = localStorage.getItem('token');
            const habResponse = await fetch('/api/cliente/habitaciones');
            const habData = await habResponse.json();
            habitacionesData = habData.habitaciones || [];
            if (token) {
                const resResponse = await fetch('/api/reservas', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                const resData = await resResponse.json();
                reservasData = resData.reservas || [];
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
                        ${habitacion.fotos.map((foto, index) => {
                            return `<img src="/img/habitaciones/${foto}" alt="Habitación" class="reserva-img" style="display: ${index === 0 ? 'block' : 'none'};" onerror="this.src='https://source.unsplash.com/featured/?luxury-hotel-room'">`;
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
                const fotoSrc = habitacion.fotos && habitacion.fotos.length > 0 ? `/img/habitaciones/${habitacion.fotos[0]}` : '/img/habitaciones/default-room.jpg';
                imagenContainer.innerHTML = `<img id="reservaHabitacionImagen" src="${fotoSrc}" alt="Habitación" class="reserva-img" onerror="this.src='https://source.unsplash.com/featured/?luxury-hotel-room'">`;
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
        
        // Collect upsells
        const upsells = [];
        if (document.getElementById('upsell-desayuno').checked) upsells.push('desayuno');
        if (document.getElementById('upsell-romantico').checked) upsells.push('romantico');
        if (document.getElementById('upsell-spa').checked) upsells.push('spa');
        if (document.getElementById('upsell-late-checkout').checked) upsells.push('late-checkout');
        
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
                    fecha_checkout: checkout,
                    upsells: upsells
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('Reserva creada exitosamente');
                closeModal('reservaModal');
                cargarDatos(); // reload to update availability
                mostrarHabitaciones(habitacionesData); // refresh display
            } else {
                document.getElementById('reservaMessage').textContent = data.error || 'Error al crear reserva';
            }
        } catch (error) {
            console.error('Error en reserva:', error);
            document.getElementById('reservaMessage').textContent = 'Error de conexión';
        }
    }

    document.getElementById('reservaForm').addEventListener('submit', manejarReserva);

    // Event listeners para los inputs del formulario de reserva
    document.getElementById('fechaCheckin').addEventListener('input', checkForm);
    document.getElementById('fechaCheckout').addEventListener('input', checkForm);

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
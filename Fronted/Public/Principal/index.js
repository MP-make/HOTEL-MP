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
                const response = await fetch('http://localhost:4000/api/cliente/habitaciones');
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
    
                    let precioTexto = '';
                    if (habitacion.precio_por_dia) {
                        precioTexto = `$${habitacion.precio_por_dia}/noche`;
                    } else if (habitacion.precio_por_hora) {
                        precioTexto = `$${habitacion.precio_por_hora}/hora`;
                    } else {
                        precioTexto = 'Consultar precio';
                    }
    
                    card.innerHTML = `
                        <img src="https://placehold.co/600x400/FFD700/8B4513?text=Habitación+${habitacion.numero_habitacion}" alt="Habitación ${habitacion.categoria}">
                        <div class="tarjeta-cuerpo">
                            <h3>Habitación ${habitacion.numero_habitacion}</h3>
                            <p>Categoría: ${habitacion.categoria}</p>
                            <p>Piso: ${habitacion.piso || 'N/A'}</p>
                            <p>Capacidad: ${habitacion.capacidad || 'N/A'} personas</p>
                            <p>Precio: ${precioTexto}</p>
                            <p class="text-green-600 font-bold">Disponible</p>
                            <button class="btn-principal">Reservar</button>
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
            if (user) {
                authButtons.classList.add('hidden');
                userProfile.classList.remove('hidden');
                userName.textContent = `Bienvenido, ${user.nombre}`;
                dashboardSection.classList.remove('hidden');
                welcomeMessage.textContent = user.nombre;
                userRoleMessage.textContent = `Tu rol es: ${user.rol}`;
            } else {
                authButtons.classList.remove('hidden');
                userProfile.classList.add('hidden');
                dashboardSection.classList.add('hidden');
            }
        };
        const handleLogin = async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            loginMessage.textContent = '';
            try {
                const response = await fetch('http://localhost:4000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('user', JSON.stringify(data.user));
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
                const response = await fetch('http://localhost:4000/api/register', {
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
    
    });
    
// Cliente.js - Funcionalidad para el panel del cliente

document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario está logueado
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // Cargar información del usuario
    loadUserInfo();

    // Cargar reservas
    loadReservas();

    // Cargar reclamos
    loadReclamos();

    // Event listeners para filtros de reservas
    document.getElementById('btnFiltrarReservas').addEventListener('click', filtrarReservas);
    document.getElementById('btnLimpiarReservas').addEventListener('click', function() {
        document.getElementById('filtro-buscar').value = '';
        document.getElementById('filtro-categoria').value = '';
        document.getElementById('filtro-estado').value = '';
        document.getElementById('filtro-fecha-desde').value = '';
        document.getElementById('filtro-fecha-hasta').value = '';
        document.getElementById('filtro-orden').value = 'ultimas';
        displayReservas(window.reservas);
    });

    // Manejar logout
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });

    // Manejar envío de reclamo
    document.getElementById('reclamo-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const descripcion = document.getElementById('reclamo-descripcion').value.trim();
        const id_habitacion_raw = document.getElementById('reclamo-habitacion').value;
        if (id_habitacion_raw === "") {
            alert("Por favor, selecciona una habitación de tus reservas.");
            return;
        }
        const id_habitacion = id_habitacion_raw && id_habitacion_raw !== '' && !isNaN(parseInt(id_habitacion_raw)) ? parseInt(id_habitacion_raw) : null;
        if (!descripcion) {
            alert('Por favor, describe el reclamo.');
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
                body: JSON.stringify({ descripcion, id_habitacion })
            });
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'index.html';
                return;
            }
            if (response.ok) {
                alert('Reclamo enviado exitosamente.');
                document.getElementById('reclamo-descripcion').value = '';
                document.getElementById('reclamo-habitacion').value = '';
                loadReclamos(); // reload
            } else {
                try {
                    const error = await response.json();
                    alert('Error al enviar reclamo: ' + (error.error || 'Desconocido'));
                } catch (error) {
                    console.error('Error parsing error response:', error);
                    alert('Error al enviar reclamo.');
                }
            }
        } catch (error) {
            console.error('Error enviando reclamo:', error);
            alert('Error al enviar reclamo.');
        }
    });
});

async function loadUserInfo() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }
        if (response.ok) {
            try {
                const user = await response.json();
                document.getElementById('userName').textContent = user.nombre || 'Cliente';
                // Mostrar el perfil del usuario y ocultar botones de login
                document.getElementById('authButtons').classList.add('hidden');
                document.getElementById('userProfile').classList.remove('hidden');
            } catch (error) {
                console.error('Error parsing user info:', error);
            }
        } else {
            console.error('Error cargando info del usuario');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadReservas() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/cliente/reservas', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }
        if (response.ok) {
            try {
                const reservas = await response.json();
                window.reservas = reservas;
                populateFiltroCategoria();
                displayReservas(window.reservas);
                populateSelect(window.reservas);
            } catch (error) {
                console.error('Error parsing reservas:', error);
                document.getElementById('reservasGrid').innerHTML = '<p>Error al cargar reservas.</p>';
            }
        } else {
            document.getElementById('reservasGrid').innerHTML = '<p>No se pudieron cargar las reservas.</p>';
        }
    } catch (error) {
        console.error('Error cargando reservas:', error);
        document.getElementById('reservasGrid').innerHTML = '<p>Error al cargar reservas.</p>';
    }
}

function displayReservas(reservas) {
    const container = document.getElementById('reservasGrid');
    if (!reservas || reservas.length === 0) {
        container.innerHTML = `
            <div class="no-reservas">
                <h3>No tienes reservas activas</h3>
                <p>Realiza una reserva para ver tus habitaciones aquí.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="reservas-grid">
            ${reservas.map(reserva => {
                const fotoSrc = reserva.fotos && reserva.fotos.length > 0 
                    ? (reserva.fotos[0].startsWith('/') ? reserva.fotos[0] : '/img/habitaciones/' + encodeURI(reserva.fotos[0])) 
                    : 'https://source.unsplash.com/featured/?luxury-hotel-room';
                const checkin = new Date(reserva.fecha_checkin).toLocaleDateString('es-ES');
                const checkout = new Date(reserva.fecha_checkout).toLocaleDateString('es-ES');
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
                                data-id="${reserva.id_reserva}">
                            Ver Detalles
                        </button>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    `;
}

function populateSelect(reservas) {
    const select = document.getElementById('reclamo-habitacion');
    select.innerHTML = '<option value="">Seleccionar habitación</option>';
    reservas.forEach(reserva => {
        const option = document.createElement('option');
        option.value = reserva.id_habitacion;
        option.textContent = `${reserva.numero_habitacion} - ${reserva.categoria}`;
        select.appendChild(option);
    });
}

async function loadReclamos() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/cliente/reclamos', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }
        if (response.ok) {
            try {
                const reclamos = await response.json();
                displayReclamos(reclamos);
            } catch (error) {
                console.error('Error parsing reclamos:', error);
                document.getElementById('reclamos-list').innerHTML = '<p>Error al cargar reclamos.</p>';
            }
        } else {
            document.getElementById('reclamos-list').innerHTML = '<p>No se pudieron cargar los reclamos.</p>';
        }
    } catch (error) {
        console.error('Error cargando reclamos:', error);
        document.getElementById('reclamos-list').innerHTML = '<p>Error al cargar reclamos.</p>';
    }
}

function displayReclamos(reclamos) {
    const container = document.getElementById('reclamos-list');
    if (reclamos.length === 0) {
        container.innerHTML = '<p>No tienes reclamos.</p>';
        return;
    }

    let html = '<table>';
    html += '<thead><tr><th>ID Reclamo</th><th>Descripción</th><th>Habitación</th><th>Estado</th><th>Fecha Creación</th></tr></thead>';
    html += '<tbody>';
    reclamos.forEach(reclamo => {
        const creacion = new Date(reclamo.fecha_creacion).toLocaleDateString('es-ES');
        const habitacion = reclamo.numero_habitacion ? `${reclamo.numero_habitacion} (${reclamo.categoria})` : 'N/A';
        html += `<tr>
            <td>${reclamo.id_reclamo}</td>
            <td>${reclamo.descripcion}</td>
            <td>${habitacion}</td>
            <td>${reclamo.estado}</td>
            <td>${creacion}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function populateFiltroCategoria() {
    const select = document.getElementById('filtro-categoria');
    select.innerHTML = '<option value="">Todas</option>';
    const categories = [...new Set(window.reservas.map(r => r.categoria))];
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

function filtrarReservas() {
    let filtered = window.reservas.slice();
    
    // Filtro por búsqueda de habitación
    const buscar = document.getElementById('filtro-buscar').value.trim().toLowerCase();
    if (buscar) {
        filtered = filtered.filter(r => 
            r.numero_habitacion.toString().toLowerCase().includes(buscar)
        );
    }
    
    // Filtro por categoría
    const cat = document.getElementById('filtro-categoria').value;
    if (cat) {
        filtered = filtered.filter(r => r.categoria === cat);
    }
    
    // Filtro por estado
    const estado = document.getElementById('filtro-estado').value;
    if (estado) {
        filtered = filtered.filter(r => r.estado_reserva === estado);
    }
    
    // Filtro por rango de fechas (check-in)
    const fechaDesde = document.getElementById('filtro-fecha-desde').value;
    const fechaHasta = document.getElementById('filtro-fecha-hasta').value;
    
    if (fechaDesde) {
        const desde = new Date(fechaDesde);
        filtered = filtered.filter(r => {
            const checkin = new Date(r.fecha_checkin);
            return checkin >= desde;
        });
    }
    
    if (fechaHasta) {
        const hasta = new Date(fechaHasta);
        hasta.setHours(23, 59, 59, 999); // Incluir todo el día
        filtered = filtered.filter(r => {
            const checkin = new Date(r.fecha_checkin);
            return checkin <= hasta;
        });
    }
    
    // Ordenar resultados
    const orden = document.getElementById('filtro-orden').value;
    if (orden === 'ultimas') {
        filtered.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
    } else if (orden === 'recientes') {
        filtered.sort((a, b) => new Date(b.fecha_checkin) - new Date(b.fecha_checkin));
    } else if (orden === 'antiguas') {
        filtered.sort((a, b) => new Date(a.fecha_checkin) - new Date(b.fecha_checkin));
    }
    
    console.log(`Filtrado: ${filtered.length} reservas de ${window.reservas.length} totales`);
    displayReservas(filtered);
}
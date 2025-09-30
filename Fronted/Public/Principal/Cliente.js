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

    // Manejar logout
    document.getElementById('logout-link').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });

    // Navegación en la sidebar
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            // Remover active de todos
            sidebarItems.forEach(i => i.classList.remove('active'));
            // Agregar active al clicado
            this.classList.add('active');
            // Scroll a la sección
            const target = this.getAttribute('href');
            document.querySelector(target).scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Manejar envío de reclamo
    document.getElementById('reclamo-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const descripcion = document.getElementById('reclamo-descripcion').value.trim();
        const id_habitacion = document.getElementById('reclamo-habitacion').value;
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
                body: JSON.stringify({ descripcion, id_habitacion: id_habitacion || null })
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
                const error = await response.json();
                alert('Error al enviar reclamo: ' + (error.error || 'Desconocido'));
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
            const user = await response.json();
            document.getElementById('user-display-name').textContent = user.nombre || 'Cliente';
            document.getElementById('user-id').textContent = user.id;
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
            const reservas = await response.json();
            displayReservas(reservas);
            populateSelect(reservas);
        } else {
            document.getElementById('reservas-list').innerHTML = '<p>No se pudieron cargar las reservas.</p>';
        }
    } catch (error) {
        console.error('Error cargando reservas:', error);
        document.getElementById('reservas-list').innerHTML = '<p>Error al cargar reservas.</p>';
    }
}

function displayReservas(reservas) {
    const container = document.getElementById('reservas-list');
    if (reservas.length === 0) {
        container.innerHTML = '<p>No tienes reservas activas.</p>';
        return;
    }

    let html = '<table>';
    html += '<thead><tr><th>ID Reserva</th><th>Habitación</th><th>Categoría</th><th>Check-in</th><th>Check-out</th><th>Estado</th><th>Fecha Creación</th></tr></thead>';
    html += '<tbody>';
    reservas.forEach(reserva => {
        const checkin = new Date(reserva.fecha_checkin).toLocaleDateString('es-ES');
        const checkout = new Date(reserva.fecha_checkout).toLocaleDateString('es-ES');
        const creacion = new Date(reserva.fecha_creacion).toLocaleDateString('es-ES');
        html += `<tr>
            <td>${reserva.id_reserva}</td>
            <td>${reserva.numero_habitacion}</td>
            <td>${reserva.categoria}</td>
            <td>${checkin}</td>
            <td>${checkout}</td>
            <td>${reserva.estado_reserva}</td>
            <td>${creacion}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
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
            const reclamos = await response.json();
            displayReclamos(reclamos);
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
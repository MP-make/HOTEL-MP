document.addEventListener('DOMContentLoaded', () => {

    const sidebarItems = document.querySelectorAll(".sidebar-item");
    const mainSections = document.querySelectorAll("main section");
    const logoutLink = document.getElementById('logout-link');
    const deleteAccountLink = document.getElementById('delete-account-link'); // ejemplo extra

    // --- Funciones para manejar los modales de confirmación ---
    const showConfirmModal = (message, onConfirm) => {
        const modalOverlay = document.getElementById('confirm-modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const confirmBtn = document.getElementById('confirm-btn');
        const cancelBtn = document.getElementById('cancel-btn');

        modalTitle.textContent = "Confirmación";
        modalMessage.textContent = message;
        modalOverlay.style.display = 'flex';

        const handleConfirm = () => {
            onConfirm();
            hideConfirmModal();
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        const handleCancel = () => {
            hideConfirmModal();
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    };

    const hideConfirmModal = () => {
        const modalOverlay = document.getElementById('confirm-modal-overlay');
        modalOverlay.style.display = 'none';
    };

    // --- Lógica para el cierre de sesión ---
        
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();

            showConfirmModal('¿Estás seguro de que quieres cerrar la sesión?', () => {
                // Borrar las mismas claves que usa index.js
                localStorage.removeItem('user'); 
                localStorage.removeItem('userSession'); 
                localStorage.removeItem('user_id');

                console.log('Sesión cerrada. Redirigiendo...');
                // Redirección segura
                window.location.replace('index.html'); 
            });
        });
    }


    // --- Ejemplo: lógica para eliminar cuenta (usa la misma confirmación) ---
    if (deleteAccountLink) {
        deleteAccountLink.addEventListener('click', (e) => {
            e.preventDefault();

            showConfirmModal('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.', () => {
                // Aquí pondrías la lógica de eliminación (API, base de datos, etc.)
                console.log('Cuenta eliminada.');
                localStorage.clear();
                window.location.href = 'index.html';
            });
        });
    }

    // --- Lógica de navegación del sidebar ---
    sidebarItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            
            const targetSectionId = item.getAttribute("href").substring(1);

            // Remueve la clase 'active' de todos los elementos
            sidebarItems.forEach(i => i.classList.remove("active"));
            
            // Añade la clase 'active' al elemento clickeado
            item.classList.add("active");

            // Oculta todas las secciones principales
            mainSections.forEach(section => {
                section.style.display = 'none';
            });

            // Muestra la sección correspondiente
            const targetSection = document.getElementById(targetSectionId);
            if (targetSection) {
                targetSection.style.display = 'block';

                // Si la sección es reservas, cargamos datos
                if (targetSectionId === 'reservas') {
                    loadReservas();
                }

                // Si la sección es habitaciones, recargar lista
                if (targetSectionId === 'habitaciones') {
                    loadRoomsList();
                }
            }
        });
    });

    // --- NUEVO: Verificar sesión y rol al cargar el panel ---
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const userDisplay = document.getElementById('user-display-name');
    const userIdDisplay = document.getElementById('user-id');
    if (!currentUser) {
        // No logueado → regresar al inicio
        window.location.replace('index.html');
        return;
    }
    // Solo encargados o admins pueden acceder
    if (!(currentUser.rol === 'encargado' || currentUser.rol === 'admin')) {
        window.location.replace('index.html');
        return;
    }
    if (userDisplay) userDisplay.textContent = currentUser.nombre || 'Encargado';
    if (userIdDisplay) userIdDisplay.textContent = currentUser.id || '';

    // --- Funciones para cargar habitaciones (lista simple) ---
    async function loadRoomsList() {
        const container = document.getElementById('rooms-list');
        if (!container) return;
        try {
            const res = await fetch('/api/admin/habitaciones');
            if (!res.ok) throw new Error('Error al obtener habitaciones');
            const habitaciones = await res.json();
            if (!Array.isArray(habitaciones) || habitaciones.length === 0) {
                container.innerHTML = '<p style="text-align:center">No hay habitaciones.</p>';
                return;
            }
            container.innerHTML = '<table class="rooms-table"><thead><tr><th>#</th><th>Categoría</th><th>Piso</th><th>Capacidad</th><th>Precio/Día</th><th>Disponible</th></tr></thead><tbody>' +
                habitaciones.map(h => `<tr><td>${h.numero_habitacion}</td><td>${h.categoria||'N/A'}</td><td>${h.piso||'-'}</td><td>${h.capacidad||'-'}</td><td>${h.precio_por_dia||'-'}</td><td>${h.disponible? 'Sí':'No'}</td></tr>`).join('') +
                '</tbody></table>';
        } catch (err) {
            console.error('Error al cargar habitaciones:', err);
            container.innerHTML = '<p style="text-align:center;color:red">Error al cargar habitaciones.</p>';
        }
    }

    // Helper para encabezados con token
    function getAuthHeaders() {
        const headers = {};
        const token = localStorage.getItem('token');
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return headers;
    }

    // Estado de paginación
    let currentPage = 1;

    // --- FUNCIONES DE RESERVAS (mejoradas con filtros y paginación) ---
    async function loadReservas(page = 1) {
        const container = document.getElementById('reservas-list');
        if (!container) return;
        container.innerHTML = '<p style="text-align:center">Cargando reservas...</p>';
        try {
            const pageSizeEl = document.getElementById('pageSize');
            const pageSize = pageSizeEl ? pageSizeEl.value : 10;
            const cliente = document.getElementById('filter-cliente')?.value || '';
            const id_habitacion = document.getElementById('filter-habitacion')?.value || '';
            const fecha_inicio = document.getElementById('filter-fecha-inicio')?.value || '';
            const fecha_fin = document.getElementById('filter-fecha-fin')?.value || '';

            const params = new URLSearchParams();
            params.set('page', page);
            params.set('pageSize', pageSize);
            if (cliente) params.set('cliente', cliente);
            if (id_habitacion) params.set('id_habitacion', id_habitacion);
            if (fecha_inicio) params.set('fecha_inicio', fecha_inicio);
            if (fecha_fin) params.set('fecha_fin', fecha_fin);

            const url = '/api/encargado/reservas?' + params.toString();
            const res = await fetch(url, { headers: getAuthHeaders() });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    container.innerHTML = '<p style="text-align:center;color:red">No autorizado. Inicia sesión como encargado.</p>';
                    return;
                }
                throw new Error('Error al obtener reservas');
            }

            const json = await res.json();
            const reservas = json.reservas || [];
            const total = json.total || 0;
            currentPage = json.page || page;

            if (!Array.isArray(reservas) || reservas.length === 0) {
                container.innerHTML = '<p style="text-align:center">No hay reservas.</p>';
                renderPagination(total, currentPage, parseInt(json.pageSize || pageSize, 10));
                return;
            }

            container.innerHTML = reservas.map(r => {
                const checkin = new Date(r.fecha_checkin).toLocaleString();
                const checkout = new Date(r.fecha_checkout).toLocaleString();
                return `
                    <div class="reserva-card" data-id="${r.id_reserva}">
                        <p><strong>ID:</strong> ${r.id_reserva}</p>
                        <p><strong>Cliente:</strong> ${r.cliente_nombre} ${r.cliente_email? `(${r.cliente_email})`: ''}</p>
                        <p><strong>Habitación:</strong> ${r.numero_habitacion}</p>
                        <p><strong>Check-in:</strong> ${checkin}</p>
                        <p><strong>Check-out:</strong> ${checkout}</p>
                        <p><strong>Estado:</strong> <span class="estado-res">${r.estado_reserva}</span></p>
                        <div class="res-actions">
                            ${r.estado_reserva !== 'completada' ? `<button class="btn" data-action="completar" data-id="${r.id_reserva}">Marcar como completada</button>` : ''}
                            <button class="btn btn-secondary" data-action="ver" data-id="${r.id_reserva}">Ver detalles</button>
                        </div>
                    </div>
                `;
            }).join('');

            renderPagination(total, currentPage, parseInt(json.pageSize || pageSize, 10));
        } catch (err) {
            console.error('Error al cargar reservas:', err);
            container.innerHTML = '<p style="text-align:center;color:red">Error al cargar reservas.</p>';
        }
    }

    // Renderizar controles de paginación
    function renderPagination(total, page, pageSize) {
        const pagContainer = document.getElementById('reservas-paginacion');
        if (!pagContainer) return;
        pagContainer.innerHTML = '';
        const totalPages = Math.max(1, Math.ceil(total / pageSize));

        const createBtn = (label, target) => {
            const b = document.createElement('button');
            b.className = 'btn';
            b.textContent = label;
            b.disabled = target === page;
            b.addEventListener('click', () => loadReservas(target));
            return b;
        };

        if (page > 1) pagContainer.appendChild(createBtn('« Anterior', page - 1));
        pagContainer.appendChild(createBtn(`Página ${page} / ${totalPages}`, page));
        if (page < totalPages) pagContainer.appendChild(createBtn('Siguiente »', page + 1));
    }

    // Aplicar filtros
    const applyBtn = document.getElementById('applyFilters');
    if (applyBtn) applyBtn.addEventListener('click', () => loadReservas(1));

    // Delegación de acciones en la sección de reservas (usa token en las llamadas)
    document.body.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        const headers = getAuthHeaders();
        if (action === 'completar') {
            showConfirmModal('Confirmar que desea marcar la reserva como completada?', async () => {
                try {
                    const res = await fetch(`/api/encargado/reservas/${id}/completar`, { method: 'PUT', headers });
                    if (!res.ok) {
                        const err = await res.json().catch(()=>({ error: res.statusText }));
                        throw new Error(err.error || 'No se pudo completar la reserva');
                    }
                    // refrescar lista
                    await loadReservas(currentPage);
                } catch (err) {
                    console.error('Error al completar reserva:', err);
                    alert('Error al completar la reserva. Revisa la consola.');
                }
            });
        } else if (action === 'ver') {
            // Mostrar detalles en modal simple
            const card = btn.closest('.reserva-card');
            if (!card) return;
            const idr = card.getAttribute('data-id');
            const detalles = card.innerHTML;
            // Reusar confirm modal para mostrar info
            showConfirmModal('Detalles de la reserva', () => {});
            // Sobrescribir el contenido del modal con detalles
            const modalMessage = document.getElementById('modal-message');
            if (modalMessage) modalMessage.innerHTML = detalles + '<br><button id="close-info" class="btn btn-secondary">Cerrar</button>';
            const closeInfo = document.getElementById('close-info');
            if (closeInfo) closeInfo.addEventListener('click', hideConfirmModal);
        }
    });

    // SSE: conexión para recibir notificaciones en tiempo real
    let eventSource;
    function startSse() {
        const token = localStorage.getItem('token');
        if (!token) return;
        if (eventSource) eventSource.close();
        const url = `/api/encargado/reservas/stream?token=${encodeURIComponent(token)}`;
        eventSource = new EventSource(url);
        eventSource.onmessage = (e) => {
            try {
                const payload = JSON.parse(e.data);
                if (!payload || !payload.event) return;
                if (payload.event === 'nueva_reserva' || payload.event === 'reserva_completada') {
                    // refrescar la página actual
                    loadReservas(currentPage);
                }
            } catch (err) {
                console.error('Error parsing SSE message:', err);
            }
        };
        eventSource.onerror = (err) => {
            console.error('SSE connection error:', err);
            // intentar reconectar más tarde
            if (eventSource) eventSource.close();
            eventSource = null;
            setTimeout(() => startSse(), 5000);
        };
    }

    // Inicializar listas
    loadRoomsList();
    // No cargar reservas por defecto hasta que el encargado abra la pestaña; pero puedes descomentar para cargar al inicio
    // loadReservas();

    // Iniciar SSE si estamos en la sección de reservas y hay token
    startSse();

});

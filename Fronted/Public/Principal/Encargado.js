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

                // Si la sección es reclamos, cargar reclamos
                if (targetSectionId === 'reclamos') {
                    loadClaims();
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
    async function loadRoomsList(page = 1) {
        const container = document.getElementById('rooms-list');
        if (!container) return;
        try {
            const numero = document.getElementById('filter-numero')?.value || '';
            const categoria = document.getElementById('filter-categoria')?.value || '';
            const piso = document.getElementById('filter-piso')?.value || '';
            const disponible = document.getElementById('filter-disponible')?.value || '';

            const params = new URLSearchParams();
            if (numero) params.set('numero', numero);
            if (categoria) params.set('categoria', categoria);
            if (piso) params.set('piso', piso);
            if (disponible) params.set('disponible', disponible);

            const url = '/api/encargado/habitaciones?' + params.toString();
            const res = await fetch(url, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Error al obtener habitaciones');
            const habitaciones = await res.json();
            if (!Array.isArray(habitaciones) || habitaciones.length === 0) {
                container.innerHTML = '<p style="text-align:center">No hay habitaciones que coincidan con los filtros.</p>';
                return;
            }
            container.innerHTML = '<table class="rooms-table"><thead><tr><th>#</th><th>Categoría</th><th>Piso</th><th>Capacidad</th><th>Precio/Día</th><th>Disponible</th><th>Acciones</th></tr></thead><tbody>' +
                habitaciones.map(h => `<tr><td>${h.numero_habitacion}</td><td>${h.categoria||'N/A'}</td><td>${h.piso||'-'}</td><td>${h.capacidad||'-'}</td><td>${h.precio_por_dia||'-'}</td><td>${h.disponible? 'Sí':'No'}</td><td><button class="btn fotos-btn" data-id="${h.id_habitacion}">Fotos</button></td></tr>`).join('') +
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

            container.innerHTML = '<table class="reservas-table"><thead><tr><th>ID</th><th>Cliente</th><th>Habitación</th><th>Check-in</th><th>Check-out</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>' +
                reservas.map(r => {
                    const checkin = new Date(r.fecha_checkin).toLocaleString('es-ES', { timeZone: 'America/Lima', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    const checkout = new Date(r.fecha_checkout).toLocaleString('es-ES', { timeZone: 'America/Lima', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    return `<tr><td>${r.id_reserva}</td><td>${r.cliente_nombre} ${r.cliente_email? `(${r.cliente_email})`: ''}</td><td>${r.numero_habitacion}</td><td>${checkin}</td><td>${checkout}</td><td><span class="estado-res">${r.estado_reserva}</span></td><td>${r.estado_reserva !== 'completada' ? `<button class="btn" data-action="completar" data-id="${r.id_reserva}">Completar</button>` : ''}</td></tr>`;
                }).join('') +
                '</tbody></table>';

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

    // --- FUNCIONES DE RECLAMOS ---
    async function loadClaims() {
        const container = document.getElementById('claims-list');
        if (!container) return;
        container.innerHTML = '<p style="text-align:center">Cargando reclamos...</p>';
        try {
            const texto = document.getElementById('filter-reclamo-texto')?.value || '';
            const habitacion = document.getElementById('filter-reclamo-habitacion')?.value || '';
            const estado = document.getElementById('filter-reclamo-estado')?.value || '';

            const params = new URLSearchParams();
            if (texto) params.set('texto', texto);
            if (habitacion) params.set('habitacion', habitacion);
            if (estado) params.set('estado', estado);

            const url = '/api/encargado/reclamos?' + params.toString();
            const res = await fetch(url, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Error al obtener reclamos');
            const reclamos = await res.json();
            if (!Array.isArray(reclamos) || reclamos.length === 0) {
                container.innerHTML = '<p style="text-align:center">No hay reclamos que coincidan con los filtros.</p>';
                return;
            }
            container.innerHTML = '<table class="reclamos-table"><thead><tr><th>ID</th><th>Habitación</th><th>Reclamo</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>' +
                reclamos.map(r => `<tr><td>${r.id_reclamo}</td><td>${r.numero_habitacion}</td><td>${r.descripcion}</td><td>${r.estado}</td><td>${new Date(r.fecha_creacion).toLocaleString('es-ES', { timeZone: 'America/Lima', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td>${r.estado === 'pendiente' ? `<button class="btn" data-action="resolver" data-id="${r.id_reclamo}">Resolver</button>` : ''}</td></tr>`).join('') +
                '</tbody></table>';
        } catch (err) {
            console.error('Error al cargar reclamos:', err);
            container.innerHTML = '<p style="text-align:center;color:red">Error al cargar reclamos.</p>';
        }
    }

    // Aplicar filtros
    const applyBtn = document.getElementById('applyFilters');
    if (applyBtn) applyBtn.addEventListener('click', () => loadReservas(1));

    const applyBtnHabitaciones = document.getElementById('applyFiltersHabitaciones');
    if (applyBtnHabitaciones) applyBtnHabitaciones.addEventListener('click', () => loadRoomsList(1));

    const applyBtnReclamos = document.getElementById('applyFiltersReclamos');
    if (applyBtnReclamos) applyBtnReclamos.addEventListener('click', () => loadClaims());

    // --- Manejar formulario de agregar reclamo ---
    const addClaimForm = document.getElementById('add-claim-form');
    if (addClaimForm) {
        addClaimForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = document.getElementById('claim-text').value;
            const room = document.getElementById('claim-room').value;
            try {
                const res = await fetch('/api/encargado/reclamos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ descripcion: text, numero_habitacion: room })
                });
                if (!res.ok) throw new Error('Error al agregar reclamo');
                alert('Reclamo agregado');
                loadClaims();
                addClaimForm.reset();
            } catch (err) {
                console.error(err);
                alert('Error al agregar reclamo');
            }
        });
    }

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
        } else if (action === 'resolver') {
            showConfirmModal('Marcar reclamo como resuelto?', async () => {
                try {
                    const res = await fetch(`/api/encargado/reclamos/${id}/resolver`, { method: 'PUT', headers });
                    if (!res.ok) throw new Error('Error al resolver reclamo');
                    loadClaims();
                } catch (err) {
                    console.error(err);
                    alert('Error al resolver reclamo');
                }
            });
        }
    });

    // --- Nuevo: gestión de fotos por el encargado ---
    document.body.addEventListener('click', async (e) => {
        const fotoBtn = e.target.closest('.fotos-btn');
        if (!fotoBtn) return;
        const id = fotoBtn.getAttribute('data-id');
        if (!id) return;
        try {
            const res = await fetch(`/api/encargado/habitaciones/${id}/fotos`, { headers: getAuthHeaders() });
            const fotos = res.ok ? await res.json() : [];
            const fotosHtml = (Array.isArray(fotos) && fotos.length) ? fotos.map(f => `
                <div class="inline-block m-2 text-center" style="width:120px">
                    <img src="${f.url || f}" class="h-24 w-full object-cover rounded border">
                    <div class="mt-1 flex justify-between">
                        <button data-url="${f.url || f}" class="delete-foto-btn px-2 py-1 text-xs bg-red-500 text-white rounded">Eliminar</button>
                        <a href="${f.url || f}" target="_blank" class="px-2 py-1 text-xs bg-gray-200 rounded">Abrir</a>
                    </div>
                </div>
            `).join('') : '<p class="text-sm">No hay fotos aún.</p>';

            // Reutilizamos el modal de confirmación para mostrar contenido personalizado
            showConfirmModal('Fotos de la habitación', () => {});
            const modalMessage = document.getElementById('modal-message');
            if (!modalMessage) return;

            modalMessage.innerHTML = `
                <div id="fotos-list" class="flex flex-wrap">${fotosHtml}</div>
                <hr class="my-3">
                <form id="upload-fotos-form" enctype="multipart/form-data">
                    <label class="block text-sm font-medium">Subir fotos</label>
                    <input type="file" name="fotos" accept="image/*" multiple class="mt-2">
                    <div class="mt-3 flex justify-end">
                        <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded">Subir</button>
                    </div>
                </form>
            `;

            // Delegación para eliminar una foto desde el modal
            const fotosListEl = document.getElementById('fotos-list');
            fotosListEl.addEventListener('click', async (ev) => {
                const delBtn = ev.target.closest('.delete-foto-btn');
                if (!delBtn) return;
                const url = delBtn.getAttribute('data-url');
                if (!url) return;
                showConfirmModal('Eliminar foto permanentemente?', async () => {
                    try {
                        // Intentar DELETE con query param
                        const delRes = await fetch(`/api/encargado/habitaciones/${id}/fotos?url=${encodeURIComponent(url)}`, { method: 'DELETE', headers: getAuthHeaders() });
                        if (!delRes.ok) {
                            // fallback a POST delete
                            await fetch(`/api/encargado/habitaciones/${id}/fotos/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify({ url }) });
                        }
                        // refrescar lista
                        const updatedRes = await fetch(`/api/encargado/habitaciones/${id}/fotos`, { headers: getAuthHeaders() });
                        const updated = updatedRes.ok ? await updatedRes.json() : [];
                        fotosListEl.innerHTML = (Array.isArray(updated) && updated.length) ? updated.map(f => `
                            <div class="inline-block m-2 text-center" style="width:120px">
                                <img src="${f.url || f}" class="h-24 w-full object-cover rounded border">
                                <div class="mt-1 flex justify-between">
                                    <button data-url="${f.url || f}" class="delete-foto-btn px-2 py-1 text-xs bg-red-500 text-white rounded">Eliminar</button>
                                    <a href="${f.url || f}" target="_blank" class="px-2 py-1 text-xs bg-gray-200 rounded">Abrir</a>
                                </div>
                            </div>
                        `).join('') : '<p class="text-sm">No hay fotos aún.</p>';
                    } catch (err) {
                        console.error('Error eliminando foto:', err);
                        alert('Error al eliminar la foto. Revisa la consola.');
                    }
                });
            });

            // Manejar subida de fotos
            const uploadForm = document.getElementById('upload-fotos-form');
            if (uploadForm) {
                uploadForm.addEventListener('submit', async (ev) => {
                    ev.preventDefault();
                    const fd = new FormData(uploadForm);
                    try {
                        const uploadRes = await fetch(`/api/encargado/habitaciones/${id}/fotos`, { method: 'POST', headers: getAuthHeaders(), body: fd });
                        if (!uploadRes.ok) throw new Error('Error subiendo fotos');
                        // refrescar listado
                        const updatedRes = await fetch(`/api/encargado/habitaciones/${id}/fotos`, { headers: getAuthHeaders() });
                        const updated = updatedRes.ok ? await updatedRes.json() : [];
                        fotosListEl.innerHTML = (Array.isArray(updated) && updated.length) ? updated.map(f => `
                            <div class="inline-block m-2 text-center" style="width:120px">
                                <img src="${f.url || f}" class="h-24 w-full object-cover rounded border">
                                <div class="mt-1 flex justify-between">
                                    <button data-url="${f.url || f}" class="delete-foto-btn px-2 py-1 text-xs bg-red-500 text-white rounded">Eliminar</button>
                                    <a href="${f.url || f}" target="_blank" class="px-2 py-1 text-xs bg-gray-200 rounded">Abrir</a>
                                </div>
                            </div>
                        `).join('') : '<p class="text-sm">No hay fotos aún.</p>';
                    } catch (err) {
                        console.error('Error subiendo fotos:', err);
                        alert('Error al subir fotos. Revisa la consola.');
                    }
                });
            }

        } catch (err) {
            console.error('Error al gestionar fotos:', err);
            alert('Error al abrir gestión de fotos. Revisa la consola.');
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

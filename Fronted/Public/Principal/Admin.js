// Admin.js (completo — usa fetch a /api/admin/...)
    document.addEventListener('DOMContentLoaded', () => {
        const API_BASE = '/api'; // usa mismo host/puerto del server
        const sidebarItems = document.querySelectorAll(".sidebar-item");
        const mainContentArea = document.getElementById("mainContent");
        const sectionTitle = document.getElementById("sectionTitle");
    
        // --- Funciones del Modal (igual a las tuyas) ---
        function showModal(title, contentHtml, onShow) {
            let modal = document.getElementById('dynamicModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'dynamicModal';
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                document.body.appendChild(modal);
            }
            modal.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-lg w-11/12 md:w-1/2">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold text-gray-800">${title}</h3>
                        <button id="close-modal-btn" class="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                    </div>
                    <div id="modalContent">
                        ${contentHtml}
                    </div>
                </div>
            `;
            document.getElementById('close-modal-btn').addEventListener('click', hideModal);
            if (typeof onShow === 'function') onShow();
        }
    
        function showConfirmModal(message, onConfirm) {
            const confirmHtml = `
                <p class="text-gray-700 mb-4">${message}</p>
                <div class="flex justify-end space-x-4">
                    <button id="cancel-btn" class="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400">Cancelar</button>
                    <button id="confirm-btn" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">Eliminar</button>
                </div>
            `;
            showModal('Confirmación', confirmHtml);
            document.getElementById('confirm-btn').addEventListener('click', () => {
                onConfirm();
                hideModal();
            });
            document.getElementById('cancel-btn').addEventListener('click', hideModal);
        }
    
        function hideModal() { 
            const modal = document.getElementById('dynamicModal');
            if (modal) modal.remove();
        }
    
        // --- Helpers API ---
        function getAuthHeader() {
            const token = localStorage.getItem('token');
            return token ? { 'Authorization': 'Bearer ' + token } : {};
        }
        async function apiGet(path) {
            const headers = { ...getAuthHeader() };
            const res = await fetch(`${API_BASE}${path}`, { headers });
            if (!res.ok) throw new Error(`GET ${path} -> ${res.statusText}`);
            return res.json();
        }
        async function apiPost(path, body) {
            const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
            const res = await fetch(`${API_BASE}${path}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const err = await res.json().catch(()=>({error:res.statusText}));
                throw new Error(err.error || res.statusText);
            }
            // if 201 might return json or empty; handle both
            const text = await res.text();
            try { return JSON.parse(text); } catch { return text; }
        }
        async function apiPut(path, body) {
            const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
            const res = await fetch(`${API_BASE}${path}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const err = await res.json().catch(()=>({error:res.statusText}));
                throw new Error(err.error || res.statusText);
            }
            return res.json();
        }
        async function apiDelete(path) {
            const headers = { ...getAuthHeader() };
            const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers });
            if (!res.ok && res.status !== 204) {
                const err = await res.json().catch(()=>({error:res.statusText}));
                throw new Error(err.error || res.statusText);
            }
            return true;
        }
    
        // --- Renderizado de secciones (dashboard, gestion-habitaciones, gestion-encargados, etc.) ---
        const sections = {
            'dashboard': {
                title: 'Dashboard',
                render: async () => {
                    try {
                        const metrics = await apiGet('/admin/dashboard');
                        return `
                        <div class="admin-card">
                            <h2 class="text-xl font-semibold mb-4">Resumen de Métricas</h2>
                            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div class="bg-blue-200 p-4 rounded-lg shadow-sm">
                                <h3 class="font-medium text-gray-700">Total Habitaciones</h3>
                                <p class="text-3xl font-bold text-blue-800 mt-2">${metrics.total_habitaciones}</p>
                            </div>
                            <div class="bg-green-200 p-4 rounded-lg shadow-sm">
                                <h3 class="font-medium text-gray-700">Habitaciones Disponibles</h3>
                                <p class="text-3xl font-bold text-green-800 mt-2">${metrics.habitaciones_disponibles}</p>
                            </div>
                            <div class="bg-yellow-200 p-4 rounded-lg shadow-sm">
                                <h3 class="font-medium text-gray-700">Encargados</h3>
                                <p class="text-3xl font-bold text-yellow-800 mt-2">${metrics.total_encargados}</p>
                            </div>
                            <div class="bg-indigo-200 p-4 rounded-lg shadow-sm">
                                <h3 class="font-medium text-gray-700">Ingresos Est.</h3>
                                <p class="text-3xl font-bold text-indigo-800 mt-2">$${(metrics.ingresos_est || 0).toFixed(2)}</p>
                            </div>
                            </div>
                            <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="p-4 bg-white rounded shadow">
                                <h4 class="font-semibold">Reservas</h4>
                                <p>Total: ${metrics.total_reservas} — Pendientes: ${metrics.reservas_pendientes} — Completadas: ${metrics.reservas_completadas}</p>
                            </div>
                            <div class="p-4 bg-white rounded shadow">
                                <h4 class="font-semibold">Acciones</h4>
                                <p>Puedes: crear/editar/eliminar habitaciones, asignar encargados, gestionar reservas.</p>
                            </div>
                            </div>
                        </div>
                        `;
                    } catch (err) {
                        return `<div class="admin-card"><p class="text-red-500">Error cargando métricas: ${err.message}</p></div>`;
                    }
                },
            },
    
            'gestion-habitaciones': {
                title: 'Gestión de Habitaciones',
                render: async () => {
                    try {
                        // cargar datos iniciales
                        const habitacionesRes = await apiGet('/admin/habitaciones');
                        const habitaciones = Array.isArray(habitacionesRes) ? habitacionesRes : (habitacionesRes.habitaciones || habitacionesRes.rows || []);
                        const categorias = await apiGet('/admin/categorias').catch(()=>[
                            { id_categoria:1, nombre:'Matrimonial' },
                            { id_categoria:2, nombre:'Simple' },
                            { id_categoria:3, nombre:'Doble' },
                            { id_categoria:4, nombre:'Familiar' }
                        ]);
                        const categoriasMap = new Map(categorias.map(c => [c.id_categoria, c.nombre]));

                        const rows = habitaciones.map(h => `
                        <tr class="border-b hover:bg-gray-50">
                            <td class="py-3 px-4">${h.id_habitacion || ''}</td>
                            <td class="py-3 px-4">${h.numero_habitacion}</td>
                            <td class="py-3 px-4">${categoriasMap.get(h.id_categoria) || h.categoria || 'N/A'}</td>
                            <td class="py-3 px-4">$${(h.precio_por_dia || 0).toFixed ? (h.precio_por_dia||0).toFixed(2) : (h.precio_por_dia||0)}</td>
                            <td class="py-3 px-4">${h.precio_por_hora ? `$${h.precio_por_hora}` : '-'}</td>
                            <td class="py-3 px-4">${h.piso || '-'}</td>
                            <td class="py-3 px-4">${h.capacidad || '-'}</td>
                            <td class="py-3 px-4">
                            <span class="${h.disponible ? 'status-available' : 'status-occupied'}">${h.disponible ? 'Disponible' : 'Ocupada'}</span>
                            </td>
                            <td class="py-3 px-4 flex space-x-2">
                            <button data-id="${h.id_habitacion}" class="edit-btn px-3 py-1 rounded bg-blue-600 text-white text-xs">Editar</button>
                            <button data-id="${h.id_habitacion}" class="delete-btn px-3 py-1 rounded bg-red-600 text-white text-xs">Eliminar</button>
                            </td>
                        </tr>
                        `).join('');

                        return `
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="text-xl font-semibold text-gray-700">Habitaciones</h2>
                            <div class="flex gap-2">
                            <button id="add-habitacion-btn" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Añadir Habitación</button>
                            </div>
                        </div>

                        <!-- Filtros de búsqueda: id/numero/categoria/piso/capacidad/disponibilidad -->
                        <div class="mb-4 p-4 bg-white rounded shadow flex flex-wrap gap-3 items-end">
                          <div>
                            <label class="block text-sm text-gray-600">ID / Número</label>
                            <input id="filter-q" type="text" class="mt-1 border border-gray-300 rounded p-2" placeholder="ID o número">
                          </div>
                          <div>
                            <label class="block text-sm text-gray-600">Categoría</label>
                            <input id="filter-categoria" type="text" class="mt-1 border border-gray-300 rounded p-2" placeholder="Ej. Matrimonial">
                          </div>
                          <div>
                            <label class="block text-sm text-gray-600">Piso</label>
                            <input id="filter-piso" type="number" class="mt-1 border border-gray-300 rounded p-2" placeholder="Piso">
                          </div>
                          <div>
                            <label class="block text-sm text-gray-600">Capacidad</label>
                            <input id="filter-capacidad" type="number" class="mt-1 border border-gray-300 rounded p-2" placeholder="Personas">
                          </div>
                          <div>
                            <label class="block text-sm text-gray-600">Disponibilidad</label>
                            <select id="filter-disponible" class="mt-1 border border-gray-300 rounded p-2">
                              <option value="">Todas</option>
                              <option value="true">Disponible</option>
                              <option value="false">Ocupada</option>
                            </select>
                          </div>
                          <div class="ml-auto flex gap-2">
                            <button id="btn-filtrar-habitaciones" class="bg-blue-600 text-white px-4 py-2 rounded">Buscar</button>
                            <button id="btn-limpiar-filtros-habitaciones" class="bg-gray-200 text-gray-700 px-4 py-2 rounded">Limpiar</button>
                          </div>
                        </div>

                        <div class="admin-card">
                            <div class="overflow-x-auto">
                            <table class="min-w-full bg-white rounded-lg shadow overflow-hidden">
                                <thead class="bg-gray-100">
                                <tr>
                                    <th class="py-3 px-4 text-left">ID</th>
                                    <th class="py-3 px-4 text-left">Número</th>
                                    <th class="py-3 px-4 text-left">Categoría</th>
                                    <th class="py-3 px-4 text-left">Precio/Día</th>
                                    <th class="py-3 px-4 text-left">Precio/Hora</th>
                                    <th class="py-3 px-4 text-left">Piso</th>
                                    <th class="py-3 px-4 text-left">Capacidad</th>
                                    <th class="py-3 px-4 text-left">Disponibilidad</th>
                                    <th class="py-3 px-4 text-left">Acciones</th>
                                </tr>
                                </thead>
                                <tbody id="habitaciones-tbody" class="divide-y divide-gray-200">
                                ${rows || `<tr><td colspan="9" class="text-center py-4">No hay habitaciones registradas.</td></tr>`}
                                </tbody>
                            </table>
                            </div>
                        </div>
                        `;
                    } catch (err) {
                        return `<div class="admin-card"><p class="text-red-500">Error cargando habitaciones: ${err.message}</p></div>`;
                    }
                },
                postRender: () => {
                    // Reemplaza el antiguo botón "Mostrar solo disponibles" por filtros avanzados
                    async function renderTableWithFilters() {
                        const q = document.getElementById('filter-q').value.trim();
                        const categoria = document.getElementById('filter-categoria').value.trim();
                        const piso = document.getElementById('filter-piso').value;
                        const capacidad = document.getElementById('filter-capacidad').value;
                        const disponible = document.getElementById('filter-disponible').value;

                        const params = new URLSearchParams();
                        if (q) params.append('q', q);
                        if (categoria) params.append('categoria', categoria);
                        if (piso) params.append('piso', piso);
                        if (capacidad) params.append('capacidad', capacidad);
                        if (disponible !== '') params.append('disponible', disponible);

                        try {
                            const path = '/admin/habitaciones' + (params.toString() ? `?${params.toString()}` : '');
                            const habitacionesRes = await apiGet(path);
                            const habitaciones = Array.isArray(habitacionesRes) ? habitacionesRes : (habitacionesRes.habitaciones || habitacionesRes.rows || []);
                            const tbody = document.getElementById('habitaciones-tbody');
                            if (!tbody) return;
                            const rows = habitaciones.map(h => `
                                <tr class="border-b hover:bg-gray-50">
                                    <td class="py-3 px-4">${h.id_habitacion || ''}</td>
                                    <td class="py-3 px-4">${h.numero_habitacion}</td>
                                    <td class="py-3 px-4">${h.categoria || '-'}</td>
                                    <td class="py-3 px-4">$${(h.precio_por_dia||0).toFixed ? (h.precio_por_dia||0).toFixed(2) : (h.precio_por_dia||0)}</td>
                                    <td class="py-3 px-4">${h.precio_por_hora|| '-'}</td>
                                    <td class="py-3 px-4">${h.piso || '-'}</td>
                                    <td class="py-3 px-4">${h.capacidad || '-'}</td>
                                    <td class="py-3 px-4"><span class="${h.disponible ? 'status-available' : 'status-occupied'}">${h.disponible ? 'Disponible' : 'Ocupada'}</span></td>
                                    <td class="py-3 px-4 flex space-x-2">
                                    <button data-id="${h.id_habitacion}" class="edit-btn px-3 py-1 rounded bg-blue-600 text-white text-xs">Editar</button>
                                    <button data-id="${h.id_habitacion}" class="delete-btn px-3 py-1 rounded bg-red-600 text-white text-xs">Eliminar</button>
                                    </td>
                                </tr>
                            `).join('');
                            tbody.innerHTML = rows.length ? rows : `<tr><td colspan="9" class="text-center py-4">No hay habitaciones.</td></tr>`;
                        } catch (err) {
                            showModal('Error', `<p>${err.message}</p>`);
                        }
                    }

                    // Inicializar tabla (sin filtros)
                    renderTableWithFilters();

                    const btnBuscar = document.getElementById('btn-filtrar-habitaciones');
                    if (btnBuscar) btnBuscar.addEventListener('click', renderTableWithFilters);
                    const btnLimpiar = document.getElementById('btn-limpiar-filtros-habitaciones');
                    if (btnLimpiar) btnLimpiar.addEventListener('click', () => {
                        document.getElementById('filter-q').value = '';
                        document.getElementById('filter-categoria').value = '';
                        document.getElementById('filter-piso').value = '';
                        document.getElementById('filter-capacidad').value = '';
                        document.getElementById('filter-disponible').value = '';
                        renderTableWithFilters();
                    });

                    // Nota: los botones Editar/Eliminar siguen siendo manejados por la delegación global en mainContentArea
                }
            },

            'gestion-carrusel': {
                title: 'Gestión del Carrusel',
                render: async () => {
                    try {
                        const imgsRes = await apiGet('/admin/carrusel');
                        const images = Array.isArray(imgsRes) ? imgsRes : (imgsRes.images || imgsRes.rows || []);
                        const listHtml = (images && images.length) ? images.map(img => `
                            <div class="carrusel-thumb">
                                <img src="${img.url || img}" alt="carrusel">
                                <div class="thumb-actions">
                                    <button data-id="${img.id || ''}" data-url="${img.url || img}" class="delete-carrusel-btn btn-minimal">Eliminar</button>
                                    <a href="${img.url || img}" target="_blank" class="btn-minimal">Abrir</a>
                                </div>
                            </div>
                        `).join('') : `<p class="carrusel-empty">No hay imágenes en el carrusel.</p>`;

                        return `
                        <div class="admin-card carrusel-wrap">
                            <h2 class="text-xl font-semibold mb-4">Imágenes del Carrusel</h2>
                            <div id="carrusel-list" class="carrusel-row">${listHtml}</div>

                            <form id="carrusel-upload-form" class="carrusel-upload-form" enctype="multipart/form-data">
                                <input id="carrusel-input" type="file" name="fotos" accept="image/*" multiple>
                                <button type="submit" class="submit-small">Subir imágenes</button>
                            </form>
                        </div>
                        `;
                    } catch (err) {
                        return `<div class="admin-card"><p class="text-red-500">Error cargando carrusel: ${err.message}</p></div>`;
                    }
                },
                postRender: () => {
                    // delegación para eliminar imagenes (botones dentro de .carrusel-row)
                    const listEl = document.getElementById('carrusel-list');
                    if (listEl) {
                        listEl.addEventListener('click', async (e) => {
                            const btn = e.target.closest('.delete-carrusel-btn');
                            if (!btn) return;
                            const id = btn.getAttribute('data-id');
                            const url = btn.getAttribute('data-url');
                            showConfirmModal('Eliminar imagen del carrusel?', async () => {
                                try {
                                    if (id) {
                                        await apiDelete(`/admin/carrusel/${id}`);
                                    } else {
                                        await apiPost('/admin/carrusel/delete', { url });
                                    }
                                    loadSection('gestion-carrusel');
                                    showModal('Éxito', '<p>Imagen eliminada.</p>');
                                } catch (err) {
                                    showModal('Error', `<p>${err.message}</p>`);
                                }
                            });
                        });
                    }

                    // manejo de subida mediante formulario simple
                    const uploadForm = document.getElementById('carrusel-upload-form');
                    if (uploadForm) {
                        uploadForm.addEventListener('submit', async (ev) => {
                            ev.preventDefault();
                            const input = document.getElementById('carrusel-input');
                            const files = input.files;
                            if (!files || files.length === 0) return showModal('Error', '<p>Seleccione al menos una imagen.</p>');

                            const fd = new FormData();
                            for (let i = 0; i < files.length; i++) fd.append('fotos', files[i]);

                            try {
                                const token = localStorage.getItem('token') || '';
                                const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
                                const res = await fetch('/api/admin/carrusel', { method: 'POST', body: fd, headers });
                                if (!res.ok) {
                                    const body = await res.json().catch(()=>({ error: res.statusText }));
                                    throw new Error(body.error || 'Error subiendo imágenes');
                                }
                                await res.json().catch(()=>null);
                                uploadForm.reset();
                                loadSection('gestion-carrusel');
                                showModal('Éxito', '<p>Imágenes subidas correctamente.</p>');
                            } catch (err) {
                                showModal('Error', `<p>${err.message}</p>`);
                            }
                        });
                        // evitar que el handler global procese este formulario
                        uploadForm.dataset.skipGlobal = 'true';
                    }
                }
            },

            'gestion-reservas': {
                title: 'Gestión de Reservas',
                render: async () => {
                    try {
                        // obtenemos todas las reservas (el filtrado se hace en frontend)
                        const reservasRes = await apiGet('/admin/reservas');
                        const reservas = Array.isArray(reservasRes) ? reservasRes : (reservasRes.reservas || reservasRes.rows || []);

                        // filtros: cliente / id / numero habitacion / fechas / estado
                        const html = `
                        <div class="admin-card">
                            <h2 class="text-xl font-semibold mb-4">Reservas</h2>

                            <div class="mb-4 p-3 bg-white rounded shadow flex flex-wrap gap-3 items-end">
                              <div>
                                <label class="block text-sm text-gray-600">Cliente (nombre o email)</label>
                                <input id="filter-cliente" type="text" class="mt-1 border border-gray-300 rounded p-2" placeholder="Nombre o email">
                              </div>
                              <div>
                                <label class="block text-sm text-gray-600">ID Reserva</label>
                                <input id="filter-id" type="text" class="mt-1 border border-gray-300 rounded p-2" placeholder="ID">
                              </div>
                              <div>
                                <label class="block text-sm text-gray-600">Número Habitación</label>
                                <input id="filter-numero" type="text" class="mt-1 border border-gray-300 rounded p-2" placeholder="Número">
                              </div>
                              <div>
                                <label class="block text-sm text-gray-600">Fecha Desde</label>
                                <input id="filter-fecha-desde" type="date" class="mt-1 border border-gray-300 rounded p-2">
                              </div>
                              <div>
                                <label class="block text-sm text-gray-600">Fecha Hasta</label>
                                <input id="filter-fecha-hasta" type="date" class="mt-1 border border-gray-300 rounded p-2">
                              </div>
                              <div>
                                <label class="block text-sm text-gray-600">Estado</label>
                                <select id="filter-estado" class="mt-1 border border-gray-300 rounded p-2">
                                  <option value="">Todas</option>
                                  <option value="pendiente">Pendiente</option>
                                  <option value="completada">Completada</option>
                                </select>
                              </div>
                              <div class="ml-auto flex gap-2">
                                <button id="btn-filtrar-reservas" class="bg-blue-600 text-white px-4 py-2 rounded">Buscar</button>
                                <button id="btn-limpiar-filtros-reservas" class="bg-gray-200 text-gray-700 px-4 py-2 rounded">Limpiar</button>
                              </div>
                            </div>

                            <div class="overflow-x-auto">
                            <table class="min-w-full bg-white rounded-lg shadow overflow-hidden">
                                <thead class="bg-gray-100">
                                <tr>
                                    <th class="py-3 px-4">ID</th>
                                    <th class="py-3 px-4">Cliente</th>
                                    <th class="py-3 px-4">Habitación</th>
                                    <th class="py-3 px-4">Fechas</th>
                                    <th class="py-3 px-4">Estado</th>
                                    <th class="py-3 px-4">Acciones</th>
                                </tr>
                                </thead>
                                <tbody id="reservas-tbody" class="divide-y divide-gray-200">
                                ${reservas.length ? reservas.map(r => `
                                    <tr class="border-b hover:bg-gray-50">
                                        <td class="py-3 px-4">${r.id_reserva}</td>
                                        <td class="py-3 px-4">${r.cliente_nombre} (${r.cliente_email || ''})</td>
                                        <td class="py-3 px-4">${r.numero_habitacion}</td>
                                        <td class="py-3 px-4">${new Date(r.fecha_checkin).toLocaleString()} - ${new Date(r.fecha_checkout).toLocaleString()}</td>
                                        <td class="py-3 px-4">${r.estado_reserva}</td>
                                        <td class="py-3 px-4 flex space-x-2">
                                        ${ (r.estado_reserva && String(r.estado_reserva).toLowerCase() !== 'completada') ? `
                                            <button data-id="${r.id_reserva}" class="complete-res-btn px-3 py-1 rounded bg-green-600 text-white text-xs">Completar</button>
                                            <button data-id="${r.id_reserva}" class="delete-res-btn px-3 py-1 rounded bg-red-600 text-white text-xs">Eliminar</button>
                                        ` : `
                                            <span class="text-sm text-gray-500">-</span>
                                        ` }
                                        </td>
                                    </tr>
                                `).join('') : `<tr><td colspan="6" class="text-center py-4">No hay reservas.</td></tr>`}
                                </tbody>
                            </table>
                            </div>
                        </div>
                        `;

                        return html;
                    } catch (err) {
                        return `<div class="admin-card"><p class="text-red-500">Error cargando reservas: ${err.message}</p></div>`;
                    }
                },
                postRender: () => {
                    // función para renderizar reservas aplicando filtros en frontend
                    async function renderReservationsWithFilters() {
                        try {
                            const cliente = (document.getElementById('filter-cliente') || {}).value || '';
                            const id = (document.getElementById('filter-id') || {}).value || '';
                            const numero = (document.getElementById('filter-numero') || {}).value || '';
                            const fechaDesde = (document.getElementById('filter-fecha-desde') || {}).value || '';
                            const fechaHasta = (document.getElementById('filter-fecha-hasta') || {}).value || '';
                            const estado = (document.getElementById('filter-estado') || {}).value || '';

                            const reservasRes = await apiGet('/admin/reservas');
                            let reservas = Array.isArray(reservasRes) ? reservasRes : (reservasRes.reservas || reservasRes.rows || []);

                            reservas = reservas.filter(r => {
                                if (cliente) {
                                    const c = (r.cliente_nombre || '') + ' ' + (r.cliente_email||'');
                                    if (!c.toLowerCase().includes(cliente.toLowerCase())) return false;
                                }
                                if (id) {
                                    if (!String(r.id_reserva).includes(id)) return false;
                                }
                                if (numero) {
                                    if (!String(r.numero_habitacion).toLowerCase().includes(numero.toLowerCase())) return false;
                                }
                                if (estado) {
                                    if (!r.estado_reserva || String(r.estado_reserva).toLowerCase() !== estado.toLowerCase()) return false;
                                }
                                if (fechaDesde) {
                                    const from = new Date(fechaDesde);
                                    const checkin = new Date(r.fecha_checkin);
                                    if (isNaN(from.getTime()) || isNaN(checkin.getTime())) return false;
                                    if (checkin < from) return false;
                                }
                                if (fechaHasta) {
                                    const to = new Date(fechaHasta);
                                    const checkout = new Date(r.fecha_checkout);
                                    if (isNaN(to.getTime()) || isNaN(checkout.getTime())) return false;
                                    if (checkout > to) return false;
                                }
                                return true;
                            });

                            const tbody = document.getElementById('reservas-tbody');
                            if (!tbody) return;

                            const rows = reservas.map(r => `
                                <tr class="border-b hover:bg-gray-50">
                                    <td class="py-3 px-4">${r.id_reserva}</td>
                                    <td class="py-3 px-4">${r.cliente_nombre} (${r.cliente_email || ''})</td>
                                    <td class="py-3 px-4">${r.numero_habitacion}</td>
                                    <td class="py-3 px-4">${new Date(r.fecha_checkin).toLocaleString()} - ${new Date(r.fecha_checkout).toLocaleString()}</td>
                                    <td class="py-3 px-4">${r.estado_reserva}</td>
                                    <td class="py-3 px-4 flex space-x-2">
                                    ${ (r.estado_reserva && String(r.estado_reserva).toLowerCase() !== 'completada') ? `
                                        <button data-id="${r.id_reserva}" class="complete-res-btn px-3 py-1 rounded bg-green-600 text-white text-xs">Completar</button>
                                        <button data-id="${r.id_reserva}" class="delete-res-btn px-3 py-1 rounded bg-red-600 text-white text-xs">Eliminar</button>
                                    ` : `
                                        <span class="text-sm text-gray-500">-</span>
                                    ` }
                                    </td>
                                </tr>
                            `).join('');

                            tbody.innerHTML = rows.length ? rows : `<tr><td colspan="6" class="text-center py-4">No hay reservas.</td></tr>`;
                        } catch (err) {
                            showModal('Error', `<p>${err.message}</p>`);
                        }
                    }

                    // inicializar
                    renderReservationsWithFilters();

                    const btnBuscar = document.getElementById('btn-filtrar-reservas');
                    if (btnBuscar) btnBuscar.addEventListener('click', renderReservationsWithFilters);
                    const btnLimpiar = document.getElementById('btn-limpiar-filtros-reservas');
                    if (btnLimpiar) btnLimpiar.addEventListener('click', () => {
                        document.getElementById('filter-cliente').value = '';
                        document.getElementById('filter-id').value = '';
                        document.getElementById('filter-numero').value = '';
                        document.getElementById('filter-fecha-desde').value = '';
                        document.getElementById('filter-fecha-hasta').value = '';
                        document.getElementById('filter-estado').value = '';
                        renderReservationsWithFilters();
                    });

                    // los botones completar/eliminar seguirán siendo manejados por la delegación global en mainContentArea
                }
            },
    
            'gestion-encargados': {
                title: 'Gestión de Encargados',
                render: async () => {
                    try {
                        const encargadosRes = await apiGet('/admin/encargados');
                        const encargados = Array.isArray(encargadosRes) ? encargadosRes : (encargadosRes.encargados || encargadosRes.rows || []);
                        const rows = encargados.map(e => `
                        <tr class="border-b hover:bg-gray-50">
                            <td class="py-3 px-4">${e.id}</td>
                            <td class="py-3 px-4">${e.nombre}</td>
                            <td class="py-3 px-4">${e.email}</td>
                            <td class="py-3 px-4">${e.rol}</td>
                            <td class="py-3 px-4 flex space-x-2">
                            <button data-id="${e.id}" class="edit-enc-btn px-3 py-1 rounded bg-blue-600 text-white text-xs">Editar</button>
                            <button data-id="${e.id}" class="delete-enc-btn px-3 py-1 rounded bg-red-600 text-white text-xs">Eliminar</button>
                            </td>
                        </tr>
                        `).join('');
    
                        return `
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="text-xl font-semibold text-gray-700">Encargados</h2>
                            <div class="flex gap-2">
                            <button id="add-encargado-btn" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Añadir Encargado</button>
                            <button id="assign-encargado-btn" class="bg-gray-200 text-gray-700 px-4 py-2 rounded">Asignar por email</button>
                            </div>
                        </div>
    
                        <div class="admin-card">
                            <div class="overflow-x-auto">
                            <table class="min-w-full bg-white rounded-lg shadow overflow-hidden">
                                <thead class="bg-gray-100">
                                <tr>
                                    <th class="py-3 px-4">ID</th>
                                    <th class="py-3 px-4">Nombre</th>
                                    <th class="py-3 px-4">Email</th>
                                    <th class="py-3 px-4">Rol</th>
                                    <th class="py-3 px-4">Acciones</th>
                                </tr>
                                </thead>
                                <tbody id="encargados-tbody" class="divide-y divide-gray-200">
                                ${rows || `<tr><td colspan="5" class="text-center py-4">No hay encargados registrados.</td></tr>`}
                                </tbody>
                            </table>
                            </div>
                        </div>
                        `;
                    } catch (err) {
                        return `<div class="admin-card"><p class="text-red-500">Error cargando encargados: ${err.message}</p></div>`;
                    }
                },
                postRender: () => {
                    // assign-encargado-btn opens modal to assign existing user by email
                    const assignBtn = document.getElementById('assign-encargado-btn');
                    if (assignBtn) {
                        assignBtn.addEventListener('click', () => {
                            const formHtml = `
                            <form id="assign-enc-form" class="space-y-4">
                                <div>
                                <label class="block text-sm font-medium text-gray-700">Email del usuario</label>
                                <input type="email" name="email" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="usuario@ejemplo.com">
                                </div>
                                <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg">Asignar como Encargado</button>
                            </form>
                            `;
                            showModal('Asignar Encargado por Email', formHtml);
                            document.getElementById('assign-enc-form').addEventListener('submit', async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                const email = formData.get('email');
                                try {
                                    const res = await apiPost('/admin/assign-encargado', { email });
                                    hideModal();
                                    showModal('Éxito', `<p>${res.message}</p>`);
                                    // reload encargados view
                                    loadSection('gestion-encargados');
                                } catch (err) {
                                    showModal('Error', `<p>${err.message}</p>`);
                                }
                            });
                        });
                    }
                }
            },
    
            'salir': {
                title: 'Cerrando Sesión',
                render: () => `<p class="text-center text-gray-600">Cerrando sesión...</p>`,
                postRender: () => {
                    localStorage.removeItem('user');
                    localStorage.removeItem('loggedIn');
                    setTimeout(() => window.location.href = 'index.html', 800);
                }
            }
        };
    
        // --- CARGAR SECCIÓN ---
        async function loadSection(sectionName) {
            const sectionData = sections[sectionName];
            if (!sectionData) return;
            sectionTitle.textContent = sectionData.title;
            mainContentArea.innerHTML = `<p class="text-center text-gray-500">Cargando...</p>`;
            try {
                if (sectionData.render) {
                    const html = await sectionData.render();
                    mainContentArea.innerHTML = html;
                }
                if (sectionData.postRender) {
                    sectionData.postRender();
                }
            } catch (err) {
                mainContentArea.innerHTML = `<p class="text-red-500">Error: ${err.message}</p>`;
            }
        }
    
        // sidebar click handler
        sidebarItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                sidebarItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                const sectionId = item.getAttribute('data-section');
                loadSection(sectionId);
            });
        });
    
        // Delegación de eventos para tablas y formularios dentro de mainContentArea
        mainContentArea.addEventListener('click', async (e) => {
            const target = e.target;
    
        // Añadir habitación (abre modal)
        if (target && target.id === 'add-habitacion-btn') {
            try {
                const categorias = await apiGet('/admin/categorias').catch(() => [
                    { id_categoria: 1, nombre: 'Matrimonial' },
                    { id_categoria: 2, nombre: 'Simple' },
                    { id_categoria: 3, nombre: 'Doble' },
                    { id_categoria: 4, nombre: 'Familiar' }
                ]);
                const options = categorias.map(c => `<option value="${c.id_categoria}">${c.nombre}</option>`).join('');
                const formHtml = `
                <form id="habitacion-form" class="space-y-4" enctype="multipart/form-data">
                    <div>
                    <label class="block text-sm font-medium text-gray-700">Número de Habitación</label>
                    <input name="numero_habitacion" required class="mt-1 block w-full border border-gray-300 rounded p-2">
                    </div>
                    <div>
                    <label class="block text-sm font-medium text-gray-700">Categoría</label>
                    <select name="id_categoria" class="mt-1 block w-full border border-gray-300 rounded p-2">${options}</select>
                    </div>
                    <div>
                    <label class="block text-sm font-medium text-gray-700">Tipo</label>
                    <input name="tipo" placeholder="Ej. Matrimonial" class="mt-1 block w-full border border-gray-300 rounded p-2">
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Precio por Día (USD)</label>
                        <input type="number" step="0.01" name="precio_por_dia" class="mt-1 block w-full border border-gray-300 rounded p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Precio por Hora (USD)</label>
                        <input type="number" step="0.01" name="precio_por_hora" class="mt-1 block w-full border border-gray-300 rounded p-2">
                    </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Piso</label>
                        <input type="number" name="piso" class="mt-1 block w-full border border-gray-300 rounded p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Capacidad (personas)</label>
                        <input type="number" name="capacidad" class="mt-1 block w-full border border-gray-300 rounded p-2">
                    </div>
                    </div>
                    <div>
                    <label class="block text-sm font-medium text-gray-700">Fotos de referencia</label>
                    <input type="file" name="fotos" accept="image/*" multiple class="mt-1 block w-full border border-gray-300 rounded p-2">
                    <div id="preview-fotos" class="flex flex-wrap mt-2"></div>
                    </div>
                    <div>
                    <label class="inline-flex items-center">
                        <input type="checkbox" name="disponible" checked class="form-checkbox">
                        <span class="ml-2">Disponible</span>
                    </label>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded">Guardar</button>
                </form>
                `;
                showModal('Añadir Habitación', formHtml, () => {
                    const form = document.getElementById('habitacion-form');
                    form.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const formData = new FormData(form); // incluye archivo

                        try {
                            const token = localStorage.getItem('token') || '';
                            const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
                            const res = await fetch('/api/admin/habitaciones', {
                                method: 'POST',
                                body: formData,
                                headers
                            });
                            if (!res.ok) {
                                // intentar extraer un mensaje de error más descriptivo del body
                                let errMsg = res.statusText || 'Error al crear habitación';
                                try {
                                    const body = await res.json();
                                    errMsg = body.error || body.message || body.detalle || JSON.stringify(body) || errMsg;
                                } catch (e) {
                                    try { const txt = await res.text(); if (txt) errMsg = txt; } catch (__){}
                                }
                                throw new Error(errMsg);
                            }
                            await res.json();

                            loadSection('gestion-habitaciones');
                            hideModal();
                            showModal('Éxito', '<p>Habitación creada con éxito.</p>');
                        } catch (err) {
                            showModal('Error', `<p>${err.message}</p>`);
                        }
                    });
                    // Indicar al handler global que NO reprocesE este formulario (evita doble envío)
                    form.dataset.skipGlobal = 'true';
                });
            } catch (err) {
                showModal('Error', `<p>${err.message}</p>`);
            }
            return;
        }

        // Editar habitación
        if (target && target.classList.contains('edit-btn') && target.closest('#mainContent')) {
            const id = target.getAttribute('data-id');
            try {
                const habitaciones = await apiGet('/admin/habitaciones');
                const habitacion = habitaciones.find(h => String(h.id_habitacion) === String(id));
                if (!habitacion) throw new Error('Habitación no encontrada');
                const categorias = await apiGet('/admin/categorias').catch(() => []);
                const options = (categorias.length ? categorias.map(c => `<option value="${c.id_categoria}" ${c.id_categoria === habitacion.id_categoria ? 'selected' : ''}>${c.nombre}</option>`).join('') : `<option value="${habitacion.id_categoria}">${habitacion.categoria || 'N/A'}</option>`);
                const formHtml = `
                <form id="habitacion-form" class="space-y-4" enctype="multipart/form-data">
                    <input type="hidden" name="id_habitacion" value="${habitacion.id_habitacion}">
                    <div>
                    <label class="block text-sm font-medium text-gray-700">Número de Habitación</label>
                    <input name="numero_habitacion" value="${habitacion.numero_habitacion || ''}" required class="mt-1 block w-full border border-gray-300 rounded p-2">
                    </div>
                    <div>
                    <label class="block text-sm font-medium text-gray-700">Categoría</label>
                    <select name="id_categoria" class="mt-1 block w-full border border-gray-300 rounded p-2">${options}</select>
                    </div>
                    <div>
                    <label class="block text-sm font-medium text-gray-700">Tipo</label>
                    <input name="tipo" value="${habitacion.tipo || ''}" class="mt-1 block w-full border border-gray-300 rounded p-2">
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Precio por Día (USD)</label>
                        <input type="number" step="0.01" name="precio_por_dia" value="${habitacion.precio_por_dia || ''}" class="mt-1 block w-full border border-gray-300 rounded p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Precio por Hora (USD)</label>
                        <input type="number" step="0.01" name="precio_por_hora" value="${habitacion.precio_por_hora || ''}" class="mt-1 block w-full border border-gray-300 rounded p-2">
                    </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Piso</label>
                        <input type="number" name="piso" value="${habitacion.piso || ''}" class="mt-1 block w-full border border-gray-300 rounded p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Capacidad (personas)</label>
                        <input type="number" name="capacidad" value="${habitacion.capacidad || ''}" class="mt-1 block w-full border border-gray-300 rounded p-2">
                    </div>
                    </div>
                    <div>
                    <label class="block text-sm font-medium text-gray-700">Foto de referencia</label>
                    <input type="file" name="fotos" accept="image/*" multiple class="mt-1 block w-full border border-gray-300 rounded p-2">
                    ${habitacion.fotos && habitacion.fotos.length > 0 
                        ? habitacion.fotos.map(f => `<img src="${f}" class="h-16 inline-block m-1 rounded">`).join("")
                        : '<p class="text-xs mt-1">Sin fotos</p>'
                    }
                    </div>
                    <div>
                    <label class="inline-flex items-center">
                        <input type="checkbox" name="disponible" ${habitacion.disponible ? 'checked' : ''} class="form-checkbox">
                        <span class="ml-2">Disponible</span>
                    </label>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded">Actualizar</button>
                </form>
                `;
                showModal('Editar Habitación', formHtml, () => {
                    const form = document.getElementById('habitacion-form');
                    form.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const formData = new FormData(form); // incluye archivo si se selecciona

                        try {
                            const token = localStorage.getItem('token') || '';
                            const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
                            const res = await fetch(`/api/admin/habitaciones/${habitacion.id_habitacion}`, {
                                method: 'PUT',
                                body: formData,
                                headers
                            });
                            if (!res.ok) {
                                let errMsg = res.statusText || 'Error al actualizar habitación';
                                try {
                                    const body = await res.json();
                                    errMsg = body.error || body.message || body.detalle || JSON.stringify(body) || errMsg;
                                } catch (e) {
                                    try { const txt = await res.text(); if (txt) errMsg = txt; } catch (__){}
                                }
                                throw new Error(errMsg);
                            }
                            await res.json();

                            loadSection('gestion-habitaciones');
                            hideModal();
                            showModal('Éxito', '<p>Habitación actualizada con éxito.</p>');
                        } catch (err) {
                            showModal('Error', `<p>${err.message}</p>`);
                        }
                    });
                    // Evitar doble envío por el handler global
                    form.dataset.skipGlobal = 'true';
                });
            } catch (err) {
                showModal('Error', `<p>${err.message}</p>`);
            }
            return;
        }

        // Eliminar habitación
        if (target && target.classList.contains('delete-btn')) {
            const id = target.getAttribute('data-id');
            showConfirmModal('¿Estás seguro de eliminar esta habitación?', async () => {
                try {
                    await apiDelete(`/admin/habitaciones/${id}`);
                    loadSection('gestion-habitaciones');
                    hideModal();
                    showModal('Éxito', `<p>Habitación eliminada.</p>`);
                } catch (err) {
                    showModal('Error', `<p>${err.message}</p>`);
                }
            });
            return;
        }

            // Añadir encargado (crear nuevo usuario con rol encargado)
            if (target && target.id === 'add-encargado-btn') {
                const formHtml = `
                <form id="create-enc-form" class="space-y-4">
                    <div>
                    <label class="block text-sm font-medium text-gray-700">Nombre</label>
                    <input name="nombre" required class="mt-1 block w-full border border-gray-300 rounded p-2">
                    </div>
                    <div>
                    <label class="block text-sm font-medium text-gray-700">Email</label>
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded">Crear Encargado</button>
                </form>
                `;
                showModal('Crear Encargado', formHtml);
    
                document.getElementById('create-enc-form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.target);
                    const body = {
                        nombre: fd.get('nombre'),
                        email: fd.get('email'),
                        password: fd.get('password')
                    };
                    try {
                        await apiPost('/admin/encargados', body);
                        hideModal();
                        showModal('Éxito', `<p>Encargado creado correctamente.</p>`);
                        loadSection('gestion-encargados');
                    } catch (err) {
                        showModal('Error', `<p>${err.message}</p>`);
                    }
                });
                return;
            }
    
            // Editar encargado (nota: aquí abrimos modal con datos y permitimos cambiar nombre/email; cambio de contraseña opcional)
            if (target && target.classList.contains('edit-enc-btn')) {
                const id = target.getAttribute('data-id');
                try {
                    // obtener lista y encontrar
                    const encargados = await apiGet('/admin/encargados');
                    const enc = encargados.find(x => String(x.id) === String(id));
                    if (!enc) throw new Error('Encargado no encontrado');
                    const formHtml = `
                    <form id="edit-enc-form" class="space-y-4">
                        <input type="hidden" name="id" value="${enc.id}">
                        <div>
                        <label class="block text-sm font-medium text-gray-700">Nombre</label>
                        <input name="nombre" value="${enc.nombre}" required class="mt-1 block w-full border border-gray-300 rounded p-2">
                        </div>
                        <div>
                        <label class="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" name="email" value="${enc.email}" required class="mt-1 block w-full border border-gray-300 rounded p-2">
                        </div>
                        <div>
                        <label class="block text-sm font-medium text-gray-700">Nueva contraseña (opcional)</label>
                        <input type="password" name="password" class="mt-1 block w-full border border-gray-300 rounded p-2">
                        </div>
                        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded">Actualizar</button>
                    </form>
                    `;
                    showModal('Editar Encargado', formHtml);
    
                    document.getElementById('edit-enc-form').addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        const body = {
                            nombre: fd.get('nombre'),
                            email: fd.get('email'),
                            password: fd.get('password') || undefined
                        };
                        try {
                            // No existe endpoint PUT /admin/encargados/:id en original; lo añadimos a server.js si quieres.
                            // Mientras tanto, para no romper, hacemos un enfoque: crear endpoint en server para PUT.
                            await apiPut(`/admin/encargados/${enc.id}`, body);
                            hideModal();
                            showModal('Éxito', `<p>Encargado actualizado.</p>`);
                            loadSection('gestion-encargados');
                        } catch (err) {
                            showModal('Error', `<p>${err.message}</p>`);
                        }
                    });
    
                } catch (err) {
                    showModal('Error', `<p>${err.message}</p>`);
                }
                return;
            }
    
            // Eliminar encargado
            if (target && target.classList.contains('delete-enc-btn')) {
                const id = target.getAttribute('data-id');
                showConfirmModal('¿Eliminar encargado? Esta acción no se puede deshacer.', async () => {
                    try {
                        // again we assume DELETE /admin/encargados/:id implemented in server
                        await apiDelete(`/admin/encargados/${id}`);
                        showModal('Éxito', `<p>Encargado eliminado.</p>`);
                        loadSection('gestion-encargados');
                    } catch (err) {
                        showModal('Error', `<p>${err.message}</p>`);
                    }
                });
                return;
            }
    
            // Gestion reservas: completar o eliminar
            if (target && target.classList.contains('complete-res-btn')) {
                const id = target.getAttribute('data-id');
                try {
                    await apiPut(`/admin/reservas/${id}/completar`, {});
                    showModal('Éxito', `<p>Reserva marcada como completada.</p>`);
                    loadSection('gestion-reservas');
                } catch (err) {
                    showModal('Error', `<p>${err.message}</p>`);
                }
                return;
            }
            if (target && target.classList.contains('delete-res-btn')) {
                const id = target.getAttribute('data-id');
                showConfirmModal('¿Eliminar reserva?', async () => {
                    try {
                        await apiDelete(`/admin/reservas/${id}`);
                        showModal('Éxito', `<p>Reserva eliminada.</p>`);
                        loadSection('gestion-reservas');
                    } catch (err) {
                        showModal('Error', `<p>${err.message}</p>`);
                    }
                });
                return;
            }
        });
    
        // Delegación de submit de formularios creados en modales (habitaciones y encargados)
        document.body.addEventListener('submit', async (e) => {
            const form = e.target;
            if (form && form.id === 'habitacion-form') {
                // Si el formulario fue manejado por el onShow (listener inline), no volver a enviarlo
                if (form.dataset && form.dataset.skipGlobal === 'true') return;
                e.preventDefault();
                // Si el formulario contiene input[type=file], enviamos FormData (multipart) y evitamos doble envío
                const fileInput = form.querySelector('input[type="file"]');
                if (fileInput) {
                    // Envío multipart con archivos
                    const fd = new FormData(form);
                    const id = fd.get('id_habitacion') || fd.get('id');
                    try {
                        const url = id ? `/api/admin/habitaciones/${id}` : '/api/admin/habitaciones';
                        const method = id ? 'PUT' : 'POST';
                        const token = localStorage.getItem('token') || '';
                        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
                        const res = await fetch(url, { method, body: fd, headers });
                        if (!res.ok) {
                            const err = await res.json().catch(()=>({ error: res.statusText }));
                            throw new Error(err.error || res.statusText);
                        }
                        hideModal();
                        showModal('Éxito', `<p>Habitación ${id ? 'actualizada' : 'creada'} correctamente.</p>`);
                        loadSection('gestion-habitaciones');
                    } catch (err) {
                        showModal('Error', `<p>${err.message}</p>`);
                    }
                    return; // importante: no continuar para evitar otro envío
                }

                // Si no hay archivos, enviamos JSON usando los helpers existentes
                const fd = new FormData(form);
                const payload = {
                    numero_habitacion: fd.get('numero_habitacion'),
                    id_categoria: parseInt(fd.get('id_categoria'), 10) || null,
                    tipo: fd.get('tipo') || null,
                    precio_por_hora: fd.get('precio_por_hora') ? parseFloat(fd.get('precio_por_hora')) : null,
                    precio_por_dia: fd.get('precio_por_dia') ? parseFloat(fd.get('precio_por_dia')) : null,
                    piso: fd.get('piso') ? parseInt(fd.get('piso'), 10) : null,
                    capacidad: fd.get('capacidad') ? parseInt(fd.get('capacidad'), 10) : null,
                    disponible: fd.get('disponible') === 'on' || fd.get('disponible') === 'true'
                };

                const id = fd.get('id_habitacion') || fd.get('id');
                try {
                    if (id) {
                        await apiPut(`/admin/habitaciones/${id}`, payload);
                        hideModal();
                        showModal('Éxito', `<p>Habitación actualizada.</p>`);
                    } else {
                        await apiPost('/admin/habitaciones', payload);
                        hideModal();
                        showModal('Éxito', `<p>Habitación creada.</p>`);
                    }
                    loadSection('gestion-habitaciones');
                } catch (err) {
                    showModal('Error', `<p>${err.message}</p>`);
                }
            }

            // crear encargado via modal (create-enc-form)
            if (form && form.id === 'create-enc-form') {
                // handled previously inline; this is a fallback
                e.preventDefault();
            }
        });
    
        // Cargar sección por defecto
        loadSection('dashboard');
    });


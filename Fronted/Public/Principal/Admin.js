// Admin.js (completo — usa fetch a /api/admin/...)
    document.addEventListener('DOMContentLoaded', () => {
        const API_BASE = '/api'; // usa mismo host/puerto del server
        const sidebarItems = document.querySelectorAll(".sidebar-item");
        const mainContentArea = document.getElementById("mainContent");
        const sectionTitle = document.getElementById("sectionTitle");
        
        // ============ CONTROL DE ACCESO POR ROL ============
        let usuarioActual = null;
        let rolUsuario = null;

        // Función para verificar sesión y obtener rol
        function verificarSesionYRol() {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            
            if (!token || !user) {
                // No hay sesión, redirigir al login
                window.location.href = 'index.html';
                return false;
            }
            
            try {
                usuarioActual = JSON.parse(user);
                rolUsuario = usuarioActual.rol;
                
                // Verificar que el rol sea admin o encargado
                if (rolUsuario !== 'admin' && rolUsuario !== 'encargado') {
                    alert('Acceso denegado. No tienes permisos para acceder a este panel.');
                    window.location.href = 'index.html';
                    return false;
                }
                
                return true;
            } catch (error) {
                console.error('Error al verificar sesión:', error);
                window.location.href = 'index.html';
                return false;
            }
        }

        // Configuración de permisos por rol
        const PERMISOS = {
            admin: [
                'dashboard',
                'configuracion-hotel',
                'gestion-habitaciones',
                'gestion-carrusel',
                'gestion-reservas',
                'gestion-reclamos',
                'gestion-encargados',
                'salir'
            ],
            encargado: [
                'gestion-habitaciones',
                'gestion-carrusel',
                'gestion-reservas',
                'gestion-reclamos',
                'salir'
            ]
        };

        // Función para verificar si el usuario tiene permiso para una sección
        function tienePermiso(seccion) {
            if (!rolUsuario) return false;
            return PERMISOS[rolUsuario].includes(seccion);
        }

        // Función para ocultar/mostrar secciones del sidebar según el rol
        function aplicarControlDeAcceso() {
            sidebarItems.forEach(item => {
                const seccion = item.getAttribute('data-section');
                
                if (!tienePermiso(seccion)) {
                    // Ocultar la sección no permitida
                    item.style.display = 'none';
                } else {
                    // Mostrar la sección permitida
                    item.style.display = 'flex';
                }
            });

            // Determinar la sección inicial según el rol
            let seccionInicial = 'dashboard';
            if (rolUsuario === 'encargado') {
                seccionInicial = 'gestion-habitaciones'; // Primera sección visible para encargados
            }
            
            // Cargar la sección inicial
            loadSection(seccionInicial);
            
            // Activar el elemento del sidebar correspondiente
            sidebarItems.forEach(item => {
                if (item.getAttribute('data-section') === seccionInicial) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }

        // Verificar sesión al cargar la página
        if (!verificarSesionYRol()) {
            return; // Detener la ejecución si no hay sesión válida
        }

        // NO aplicar control de acceso aquí todavía - se hace después de definir loadSection

        // ============ FIN CONTROL DE ACCESO ============

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
                        window.currentMetrics = metrics;
                        return `
                        <div class="space-y-8">
                            <!-- 1. Resumen Financiero y de Ocupación (Métricas Clave Hoy) -->
                            <div class="admin-card">
                                <div class="flex justify-between items-center mb-4">
                                    <h2 class="text-xl font-semibold">Resumen Financiero y de Ocupación (Métricas Clave Hoy)</h2>
                                    <button class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Exportar a Hojas de cálculo</button>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div class="bg-blue-200 p-4 rounded-lg shadow-sm">
                                        <h3 class="font-medium text-gray-700">Ingresos Netos del Día</h3>
                                        <p class="text-3xl font-bold text-blue-800 mt-2">$${(metrics.ingresos_netos_dia || 0).toFixed(2)}</p>
                                        <p class="text-sm text-gray-600">Ganancia total por check-ins, check-outs y servicios adicionales facturados hoy.</p>
                                    </div>
                                    <div class="bg-green-200 p-4 rounded-lg shadow-sm">
                                        <h3 class="font-medium text-gray-700">N° de Check-ins Hoy</h3>
                                        <p class="text-3xl font-bold text-green-800 mt-2">${metrics.checkins_hoy || 0}</p>
                                        <p class="text-sm text-gray-600">Cantidad de reservas que ingresan hoy. Mide la actividad de llegada.</p>
                                    </div>
                                    <div class="bg-yellow-200 p-4 rounded-lg shadow-sm">
                                        <h3 class="font-medium text-gray-700">Tasa de Ocupación Actual</h3>
                                        <p class="text-3xl font-bold text-yellow-800 mt-2">${((metrics.tasa_ocupacion_actual || 0) * 100).toFixed(1)}%</p>
                                        <p class="text-sm text-gray-600">Porcentaje de habitaciones ocupadas en este momento. Métrica vital de rendimiento del activo.</p>
                                    </div>
                                    <div class="bg-indigo-200 p-4 rounded-lg shadow-sm">
                                        <h3 class="font-medium text-gray-700">ADR (Tarifa Diaria Promedio)</h3>
                                        <p class="text-3xl font-bold text-indigo-800 mt-2">$${(metrics.adr_hoy || 0).toFixed(2)}</p>
                                        <p class="text-sm text-gray-600">Ingreso promedio por habitación ocupada hoy. Mide la efectividad de la política de precios.</p>
                                    </div>
                                    <div class="bg-purple-200 p-4 rounded-lg shadow-sm">
                                        <h3 class="font-medium text-gray-700">Valor Pendiente Reservas (Futuras)</h3>
                                        <p class="text-3xl font-bold text-purple-800 mt-2">$${(metrics.valor_pendiente_futuras || 0).toFixed(2)}</p>
                                        <p class="text-sm text-gray-600">Suma de dinero esperado por las reservas futuras ya confirmadas (potenciales ingresos).</p>
                                    </div>
                                    <div class="bg-red-200 p-4 rounded-lg shadow-sm">
                                        <h3 class="font-medium text-gray-700">Habitaciones Disponibles</h3>
                                        <p class="text-3xl font-bold text-red-800 mt-2">${metrics.habitaciones_disponibles || 0}</p>
                                        <p class="text-sm text-gray-600">Número de habitaciones listas para reservar/ocupar. (Quizás también "Libres/Ocupadas/Limpieza").</p>
                                    </div>
                                </div>
                            </div>

                            <!-- 3. Gestión de Clientes y Recursos -->
                            <div class="admin-card">
                                <div class="flex justify-between items-center mb-4">
                                    <h2 class="text-xl font-semibold">Gestión de Clientes y Recursos</h2>
                                    <button class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Exportar a Hojas de cálculo</button>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div class="p-4 bg-white rounded shadow">
                                        <h4 class="font-semibold">Huéspedes del Período</h4>
                                        <ul class="text-sm space-y-1">
                                            <li>Total de Huéspedes Registrados: ${metrics.total_huespedes || 0}</li>
                                            <li>Nuevos Huéspedes (Mes): ${metrics.nuevos_huespedes_mes || 0}</li>
                                            <li>Huéspedes Recurrentes (Mes): ${metrics.huespedes_recurrentes_mes || 0}</li>
                                        </ul>
                                    </div>
                                    <div class="p-4 bg-white rounded shadow">
                                        <h4 class="font-semibold">Comportamiento del Huésped</h4>
                                        <ul class="text-sm space-y-1">
                                            <li>Estadía Promedio (Días): ${metrics.estadia_promedio || 0} días</li>
                                            <li>Gasto Promedio por Estadía: $${(metrics.gasto_promedio_estadia || 0).toFixed(2)}</li>
                                            <li>Tasa de Retención de Huéspedes: ${(metrics.tasa_retencion || 0).toFixed(1)}%</li>
                                        </ul>
                                    </div>
                                    <div class="p-4 bg-white rounded shadow md:col-span-2">
                                        <h4 class="font-semibold">Rendimiento por Categoría de Habitación</h4>
                                        <p class="text-sm text-gray-600">Compara la ocupación y el ADR entre las categorías de habitaciones (Ej: Simple vs. Doble vs. Matrimonial vs. Suite).</p>
                                        <!-- Placeholder for table -->
                                        <div class="mt-4 overflow-x-auto">
                                            <table class="min-w-full bg-gray-50 rounded">
                                                <thead>
                                                    <tr>
                                                        <th class="py-2 px-4 text-left">Categoría</th>
                                                        <th class="py-2 px-4 text-left">Ocupación (%)</th>
                                                        <th class="py-2 px-4 text-left">ADR ($)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td class="py-2 px-4">Matrimonial</td>
                                                        <td class="py-2 px-4">${metrics.ocupacion_matrimonial || 0}%</td>
                                                        <td class="py-2 px-4">$${(metrics.adr_matrimonial || 0).toFixed(2)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td class="py-2 px-4">Estándar</td>
                                                        <td class="py-2 px-4">${metrics.ocupacion_estandar || 0}%</td>
                                                        <td class="py-2 px-4">$${(metrics.adr_estandar || 0).toFixed(2)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td class="py-2 px-4">Deluxe</td>
                                                        <td class="py-2 px-4">${metrics.ocupacion_deluxe || 0}%</td>
                                                        <td class="py-2 px-4">$${(metrics.adr_deluxe || 0).toFixed(2)}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 4. Alertas y Tareas Críticas (Para una Acción Rápida) -->
                            <div class="admin-card">
                                <div class="flex justify-between items-center mb-4">
                                    <h2 class="text-xl font-semibold">Alertas y Tareas Críticas (Para una Acción Rápida)</h2>
                                    <button class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Exportar a Hojas de cálculo</button>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div class="p-4 bg-white rounded shadow">
                                        <h4 class="font-semibold">Quejas de Huéspedes Pendientes</h4>
                                        <p class="text-2xl font-bold text-red-600">${metrics.quejas_pendientes || 0}</p>
                                        <p class="text-sm text-gray-600">N° de quejas activas/sin resolver. Alerta sobre la reputación y la satisfacción del cliente.</p>
                                    </div>
                                    <div class="p-4 bg-white rounded shadow">
                                        <h4 class="font-semibold">Alertas de Gestión y Ocupación</h4>
                                        <ul class="text-sm space-y-1">
                                            <li>Ocupación Baja (Próximos 7 días): ${metrics.ocupacion_baja_7dias || 0}% - Considerar promociones.</li>
                                            <li>Habitaciones para Revisar (Limpieza/Mantenimiento): ${metrics.habitaciones_revisar || 0}</li>
                                            <li>Vencimiento de Contratos (Encargados): Revisar [Nombre Encargado].</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                        `;
                    } catch (err) {
                        return `<div class="admin-card"><p class="text-red-500">Error cargando métricas: ${err.message}</p></div>`;
                    }
                },
                postRender: () => {
                    if (window.currentMetrics) {
                        const metrics = window.currentMetrics;

                        // Ingresos Mensuales
                        const ingresosCanvas = document.getElementById('chart-ingresos-mensuales');
                        if (ingresosCanvas && metrics.chart_ingresos_mensuales && metrics.chart_ingresos_mensuales.rows) {
                            const ctx = ingresosCanvas.getContext('2d');
                            const data = metrics.chart_ingresos_mensuales.rows;
                            new Chart(ctx, {
                                type: 'bar',
                                data: {
                                    labels: data.map(row => row.month),
                                    datasets: [{
                                        label: 'Ingresos',
                                        data: data.map(row => row.revenue),
                                        backgroundColor: 'rgba(139, 69, 19, 0.5)',
                                    }, {
                                        label: 'Meta',
                                        data: data.map(row => row.target),
                                        backgroundColor: 'rgba(218, 165, 32, 0.5)',
                                    }]
                                }
                            });
                        }

                        // Distribución de Pagos
                        const pagosCanvas = document.getElementById('chart-distribucion-pagos');
                        if (pagosCanvas && metrics.chart_distribucion_ingresos && metrics.chart_distribucion_ingresos.rows) {
                            const ctx = pagosCanvas.getContext('2d');
                            const data = metrics.chart_distribucion_ingresos.rows;
                            new Chart(ctx, {
                                type: 'pie',
                                data: {
                                    labels: data.map(row => row.method),
                                    datasets: [{
                                        data: data.map(row => row.amount),
                                        backgroundColor: ['#8B4513', '#DAA520', '#F5F5DC', '#696969'],
                                    }]
                                }
                            });
                        }

                        // Picos de Check-in/Check-out
                        const picosCanvas = document.getElementById('chart-picos-checkin-checkout');
                        if (picosCanvas && metrics.chart_checkins_diarios && metrics.chart_checkins_diarios.rows) {
                            const ctx = picosCanvas.getContext('2d');
                            const data = metrics.chart_checkins_diarios.rows;
                            new Chart(ctx, {
                                type: 'line',
                                data: {
                                    labels: data.map(row => row.hour),
                                    datasets: [{
                                        label: 'Check-ins',
                                        data: data.map(row => row.checkins),
                                        borderColor: '#8B4513',
                                        fill: false,
                                    }, {
                                        label: 'Check-outs',
                                        data: data.map(row => row.checkouts),
                                        borderColor: '#DAA520',
                                        fill: false,
                                    }]
                                }
                            });
                        }

                        // Servicios Rentables
                        if (metrics.servicios_rentables) {
                            const list = document.getElementById('servicios-rentables-list');
                            list.innerHTML = metrics.servicios_rentables.map(s => `<li>${s.nombre}: $${s.ingresos}</li>`).join('');
                        }
                    }
                }
            },
            // CONFIGURACIÓN DE HOTEL: permite establecer pisos, habitaciones por piso y categorías
            'configuracion-hotel': {
                title: 'Configuración de Hotel',
                render: async () => {
                    try {
                        // Obtener configuración del hotel
                        const config = await apiGet('/admin/hotel-config').catch(() => ({ num_pisos: 1, habitaciones_por_piso: 10 }));

                        // Obtener categorías desde el backend en lugar de localStorage
                        const categorias = await apiGet('/admin/categorias').catch(() => []);

                        const categoriasHtml = categorias.length ? categorias.map((c, idx) => `
                            <div class="categoria-row bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-3" data-id="${c.id_categoria}">
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Nombre de la Categoría</label>
                                        <input class="cat-nombre w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500" 
                                               placeholder="Ej: Matrimonial, Simple, etc." 
                                               value="${c.nombre || ''}" 
                                               readonly>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                        <input class="cat-descripcion w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500" 
                                               placeholder="Descripción opcional" 
                                               value="${c.descripcion || ''}" 
                                               readonly>
                                    </div>
                                    <div class="flex space-x-2">
                                        <button type="button" class="edit-categoria-btn bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm">
                                            Editar
                                        </button>
                                        <button type="button" class="save-categoria-btn bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm hidden">
                                            Guardar
                                        </button>
                                        <button type="button" class="cancel-categoria-btn bg-gray-500 text-white px-3 py-2 rounded-md hover:bg-gray-600 text-sm hidden">
                                            Cancelar
                                        </button>
                                        <button type="button" class="delete-categoria-btn bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 text-sm">
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('') : `
                            <div class="text-center py-8 text-gray-500">
                                <p class="text-lg mb-2">No hay categorías configuradas</p>
                                <p class="text-sm">Crea tu primera categoría de habitación usando el botón de abajo</p>
                            </div>
                        `;

                        return `
                        <div class="space-y-8">
                            <!-- Configuración General del Hotel -->
                            <div class="admin-card">
                                <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                                    <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-2 0H9m-2 0H5m-2 0h2M7 7h10M7 11h6m-6 4h3"></path>
                                    </svg>
                                    Configuración General del Hotel
                                </h2>

                                <form id="hotel-config-form" class="space-y-4">
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Número de Pisos</label>
                                            <input type="number" id="num-pisos" name="num_pisos" min="1" max="50" value="${config.num_pisos || 1}" 
                                                   class="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500" required>
                                            <p class="text-sm text-gray-500 mt-1">Máximo número de pisos del hotel</p>
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Habitaciones por Piso</label>
                                            <input type="number" id="hab-por-piso" name="habitaciones_por_piso" min="1" max="100" value="${config.habitaciones_por_piso || 10}" 
                                                   class="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500" required>
                                            <p class="text-sm text-gray-500 mt-1">Máximo número de habitaciones por piso</p>
                                        </div>
                                    </div>
                                    <div class="flex justify-end">
                                        <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                                            Guardar Configuración
                                        </button>
                                    </div>
                                </form>

                                <!-- Información adicional -->
                                <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h3 class="font-semibold text-blue-800 mb-2">
                                        <svg class="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        Información Importante
                                    </h3>
                                    <ul class="text-blue-700 text-sm space-y-1">
                                        <li>• Estas configuraciones se usan como límites al crear habitaciones</li>
                                        <li>• El número de habitación debe ser piso*100 + número (ej: piso 1, hab 101-110)</li>
                                        <li>• No se pueden crear habitaciones que excedan estos límites</li>
                                    </ul>
                                </div>
                            </div>

                            <!-- Gestión de Categorías de Habitaciones -->
                            <div class="admin-card">
                                <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                                    <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-2 0H9m-2 0H5m-2 0h2M7 7h10M7 11h6m-6 4h3"></path>
                                    </svg>
                                    Gestión de Categorías de Habitaciones
                                </h2>

                                <div class="mb-6">
                                    <p class="text-gray-600 mb-4">
                                        Administra las categorías de habitaciones de tu hotel. Las habitaciones existentes mantendrán su categoría actual.
                                    </p>
                                    
                                    <div class="flex flex-wrap gap-3 mb-6">
                                        <button id="add-categoria-btn" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center">
                                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                            </svg>
                                            Añadir Categoría
                                        </button>
                                        
                                        <button id="refresh-categorias-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
                                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                            </svg>
                                            Actualizar Lista
                                        </button>
                                    </div>
                                </div>

                                <div id="categorias-container" class="space-y-4">
                                    ${categoriasHtml}
                                </div>

                                <!-- Información adicional -->
                                <div class="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h3 class="font-semibold text-blue-800 mb-2">
                                        <svg class="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        Información Importante
                                    </h3>
                                    <ul class="text-blue-700 text-sm space-y-1">
                                        <li>• Las categorías se almacenan en la base de datos del hotel</li>
                                        <li>• No puedes eliminar categorías que estén siendo utilizadas por habitaciones</li>
                                        <li>• Los cambios se aplican inmediatamente al crear/editar habitaciones</li>
                                        <li>• Los nombres de categorías deben ser únicos</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        `;
                    } catch (err) {
                        return `<div class="admin-card"><p class="text-red-500">Error cargando configuración: ${err.message}</p></div>`;
                    }
                },
                postRender: () => {
                    const container = document.getElementById('categorias-container');
                    const addBtn = document.getElementById('add-categoria-btn');
                    const refreshBtn = document.getElementById('refresh-categorias-btn');

                    // Función para recargar las categorías
                    async function reloadCategorias() {
                        try {
                            await loadSection('configuracion-hotel');
                        } catch (err) {
                            showModal('Error', `<p>Error al recargar categorías: ${err.message}</p>`);
                        }
                    }

                    // Botón añadir categoría
                    if (addBtn) {
                        addBtn.addEventListener('click', () => {
                            const formHtml = `
                                <form id="add-categoria-form" class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Nombre de la Categoría</label>
                                        <input name="nombre" required class="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500" 
                                               placeholder="Ej: Matrimonial, Simple, Doble, Familiar">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Descripción (opcional)</label>
                                        <textarea name="descripcion" class="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500" 
                                                  rows="3" placeholder="Descripción de la categoría..."></textarea>
                                    </div>
                                    <div class="flex justify-end space-x-3 pt-4">
                                        <button type="button" onclick="hideModal()" class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                                            Cancelar
                                        </button>
                                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                            Crear Categoría
                                        </button>
                                    </div>
                                </form>
                            `;
                            
                            showModal('Nueva Categoría', formHtml, () => {
                                document.getElementById('add-categoria-form').addEventListener('submit', async (e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.target);
                                    const data = {
                                        nombre: formData.get('nombre'),
                                        descripcion: formData.get('descripcion') || ''
                                    };
                                    
                                    try {
                                        await apiPost('/admin/categorias', data);
                                        hideModal();
                                        showModal('Éxito', '<p>Categoría creada correctamente.</p>');
                                        await reloadCategorias();
                                    } catch (err) {
                                        showModal('Error', `<p>${err.message}</p>`);
                                    }
                                });
                            });
                        });
                    }

                    // Botón actualizar
                    if (refreshBtn) {
                        refreshBtn.addEventListener('click', reloadCategorias);
                    }

                    // Delegación de eventos para las categorías
                    if (container) {
                        container.addEventListener('click', async (e) => {
                            const target = e.target;
                            const row = target.closest('.categoria-row');
                            if (!row) return;
                            
                            const categoryId = row.getAttribute('data-id');
                            const nombreInput = row.querySelector('.cat-nombre');
                            const descripcionInput = row.querySelector('.cat-descripcion');

                            // Botón Editar
                            if (target.classList.contains('edit-categoria-btn')) {
                                // Habilitar edición
                                nombreInput.removeAttribute('readonly');
                                descripcionInput.removeAttribute('readonly');
                                nombreInput.focus();
                                
                                // Mostrar/ocultar botones
                                row.querySelector('.edit-categoria-btn').classList.add('hidden');
                                row.querySelector('.delete-categoria-btn').classList.add('hidden');
                                row.querySelector('.save-categoria-btn').classList.remove('hidden');
                                row.querySelector('.cancel-categoria-btn').classList.remove('hidden');
                                
                                // Cambiar estilo visual
                                nombreInput.classList.add('bg-yellow-50', 'border-yellow-300');
                                descripcionInput.classList.add('bg-yellow-50', 'border-yellow-300');
                            }

                            // Botón Guardar
                            else if (target.classList.contains('save-categoria-btn')) {
                                const nombre = nombreInput.value.trim();
                                if (!nombre) {
                                    showModal('Error', '<p>El nombre de la categoría es obligatorio.</p>');
                                    return;
                                }
                                
                                try {
                                    const data = {
                                        nombre: nombre,
                                        descripcion: descripcionInput.value.trim()
                                    };
                                    
                                    await apiPut(`/admin/categorias/${categoryId}`, data);
                                    showModal('Éxito', '<p>Categoría actualizada correctamente.</p>');
                                    await reloadCategorias();
                                } catch (err) {
                                    showModal('Error', `<p>${err.message}</p>`);
                                }
                            }

                            // Botón Cancelar
                            else if (target.classList.contains('cancel-categoria-btn')) {
                                await reloadCategorias(); // Recargar para restaurar valores originales
                            }

                            // Botón Eliminar
                            else if (target.classList.contains('delete-categoria-btn')) {
                                const nombreCategoria = nombreInput.value;
                                showConfirmModal(
                                    `¿Estás seguro de eliminar la categoría "${nombreCategoria}"?<br><br>
                                     <strong>Nota:</strong> No se puede eliminar si hay habitaciones usando esta categoría.`, 
                                    async () => {
                                        try {
                                            await apiDelete(`/admin/categorias/${categoryId}`);
                                            showModal('Éxito', '<p>Categoría eliminada correctamente.</p>');
                                            await reloadCategorias();
                                        } catch (err) {
                                            showModal('Error', `<p>${err.message}</p>`);
                                        }
                                    }
                                );
                            }
                        });
                    }

                    // Handler para el formulario de configuración del hotel
                    const configForm = document.getElementById('hotel-config-form');
                    if (configForm) {
                        configForm.addEventListener('submit', async (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                            const data = {
                                num_pisos: parseInt(formData.get('num_pisos'), 10),
                                habitaciones_por_piso: parseInt(formData.get('habitaciones_por_piso'), 10)
                            };

                            try {
                                await apiPut('/admin/hotel-config', data);
                                showModal('Éxito', '<p>Configuración del hotel guardada correctamente.</p>');
                            } catch (err) {
                                showModal('Error', `<p>${err.message}</p>`);
                            }
                        });
                    }
                }
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

                    // --- Handler para 'Añadir Habitación' (modal con validaciones según configuración del hotel) ---
                    async function openAddHabitacionModal() {
                        try {
                            // obtener configuración del hotel desde la API
                            const cfg = await apiGet('/admin/hotel-config').catch(() => ({ num_pisos: 1, habitaciones_por_piso: 10 }));
                            const pisos = parseInt(cfg.num_pisos || 1, 10) || 1;
                            const habPorPiso = parseInt(cfg.habitaciones_por_piso || 10, 10) || 10;

                            // OBTENER CATEGORÍAS DIRECTAMENTE DEL API (sin intentar desde cfg.categorias)
                            console.log('Obteniendo categorías desde el API...');
                            let categorias = [];
                            try { 
                                categorias = await apiGet('/admin/categorias');
                                console.log('Categorías obtenidas:', categorias);
                            } catch(e){ 
                                console.error('Error al obtener categorías:', e);
                            }

                            // obtener habitaciones existentes para calcular números ocupados
                            const habitacionesRes = await apiGet('/admin/habitaciones').catch(()=>[]);
                            const habitaciones = Array.isArray(habitacionesRes) ? habitacionesRes : (habitacionesRes.habitaciones || habitacionesRes.rows || []);
                            const usados = new Set((habitaciones || []).map(h => String(h.numero_habitacion)));

                            // helpers para generar opciones de piso y número
                            const pisoOptions = Array.from({length: pisos}, (_,i) => i+1).map(p => `<option value="${p}">${p}</option>`).join('');

                            function generarNumerosOptions(piso) {
                                const base = parseInt(piso,10) * 100;
                                const opts = [];
                                for (let i = 1; i <= habPorPiso; i++) {
                                    const num = base + i;
                                    if (!usados.has(String(num))) opts.push(`<option value="${num}">${num}</option>`);
                                }
                                return opts.join('') || '<option value="">(No hay números disponibles en este piso)</option>';
                            }

                            // Generar opciones de categorías correctamente
                            const categoriasOptions = categorias.length > 0 
                                ? categorias.map(c => `<option data-precio-dia="${c.precio_min_dia || ''}" data-precio-hora="${c.precio_min_hora || ''}" value="${c.id_categoria}">${c.nombre}</option>`).join('')
                                : '<option value="">Sin categorías disponibles</option>';

                            const formHtml = `
                                <form id="add-habitacion-form" enctype="multipart/form-data">
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label>Número de Piso</label>
                                            <select id="add-piso" class="mt-1 border rounded p-2">${pisoOptions}</select>
                                        </div>
                                        <div>
                                            <label>Número de Habitación</label>
                                            <select id="add-numero" class="mt-1 border rounded p-2">${generarNumerosOptions(1)}</select>
                                        </div>
                                        <div class="md:col-span-2">
                                            <label>Categoría</label>
                                            <select id="add-categoria" class="mt-1 border rounded p-2">${categoriasOptions}</select>
                                        </div>
                                        <div>
                                            <label>Precio por Día (USD)</label>
                                            <input id="add-precio-dia" type="number" step="0.01" class="mt-1 border rounded p-2" required>
                                            <p id="min-dia-msg" class="text-sm text-gray-500 mt-1"></p>
                                        </div>
                                        <div>
                                            <label>Precio por Hora (USD)</label>
                                            <input id="add-precio-hora" type="number" step="0.01" class="mt-1 border rounded p-2">
                                            <p id="min-hora-msg" class="text-sm text-gray-500 mt-1"></p>
                                        </div>
                                        <div class="md:col-span-2">
                                            <label>Capacidad (personas)</label>
                                            <input id="add-capacidad" type="number" min="1" class="mt-1 border rounded p-2">
                                        </div>
                                        <div class="md:col-span-2">
                                            <label>Descripción</label>
                                            <textarea id="add-descripcion" class="mt-1 border rounded p-2 w-full" rows="3"></textarea>
                                        </div>
                                        <div class="md:col-span-2">
                                            <label>Fotos de referencia</label>
                                            <input id="add-fotos" type="file" accept="image/*" multiple class="mt-1">
                                        </div>
                                        <div class="md:col-span-2 flex justify-end">
                                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded">Guardar</button>
                                        </div>
                                    </div>
                                </form>
                            `;

                            showModal('Añadir Habitación', formHtml, () => {
                                const selectPiso = document.getElementById('add-piso');
                                const selectNumero = document.getElementById('add-numero');
                                const selectCategoria = document.getElementById('add-categoria');
                                const inputPrecioDia = document.getElementById('add-precio-dia');
                                const inputPrecioHora = document.getElementById('add-precio-hora');
                                const minDiaMsg = document.getElementById('min-dia-msg');
                                const minHoraMsg = document.getElementById('min-hora-msg');
                                const form = document.getElementById('add-habitacion-form');

                                function updateNumeroOptions() {
                                    const pisoVal = selectPiso.value || '1';
                                    selectNumero.innerHTML = generarNumerosOptions(pisoVal);
                                }

                                function updateMinPrices() {
                                    const sel = selectCategoria.selectedOptions[0];
                                    if (!sel) return;
                                    const minDia = sel.getAttribute('data-precio-dia');
                                    const minHora = sel.getAttribute('data-precio-hora');
                                    minDiaMsg.textContent = minDia ? `Precio mínimo por día: $${parseFloat(minDia).toFixed(2)}` : '';
                                    minHoraMsg.textContent = minHora ? `Precio mínimo por hora: $${parseFloat(minHora).toFixed(2)}` : '';
                                    if (minDia) inputPrecioDia.min = minDia; else inputPrecioDia.removeAttribute('min');
                                    if (minHora) inputPrecioHora.min = minHora; else inputPrecioHora.removeAttribute('min');
                                }

                                selectPiso.addEventListener('change', updateNumeroOptions);
                                selectCategoria.addEventListener('change', updateMinPrices);

                                // inicializar valores
                                updateNumeroOptions();
                                updateMinPrices();

                                form.addEventListener('submit', async (ev) => {
                                    ev.preventDefault();
                                    try {
                                        const numero = (document.getElementById('add-numero') || {}).value;
                                        const piso = (document.getElementById('add-piso') || {}).value;
                                        const categoriaSel = (document.getElementById('add-categoria') || {}).selectedOptions[0];
                                        const idCategoria = categoriaSel ? categoriaSel.value : '';
                                        const precioDia = parseFloat((document.getElementById('add-precio-dia') || {}).value || '0');
                                        const precioHora = parseFloat((document.getElementById('add-precio-hora') || {}).value || '0');
                                        const capacidad = parseInt((document.getElementById('add-capacidad') || {}).value || '', 10) || undefined;
                                        const descripcion = (document.getElementById('add-descripcion') || {}).value || '';
                                        const fotosEl = document.getElementById('add-fotos');

                                        if (!numero) return showModal('Error', '<p>Seleccione un número de habitación disponible.</p>');

                                        // validar precios mínimos según categoría
                                        const minDia = parseFloat(categoriaSel.getAttribute('data-precio-dia') || '0') || 0;
                                        const minHora = parseFloat(categoriaSel.getAttribute('data-precio-hora') || '0') || 0;
                                        if (minDia && precioDia < minDia) return showModal('Error', `<p>El precio por día no puede ser inferior a $${minDia.toFixed(2)} para esta categoría.</p>`);
                                        if (minHora && precioHora && precioHora < minHora) return showModal('Error', `<p>El precio por hora no puede ser inferior a $${minHora.toFixed(2)} para esta categoría.</p>`);

                                        // construir FormData para incluir imágenes
                                        const fd = new FormData();
                                        fd.append('numero_habitacion', numero);
                                        fd.append('piso', piso);
                                        fd.append('id_categoria', idCategoria);
                                        fd.append('precio_por_dia', precioDia);
                                        if (!isNaN(precioHora) && precioHora > 0) fd.append('precio_por_hora', precioHora);
                                        if (capacidad) fd.append('capacidad', capacidad);
                                        if (descripcion) fd.append('descripcion', descripcion);

                                        if (fotosEl && fotosEl.files && fotosEl.files.length) {
                                            for (let i = 0; i < fotosEl.files.length; i++) fd.append('fotos', fotosEl.files[i]);
                                        }

                                        // enviar con fetch para multipart/form-data
                                        const token = localStorage.getItem('token') || '';
                                        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
                                        const res = await fetch('/api/admin/habitaciones', { method: 'POST', body: fd, headers });
                                        if (!res.ok) {
                                            const body = await res.json().catch(()=>({ error: res.statusText }));
                                            throw new Error(body.error || 'Error creando habitación');
                                        }

                                        // cerrar modal y recargar sección
                                        hideModal();
                                        loadSection('gestion-habitaciones');
                                        showModal('Éxito', '<p>Habitación creada correctamente.</p>');
                                    } catch (err) {
                                        showModal('Error', `<p>${err.message}</p>`);
                                    }
                                });
                            });

                        } catch (err) {
                            showModal('Error', `<p>${err.message}</p>`);
                        }
                    }

                    const addBtnEl = document.getElementById('add-habitacion-btn');
                    if (addBtnEl) addBtnEl.addEventListener('click', openAddHabitacionModal);
                }
            },

            'gestion-carrusel': {
                title: 'Gestión del Carrusel',
                render: async () => {
                    try {
                        const imgsRes = await apiGet('/admin/carrusel');
                        const images = Array.isArray(imgsRes) ? imgsRes : (imgsRes.images || imgsRes.rows || []);
                        console.log('Images received from API:', images);
                        const listHtml = (images && images.length) ? images.map(img => `
                            <div class="carrusel-thumb">
                                <img src="${img.url || img}" alt="carrusel">
                                <div class="thumb-actions">
                                    <button data-filename="${img.filename || ''}" data-url="${img.url || img}" class="delete-carrusel-btn btn-minimal">Eliminar</button>
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
                            const filename = btn.getAttribute('data-filename');
                            showConfirmModal('Eliminar imagen del carrusel?', async () => {
                                try {
                                    await apiDelete(`/admin/carrusel/${encodeURIComponent(filename)}`);
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
                                        <td class="py-3 px-4">${new Date(r.fecha_checkin).toLocaleString('es-ES', { timeZone: 'America/Lima', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} - ${new Date(r.fecha_checkout).toLocaleString('es-ES', { timeZone: 'America/Lima', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                        <td class="py-3 px-4">${r.estado_reserva}</td>
                                        <td class="py-3 px-4 flex space-x-2">
                                        <button data-reserva='${JSON.stringify(r).replace(/'/g, "&apos;")}' class="ver-detalles-reserva-btn px-3 py-1 rounded bg-indigo-600 text-white text-xs">Ver Detalles</button>
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
                                    <td class="py-3 px-4">${new Date(r.fecha_checkin).toLocaleString('es-ES', { timeZone: 'America/Lima', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} - ${new Date(r.fecha_checkout).toLocaleString('es-ES', { timeZone: 'America/Lima', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                    <td class="py-3 px-4">${r.estado_reserva}</td>
                                    <td class="py-3 px-4 flex space-x-2">
                                    <button data-reserva='${JSON.stringify(r).replace(/'/g, "&apos;")}' class="ver-detalles-reserva-btn px-3 py-1 rounded bg-indigo-600 text-white text-xs">Ver Detalles</button>
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
    
            'gestion-reclamos': {
                title: 'Gestión de Solicitudes',
                render: async () => {
                    try {
                        const reclamosRes = await apiGet('/encargado/reclamos');
                        const reclamos = Array.isArray(reclamosRes) ? reclamosRes : [];

                        // Función para obtener emoji y color según tipo
                        function getTipoInfo(tipo) {
                            const tipos = {
                                'reclamo': { color: '#dc3545', bgColor: '#f8d7da', label: 'Reclamo' },
                                'pedido': { color: '#0d6efd', bgColor: '#cfe2ff', label: 'Pedido' },
                                'limpieza': { Color: '#198754', bgColor: '#d1e7dd', label: 'Limpieza' }
                            };
                            return tipos[tipo] || { color: '#6c757d', bgColor: '#e9ecef', label: tipo || 'Desconocido' };
                        }

                        return `
                        <div class="space-y-6">
                            <!-- Formulario para agregar solicitud -->
                            <div class="admin-card">
                                <h2 class="text-xl font-semibold mb-4">Agregar Nueva Solicitud</h2>
                                <form id="add-reclamo-form" class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Solicitud</label>
                                        <select id="reclamo-tipo" name="tipo_solicitud" required 
                                                class="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500">
                                            <option value="reclamo">Reclamo</option>
                                            <option value="pedido">Pedido</option>
                                            <option value="limpieza">Limpieza</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Número de Habitación</label>
                                        <input type="number" id="reclamo-habitacion" name="numero_habitacion" required 
                                               class="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500" 
                                               placeholder="Ej: 101">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                                        <textarea id="reclamo-descripcion" name="descripcion" required rows="3"
                                                  class="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500" 
                                                  placeholder="Describa la solicitud..."></textarea>
                                    </div>
                                    <div class="flex justify-end">
                                        <button type="submit" class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                                            Agregar Solicitud
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <!-- Lista de solicitudes -->
                            <div class="admin-card">
                                <h2 class="text-xl font-semibold mb-4">Solicitudes Registradas</h2>
                                
                                <!-- Filtros -->
                                <div class="mb-4 p-4 bg-white rounded shadow flex flex-wrap gap-3 items-end">
                                    <div>
                                        <label class="block text-sm text-gray-600">Buscar en descripción</label>
                                        <input id="filter-reclamo-texto" type="text" class="mt-1 border border-gray-300 rounded p-2" placeholder="Texto">
                                    </div>
                                    <div>
                                        <label class="block text-sm text-gray-600">Habitación</label>
                                        <input id="filter-reclamo-habitacion" type="number" class="mt-1 border border-gray-300 rounded p-2" placeholder="Núm.">
                                    </div>
                                    <div>
                                        <label class="block text-sm text-gray-600">Tipo</label>
                                        <select id="filter-reclamo-tipo" class="mt-1 border border-gray-300 rounded p-2">
                                            <option value="">Todos</option>
                                            <option value="reclamo">Reclamo</option>
                                            <option value="pedido">Pedido</option>
                                            <option value="limpieza">Limpieza</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-sm text-gray-600">Estado</label>
                                        <select id="filter-reclamo-estado" class="mt-1 border border-gray-300 rounded p-2">
                                            <option value="">Todos</option>
                                            <option value="pendiente">Pendiente</option>
                                            <option value="resuelto">Resuelto</option>
                                        </select>
                                    </div>
                                    <div class="ml-auto flex gap-2">
                                        <button id="btn-filtrar-reclamos" class="bg-blue-600 text-white px-4 py-2 rounded">Buscar</button>
                                        <button id="btn-limpiar-filtros-reclamos" class="bg-gray-200 text-gray-700 px-4 py-2 rounded">Limpiar</button>
                                    </div>
                                </div>

                                <div class="overflow-x-auto">
                                    <table class="min-w-full bg-white rounded-lg shadow overflow-hidden">
                                        <thead class="bg-gray-100">
                                            <tr>
                                                <th class="py-3 px-4 text-left">ID</th>
                                                <th class="py-3 px-4 text-left">Tipo</th>
                                                <th class="py-3 px-4 text-left">Habitación</th>
                                                <th class="py-3 px-4 text-left">Descripción</th>
                                                <th class="py-3 px-4 text-left">Estado</th>
                                                <th class="py-3 px-4 text-left">Fecha</th>
                                                <th class="py-3 px-4 text-left">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody id="reclamos-tbody" class="divide-y divide-gray-200">
                                            ${reclamos.length ? reclamos.map(r => {
                                                const tipoInfo = getTipoInfo(r.tipo_solicitud);
                                                return `
                                                <tr class="border-b hover:bg-gray-50">
                                                    <td class="py-3 px-4">${r.id_reclamo}</td>
                                                    <td class="py-3 px-4">
                                                        <span style="display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 12px; font-size: 0.875rem; font-weight: 600; color: ${tipoInfo.color}; background-color: ${tipoInfo.bgColor};">
                                                            ${tipoInfo.emoji} ${tipoInfo.label}
                                                        </span>
                                                    </td>
                                                    <td class="py-3 px-4">${r.numero_habitacion || 'N/A'}</td>
                                                    <td class="py-3 px-4">${r.descripcion}</td>
                                                    <td class="py-3 px-4">
                                                        <span class="px-2 py-1 rounded text-xs ${r.estado === 'pendiente' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}">
                                                            ${r.estado}
                                                        </span>
                                                    </td>
                                                    <td class="py-3 px-4">${new Date(r.fecha_creacion).toLocaleString()}</td>
                                                    <td class="py-3 px-4">
                                                        ${r.estado === 'pendiente' ? `
                                                            <button data-id="${r.id_reclamo}" class="resolver-reclamo-btn px-3 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700">
                                                                Resolver
                                                            </button>
                                                        ` : '<span class="text-sm text-gray-500">Resuelto</span>'}
                                                    </td>
                                                </tr>
                                            `}).join('') : '<tr><td colspan="7" class="text-center py-4">No hay solicitudes registradas.</td></tr>'}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        `;
                    } catch (err) {
                        return `<div class="admin-card"><p class="text-red-500">Error cargando solicitudes: ${err.message}</p></div>`;
                    }
                },
                postRender: () => {
                    // Función para obtener emoji y color según tipo
                    function getTipoInfo(tipo) {
                        const tipos = {
                            'reclamo': { emoji: '⚠️', color: '#dc3545', bgColor: '#f8d7da', label: 'Reclamo' },
                            'pedido': { emoji: '🛎️', color: '#0d6efd', bgColor: '#cfe2ff', label: 'Pedido' },
                            'limpieza': { emoji: '🧹', color: '#198754', bgColor: '#d1e7dd', label: 'Limpieza' }
                        };
                        return tipos[tipo] || { emoji: '📝', color: '#6c757d', bgColor: '#e9ecef', label: tipo || 'Desconocido' };
                    }

                    // Función para renderizar solicitudes con filtros
                    async function renderReclamosWithFilters() {
                        try {
                            const texto = (document.getElementById('filter-reclamo-texto') || {}).value || '';
                            const habitacion = (document.getElementById('filter-reclamo-habitacion') || {}).value || '';
                            const estado = (document.getElementById('filter-reclamo-estado') || {}).value || '';
                            const tipo = (document.getElementById('filter-reclamo-tipo') || {}).value || '';

                            const params = new URLSearchParams();
                            if (texto) params.append('texto', texto);
                            if (habitacion) params.append('habitacion', habitacion);
                            if (estado) params.append('estado', estado);
                            if (tipo) params.append('tipo', tipo);

                            const url = '/encargado/reclamos' + (params.toString() ? `?${params.toString()}` : '');
                            const reclamosRes = await apiGet(url);
                            let reclamos = Array.isArray(reclamosRes) ? reclamosRes : [];

                            const tbody = document.getElementById('reclamos-tbody');
                            if (!tbody) return;

                            const rows = reclamos.map(r => {
                                const tipoInfo = getTipoInfo(r.tipo_solicitud);
                                return `
                                <tr class="border-b hover:bg-gray-50">
                                    <td class="py-3 px-4">${r.id_reclamo}</td>
                                    <td class="py-3 px-4">
                                        <span style="display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 12px; font-size: 0.875rem; font-weight: 600; color: ${tipoInfo.color}; background-color: ${tipoInfo.bgColor};">
                                            ${tipoInfo.emoji} ${tipoInfo.label}
                                        </span>
                                    </td>
                                    <td class="py-3 px-4">${r.numero_habitacion || 'N/A'}</td>
                                    <td class="py-3 px-4">${r.descripcion}</td>
                                    <td class="py-3 px-4">
                                        <span class="px-2 py-1 rounded text-xs ${r.estado === 'pendiente' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}">
                                            ${r.estado}
                                        </span>
                                    </td>
                                    <td class="py-3 px-4">${new Date(r.fecha_creacion).toLocaleString()}</td>
                                    <td class="py-3 px-4">
                                        ${r.estado === 'pendiente' ? `
                                            <button data-id="${r.id_reclamo}" class="resolver-reclamo-btn px-3 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700">
                                                Resolver
                                            </button>
                                        ` : '<span class="text-sm text-gray-500">Resuelto</span>'}
                                    </td>
                                </tr>
                            `}).join('');

                            tbody.innerHTML = rows.length ? rows : '<tr><td colspan="7" class="text-center py-4">No hay solicitudes que coincidan con los filtros.</td></tr>';
                        } catch (err) {
                            showModal('Error', `<p>${err.message}</p>`);
                        }
                    }

                    // Inicializar tabla
                    renderReclamosWithFilters();

                    // Botones de filtro
                    const btnBuscar = document.getElementById('btn-filtrar-reclamos');
                    if (btnBuscar) btnBuscar.addEventListener('click', renderReclamosWithFilters);
                    
                    const btnLimpiar = document.getElementById('btn-limpiar-filtros-reclamos');
                    if (btnLimpiar) btnLimpiar.addEventListener('click', () => {
                        document.getElementById('filter-reclamo-texto').value = '';
                        document.getElementById('filter-reclamo-habitacion').value = '';
                        document.getElementById('filter-reclamo-estado').value = '';
                        document.getElementById('filter-reclamo-tipo').value = '';
                        renderReclamosWithFilters();
                    });

                    // Formulario para agregar solicitud
                    const addReclamoForm = document.getElementById('add-reclamo-form');
                    if (addReclamoForm) {
                        addReclamoForm.addEventListener('submit', async (e) => {
                            e.preventDefault();
                            const tipo = document.getElementById('reclamo-tipo').value;
                            const habitacion = document.getElementById('reclamo-habitacion').value;
                            const descripcion = document.getElementById('reclamo-descripcion').value;

                            try {
                                await apiPost('/encargado/reclamos', {
                                    tipo_solicitud: tipo,
                                    numero_habitacion: habitacion,
                                    descripcion: descripcion
                                });
                                showModal('Éxito', '<p>Solicitud agregada correctamente.</p>');
                                addReclamoForm.reset();
                                renderReclamosWithFilters();
                            } catch (err) {
                                showModal('Error', `<p>${err.message}</p>`);
                            }
                        });
                    }

                    // Delegación de eventos para resolver solicitudes
                    document.body.addEventListener('click', async (e) => {
                        if (e.target.classList.contains('resolver-reclamo-btn')) {
                            const id = e.target.getAttribute('data-id');
                            showConfirmModal('¿Marcar esta solicitud como resuelta?', async () => {
                                try {
                                    await apiPut(`/encargado/reclamos/${id}/resolver`, {});
                                    showModal('Éxito', '<p>Solicitud marcada como resuelta.</p>');
                                    renderReclamosWithFilters();
                                } catch (err) {
                                    showModal('Error', `<p>${err.message}</p>`);
                                }
                            });
                        }
                    });
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

                        <!-- FILTROS: id / nombre / email -->
                        <div class="mb-4 p-4 bg-white rounded shadow flex flex-wrap gap-3 items-end">
                          <div>
                            <label class="block text-sm text-gray-600">ID</label>
                            <input id="filter-enc-id" type="text" class="mt-1 border border-gray-300 rounded p-2" placeholder="ID">
                          </div>
                          <div>
                            <label class="block text-sm text-gray-600">Nombre</label>
                            <input id="filter-enc-nombre" type="text" class="mt-1 border border-gray-300 rounded p-2" placeholder="Nombre">
                          </div>
                          <div>
                            <label class="block text-sm text-gray-600">Email</label>
                            <input id="filter-enc-email" type="text" class="mt-1 border border-gray-300 rounded p-2" placeholder="Email">
                          </div>
                          <div class="ml-auto flex gap-2">
                            <button id="btn-filtrar-encargados" class="bg-blue-600 text-white px-4 py-2 rounded">Buscar</button>
                            <button id="btn-limpiar-filtros-encargados" class="bg-gray-200 text-gray-700 px-4 py-2 rounded">Limpiar</button>
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
                    // función para renderizar encargados aplicando filtros en frontend
                    async function renderEncargadosWithFilters() {
                        try {
                            const idFilter = (document.getElementById('filter-enc-id') || {}).value || '';
                            const nombreFilter = (document.getElementById('filter-enc-nombre') || {}).value || '';
                            const emailFilter = (document.getElementById('filter-enc-email') || {}).value || '';

                            const encargadosRes = await apiGet('/admin/encargados');
                            let encargados = Array.isArray(encargadosRes) ? encargadosRes : (encargadosRes.encargados || encargadosRes.rows || []);

                            encargados = encargados.filter(e => {
                                if (idFilter && !String(e.id).includes(idFilter)) return false;
                                if (nombreFilter && !( (e.nombre||'').toLowerCase().includes(nombreFilter.toLowerCase()) )) return false;
                                if (emailFilter && !( (e.email||'').toLowerCase().includes(emailFilter.toLowerCase()) )) return false;
                                return true;
                            });

                            const tbody = document.getElementById('encargados-tbody');
                            if (!tbody) return;

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

                            tbody.innerHTML = rows.length ? rows : `<tr><td colspan="5" class="text-center py-4">No hay encargados registrados.</td></tr>`;
                        } catch (err) {
                            showModal('Error', `<p>${err.message}</p>`);
                        }
                    }

                    // inicializar
                    renderEncargadosWithFilters();

                    const btnBuscar = document.getElementById('btn-filtrar-encargados');
                    if (btnBuscar) btnBuscar.addEventListener('click', renderEncargadosWithFilters);
                    const btnLimpiar = document.getElementById('btn-limpiar-filtros-encargados');
                    if (btnLimpiar) btnLimpiar.addEventListener('click', () => {
                        document.getElementById('filter-enc-id').value = '';
                        document.getElementById('filter-enc-nombre').value = '';
                        document.getElementById('filter-enc-email').value = '';
                        renderEncargadosWithFilters();
                    });

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
    
        // El botón "Añadir Habitación" se maneja en el postRender de gestion-habitaciones
        // NO interceptar aquí para que el event listener del postRender funcione correctamente

        // Editar habitación
        if (target && target.classList.contains('edit-btn') && target.closest('#mainContent')) {
            const id = target.getAttribute('data-id');
            try {
                const habitaciones = await apiGet('/admin/habitaciones');
                const habitacion = habitaciones.find(h => String(h.id_habitacion) === String(id));
                if (!habitacion) throw new Error('Habitación no encontrada');
                
                // Obtener fotos existentes de la habitación
                let fotosExistentes = [];
                try {
                    const fotosRes = await apiGet(`/encargado/habitaciones/${id}/fotos`);
                    fotosExistentes = Array.isArray(fotosRes) ? fotosRes : [];
                } catch (err) {
                    console.log('No se pudieron cargar las fotos:', err);
                }
                
                const categorias = await apiGet('/admin/categorias').catch(() => []);
                const options = (categorias.length ? categorias.map(c => `<option value="${c.id_categoria}" ${c.id_categoria === habitacion.id_categoria ? 'selected' : ''}>${c.nombre}</option>`).join('') : `<option value="${habitacion.id_categoria}">${habitacion.categoria || 'N/A'}</option>`);
                
                // NUEVO MODAL CON 3 COLUMNAS ESTILO RESERVA
                const formHtml = `
                <div class="reserva-modal-content" style="max-width: 1400px !important;">
                    <span class="close-modal" data-modal-close="dynamicModal">&times;</span>
                    <h2 style="text-align: center; font-size: 2rem; margin-bottom: 30px; color: #000;">Editar Habitación</h2>
                    
                    <form id="habitacion-form" enctype="multipart/form-data">
                        <input type="hidden" name="id_habitacion" value="${habitacion.id_habitacion}">
                        
                        <div class="reserva-container">
                            <!-- COLUMNA 1: Datos de la habitación -->
                            <div class="reserva-info-column">
                                <h4 style="color: #000; font-size: 1.3rem; margin-bottom: 20px; font-weight: 700;">📋 Datos de la Habitación</h4>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #333; font-weight: 600;">Número de Habitación</label>
                                    <input name="numero_habitacion" value="${habitacion.numero_habitacion || ''}" required 
                                           class="form-input" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px;">
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #333; font-weight: 600;">Categoría</label>
                                    <select name="id_categoria" class="form-input" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px;">
                                        ${options}
                                    </select>
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #333; font-weight: 600;">Piso</label>
                                    <input type="number" name="piso" value="${habitacion.piso || ''}" 
                                           class="form-input" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px;">
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #333; font-weight: 600;">Capacidad (personas)</label>
                                    <input type="number" name="capacidad" value="${habitacion.capacidad || ''}" 
                                           class="form-input" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px;">
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #333; font-weight: 600;">Precio por Día (USD)</label>
                                    <input type="number" step="0.01" name="precio_por_dia" value="${habitacion.precio_por_dia || ''}" 
                                           class="form-input" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px;">
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #333; font-weight: 600;">Precio por Hora (USD)</label>
                                    <input type="number" step="0.01" name="precio_por_hora" value="${habitacion.precio_por_hora || ''}" 
                                           class="form-input" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px;">
                                </div>
                            </div>

                            <!-- COLUMNA 2: Descripción y Disponibilidad -->
                            <div class="reserva-form-column">
                                <h4 style="color: #000; font-size: 1.3rem; margin-bottom: 20px; font-weight: 700;">📝 Información Adicional</h4>
                                
                                <div style="margin-bottom: 20px;">
                                    <label style="display: block; margin-bottom: 5px; color: #333; font-weight: 600;">Descripción</label>
                                    <textarea name="descripcion" rows="6" class="form-input" 
                                              style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; resize: vertical;"
                                              placeholder="Describe las características de la habitación...">${habitacion.descripcion || ''}</textarea>
                                </div>
                                
                                <div style="margin-bottom: 20px;">
                                    <label style="display: flex; align-items: center; cursor: pointer; font-size: 1.1rem;">
                                        <input type="checkbox" name="disponible" ${habitacion.disponible ? 'checked' : ''} 
                                               style="width: 20px; height: 20px; margin-right: 10px; cursor: pointer;">
                                        <span style="color: #000; font-weight: 600;">Habitación Disponible</span>
                                    </label>
                                    <p style="margin-top: 8px; font-size: 0.9rem; color: #666;">
                                        Marca esta casilla si la habitación está lista para ser reservada
                                    </p>
                                </div>
                                
                                <div style="padding: 20px; background: linear-gradient(145deg, #e3f2fd, #bbdefb); border-radius: 12px; margin-top: 30px;">
                                    <h5 style="color: #1976d2; font-weight: 700; margin-bottom: 10px; font-size: 1rem;">
                                        💡 Consejos
                                    </h5>
                                    <ul style="list-style: none; padding: 0; font-size: 0.9rem; color: #333;">
                                        <li style="margin-bottom: 8px;">✓ Asegúrate de completar todos los campos importantes</li>
                                        <li style="margin-bottom: 8px;">✓ Las imágenes ayudan a los clientes a elegir mejor</li>
                                        <li style="margin-bottom: 8px;">✓ Puedes agregar múltiples fotos de la habitación</li>
                                        <li>✓ Haz clic en la "×" de cada foto para eliminarla</li>
                                    </ul>
                                </div>
                            </div>

                            <!-- COLUMNA 3: Gestión de Imágenes -->
                            <div class="reserva-imagen-column">
                                <h4 style="color: #000; font-size: 1.3rem; margin-bottom: 20px; font-weight: 700;">🖼️ Gestión de Imágenes</h4>
                                
                                <!-- Área de thumbnails dinámicos -->
                                <div id="image-thumbnails-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-bottom: 20px; min-height: 120px;">
                                    ${fotosExistentes.length > 0 ? fotosExistentes.map(foto => `
                                        <div class="image-thumbnail" data-foto="${foto}" style="position: relative; width: 100px; height: 100px; border-radius: 8px; overflow: hidden; border: 2px solid #ddd; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                            <img src="/img/habitaciones/${foto}" alt="Foto" style="width: 100%; height: 100%; object-fit: cover;">
                                            <button type="button" class="delete-thumbnail-btn" data-foto="${foto}" 
                                                    style="position: absolute; top: 2px; right: 2px; background: rgba(220, 53, 69, 0.9); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 16px; font-weight: bold; display: flex; align-items: center; justify-content: center; transition: all 0.3s;">
                                                ×
                                            </button>
                                        </div>
                                    `).join('') : ''}
                                    
                                    <!-- Botón para agregar más imágenes -->
                                    <div id="add-image-btn" style="width: 100px; height: 100px; border: 2px dashed #999; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; background: #f8f9fa; transition: all 0.3s; color: #666;">
                                        <span style="font-size: 2.5rem; line-height: 1; margin-bottom: 4px;">+</span>
                                        <span style="font-size: 0.75rem; text-align: center;">Agregar<br>Fotos</span>
                                    </div>
                                </div>
                                
                                <!-- Input oculto para archivos -->
                                <input type="file" id="new-images-input" name="fotos" accept="image/*" multiple style="display: none;">
                                
                                <!-- Indicador de nuevas imágenes seleccionadas -->
                                <div id="new-images-preview" style="margin-top: 15px; padding: 15px; background: #f0f8ff; border-radius: 8px; display: none;">
                                    <p style="margin: 0 0 10px 0; font-weight: 600; color: #1976d2;">
                                        📎 Nuevas imágenes seleccionadas: <span id="new-images-count">0</span>
                                    </p>
                                    <div id="new-images-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px;"></div>
                                </div>
                                
                                <!-- Botón Guardar Cambios -->
                                <button type="submit" class="btn-confirmar-reserva" style="margin-top: 30px; width: 100%;">
                                    <i class="fas fa-save"></i> Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                `;
                
                // Mostrar modal sin usar showModal (para tener control total del HTML)
                let modal = document.getElementById('dynamicModal');
                if (!modal) {
                    modal = document.createElement('div');
                    modal.id = 'dynamicModal';
                    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                    document.body.appendChild(modal);
                }
                modal.innerHTML = formHtml;
                
                // Cerrar modal
                modal.querySelector('.close-modal').addEventListener('click', () => {
                    modal.remove();
                });
                
                // Variables para gestión de imágenes
                const form = document.getElementById('habitacion-form');
                const thumbnailsContainer = document.getElementById('image-thumbnails-container');
                const addImageBtn = document.getElementById('add-image-btn');
                const newImagesInput = document.getElementById('new-images-input');
                const newImagesPreview = document.getElementById('new-images-preview');
                const newImagesList = document.getElementById('new-images-list');
                const newImagesCount = document.getElementById('new-images-count');
                
                let imagesToDelete = [];
                let newImagesFiles = [];
                
                // Abrir selector de archivos al hacer clic en el botón "+"
                addImageBtn.addEventListener('click', () => {
                    newImagesInput.click();
                });
                
                // Manejar selección de nuevas imágenes
                newImagesInput.addEventListener('change', (e) => {
                    const files = Array.from(e.target.files);
                    
                    files.forEach(file => {
                        if (file.type.startsWith('image/')) {
                            newImagesFiles.push(file);
                            
                            // Crear preview
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                const preview = document.createElement('div');
                                preview.className = 'new-image-preview';
                                preview.style.cssText = 'position: relative; width: 80px; height: 80px; border-radius: 6px; overflow: hidden; border: 2px solid #4caf50;';
                                preview.innerHTML = `
                                    <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">
                                    <button type="button" class="remove-new-image" data-index="${newImagesFiles.length - 1}" 
                                            style="position: absolute; top: 2px; right: 2px; background: rgba(244, 67, 54, 0.9); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 14px; font-weight: bold;">
                                        ×
                                    </button>
                                `;
                                newImagesList.appendChild(preview);
                            };
                            reader.readAsDataURL(file);
                        }
                    });
                    
                    // Actualizar contador y mostrar preview
                    newImagesCount.textContent = newImagesFiles.length;
                    if (newImagesFiles.length > 0) {
                        newImagesPreview.style.display = 'block';
                    }
                    
                    // Resetear input para permitir seleccionar los mismos archivos de nuevo
                    newImagesInput.value = '';
                });
                
                // Remover nueva imagen de la lista
                newImagesList.addEventListener('click', (e) => {
                    if (e.target.classList.contains('remove-new-image')) {
                        const index = parseInt(e.target.getAttribute('data-index'));
                        newImagesFiles.splice(index, 1);
                        
                        // Re-renderizar previews
                        newImagesList.innerHTML = '';
                        newImagesFiles.forEach((file, idx) => {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                const preview = document.createElement('div');
                                preview.className = 'new-image-preview';
                                preview.style.cssText = 'position: relative; width: 80px; height: 80px; border-radius: 6px; overflow: hidden; border: 2px solid #4caf50;';
                                preview.innerHTML = `
                                    <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">
                                    <button type="button" class="remove-new-image" data-index="${idx}" 
                                            style="position: absolute; top: 2px; right: 2px; background: rgba(244, 67, 54, 0.9); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 14px; font-weight: bold;">
                                        ×
                                    </button>
                                `;
                                newImagesList.appendChild(preview);
                            };
                            reader.readAsDataURL(file);
                        });
                        
                        newImagesCount.textContent = newImagesFiles.length;
                        if (newImagesFiles.length === 0) {
                            newImagesPreview.style.display = 'none';
                        }
                    }
                });
                
                // Eliminar fotos existentes
                thumbnailsContainer.addEventListener('click', async (e) => {
                    if (e.target.classList.contains('delete-thumbnail-btn')) {
                        const foto = e.target.getAttribute('data-foto');
                        
                        if (confirm('¿Eliminar esta imagen?')) {
                            try {
                                const token = localStorage.getItem('token') || '';
                                const headers = { 
                                    'Authorization': 'Bearer ' + token, 
                                    'Content-Type': 'application/json' 
                                };
                                const res = await fetch(`/api/encargado/habitaciones/${id}/fotos/delete`, {
                                    method: 'POST',
                                    headers,
                                    body: JSON.stringify({ url: foto })
                                });
                                
                                if (!res.ok) {
                                    throw new Error('Error al eliminar imagen');
                                }
                                
                                // Remover del DOM
                                e.target.closest('.image-thumbnail').remove();
                                
                                showModal('Éxito', '<p>Imagen eliminada correctamente.</p>');
                            } catch (err) {
                                showModal('Error', `<p>${err.message}</p>`);
                            }
                        }
                    }
                });
                
                // Enviar formulario
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(form);
                    
                    // Asegurar que disponible se envíe correctamente
                    const disponibleCheckbox = form.querySelector('input[name="disponible"]');
                    if (disponibleCheckbox) {
                        formData.set('disponible', disponibleCheckbox.checked ? 'true' : 'false');
                    }
                    
                    // Agregar nuevas imágenes
                    formData.delete('fotos'); // Limpiar el campo anterior
                    newImagesFiles.forEach(file => {
                        formData.append('fotos', file);
                    });

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

                        modal.remove();
                        loadSection('gestion-habitaciones');
                        showModal('Éxito', '<p>Habitación actualizada con éxito.</p>');
                    } catch (err) {
                        showModal('Error', `<p>${err.message}</p>`);
                    }
                });
                
                // Evitar doble envío por el handler global
                form.dataset.skipGlobal = 'true';
                
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
                    showModal('Éxito', '<p>Habitación eliminada.</p>');
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
                    <input type="email" name="email" required class="mt-1 block w-full border border-gray-300 rounded p-2">
                    </div>
                    <div>
                    <label class="block text-sm font-medium text-gray-700">Contraseña</label>
                    <input type="password" name="password" required class="mt-1 block w-full border border-gray-300 rounded p-2">
                    </div>
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
            
            // VER DETALLES DE RESERVA - HANDLER NUEVO
            if (target && target.classList.contains('ver-detalles-reserva-btn')) {
                try {
                    const reservaData = target.getAttribute('data-reserva');
                    const reserva = JSON.parse(reservaData);
                    
                    const detallesHtml = `
                        <div style="max-width: 600px;">
                            <h3 style="font-size: 1.5rem; margin-bottom: 20px; color: #1976d2; font-weight: 700;">
                                📋 Detalles de la Reserva #${reserva.id_reserva}
                            </h3>
                            
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                                <h4 style="font-size: 1.1rem; margin-bottom: 15px; color: #333; font-weight: 600;">
                                    👤 Información del Cliente
                                </h4>
                                <p style="margin: 8px 0;"><strong>Nombre:</strong> ${reserva.cliente_nombre || 'N/A'}</p>
                                <p style="margin: 8px 0;"><strong>Email:</strong> ${reserva.cliente_email || 'N/A'}</p>
                                <p style="margin: 8px 0;"><strong>Teléfono:</strong> ${reserva.cliente_telefono || 'N/A'}</p>
                            </div>
                            
                            <div style="background: #e3f2fd; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                                <h4 style="font-size: 1.1rem; margin-bottom: 15px; color: #333; font-weight: 600;">
                                    🏨 Información de la Habitación
                                </h4>
                                <p style="margin: 8px 0;"><strong>Habitación:</strong> ${reserva.numero_habitacion || 'N/A'}</p>
                                <p style="margin: 8px 0;"><strong>Categoría:</strong> ${reserva.categoria_habitacion || 'N/A'}</p>
                                <p style="margin: 8px 0;"><strong>Tipo de Reserva:</strong> ${reserva.tipo_reserva || 'N/A'}</p>
                            </div>
                            
                            <div style="background: #fff3e0; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                                <h4 style="font-size: 1.1rem; margin-bottom: 15px; color: #333; font-weight: 600;">
                                    📅 Fechas y Duración
                                </h4>
                                <p style="margin: 8px 0;"><strong>Check-in:</strong> ${new Date(reserva.fecha_checkin).toLocaleString('es-ES', { timeZone: 'America/Lima', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                <p style="margin: 8px 0;"><strong>Check-out:</strong> ${new Date(reserva.fecha_checkout).toLocaleString('es-ES', { timeZone: 'America/Lima', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            
                            <div style="background: #e8f5e9; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                                <h4 style="font-size: 1.1rem; margin-bottom: 15px; color: #333; font-weight: 600;">
                                    💰 Información de Pago
                                </h4>
                                <p style="margin: 8px 0;"><strong>Precio Total:</strong> S/ ${parseFloat(reserva.precio_total || 0).toFixed(2)}</p>
                                <p style="margin: 8px 0;"><strong>Estado del Pago:</strong> <span style="color: ${reserva.estado_pago === 'completado' ? '#4caf50' : '#ff9800'}; font-weight: 600;">${reserva.estado_pago || 'N/A'}</span></p>
                                <p style="margin: 8px 0;"><strong>Método de Pago:</strong> ${reserva.metodo_pago || 'N/A'}</p>
                            </div>
                            
                            <div style="background: #f3e5f5; padding: 20px; border-radius: 12px;">
                                <h4 style="font-size: 1.1rem; margin-bottom: 15px; color: #333; font-weight: 600;">
                                    ℹ️ Estado de la Reserva
                                </h4>
                                <p style="margin: 8px 0;"><strong>Estado:</strong> <span style="padding: 4px 12px; border-radius: 20px; background: ${reserva.estado_reserva === 'confirmada' ? '#4caf50' : reserva.estado_reserva === 'completada' ? '#2196f3' : '#ff9800'}; color: white; font-weight: 600;">${reserva.estado_reserva || 'N/A'}</span></p>
                                <p style="margin: 8px 0;"><strong>Fecha de Creación:</strong> ${reserva.fecha_creacion ? new Date(reserva.fecha_creacion).toLocaleString('es-ES', { timeZone: 'America/Lima' }) : 'N/A'}</p>
                                ${reserva.notas ? `<p style="margin: 8px 0;"><strong>Notas:</strong> ${reserva.notas}</p>` : ''}
                            </div>
                            
                            <div style="margin-top: 20px; text-align: right;">
                                <button onclick="hideModal()" style="background: #2196f3; color: white; padding: 10px 30px; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    `;
                    
                    showModal('Detalles de la Reserva', detallesHtml);
                } catch (err) {
                    console.error('Error al mostrar detalles:', err);
                    showModal('Error', '<p>No se pudieron cargar los detalles de la reserva.</p>');
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
                    id_habitacion: fd.get('id_habitacion'),
                    numero_habitacion: fd.get('numero_habitacion'),
                    id_categoria: fd.get('id_categoria'),
                    precio_por_dia: fd.get('precio_por_dia') || null,
                    precio_por_hora: fd.get('precio_por_hora') || null,
                    piso: fd.get('piso') || null,
                    capacidad: fd.get('capacidad') || null,
                    disponible: fd.get('disponible') === 'on',
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
    
        // NO cargar sección por defecto aquí, ya se hace en aplicarControlDeAcceso()
        // La sección inicial se determina según el rol en aplicarControlDeAcceso()
        aplicarControlDeAcceso();
    });


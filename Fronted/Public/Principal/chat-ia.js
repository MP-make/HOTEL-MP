// CHAT CON IA - ASISTENTE VIRTUAL
document.addEventListener('DOMContentLoaded', () => {
    const chatBotButton = document.getElementById('chatBotButton');
    const chatWelcomePopup = document.getElementById('chatWelcomePopup');
    const chatModal = document.getElementById('chatModal');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatMessages = document.getElementById('chatMessages');

    let chatState = {
        step: 'initial', // initial, asking_type, asking_dates, showing_rooms, confirming_reservation
        preferences: {},
        lastOfferedRoom: null // Para recordar la habitación que se ofreció específicamente
    };

    function actualizarVisibilidadChatbot() {
        const user = localStorage.getItem('user');
        let usuarioActual = null;
        try { if (user) usuarioActual = JSON.parse(user); } catch (e) { }
        if (usuarioActual && usuarioActual.rol === 'cliente') {
            chatBotButton.classList.add('visible');
        } else {
            chatBotButton.classList.remove('visible');
            chatModal.classList.remove('active');
        }
    }

    function mostrarPopupBienvenida() {
        const user = localStorage.getItem('user');
        let usuarioActual = null;
        try { if (user) usuarioActual = JSON.parse(user); } catch (e) { return; }
        if (!usuarioActual || usuarioActual.rol !== 'cliente') return;
        chatWelcomePopup.classList.add('show');
        setTimeout(() => chatWelcomePopup.classList.remove('show'), 5000);
    }

    if (chatBotButton) {
        chatBotButton.addEventListener('click', () => {
            chatModal.classList.add('active');
            chatBotButton.style.display = 'none';
            chatInput.focus();
            if (chatState.step === 'initial') {
                setTimeout(() => {
                    agregarMensaje('¡Hola! Soy HotelBot, tu asistente virtual. ¿En qué puedo ayudarte hoy? Puedo ayudarte a encontrar habitaciones perfectas para tu estadía.', 'bot');
                }, 500);
            }
        });
    }

    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', () => {
            chatModal.classList.remove('active');
            chatBotButton.style.display = 'block';
            resetChatState();
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === chatModal) {
            chatModal.classList.remove('active');
            resetChatState();
        }
    });

    function resetChatState() {
        chatState = { step: 'initial', preferences: {}, lastOfferedRoom: null };
    }

    function agregarMensaje(texto, tipo) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ' + tipo;
        messageDiv.textContent = texto;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageDiv;
    }

    function agregarMensajeHTML(html, tipo) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ' + tipo;
        messageDiv.innerHTML = html;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageDiv;
    }

    async function enviarPregunta() {
        const pregunta = chatInput.value.trim();
        if (!pregunta) return;
        const token = localStorage.getItem('token');
        if (!token) {
            agregarMensaje('Por favor, inicia sesión para usar el chat.', 'bot');
            return;
        }
        agregarMensaje(pregunta, 'user');
        chatInput.value = '';
        chatInput.disabled = true;
        sendChatBtn.disabled = true;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot typing';
        typingDiv.textContent = 'HotelBot está escribiendo...';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            // Handle conversation flow
            const response = await handleConversation(pregunta, token);
            typingDiv.remove();
            if (response) {
                if (response.html) {
                    agregarMensajeHTML(response.html, 'bot');
                } else {
                    agregarMensaje(response.text, 'bot');
                }
            }
        } catch (error) {
            typingDiv.remove();
            agregarMensaje('Lo siento, hubo un error. ¿Puedes intentarlo de nuevo?', 'bot');
        } finally {
            chatInput.disabled = false;
            sendChatBtn.disabled = false;
            chatInput.focus();
        }
    }

    async function handleConversation(pregunta, token) {
        const lowerPregunta = pregunta.toLowerCase();

        // Check for reservation confirmation in any state
        if (lowerPregunta.includes('si') && (lowerPregunta.includes('reservar') || lowerPregunta.includes('quiero') || lowerPregunta.includes('confirmar'))) {
            // User wants to reserve, proceed to show available rooms
            chatState.step = 'showing_rooms';
            // If we don't have preferences, do a general search
            if (!chatState.preferences.type || !chatState.preferences.dates) {
                chatState.preferences.type = 'todas'; // Default to all types
                chatState.preferences.dates = 'hoy'; // Default to today
            }
            return await searchAndShowRooms(token);
        }

        // Check if user wants to search for rooms
        if (lowerPregunta.includes('habitacion') || lowerPregunta.includes('reserva') || lowerPregunta.includes('alojamiento') || lowerPregunta.includes('hospedaje')) {
            if (chatState.step === 'initial') {
                chatState.step = 'asking_type';
                return {
                    text: '¡Perfecto! Me encantaría ayudarte a encontrar la habitación ideal. ¿Qué tipo de habitación prefieres? (Ej: Estándar, Matrimonial, Deluxe, Junior Suite)'
                };
            }
        }

        // Handle room type selection
        if (chatState.step === 'asking_type') {
            chatState.preferences.type = pregunta;
            chatState.step = 'asking_dates';
            return {
                text: 'Excelente elección. ¿Para qué fechas necesitas la habitación? Por favor indica fecha de llegada y salida (ej: 15/12/2025 - 17/12/2025)'
            };
        }

        // Handle dates
        if (chatState.step === 'asking_dates') {
            chatState.preferences.dates = pregunta;
            chatState.step = 'showing_rooms';
            return await searchAndShowRooms(token);
        }

        // If already showing rooms or general chat
        if (chatState.step === 'showing_rooms' || chatState.step === 'initial') {
            // Send to backend for general response
            const response = await fetch('http://localhost:4000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ pregunta })
            });
            const data = await response.json();

            if (data.habitaciones) {
                agregarMensaje(data.respuesta, 'bot');
                // Mostrar tarjetas para habitaciones
                const habitacionesDiv = document.createElement('div');
                habitacionesDiv.className = 'message bot habitaciones-cards';
                data.habitaciones.forEach(habitacion => {
                    const card = document.createElement('div');
                    card.className = 'chat-room-card';
                    
                    const img = document.createElement('img');
                    img.src = habitacion.fotos && habitacion.fotos.length > 0 ? `/img/habitaciones/${habitacion.fotos[0]}` : '/img/logo1.jpg';
                    img.alt = `Habitación ${habitacion.numero_habitacion}`;
                    img.className = 'chat-room-img';
                    
                    const info = document.createElement('div');
                    info.className = 'chat-room-info';
                    info.innerHTML = `
                        <h4>Habitación ${habitacion.numero_habitacion}</h4>
                        <p>${habitacion.categoria}</p>
                        <p>S/ ${habitacion.precio_por_dia}/día</p>
                    `;
                    
                    const btn = document.createElement('button');
                    btn.className = 'btn-check';
                    btn.title = 'Seleccionar habitación';
                    btn.onclick = () => {
                        // Cerrar el modal del chat
                        chatModal.classList.remove('active');
                        chatBotButton.style.display = 'block';
                        
                        // Llamar a la función de reserva que abre el modal
                        if (window.reservarHabitacion) {
                            window.reservarHabitacion(habitacion.id_habitacion, `Habitación ${habitacion.numero_habitacion}`);
                        } else {
                            alert('Error: No se pudo abrir el modal de reserva. Por favor, recarga la página.');
                        }
                    };
                    
                    card.appendChild(img);
                    card.appendChild(info);
                    card.appendChild(btn);
                    habitacionesDiv.appendChild(card);
                });
                chatMessages.appendChild(habitacionesDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            } else {
                return { text: data.respuesta || 'No encontré habitaciones disponibles con esos criterios. ¿Quieres intentar con otras fechas o tipo de habitación?' };
            }
        }

        // Default response
        return { text: '¿En qué más puedo ayudarte? Si quieres buscar habitaciones, solo dime "buscar habitaciones" o similar.' };
    }

    async function searchAndShowRooms(token) {
        try {
            const query = `Buscar habitaciones tipo ${chatState.preferences.type} para fechas ${chatState.preferences.dates}`;
            const response = await fetch('http://localhost:4000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ pregunta: query })
            });
            const data = await response.json();

            if (data.habitaciones && data.habitaciones.length > 0) {
                return await createRoomsHTML(data.habitaciones.slice(0, 3));
            } else {
                chatState.step = 'asking_type'; // Reset to ask again
                return { text: 'No encontré habitaciones disponibles para esas fechas. ¿Quieres probar con otro tipo de habitación o diferentes fechas?' };
            }
        } catch (error) {
            return { text: 'Hubo un error al buscar habitaciones. ¿Puedes intentarlo de nuevo?' };
        }
    }

    async function createRoomsHTML(habitaciones) {
        let html = '<div class="habitaciones-cards">';
        habitaciones.forEach(habitacion => {
            const imgSrc = habitacion.fotos && habitacion.fotos.length > 0 ? `/img/habitaciones/${habitacion.fotos[0]}` : '/img/logo1.jpg';
            html += `
                <div class="chat-room-card">
                    <img src="${imgSrc}" alt="Habitación ${habitacion.numero_habitacion}" class="chat-room-img">
                    <div class="chat-room-info">
                        <h4>Habitación ${habitacion.numero_habitacion}</h4>
                        <p>${habitacion.categoria}</p>
                        <p>S/ ${habitacion.precio_por_dia}/día</p>
                    </div>
                    <button class="btn-check" onclick="seleccionarHabitacionChat(${habitacion.id_habitacion}, 'Habitación ${habitacion.numero_habitacion}')" title="Seleccionar habitación">✓</button>
                </div>
            `;
        });
        html += '</div>';
        html += '<p style="margin-top: 10px; font-size: 0.9em;">Haz clic en ✓ para seleccionar la habitación y proceder con la reserva.</p>';
        return { html };
    }

    // Función global para manejar la selección de habitación desde el chat
    window.seleccionarHabitacionChat = function(habitacionId, nombreHabitacion) {
        // Cerrar el modal del chat
        const chatModal = document.getElementById('chatModal');
        const chatBotButton = document.getElementById('chatBotButton');
        if (chatModal) chatModal.classList.remove('active');
        if (chatBotButton) chatBotButton.style.display = 'block';
        
        // Llamar a la función de reserva que abre el modal
        if (window.reservarHabitacion) {
            window.reservarHabitacion(habitacionId, nombreHabitacion);
        } else {
            alert('Error: No se pudo abrir el modal de reserva. Por favor, recarga la página.');
        }
    };

    if (sendChatBtn) sendChatBtn.addEventListener('click', enviarPregunta);
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); enviarPregunta(); }
        });
    }

    window.actualizarVisibilidadChatbot = actualizarVisibilidadChatbot;
    window.mostrarPopupBienvenidaChat = mostrarPopupBienvenida;
    actualizarVisibilidadChatbot();
    setTimeout(() => {
        const user = localStorage.getItem('user');
        if (user) {
            try {
                const u = JSON.parse(user);
                if (u.rol === 'cliente') mostrarPopupBienvenida();
            } catch (e) { }
        }
    }, 1000);
});
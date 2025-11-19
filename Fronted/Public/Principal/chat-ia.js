// CHAT CON IA - ASISTENTE VIRTUAL
document.addEventListener('DOMContentLoaded', () => {
    const chatBotButton = document.getElementById('chatBotButton');
    const chatWelcomePopup = document.getElementById('chatWelcomePopup');
    const chatModal = document.getElementById('chatModal');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatMessages = document.getElementById('chatMessages');

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
            chatBotButton.style.display = 'none'; // Ocultar la burbuja cuando se abre el chat
            chatInput.focus();
        });
    }

    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', () => {
            chatModal.classList.remove('active');
            chatBotButton.style.display = 'block'; // Mostrar la burbuja cuando se cierra el chat
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === chatModal) chatModal.classList.remove('active');
    });

    function agregarMensaje(texto, tipo) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ' + tipo;
        messageDiv.textContent = texto;
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
            const response = await fetch('http://localhost:4000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ pregunta })
            });
            typingDiv.remove();
            if (!response.ok) throw new Error('Error en el servidor');
            const data = await response.json();
            agregarMensaje(data.respuesta, 'bot');
        } catch (error) {
            typingDiv.remove();
            agregarMensaje('Lo siento, hubo un error.', 'bot');
        } finally {
            chatInput.disabled = false;
            sendChatBtn.disabled = false;
            chatInput.focus();
        }
    }

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
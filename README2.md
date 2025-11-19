# 🤖 Sistema de Chat con IA - Guía de Implementación

## 📋 Estado del Proyecto

### ✅ Completado
- Base de datos `faq_hotel` creada y configurada
- Datos iniciales de preguntas/respuestas insertados

### 🔧 Pendiente de Implementación
- Instalación de Ollama
- Configuración del endpoint del chat en el backend
- Implementación de la interfaz del chat en el frontend
- Pruebas y ajustes finales

---

## 🎯 ¿Qué es este Sistema?

Es un **chatbot inteligente** que responde preguntas de usuarios usando:
- **Ollama** (IA local) con modelo `llama3`
- **Base de datos PostgreSQL** (ya configurada con FAQ)
- **Backend Node.js + Express**
- **Frontend JavaScript**

---

## 🏗️ Arquitectura del Sistema

```
Usuario escribe pregunta
    ↓
Frontend envía POST a /api/chat
    ↓
Backend busca contexto en DB (faq_hotel) ✅ YA CREADA
    ↓
Backend genera "Súper-Prompt" con contexto
    ↓
Backend envía prompt a Ollama (http://localhost:11434)
    ↓
Ollama procesa con modelo llama3
    ↓
Backend recibe respuesta y la devuelve
    ↓
Frontend muestra respuesta al usuario
```

---

## 📦 PASO 1: Instalar Ollama

### Windows:
1. Descarga Ollama desde: https://ollama.com/download
2. Ejecuta el instalador
3. Abre PowerShell o CMD y ejecuta:

```bash
ollama pull llama3
```

4. Verifica que funciona:

```bash
ollama run llama3
# Debería abrir una consola de chat interactiva
# Presiona Ctrl+C para salir
```

5. Ollama quedará corriendo automáticamente en `http://localhost:11434`

### Modelos disponibles:
- `llama3` (recomendado)
- `llama3.2` (más reciente)
- `mistral` (alternativa más rápida)
- `codellama` (especializado en código)

---

## 💻 PASO 2: Instalar Dependencias del Backend

En la terminal, dentro de la carpeta `Backend/`:

```bash
npm install axios
```

> **Nota:** Las demás dependencias (`express`, `cors`, `pg`, etc.) ya deberían estar instaladas.

---

## 🔧 PASO 3: Configurar Endpoint del Chat en el Backend

Abre el archivo `Backend/server.js` y agrega el siguiente endpoint **después de los otros endpoints del admin**:

```javascript
/**
 * @route POST /api/chat
 * @desc Chat con IA local (Ollama)
 */
app.post("/api/chat", authenticateToken, async (req, res) => {
  const { pregunta } = req.body;

  // PASO 1: Validar pregunta
  if (!pregunta || typeof pregunta !== 'string' || pregunta.trim().length === 0) {
    return res.status(400).json({ error: 'Pregunta requerida' });
  }

  // PASO 2: Validar longitud (evitar spam)
  if (pregunta.length > 500) {
    return res.status(400).json({ 
      error: 'Pregunta demasiado larga (máximo 500 caracteres)' 
    });
  }

  // PASO 3: Respuesta rápida para saludos
  const preguntaLower = pregunta.trim().toLowerCase();
  if (['hola', 'hi', 'hello', 'buenos días', 'buenas tardes'].includes(preguntaLower)) {
    return res.json({ 
      respuesta: "¡Hola! Bienvenido al chat de asistencia del JW Marriott Hotel Lima. ¿En qué puedo ayudarte hoy?" 
    });
  }

  try {
    // PASO 4: Buscar contexto en la base de datos
    const palabrasClave = pregunta.trim().toLowerCase().split(/\s+/);
    let contexto = '';
    
    for (const palabra of palabrasClave) {
      if (palabra.length > 2) { // Ignorar palabras muy cortas (el, la, de, etc.)
        const result = await pool.query(
          "SELECT respuesta FROM faq_hotel WHERE LOWER(pregunta) ILIKE $1 OR LOWER(respuesta) ILIKE $1 LIMIT 3",
          [`%${palabra}%`]
        );
        
        for (const row of result.rows) {
          if (!contexto.includes(row.respuesta)) {
            contexto += row.respuesta + '\n';
          }
        }
      }
    }

    // PASO 5: Crear el "Súper-Prompt" con contexto
    const superPrompt = `Eres el asistente virtual del JW Marriott Hotel Lima, ubicado en Miraflores, Perú.

Información del hotel:
- Ubicación: Av. Malecón de la Reserva 615, Miraflores, Lima, Perú
- Check-in: 15:00 hrs | Check-out: 12:00 hrs
- Servicios: Wi-Fi gratuito, spa, gimnasio, restaurantes, salones para eventos
- Contacto: (01) 217-7000 | reservas@jwmarriottlima.com

Contexto relevante de la base de conocimientos:
${contexto || 'No hay información específica disponible.'}

Pregunta del usuario: "${pregunta.trim()}"

Instrucciones:
- Mantén tus respuestas BREVES (máximo 3-4 frases)
- Sé amigable, profesional y cortés
- Si no sabes algo, sugiere contactar recepción al (01) 217-7000
- Nunca inventes información que no tengas
- Responde en español de forma natural`;

    // PASO 6: Enviar a Ollama
    const axios = require('axios');
    const ollamaResponse = await axios.post('http://localhost:11434/api/chat', {
      model: 'llama3',
      messages: [{ role: 'user', content: superPrompt }],
      stream: false,
      options: {
        temperature: 0.7, // Equilibrio entre precisión y creatividad
        num_predict: 200  // Máximo de tokens en la respuesta
      }
    });

    // PASO 7: Extraer y enviar respuesta
    const respuesta = ollamaResponse.data?.message?.content?.trim() || 
                      'Lo siento, no pude generar una respuesta.';

    res.json({ respuesta });

  } catch (error) {
    console.error('Error en chat con Ollama:', error);

    // PASO 8: Fallback en caso de error
    const respuestaFallback = "Lo siento, estoy teniendo dificultades técnicas. " +
                               "Por favor, contacta a recepción al (01) 217-7000 o envía un email a reservas@jwmarriottlima.com";
    
    res.json({ respuesta: respuestaFallback });
  }
});
```

### Asegúrate de tener el import de axios al inicio del archivo:

```javascript
const axios = require('axios');
```

---

## 🎨 PASO 4: Crear la Interfaz del Chat (Frontend)

### A. Crear archivo `chat.css` en `Fronted/Public/Principal/`

```css
/* Botón flotante para abrir el chat */
.chat-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
  color: white;
  border: none;
  padding: 15px 25px;
  border-radius: 50px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(139, 69, 19, 0.3);
  font-size: 16px;
  font-weight: 600;
  z-index: 999;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(139, 69, 19, 0.4);
  background: linear-gradient(135deg, #A0522D 0%, #8B4513 100%);
}

/* Modal del chat */
.chat-modal {
  display: none;
  position: fixed;
  bottom: 90px;
  right: 20px;
  width: 400px;
  height: 600px;
  background: white;
  border-radius: 15px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  flex-direction: column;
  overflow: hidden;
}

.chat-modal.active {
  display: flex;
}

/* Header del chat */
.chat-header {
  background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 15px 15px 0 0;
}

.chat-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.chat-close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.chat-close-btn:hover {
  transform: rotate(90deg);
}

/* Área de mensajes */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f5f5f5;
}

/* Mensaje individual */
.message {
  margin-bottom: 15px;
  padding: 12px 16px;
  border-radius: 18px;
  max-width: 80%;
  word-wrap: break-word;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
  color: white;
  margin-left: auto;
  text-align: right;
  border-bottom-right-radius: 4px;
}

.message.bot {
  background: white;
  color: #333;
  border: 1px solid #e0e0e0;
  border-bottom-left-radius: 4px;
}

.message.typing {
  background: #e0e0e0;
  color: #666;
  font-style: italic;
}

/* Área de input */
.chat-input-container {
  display: flex;
  padding: 15px;
  background: white;
  border-top: 1px solid #e0e0e0;
  gap: 10px;
}

#chatInput {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 25px;
  outline: none;
  font-size: 14px;
  font-family: inherit;
}

#chatInput:focus {
  border-color: #8B4513;
  box-shadow: 0 0 0 2px rgba(139, 69, 19, 0.1);
}

#sendChatBtn {
  background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

#sendChatBtn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
}

#sendChatBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .chat-modal {
    width: 100%;
    height: 100%;
    bottom: 0;
    right: 0;
    border-radius: 0;
  }

  .chat-btn {
    bottom: 15px;
    right: 15px;
    padding: 12px 20px;
    font-size: 14px;
  }
}
```

### B. Agregar HTML al final de `index.html` (antes de `</body>`)

```html
<!-- Botón para abrir chat -->
<button id="openChatBtn" class="chat-btn">
  <i class="fas fa-comments"></i>
  Asistente Virtual
</button>

<!-- Modal del chat -->
<div id="chatModal" class="chat-modal">
  <div class="chat-header">
    <h3>🤖 Asistente JW Marriott</h3>
    <button id="closeChatBtn" class="chat-close-btn">&times;</button>
  </div>
  
  <div id="chatMessages" class="chat-messages">
    <div class="message bot">
      ¡Hola! Soy el asistente virtual del JW Marriott Hotel Lima. ¿En qué puedo ayudarte hoy? 😊
    </div>
  </div>
  
  <div class="chat-input-container">
    <input 
      type="text" 
      id="chatInput" 
      placeholder="Escribe tu pregunta..."
      autocomplete="off"
    >
    <button id="sendChatBtn">
      <i class="fas fa-paper-plane"></i>
    </button>
  </div>
</div>

<!-- Vincular CSS y JS del chat -->
<link rel="stylesheet" href="chat.css">
<script src="chat.js"></script>
```

### C. Crear archivo `chat.js` en `Fronted/Public/Principal/`

```javascript
// chat.js - Lógica del chat con IA
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos
    const chatModal = document.getElementById('chatModal');
    const openChatBtn = document.getElementById('openChatBtn');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatMessages = document.getElementById('chatMessages');

    // Obtener token del localStorage
    function getToken() {
        return localStorage.getItem('token');
    }

    // Abrir chat
    openChatBtn.addEventListener('click', () => {
        chatModal.classList.add('active');
        chatInput.focus();
    });

    // Cerrar chat
    closeChatBtn.addEventListener('click', () => {
        chatModal.classList.remove('active');
    });

    // Cerrar chat al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === chatModal) {
            chatModal.classList.remove('active');
        }
    });

    // Agregar mensaje al chat
    function addMessage(texto, tipo) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${tipo}`;
        messageDiv.textContent = texto;
        chatMessages.appendChild(messageDiv);
        
        // Scroll automático al último mensaje
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Enviar pregunta
    async function enviarPregunta() {
        const pregunta = chatInput.value.trim();
        
        if (!pregunta) return;
        
        // Verificar autenticación
        const token = getToken();
        if (!token) {
            addMessage('Por favor, inicia sesión para usar el chat.', 'bot');
            return;
        }
        
        // Mostrar pregunta del usuario
        addMessage(pregunta, 'user');
        chatInput.value = '';
        
        // Deshabilitar input mientras se procesa
        chatInput.disabled = true;
        sendChatBtn.disabled = true;
        
        // Mostrar "escribiendo..."
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot typing';
        typingDiv.textContent = 'Escribiendo...';
        typingDiv.id = 'typing-indicator';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        try {
            const response = await fetch('http://localhost:4000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ pregunta })
            });
            
            // Remover "escribiendo..."
            typingDiv.remove();
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
                }
                throw new Error('Error en la respuesta del servidor');
            }
            
            const data = await response.json();
            addMessage(data.respuesta, 'bot');
            
        } catch (error) {
            console.error('Error:', error);
            const errorMsg = error.message || 'Lo siento, hubo un error. Intenta de nuevo más tarde.';
            typingDiv.remove();
            addMessage(errorMsg, 'bot');
        } finally {
            // Rehabilitar input
            chatInput.disabled = false;
            sendChatBtn.disabled = false;
            chatInput.focus();
        }
    }

    // Event listeners
    sendChatBtn.addEventListener('click', enviarPregunta);

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enviarPregunta();
        }
    });

    // Mensaje de bienvenida aleatorio
    const mensajesBienvenida = [
        '¡Hola! ¿Buscas información sobre nuestras habitaciones?',
        '¿Necesitas ayuda con tu reserva?',
        '¿Tienes alguna pregunta sobre nuestros servicios?',
        '¡Bienvenido! Estoy aquí para ayudarte. 😊'
    ];

    // Agregar mensaje de bienvenida aleatorio después de 2 segundos
    setTimeout(() => {
        const mensajeAleatorio = mensajesBienvenida[Math.floor(Math.random() * mensajesBienvenida.length)];
        addMessage(mensajeAleatorio, 'bot');
    }, 2000);
});
```

---

## ✅ PASO 5: Pruebas

### 1. Verificar que Ollama esté corriendo:

```bash
curl http://localhost:11434/api/tags
```

Debería devolver la lista de modelos instalados.

### 2. Reiniciar el servidor backend:

```bash
cd Backend
npm start
```

### 3. Abrir la página principal y probar el chat:

- Haz clic en el botón "Asistente Virtual"
- Escribe una pregunta como: "¿Cuánto cuesta una habitación?"
- La IA debería responder basándose en la información de la base de datos

### Ejemplos de preguntas para probar:

- "Hola"
- "¿Cuál es el horario de check-in?"
- "¿Tienen Wi-Fi?"
- "¿Dónde está ubicado el hotel?"
- "¿Qué servicios ofrecen?"
- "¿Cuánto cuesta una habitación matrimonial?"

---

## 🛡️ Seguridad Implementada

✅ **Autenticación obligatoria** - Solo usuarios con sesión pueden usar el chat
✅ **Límite de caracteres** - Máximo 500 caracteres por pregunta
✅ **Validación de entrada** - Previene inyección de código
✅ **Fallback robusto** - Si Ollama falla, se muestra mensaje de error amigable

---

## 🔧 Configuración Avanzada (Opcional)

### Ajustar la "temperatura" (creatividad):

En `server.js`, línea del POST a Ollama:

```javascript
options: {
  temperature: 0.7, // 0 = muy preciso, 1 = muy creativo
  num_predict: 200  // Máximo de tokens en la respuesta
}
```

### Cambiar el modelo de IA:

```javascript
model: 'llama3.2', // o 'mistral', 'codellama'
```

### Agregar rate limiting (evitar spam):

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10, // Máximo 10 peticiones por minuto
  message: 'Demasiadas peticiones, intenta de nuevo más tarde'
});

app.post("/api/chat", authenticateToken, chatLimiter, async (req, res) => {
  // ...
});
```

---

## 📊 Agregar Más Preguntas a la Base de Datos (Opcional)

Si quieres expandir el conocimiento del chatbot, puedes agregar más preguntas a la tabla `faq_hotel`:

```sql
INSERT INTO faq_hotel (pregunta, respuesta) VALUES
('¿Aceptan mascotas?', 'Sí, aceptamos mascotas pequeñas con un cargo adicional de S/50 por noche.'),
('¿Tienen estacionamiento?', 'Sí, contamos con estacionamiento gratuito para huéspedes.'),
('¿Cuánto cuesta el desayuno?', 'El desayuno buffet tiene un costo de S/45 por persona.'),
('¿Tienen servicio de lavandería?', 'Sí, ofrecemos servicio de lavandería con costo adicional.'),
('¿Hay gimnasio?', 'Sí, tenemos un gimnasio totalmente equipado disponible 24/7 para huéspedes.');
```

---

## 🚨 Solución de Problemas

### Problema: "Ollama no responde"

**Solución:**
```bash
# Verificar que Ollama esté corriendo:
curl http://localhost:11434/api/tags

# Si no responde, reiniciar Ollama:
ollama serve
```

### Problema: "Respuestas muy lentas"

**Solución:** Reducir `num_predict`:
```javascript
options: {
  num_predict: 100 // en lugar de 200
}
```

### Problema: "No encuentra contexto en la DB"

**Solución:** Verificar datos:
```sql
SELECT COUNT(*) FROM faq_hotel;
SELECT * FROM faq_hotel WHERE LOWER(pregunta) ILIKE '%precio%';
```

### Problema: "Error 401 Unauthorized"

**Solución:** El usuario debe iniciar sesión primero. El chat requiere autenticación.

---

## 📝 Checklist de Implementación

- [ ] Ollama instalado y corriendo
- [ ] Modelo `llama3` descargado
- [ ] Dependencia `axios` instalada en backend
- [ ] Endpoint `/api/chat` agregado en `server.js`
- [ ] Archivo `chat.css` creado
- [ ] Archivo `chat.js` creado
- [ ] HTML del chat agregado a `index.html`
- [ ] Servidor backend reiniciado
- [ ] Pruebas realizadas con preguntas de ejemplo
- [ ] Chat funcionando correctamente

---

## 🎯 Resultado Final

Una vez completados todos los pasos, tendrás:

✅ Un botón flotante "Asistente Virtual" en la esquina inferior derecha
✅ Chat modal elegante con diseño profesional
✅ Respuestas inteligentes basadas en IA y base de datos
✅ Sistema 100% funcional y seguro
✅ Experiencia de usuario fluida y natural

---

## 📞 Soporte

Si tienes algún problema durante la implementación:

1. Verifica que Ollama esté corriendo: `curl http://localhost:11434/api/tags`
2. Revisa la consola del navegador (F12) para errores de JavaScript
3. Revisa la consola del servidor para errores de backend
4. Asegúrate de que el usuario esté autenticado (token válido)

---

**¡Éxito con la implementación! 🚀**

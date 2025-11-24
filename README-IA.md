# 🤖 HotelBot - Asistente Virtual con IA

## 📋 Índice
1. [IA Seleccionada: Llama 3](#ia-seleccionada-llama-3)
2. [Descripción de la IA](#descripción-de-la-ia)
3. [Prompt y Especificaciones](#prompt-y-especificaciones)
4. [Código de Conexión](#código-de-conexión)
5. [Arquitectura del Sistema](#arquitectura-del-sistema)

---

## 🧠 IA Seleccionada: Llama 3

**Modelo:** `llama3` (Meta AI)  
**Ejecutado en:** Ollama (motor local de IA)  
**Puerto:** `http://localhost:11434`  
**Endpoint:** `/api/chat`

### ¿Por qué Llama 3?

✅ **Gratuito y de código abierto**  
✅ **Ejecución local** - No depende de APIs externas pagas  
✅ **Privacidad total** - Los datos del hotel no salen del servidor  
✅ **Bajo costo operativo** - No hay límites de consultas ni costos por token  
✅ **Multilenguaje** - Soporte nativo para español e inglés  
✅ **Alto rendimiento** - Respuestas rápidas y contextuales  

---

## 📖 Descripción de la IA

### Llama 3 (Large Language Model Meta AI 3)

Llama 3 es un **modelo de lenguaje grande (LLM)** desarrollado por **Meta AI**, diseñado para:

- **Comprensión de lenguaje natural:** Entiende preguntas en español e inglés
- **Generación de texto coherente:** Respuestas conversacionales y naturales
- **Razonamiento contextual:** Mantiene el contexto de la conversación
- **Adaptabilidad:** Se ajusta al dominio hotelero mediante prompts especializados

### Características Técnicas

| Característica | Valor |
|---------------|-------|
| **Parámetros** | 7B / 13B (configurables) |
| **Tokens de contexto** | ~4,096 tokens |
| **Idiomas soportados** | Español, Inglés, +100 más |
| **Velocidad de respuesta** | ~2-5 segundos (local) |
| **Memoria RAM requerida** | Mínimo 8GB (recomendado 16GB) |
| **Licencia** | Open Source (Meta AI) |

### Ollama - Motor de Ejecución

**Ollama** es una plataforma que permite ejecutar modelos de IA localmente de forma sencilla:

```bash
# Instalación de Llama 3
ollama pull llama3

# Ejecutar el modelo
ollama run llama3

# Servir API REST
ollama serve
```

---

## 💬 Prompt y Especificaciones

### Super-Prompt del HotelBot

El sistema utiliza un **super-prompt** que combina:
1. **Identidad del bot**
2. **Información del hotel**
3. **Contexto de la base de conocimientos (FAQ)**
4. **Pregunta del usuario**

```javascript
const superPrompt = `Eres 'HotelBot', el asistente virtual amigable y profesional del Hotel JW Marriott.

Información del hotel:
- Ubicación: Av. Malecón de la Reserva 615, Miraflores, Lima, Perú
- Servicios: Wi-Fi de alta velocidad, spa, gimnasio, restaurantes, salones para eventos
- Categorías de habitaciones: Estándar, Matrimonial, Deluxe, Junior Suite
- Horario de check-in: 15:00, check-out: 12:00

Contexto relevante de la base de conocimientos:
${contexto || 'No hay información específica disponible.'}

Pregunta del usuario: "${pregunta.trim()}"

Mantén TODAS tus respuestas breves y concisas. Nunca uses más de 3 frases, a menos que el usuario te pida explícitamente más detalles.`;
```

### Especificaciones del Sistema

#### 1. **Búsqueda en FAQ (Base de Conocimientos)**

Antes de enviar la pregunta a Llama 3, el sistema busca respuestas relevantes en la tabla `faq_hotel`:

```javascript
// Extraer palabras clave de la pregunta
const palabrasClave = pregunta.trim().toLowerCase().split(/\s+/);

for (const palabra of palabrasClave) {
  if (palabra.length > 2) {
    const result = await pool.query(
      "SELECT respuesta FROM faq_hotel WHERE LOWER(pregunta) ILIKE $1 OR LOWER(respuesta) ILIKE $1 LIMIT 3",
      [`%${palabra}%`]
    );
    
    // Agregar respuestas al contexto
    for (const row of result.rows) {
      contexto += row.respuesta + '\n';
    }
  }
}
```

#### 2. **Respuestas Rápidas (Fast Responses)**

Para preguntas comunes, el sistema responde instantáneamente sin consultar la IA:

```javascript
// Saludos
if (['hola', 'hello', 'hi', 'buenos días', 'buenas tardes', 'buenas noches'].includes(preguntaLower)) {
  return res.json({ 
    respuesta: "¡Hola! Bienvenido a HotelBot. ¿En qué puedo ayudarte hoy?" 
  });
}
```

#### 3. **Detección de Intención (Intent Detection)**

El sistema detecta si el usuario quiere ver habitaciones:

```javascript
const keywordsHabitaciones = [
  'habitación', 'habitaciones', 'reservar', 'disponible', 
  'disponibles', 'ver habitaciones', 'mostrar habitaciones', 
  'quiero reservar', 'buscar habitación'
];

const isAboutHabitaciones = keywordsHabitaciones.some(
  keyword => preguntaLower.includes(keyword)
);

if (isAboutHabitaciones) {
  // Consultar habitaciones en BD
  const habitaciones = await obtenerHabitacionesDisponibles();
  return res.json({ 
    respuesta: "Aquí tienes las habitaciones disponibles:", 
    habitaciones 
  });
}
```

#### 4. **Configuración de Ollama**

```javascript
const ollamaResponse = await axios.post('http://localhost:11434/api/chat', {
  model: 'llama3',           // Modelo a usar
  messages: [                // Historial de conversación
    { role: 'user', content: superPrompt }
  ],
  stream: false,             // Respuesta completa (no streaming)
  options: {
    temperature: 0.7,        // Creatividad (0-1)
    top_p: 0.9,             // Diversidad de respuestas
    top_k: 40               // Alternativas consideradas
  }
});
```

### Parámetros Explicados

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `temperature` | 0.7 | Controla la creatividad. Bajo = más preciso, Alto = más creativo |
| `top_p` | 0.9 | Diversidad de palabras. 0.9 = balance entre precisión y variedad |
| `top_k` | 40 | Número de palabras candidatas. Más alto = más opciones |
| `stream` | false | Si es true, la respuesta llega palabra por palabra |

---

## 🔌 Código de Conexión

### 📂 Archivo: `Backend/server.js` (Líneas 2173-2250)

#### Endpoint de Chat

```javascript
/**
 * @route POST /api/chat
 * @desc Chat con IA local (Ollama) para usuarios autenticados
 */
app.post("/api/chat", authenticateToken, async (req, res) => {
  const { pregunta } = req.body;

  // ======================================
  // PASO A: VALIDAR PREGUNTA
  // ======================================
  if (!pregunta || typeof pregunta !== 'string' || pregunta.trim().length === 0) {
    return res.status(400).json({ error: 'Pregunta requerida' });
  }

  // ======================================
  // PASO B: RESPUESTAS RÁPIDAS (SALUDOS)
  // ======================================
  const preguntaLower = pregunta.trim().toLowerCase();
  if (['hola', 'hello', 'hi', 'buenos días', 'buenas tardes', 'buenas noches'].includes(preguntaLower)) {
    return res.json({ 
      respuesta: "¡Hola! Bienvenido a HotelBot. ¿En qué puedo ayudarte hoy?" 
    });
  }

  // ======================================
  // PASO C: DETECCIÓN DE INTENCIÓN
  // ======================================
  const keywordsHabitaciones = [
    'habitación', 'habitaciones', 'reservar', 'disponible', 
    'disponibles', 'ver habitaciones', 'mostrar habitaciones', 
    'quiero reservar', 'buscar habitación'
  ];
  
  const isAboutHabitaciones = keywordsHabitaciones.some(
    keyword => preguntaLower.includes(keyword)
  );

  if (isAboutHabitaciones) {
    try {
      // Obtener habitaciones disponibles de la BD
      const habitacionesResult = await queryWithRetry(
        `SELECT h.id_habitacion, h.numero_habitacion, h.piso, h.capacidad, 
                h.precio_por_dia, h.precio_por_hora, h.disponible, 
                c.nombre AS categoria,
                COALESCE(ARRAY_AGG(f.ruta_foto) FILTER (WHERE f.ruta_foto IS NOT NULL), '{}') AS fotos
         FROM public.habitaciones h
         INNER JOIN public.categorias_habitaciones c ON h.id_categoria = c.id_categoria
         LEFT JOIN public.habitaciones_fotos f ON h.id_habitacion = f.id_habitacion
         WHERE h.disponible = true
         GROUP BY h.id_habitacion, c.nombre
         ORDER BY h.numero_habitacion ASC
         LIMIT 3`
      );
      
      return res.json({ 
        respuesta: "Aquí tienes las habitaciones disponibles:", 
        habitaciones: habitacionesResult.rows 
      });
    } catch (err) {
      console.error('Error obteniendo habitaciones:', err);
      return res.json({ 
        respuesta: "Lo siento, no pude obtener las habitaciones disponibles en este momento." 
      });
    }
  }

  try {
    // ======================================
    // PASO D: BUSCAR CONTEXTO EN FAQ
    // ======================================
    const palabrasClave = pregunta.trim().toLowerCase().split(/\s+/);
    let contexto = '';
    
    for (const palabra of palabrasClave) {
      if (palabra.length > 2) { // Ignorar palabras muy cortas
        const result = await queryWithRetry(
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

    // ======================================
    // PASO E: ARMAR SUPER-PROMPT
    // ======================================
    const superPrompt = `Eres 'HotelBot', el asistente virtual amigable y profesional del Hotel JW Marriott.

Información del hotel:
- Ubicación: Av. Malecón de la Reserva 615, Miraflores, Lima, Perú
- Servicios: Wi-Fi de alta velocidad, spa, gimnasio, restaurantes, salones para eventos
- Categorías de habitaciones: Estándar, Matrimonial, Deluxe, Junior Suite
- Horario de check-in: 15:00, check-out: 12:00

Contexto relevante de la base de conocimientos:
${contexto || 'No hay información específica disponible.'}

Pregunta del usuario: "${pregunta.trim()}"

Mantén TODAS tus respuestas breves y concisas. Nunca uses más de 3 frases, a menos que el usuario te pida explícitamente más detalles.`;

    // ======================================
    // PASO F: ENVIAR A OLLAMA (LLAMA 3)
    // ======================================
    const ollamaResponse = await axios.post('http://localhost:11434/api/chat', {
      model: 'llama3',
      messages: [{ role: 'user', content: superPrompt }],
      stream: false
    });

    // ======================================
    // PASO G: PROCESAR RESPUESTA
    // ======================================
    const respuesta = ollamaResponse.data?.message?.content?.trim() 
      || 'Lo siento, no pude generar una respuesta.';

    res.json({ respuesta });

  } catch (error) {
    console.error('Error en chat con Ollama:', error);

    // ======================================
    // PASO H: RESPUESTAS DE FALLBACK
    // ======================================
    const fallbacks = [
      "Lo siento, estoy teniendo dificultades técnicas. Por favor, contacta directamente con el hotel al teléfono (999-999-999) o por email a Teycketan@gmail.com.",
      "Disculpa, mi sistema de IA no está disponible en este momento. Te recomiendo visitar nuestra sección de contacto para más información.",
      "Hay un problema con mi conexión. Para asistencia inmediata, puedes llamar al (999-999-999) o escribir a Teycketan@gmail.com."
    ];

    const respuesta = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    res.json({ respuesta });
  }
});
```

### 📂 Archivo: `Fronted/Public/Principal/chat-ia.js` (Frontend)

#### Función de Envío de Mensajes

```javascript
async function enviarPregunta() {
  const pregunta = chatInput.value.trim();
  if (!pregunta) return;
  
  const token = localStorage.getItem('token');
  if (!token) {
    agregarMensaje('Por favor, inicia sesión para usar el chat.', 'bot');
    return;
  }

  // Mostrar mensaje del usuario
  agregarMensaje(pregunta, 'user');
  chatInput.value = '';
  chatInput.disabled = true;
  sendChatBtn.disabled = true;

  // Mostrar indicador "escribiendo..."
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message bot typing';
  typingDiv.textContent = 'HotelBot está escribiendo...';
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    // ======================================
    // LLAMADA AL BACKEND
    // ======================================
    const response = await fetch('http://localhost:4000/api/chat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': 'Bearer ' + token 
      },
      body: JSON.stringify({ pregunta })
    });

    const data = await response.json();
    typingDiv.remove();

    // ======================================
    // MOSTRAR RESPUESTA
    // ======================================
    if (data.habitaciones) {
      // Si hay habitaciones, mostrar tarjetas
      agregarMensaje(data.respuesta, 'bot');
      mostrarHabitaciones(data.habitaciones);
    } else {
      // Respuesta de texto simple
      agregarMensaje(data.respuesta || 'No encontré información.', 'bot');
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
```

#### Mostrar Tarjetas de Habitaciones

```javascript
function mostrarHabitaciones(habitaciones) {
  const habitacionesDiv = document.createElement('div');
  habitacionesDiv.className = 'message bot habitaciones-cards';
  
  habitaciones.forEach(habitacion => {
    const card = document.createElement('div');
    card.className = 'chat-room-card';
    
    const img = document.createElement('img');
    img.src = habitacion.fotos && habitacion.fotos.length > 0 
      ? `/img/habitaciones/${habitacion.fotos[0]}` 
      : '/img/logo1.jpg';
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
    btn.innerHTML = '✓';
    btn.onclick = () => {
      // Cerrar el modal del chat
      chatModal.classList.remove('active');
      chatBotButton.style.display = 'block';
      
      // Abrir modal de reserva
      if (window.reservarHabitacion) {
        window.reservarHabitacion(
          habitacion.id_habitacion, 
          `Habitación ${habitacion.numero_habitacion}`
        );
      }
    };
    
    card.appendChild(img);
    card.appendChild(info);
    card.appendChild(btn);
    habitacionesDiv.appendChild(card);
  });
  
  chatMessages.appendChild(habitacionesDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
```

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIO                               │
│                          ↓                                   │
│              [Interfaz Web - chat-ia.js]                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ HTTP POST /api/chat
                            │ { pregunta: "..." }
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND - server.js                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  1. Validación de pregunta                           │   │
│  │  2. Respuestas rápidas (saludos)                     │   │
│  │  3. Detección de intención (habitaciones, FAQ, etc)  │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│            ┌───────────────┴────────────────┐                │
│            ↓                                ↓                │
│  ┌─────────────────┐              ┌─────────────────┐       │
│  │  Base de Datos  │              │  Ollama (IA)    │       │
│  │  PostgreSQL     │              │  Llama 3        │       │
│  │  - faq_hotel    │              │  localhost:11434│       │
│  │  - habitaciones │              └─────────────────┘       │
│  └─────────────────┘                       │                │
│            │                                ↓                │
│            │                    ┌─────────────────┐         │
│            │                    │  Super-Prompt   │         │
│            │                    │  + Contexto FAQ │         │
│            │                    └─────────────────┘         │
│            │                                ↓                │
│            └────────────────────────────────┬────────────────┤
│                                             ↓                │
│                              ┌────────────────────────┐      │
│                              │  Respuesta Generada    │      │
│                              │  por Llama 3           │      │
│                              └────────────────────────┘      │
└────────────────────────────────────┬────────────────────────┘
                                     │
                                     │ JSON Response
                                     │ { respuesta: "..." }
                                     │ { habitaciones: [...] }
                                     ↓
                          ┌─────────────────────┐
                          │  USUARIO RECIBE     │
                          │  - Texto de respuesta│
                          │  - Tarjetas de      │
                          │    habitaciones     │
                          └─────────────────────┘
```

---

## 📊 Flujo de Datos Detallado

### 1️⃣ Usuario envía pregunta
```javascript
// Frontend: chat-ia.js
fetch('http://localhost:4000/api/chat', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer TOKEN'
  },
  body: JSON.stringify({ pregunta: "¿Cuáles son los servicios del hotel?" })
})
```

### 2️⃣ Backend procesa la pregunta
```javascript
// Backend: server.js
app.post("/api/chat", authenticateToken, async (req, res) => {
  const { pregunta } = req.body;
  
  // Buscar en FAQ
  const contexto = await buscarEnFAQ(pregunta);
  
  // Armar super-prompt
  const superPrompt = crearSuperPrompt(pregunta, contexto);
  
  // Enviar a Ollama
  const respuesta = await consultarOllama(superPrompt);
  
  res.json({ respuesta });
});
```

### 3️⃣ Ollama genera respuesta
```bash
# Ollama recibe:
POST http://localhost:11434/api/chat
{
  "model": "llama3",
  "messages": [
    {
      "role": "user",
      "content": "Eres HotelBot... [super-prompt completo]"
    }
  ]
}

# Ollama responde:
{
  "message": {
    "content": "El JW Marriott Hotel Lima ofrece: Wi-Fi de alta velocidad, spa con tratamientos premium, gimnasio equipado, restaurantes gourmet y salones para eventos. ¿Te gustaría saber más sobre algún servicio?"
  }
}
```

### 4️⃣ Usuario recibe respuesta
```javascript
// Frontend muestra la respuesta
agregarMensaje(data.respuesta, 'bot');
```

---

## ⚙️ Configuración y Requisitos

### Requisitos del Sistema

```yaml
Software:
  - Node.js: >=16.x
  - PostgreSQL: >=14.x
  - Ollama: >=0.1.x
  - Llama 3: modelo descargado

Hardware Mínimo:
  - RAM: 8GB (recomendado 16GB)
  - CPU: 4 cores
  - Almacenamiento: 5GB libres

Puertos:
  - Frontend: 4000 (o configurado en server.js)
  - Ollama: 11434
  - PostgreSQL: 5432
```

### Instalación de Ollama y Llama 3

```bash
# 1. Instalar Ollama (Windows/Linux/Mac)
# Descargar desde: https://ollama.ai/download

# 2. Instalar el modelo Llama 3
ollama pull llama3

# 3. Ejecutar Ollama en segundo plano
ollama serve

# 4. Verificar que funciona
curl http://localhost:11434/api/tags
```

### Variables de Entorno

```env
# Backend/.env
PORT=4000
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_DATABASE=hotel_db
DB_PORT=5432
JWT_SECRET=your-secret-key

# Ollama (opcional, por defecto usa localhost:11434)
OLLAMA_HOST=http://localhost:11434
```

---

## 🔍 Debugging y Logs

### Activar logs detallados

```javascript
// En server.js, agregar:
console.log('Pregunta recibida:', pregunta);
console.log('Contexto FAQ:', contexto);
console.log('Super-prompt:', superPrompt);
console.log('Respuesta de Ollama:', ollamaResponse.data);
```

### Verificar estado de Ollama

```bash
# Ver modelos instalados
ollama list

# Probar Llama 3 directamente
ollama run llama3

# Ver logs de Ollama
ollama ps
```

---

## 📈 Mejoras Futuras

### Próximas Funcionalidades

1. **Historial de conversación persistente** - Guardar conversaciones en BD
2. **Análisis de sentimiento** - Detectar si el cliente está frustrado
3. **Recomendaciones personalizadas** - Sugerir habitaciones según preferencias
4. **Soporte multilenguaje** - Detectar idioma y responder en consecuencia
5. **Integración con calendario** - Sugerir fechas disponibles
6. **Análisis de métricas** - Dashboard con estadísticas del chatbot

---

## 📞 Soporte

Para problemas con el chatbot:
- **Email:** Teycketan@gmail.com
- **Teléfono:** (999-999-999)
- **Documentación Ollama:** https://ollama.ai/docs
- **Documentación Llama 3:** https://ai.meta.com/llama/

---

**Última actualización:** Noviembre 2025  
**Versión del documento:** 1.0  
**Autor:** Equipo de Desarrollo Hotel JW Marriott

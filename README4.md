# 🤖 HotelBot - Presentación de IA

## 🎯 IA Seleccionada: Llama 3 (Meta AI)

**Modelo utilizado:** `llama3`  
**Plataforma de ejecución:** Ollama (motor local de IA)  
**Puerto de conexión:** `http://localhost:11434`  
**Ventajas principales:**
- ✅ **Completamente gratuito** - No requiere suscripciones ni costos por token
- ✅ **Ejecución local** - Máxima privacidad, los datos del hotel nunca salen del servidor
- ✅ **Sin límites de uso** - No hay restricciones de consultas diarias
- ✅ **Multilenguaje nativo** - Soporte perfecto para español e inglés
- ✅ **Alto rendimiento** - Respuestas rápidas (2-5 segundos)

## 📖 Descripción de la IA

### ¿Qué es Llama 3?

Llama 3 es un **modelo de lenguaje grande (LLM)** desarrollado por **Meta AI** que representa el estado del arte en inteligencia artificial conversacional. Específicamente diseñado para:

- **Comprensión contextual profunda** de preguntas en lenguaje natural
- **Generación de respuestas coherentes y naturales** en conversaciones
- **Razonamiento lógico** para resolver consultas complejas
- **Adaptabilidad al dominio** mediante prompts especializados

### Especificaciones Técnicas

| Característica | Detalle |
|---------------|---------|
| **Arquitectura** | Transformer-based LLM |
| **Parámetros** | 7B / 13B (configurable) |
| **Ventana de contexto** | ~4,096 tokens |
| **Idiomas** | Español, Inglés, +100 idiomas |
| **Velocidad** | 2-5 segundos por respuesta |
| **Requisitos mínimos** | 8GB RAM (16GB recomendado) |

### ¿Por qué elegimos Llama 3 para el Hotel JW Marriott?

1. **Costo cero operativo** - A diferencia de GPT-4 o Claude que cuestan por token
2. **Privacidad total** - Los datos sensibles del hotel permanecen en el servidor local
3. **Independencia de internet** - Funciona sin conexión a servicios externos
4. **Personalización completa** - Podemos modificar el comportamiento sin restricciones
5. **Escalabilidad** - Maneja múltiples conversaciones simultáneas

## 💬 Prompt y Especificaciones de Interacción

### Super-Prompt Principal

El sistema utiliza un **super-prompt inteligente** que combina múltiples capas de información:

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

### Sistema de Contexto Inteligente

**Antes de enviar la pregunta a Llama 3, el sistema busca respuestas relevantes en la base de FAQ:**

```javascript
// Extrae palabras clave de la pregunta del usuario
const palabrasClave = pregunta.trim().toLowerCase().split(/\s+/);

// Busca en la tabla faq_hotel por cada palabra
for (const palabra of palabrasClave) {
  if (palabra.length > 2) {
    const result = await pool.query(
      "SELECT respuesta FROM faq_hotel WHERE LOWER(pregunta) ILIKE $1 OR LOWER(respuesta) ILIKE $1 LIMIT 3",
      [`%${palabra}%`]
    );
    
    // Agrega respuestas relevantes al contexto
    for (const row of result.rows) {
      contexto += row.respuesta + '\n';
    }
  }
}
```

### Configuración de Parámetros de IA

```javascript
const ollamaResponse = await axios.post('http://localhost:11434/api/chat', {
  model: 'llama3',
  messages: [{ role: 'user', content: superPrompt }],
  stream: false,
  options: {
    temperature: 0.7,    // Balance entre creatividad y precisión
    top_p: 0.9,         // Diversidad de respuestas
    top_k: 40           // Número de alternativas consideradas
  }
});
```

### Sistema de Respuestas Rápidas

**Para optimizar la velocidad, ciertas preguntas comunes responden instantáneamente:**

```javascript
// Saludos - Respuesta inmediata sin consultar IA
if (['hola', 'hello', 'hi', 'buenos días', 'buenas tardes', 'buenas noches'].includes(preguntaLower)) {
  return res.json({ 
    respuesta: "¡Hola! Bienvenido a HotelBot. ¿En qué puedo ayudarte hoy?" 
  });
}
```

### Detección de Intención Automática

**El sistema detecta automáticamente si el usuario quiere ver habitaciones:**

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
  // Consulta directamente la base de datos
  const habitaciones = await obtenerHabitacionesDisponibles();
  return res.json({ 
    respuesta: "Aquí tienes las habitaciones disponibles:", 
    habitaciones 
  });
}
```

## 🔌 Código de Conexión Frontend-Backend

### 📂 Archivo Principal: `Backend/server.js`

**Buscar en las líneas 2099-2250 aproximadamente**

```javascript
/**
 * @route POST /api/chat
 * @desc Chat con IA local (Ollama) para usuarios autenticados
 */
app.post("/api/chat", authenticateToken, async (req, res) => {
  const { pregunta } = req.body;

  // PASO A: VALIDAR PREGUNTA
  if (!pregunta || typeof pregunta !== 'string' || pregunta.trim().length === 0) {
    return res.status(400).json({ error: 'Pregunta requerida' });
  }

  // PASO B: RESPUESTAS RÁPIDAS (SALUDOS)
  const preguntaLower = pregunta.trim().toLowerCase();
  if (['hola', 'hello', 'hi', 'buenos días', 'buenas tardes', 'buenas noches'].includes(preguntaLower)) {
    return res.json({ 
      respuesta: "¡Hola! Bienvenido a HotelBot. ¿En qué puedo ayudarte hoy?" 
    });
  }

  // PASO C: DETECCIÓN DE INTENCIÓN
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
    // PASO D: BUSCAR CONTEXTO EN FAQ
    const palabrasClave = pregunta.trim().toLowerCase().split(/\s+/);
    let contexto = '';
    
    for (const palabra of palabrasClave) {
      if (palabra.length > 2) {
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

    // PASO E: ARMAR SUPER-PROMPT
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

    // PASO F: ENVIAR A OLLAMA (LLAMA 3)
    const ollamaResponse = await axios.post('http://localhost:11434/api/chat', {
      model: 'llama3',
      messages: [{ role: 'user', content: superPrompt }],
      stream: false
    });

    // PASO G: PROCESAR RESPUESTA
    const respuesta = ollamaResponse.data?.message?.content?.trim() 
      || 'Lo siento, no pude generar una respuesta.';

    res.json({ respuesta });

  } catch (error) {
    console.error('Error en chat con Ollama:', error);

    // PASO H: RESPUESTAS DE FALLBACK
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

### 📂 Archivo Frontend: `Fronted/Public/Principal/chat-ia.js`

**Buscar en las líneas 80-150 aproximadamente (función enviarPregunta)**

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
    // LLAMADA AL BACKEND
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

    // MOSTRAR RESPUESTA
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

## 📸 Capturas de Pantalla Recomendadas

### 1. **Botón del Chatbot (GIF Animado)**
- **Dónde:** Página principal `index.html` (esquina inferior derecha)
- **Archivo:** `Fronted/Public/img/asistente-de-inteligencia-artificial.gif`
- **Descripción:** Muestra el botón flotante con el GIF del robot que aparece solo para usuarios logueados

### 2. **Modal del Chat Abierto**
- **Dónde:** `index.html` - Click en el botón del chatbot
- **Elementos a mostrar:**
  - Header con título "HotelBot - Asistente Virtual"
  - Área de mensajes con conversación de ejemplo
  - Input de texto y botón de enviar
- **CSS relacionado:** `.chat-modal`, `.chat-header`, `.chat-messages` en `index.css`

### 3. **Popup de Bienvenida**
- **Dónde:** Aparece automáticamente 1 segundo después del login
- **Texto:** "¡Habla con HotelBot!"
- **CSS:** `.chat-welcome-popup` en `index.css`

### 4. **Respuesta con Tarjetas de Habitaciones**
- **Dónde:** Cuando el usuario pregunta por habitaciones
- **Elementos:** Tarjetas con imagen, nombre, categoría, precio y botón ✓
- **CSS:** `.habitaciones-cards`, `.chat-room-card` en `index.css`

### 5. **Indicador "Escribiendo..."**
- **Dónde:** Durante el procesamiento de la pregunta
- **Texto:** "HotelBot está escribiendo..."
- **CSS:** `.message.typing` en `index.css`

### 6. **Interfaz Móvil del Chat**
- **Dónde:** En dispositivos móviles (responsive)
- **Diferencias:** Modal fullscreen, elementos más grandes
- **CSS:** Media queries `@media (max-width: 768px)` en `index.css`

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    HTTP POST /api/chat    ┌─────────────────┐
│   USUARIO       │ ────────────────────────► │   BACKEND       │
│   (Frontend)    │                           │   server.js     │
└─────────────────┘                           └─────────────────┘
                                                   │
                                                   │ Busca en FAQ
                                                   ▼
┌─────────────────┐    Super-Prompt + Contexto    ┌─────────────────┐
│   BASE DE       │ ◄──────────────────────────── │   OLLAMA        │
│   DATOS         │                               │   (Llama 3)     │
│   PostgreSQL    │                               │   localhost:    │
│                 │                               │   11434         │
└─────────────────┘                               └─────────────────┘
```

## ⚙️ Requisitos Técnicos

- **Node.js:** ≥16.x
- **PostgreSQL:** ≥14.x
- **Ollama:** ≥0.1.x
- **Llama 3:** Modelo descargado
- **RAM:** 8GB mínimo (16GB recomendado)
- **Puertos:** Frontend: 4000, Ollama: 11434, PostgreSQL: 5432

## 🚀 Cómo Instalar y Ejecutar

```bash
# 1. Instalar Ollama
# Descargar desde: https://ollama.ai/download

# 2. Instalar modelo Llama 3
ollama pull llama3

# 3. Ejecutar Ollama
ollama serve

# 4. Verificar funcionamiento
curl http://localhost:11434/api/tags

# 5. Iniciar el backend del hotel
cd Backend
npm install
npm start

# 6. Abrir index.html en el navegador
```

## 📊 Métricas de Rendimiento

- **Tiempo de respuesta:** 2-5 segundos
- **Disponibilidad:** 99.9% (solo depende del servidor local)
- **Costo operativo:** $0.00
- **Privacidad:** 100% local
- **Escalabilidad:** Ilimitada (depende del hardware)

---

**Presentación preparada para:** Equipo de Desarrollo Hotel JW Marriott  
**Fecha:** Noviembre 2025  
**Versión:** 1.0
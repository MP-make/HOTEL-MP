// Versión de prueba mínima del servidor
const express = require("express");
const path = require('path');
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

console.log('🔧 Iniciando servidor en modo de prueba...');

// Middleware básico
app.use(express.json());

// Servir archivos estáticos
const staticPath = path.join(__dirname, '..', 'Fronted', 'Public', 'Principal');
console.log('📁 Sirviendo archivos estáticos desde:', staticPath);
app.use(express.static(staticPath));

// Ruta de prueba
app.get('/test', (req, res) => {
  res.json({ message: 'Servidor funcionando correctamente', timestamp: new Date().toISOString() });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log('✅ Servidor iniciado exitosamente');
  console.log('🔗 Prueba: http://localhost:4000/test');
  console.log('⚡ El servidor está funcionando. Presiona Ctrl+C para detenerlo.');
});

// Mantener el proceso vivo
process.on('SIGINT', () => {
  console.log('\n⚠️ Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

console.log('✨ Inicialización completada');
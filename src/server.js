// backend/src/server.js
// Servidor principal del backend - Dashboard de Ventas

const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./config/database'); // Conecta a la base de datos

// Importar las rutas
const authRoutes = require('./routes/authRoutes');
const usersRoutes = require('./routes/usersRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const sucursalesRoutes = require('./routes/sucursalesRoutes');

// Crear la aplicación Express
const app = express();

// Configurar el puerto
const PORT = process.env.PORT || 3001;

// ========================================
// MIDDLEWARES
// ========================================

// Parsear JSON en el body de las peticiones
app.use(express.json());

// Habilitar CORS para permitir peticiones desde el frontend
app.use(cors({
  origin: 'http://localhost:3000', // URL del frontend Next.js
  credentials: true
}));

// Middleware para logs de peticiones
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString('es-AR');
  console.log(`[${timestamp}] 📨 ${req.method} ${req.url}`);
  next();
});

// ========================================
// RUTAS
// ========================================

// Ruta raíz - Health check
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API Dashboard de Ventas - TP Final BDA',
    status: 'online',
    version: '1.0.0',
    database: 'MySQL - dashboard_ventas',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register'
      },
      users: {
        getAll: 'GET /api/users',
        getById: 'GET /api/users/:id',
        search: 'GET /api/users/search?search=term',
        stats: 'GET /api/users/stats',
        update: 'PUT /api/users/:id',
        changePassword: 'PUT /api/users/:id/password',
        delete: 'DELETE /api/users/:id'
      }
    },
    authors: 'Almansa & Alvarez'
  });
  res.redirect('/dashboard');
});

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Rutas de usuarios
app.use('/api/users', usersRoutes);

// Rutas del dashboard
app.use('/api/dashboard', dashboardRoutes);

// Rutas de sucursales
app.use('/api/sucursales', sucursalesRoutes);


// ========================================
// MANEJO DE ERRORES
// ========================================

// Ruta no encontrada (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.url
  });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ========================================
// INICIAR SERVIDOR
// ========================================

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║                                                ║');
  console.log('║     🚀 SERVIDOR BACKEND INICIADO              ║');
  console.log('║                                                ║');
  console.log(`║     📡 Puerto: ${PORT}                            ║`);
  console.log(`║     🌐 URL: http://localhost:${PORT}              ║`);
  console.log('║     📊 Base de Datos: MySQL                    ║');
  console.log('║                                                ║');
  console.log('║     📚 Endpoints disponibles:                  ║');
  console.log('║     • POST   /api/auth/login                   ║');
  console.log('║     • POST   /api/auth/register                ║');
  console.log('║     • GET    /api/users                        ║');
  console.log('║     • GET    /api/users/:id                    ║');
  console.log('║     • PUT    /api/users/:id                    ║');
  console.log('║     • DELETE /api/users/:id                    ║');
  console.log('║                                                ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  console.log('💡 Presiona Ctrl+C para detener el servidor');
  console.log('');
});
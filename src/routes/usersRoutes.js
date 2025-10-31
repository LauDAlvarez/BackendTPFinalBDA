// backend/src/routes/usersRoutes.js
// Rutas para gestión de usuarios

const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');

// ==========================================
// RUTAS DE CONSULTA (GET)
// ==========================================

// GET /api/users
// Obtener todos los usuarios
router.get('/', usersController.getAllUsers);

// GET /api/users/stats
// Obtener estadísticas de usuarios
router.get('/stats', usersController.getUserStats);

// GET /api/users/search?search=juan
// Buscar usuarios por nombre o email
router.get('/search', usersController.searchUsers);

// GET /api/users/:id
// Obtener un usuario específico por ID
router.get('/:id', usersController.getUserById);

// ==========================================
// RUTAS DE MODIFICACIÓN
// ==========================================

// PUT /api/users/:id
// Actualizar información de un usuario
router.put('/:id', usersController.updateUser);

// PUT /api/users/:id/password
// Cambiar contraseña de un usuario
router.put('/:id/password', usersController.changePassword);

// DELETE /api/users/:id
// Eliminar un usuario
router.delete('/:id', usersController.deleteUser);

module.exports = router;
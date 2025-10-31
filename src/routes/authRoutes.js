// src/routes/authRoutes.js
// Define las rutas (URLs) de autenticación

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Ruta POST para hacer login
// URL: http://localhost:3001/api/auth/login
router.post('/login', authController.login);

// Puedes agregar más rutas aquí en el futuro:
router.post('/register', authController.register);
// router.post('/logout', authController.logout);

module.exports = router;
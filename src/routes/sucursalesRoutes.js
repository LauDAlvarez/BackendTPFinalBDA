// backend/src/routes/sucursalesRoutes.js
// Rutas para gestión de sucursales

const express = require('express');
const router = express.Router();
const sucursalesController = require('../controllers/sucursalesController');

// ==========================================
// RUTAS DE CONSULTA
// ==========================================

// GET /api/sucursales
// Obtener todas las sucursales
router.get('/', sucursalesController.getAllSucursales);

// GET /api/sucursales/stats
// Obtener estadísticas generales
router.get('/stats', sucursalesController.getSucursalesStats);

// GET /api/sucursales/:id
// Obtener sucursal por ID
router.get('/:id', sucursalesController.getSucursalById);

// GET /api/sucursales/:id/vendedores
// Obtener vendedores de una sucursal
router.get('/:id/vendedores', sucursalesController.getVendedoresBySucursal);

// GET /api/sucursales/:id/inventario
// Obtener inventario de una sucursal
router.get('/:id/inventario', sucursalesController.getInventarioBySucursal);

// ==========================================
// RUTAS DE MODIFICACIÓN
// ==========================================

// POST /api/sucursales
// Crear nueva sucursal
router.post('/', sucursalesController.createSucursal);

// PUT /api/sucursales/:id
// Actualizar sucursal
router.put('/:id', sucursalesController.updateSucursal);

// DELETE /api/sucursales/:id
// Eliminar sucursal
router.delete('/:id', sucursalesController.deleteSucursal);

module.exports = router;
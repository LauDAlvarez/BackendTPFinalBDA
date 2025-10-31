// backend/src/routes/dashboardRoutes.js
// Rutas para los endpoints del Dashboard

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// ==========================================
// RUTAS DEL DASHBOARD
// ==========================================

// GET /api/dashboard/kpis
// KPIs generales (Nivel 1)
router.get('/kpis', dashboardController.getGeneralKPIs);

// GET /api/dashboard/sucursales/ranking
// Ranking de sucursales con semaforización (Nivel 2)
router.get('/sucursales/ranking', dashboardController.getRankingSucursales);

// GET /api/dashboard/categorias
// Ventas por categoría de producto
router.get('/categorias', dashboardController.getVentasPorCategoria);

// GET /api/dashboard/productos/top?limit=10
// Top productos más vendidos
router.get('/productos/top', dashboardController.getTopProductos);

// GET /api/dashboard/ventas/periodo?periodo=dia&dias=30
// Ventas por período (para gráficos)
router.get('/ventas/periodo', dashboardController.getVentasPorPeriodo);

module.exports = router;
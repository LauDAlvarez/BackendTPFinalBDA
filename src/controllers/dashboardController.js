// backend/src/controllers/dashboardController.js
// Controlador para los KPIs del Dashboard

const db = require('../config/database');

// ==========================================
// NIVEL 1 - GENERAL: KPIs Principales
// ==========================================

/**
 * Obtener KPIs generales de toda la empresa
 */
const getGeneralKPIs = (req, res) => {
  // Query para obtener todos los KPIs en una sola consulta
  const query = `
    SELECT 
      -- Total de ventas acumuladas
      (SELECT COALESCE(SUM(Total), 0) FROM Compras) as ventasTotales,
      
      -- Promedio mensual (últimos 30 días)
      (SELECT COALESCE(AVG(daily_total), 0) 
       FROM (
         SELECT DATE(Fecha) as date, SUM(Total) as daily_total 
         FROM Compras 
         WHERE Fecha >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY DATE(Fecha)
       ) as daily_sales
      ) as promedioMensual,
      
      -- Ventas del mes actual
      (SELECT COALESCE(SUM(Total), 0) 
       FROM Compras 
       WHERE MONTH(Fecha) = MONTH(NOW()) 
       AND YEAR(Fecha) = YEAR(NOW())
      ) as ventasMesActual,
      
      -- Ventas del mes anterior
      (SELECT COALESCE(SUM(Total), 0) 
       FROM Compras 
       WHERE MONTH(Fecha) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH))
       AND YEAR(Fecha) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH))
      ) as ventasMesAnterior,
      
      -- Número total de compras/transacciones
      (SELECT COUNT(*) FROM Compras) as totalTransacciones,
      
      -- Número de sucursales
      (SELECT COUNT(*) FROM Sucursales) as totalSucursales,
      
      -- Número de productos
      (SELECT COUNT(*) FROM Producto) as totalProductos
  `;

  db.query(query, (error, results) => {
    if (error) {
      console.error('❌ Error al obtener KPIs generales:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener los KPIs'
      });
    }

    const data = results[0];
    
    // Calcular comparativa (porcentaje de cambio)
    const comparativa = data.ventasMesAnterior > 0
      ? ((data.ventasMesActual - data.ventasMesAnterior) / data.ventasMesAnterior * 100).toFixed(2)
      : 0;

    console.log('✅ KPIs generales obtenidos');

    res.status(200).json({
      success: true,
      message: 'KPIs obtenidos exitosamente',
      data: {
        ventasTotales: parseFloat(data.ventasTotales),
        promedioMensual: parseFloat(data.promedioMensual),
        ventasMesActual: parseFloat(data.ventasMesActual),
        ventasMesAnterior: parseFloat(data.ventasMesAnterior),
        comparativa: parseFloat(comparativa),
        totalTransacciones: data.totalTransacciones,
        totalSucursales: data.totalSucursales,
        totalProductos: data.totalProductos
      }
    });
  });
};

// ==========================================
// NIVEL 2: Ranking de Sucursales
// ==========================================

/**
 * Obtener ranking de sucursales con semaforización
 */
const getRankingSucursales = (req, res) => {
  const { fechaInicio, fechaFin } = req.query;

  const joinConditions = [];
  const params = [];

  if (fechaInicio) {
    joinConditions.push('c.Fecha >= ?');
    params.push(fechaInicio);
  }

  if (fechaFin) {
    joinConditions.push('c.Fecha < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(fechaFin);
  }

  const dateFilterJoin = joinConditions.length 
    ? ` AND ${joinConditions.join(' AND ')}`
    : '';

  const query = `
    SELECT 
      s.Id as id,
      s.Nombre as nombre,
      s.Ubicacion as ubicacion,
      COALESCE(SUM(c.Total), 0) as ventasTotales,
      COUNT(c.Id) as numeroCompras,
      COALESCE(AVG(c.Total), 0) as ticketPromedio,
      -- Meta de ventas (si existe en la tabla)
      0 as metaVentas
    FROM Sucursales s
    LEFT JOIN Compras c ON s.Id = c.Sucursal_Id${dateFilterJoin}
    GROUP BY s.Id, s.Nombre, s.Ubicacion
    ORDER BY ventasTotales DESC
  `;

  db.query(query, params, (error, results) => {
    if (error) {
      console.error('❌ Error al obtener ranking de sucursales:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el ranking'
      });
    }

    // Calcular el total general para porcentajes
    const totalGeneral = results.reduce((sum, s) => sum + parseFloat(s.ventasTotales), 0);

    // Agregar semaforización a cada sucursal
    const sucursalesConSemaforo = results.map((sucursal, index) => {
      const porcentajeDelTotal = totalGeneral > 0 
        ? (parseFloat(sucursal.ventasTotales) / totalGeneral * 100).toFixed(2)
        : 0;

      // Lógica de semaforización
      let estado;
      let color;
      if (parseFloat(porcentajeDelTotal) >= 30) {
        estado = 'Excelente';
        color = 'verde';
      } else if (parseFloat(porcentajeDelTotal) >= 15) {
        estado = 'Bueno';
        color = 'amarillo';
      } else {
        estado = 'Bajo';
        color = 'rojo';
      }

      return {
        ...sucursal,
        ranking: index + 1,
        porcentajeDelTotal: parseFloat(porcentajeDelTotal),
        ventasTotales: parseFloat(sucursal.ventasTotales),
        ticketPromedio: parseFloat(sucursal.ticketPromedio),
        estado,
        color
      };
    });

    console.log('✅ Ranking de sucursales obtenido');

    res.status(200).json({
      success: true,
      message: 'Ranking obtenido exitosamente',
      data: sucursalesConSemaforo
    });
  });
};

// ==========================================
// Ventas por Categoría
// ==========================================

/**
 * Obtener ventas agrupadas por categoría de producto
 */
const getVentasPorCategoria = (req, res) => {
  const { sucursalId, fechaInicio, fechaFin } = req.query;

  const filters = [];
  const params = [];

  const sucursalIdNumber = sucursalId ? parseInt(sucursalId, 10) : null;

  if (sucursalId && Number.isNaN(sucursalIdNumber)) {
    return res.status(400).json({
      success: false,
      message: 'ID de sucursal inválido'
    });
  }

  if (sucursalId) {
    filters.push('comp.Sucursal_Id = ?');
    params.push(sucursalIdNumber);
  }

  if (fechaInicio) {
    filters.push('comp.Fecha >= ?');
    params.push(fechaInicio);
  }

  if (fechaFin) {
    filters.push('comp.Fecha < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(fechaFin);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const query = `
    SELECT 
      cat.Nombre as categoria,
      COUNT(DISTINCT dc.Compra_Id) as numeroVentas,
      SUM(dc.Cantidad) as unidadesVendidas,
      SUM(dc.Cantidad * dc.Precio_Compra) as ingresoTotal
    FROM Categoria cat
    JOIN Producto p ON cat.Id = p.Categoria_Id
    JOIN Detalle_Compra dc ON p.Id = dc.Producto_Id
    JOIN Compras comp ON dc.Compra_Id = comp.Id
    ${whereClause}
    GROUP BY cat.Id, cat.Nombre
    ORDER BY ingresoTotal DESC
  `;

  db.query(query, params, (error, results) => {
    if (error) {
      console.error('❌ Error al obtener ventas por categoría:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener ventas por categoría'
      });
    }

    const datosFormateados = results.map(r => ({
      categoria: r.categoria,
      numeroVentas: r.numeroVentas,
      unidadesVendidas: r.unidadesVendidas,
      ingresoTotal: parseFloat(r.ingresoTotal)
    }));

    console.log('✅ Ventas por categoría obtenidas');

    res.status(200).json({
      success: true,
      message: 'Ventas por categoría obtenidas exitosamente',
      data: datosFormateados
    });
  });
};

// ==========================================
// Top Productos Más Vendidos
// ==========================================

/**
 * Obtener los productos más vendidos
 */
const getTopProductos = (req, res) => {
  const { limit = 10 } = req.query;

  const query = `
    SELECT 
      p.Id as id,
      p.Nombre as nombre,
      cat.Nombre as categoria,
      p.Precio_Uni as precioUnitario,
      SUM(dc.Cantidad) as unidadesVendidas,
      SUM(dc.Cantidad * dc.Precio_Compra) as ingresoTotal,
      COUNT(DISTINCT dc.Compra_Id) as numeroTransacciones
    FROM Producto p
    JOIN Categoria cat ON p.Categoria_Id = cat.Id
    JOIN Detalle_Compra dc ON p.Id = dc.Producto_Id
    GROUP BY p.Id, p.Nombre, cat.Nombre, p.Precio_Uni
    ORDER BY unidadesVendidas DESC
    LIMIT ?
  `;

  db.query(query, [parseInt(limit)], (error, results) => {
    if (error) {
      console.error('❌ Error al obtener top productos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener productos más vendidos'
      });
    }

    const datosFormateados = results.map(r => ({
      ...r,
      precioUnitario: parseFloat(r.precioUnitario),
      ingresoTotal: parseFloat(r.ingresoTotal)
    }));

    console.log('✅ Top productos obtenidos');

    res.status(200).json({
      success: true,
      message: 'Top productos obtenidos exitosamente',
      data: datosFormateados
    });
  });
};

// ==========================================
// Ventas por Período (para gráficos)
// ==========================================

/**
 * Obtener ventas agrupadas por día/semana/mes
 */
const getVentasPorPeriodo = (req, res) => {
  const { periodo = 'dia', dias = 30 } = req.query;

  let groupBy;
  let dateFormat;

  switch(periodo) {
    case 'mes':
      groupBy = 'YEAR(Fecha), MONTH(Fecha)';
      dateFormat = "DATE_FORMAT(Fecha, '%Y-%m-01')";
      break;
    case 'semana':
      groupBy = 'YEARWEEK(Fecha)';
      dateFormat = "DATE_FORMAT(Fecha, '%Y-%m-%d')";
      break;
    default: // día
      groupBy = 'DATE(Fecha)';
      dateFormat = "DATE(Fecha)";
  }

  const query = `
    SELECT 
      ${dateFormat} as fecha,
      SUM(Total) as totalVentas,
      COUNT(*) as numeroTransacciones,
      AVG(Total) as ticketPromedio
    FROM Compras
    WHERE Fecha >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY ${groupBy}
    ORDER BY fecha ASC
  `;

  db.query(query, [parseInt(dias)], (error, results) => {
    if (error) {
      console.error('❌ Error al obtener ventas por período:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener ventas por período'
      });
    }

    const datosFormateados = results.map(r => ({
      fecha: r.fecha,
      totalVentas: parseFloat(r.totalVentas),
      numeroTransacciones: r.numeroTransacciones,
      ticketPromedio: parseFloat(r.ticketPromedio)
    }));

    console.log('✅ Ventas por período obtenidas');

    res.status(200).json({
      success: true,
      message: 'Ventas por período obtenidas exitosamente',
      data: datosFormateados
    });
  });
};

// Exportar todas las funciones
module.exports = {
  getGeneralKPIs,
  getRankingSucursales,
  getVentasPorCategoria,
  getTopProductos,
  getVentasPorPeriodo
};

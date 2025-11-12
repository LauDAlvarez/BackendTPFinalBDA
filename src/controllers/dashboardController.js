// backend/src/controllers/dashboardController.js
// Controlador para los KPIs del Dashboard

const db = require('../config/database');

const executeQuery = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.query(query, params, (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results);
    });
  });

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
      
      -- Promedio mensual (Ãºltimos 30 dÃ­as)
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
      
      -- NÃºmero total de compras/transacciones
      (SELECT COUNT(*) FROM Compras) as totalTransacciones,
      
      -- NÃºmero de sucursales
      (SELECT COUNT(*) FROM Sucursales) as totalSucursales,
      
      -- NÃºmero de productos
      (SELECT COUNT(*) FROM Producto) as totalProductos
  `;

  db.query(query, (error, results) => {
    if (error) {
      console.error('âŒ Error al obtener KPIs generales:', error);
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

    console.log('âœ… KPIs generales obtenidos');

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
 * Obtener ranking de sucursales con semaforizaciÃ³n
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
      console.error('âŒ Error al obtener ranking de sucursales:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el ranking'
      });
    }

    // Calcular el total general para porcentajes
    const totalGeneral = results.reduce((sum, s) => sum + parseFloat(s.ventasTotales), 0);

    // Agregar semaforizaciÃ³n a cada sucursal
    const sucursalesConSemaforo = results.map((sucursal, index) => {
      const porcentajeDelTotal = totalGeneral > 0 
        ? (parseFloat(sucursal.ventasTotales) / totalGeneral * 100).toFixed(2)
        : 0;

      // LÃ³gica de semaforizaciÃ³n
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

    console.log('âœ… Ranking de sucursales obtenido');

    res.status(200).json({
      success: true,
      message: 'Ranking obtenido exitosamente',
      data: sucursalesConSemaforo
    });
  });
};

// ==========================================
// Ventas por CategorÃ­a
// ==========================================

/**
 * Obtener ventas agrupadas por categorÃ­a de producto
 */
const getVentasPorCategoria = (req, res) => {
  const { sucursalId, fechaInicio, fechaFin } = req.query;

  const filters = [];
  const params = [];

  const sucursalIdNumber = sucursalId ? parseInt(sucursalId, 10) : null;

  if (sucursalId && Number.isNaN(sucursalIdNumber)) {
    return res.status(400).json({
      success: false,
      message: 'ID de sucursal invÃ¡lido'
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
      console.error('âŒ Error al obtener ventas por categorÃ­a:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener ventas por categorÃ­a'
      });
    }

    const datosFormateados = results.map(r => ({
      categoria: r.categoria,
      numeroVentas: r.numeroVentas,
      unidadesVendidas: r.unidadesVendidas,
      ingresoTotal: parseFloat(r.ingresoTotal)
    }));

    console.log('âœ… Ventas por categorÃ­a obtenidas');

    res.status(200).json({
      success: true,
      message: 'Ventas por categorÃ­a obtenidas exitosamente',
      data: datosFormateados
    });
  });
};

// ==========================================
// Top Productos MÃ¡s Vendidos
// ==========================================

/**
 * Obtener los productos mÃ¡s vendidos
 */
const getTopProductos = (req, res) => {
  const { limit = 10, sucursalId, fechaInicio, fechaFin } = req.query;

  const filters = [];
  const params = [];

  if (sucursalId && !isNaN(Number(sucursalId))) {
    filters.push('c.Sucursal_Id = ?');
    params.push(Number(sucursalId));
  }

  if (fechaInicio) {
    filters.push('c.Fecha >= ?');
    params.push(fechaInicio);
  }

  if (fechaFin) {
    filters.push('c.Fecha < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(fechaFin);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

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
    JOIN Compras c ON dc.Compra_Id = c.Id
    ${whereClause}
    GROUP BY p.Id, p.Nombre, cat.Nombre, p.Precio_Uni
    ORDER BY unidadesVendidas DESC
    LIMIT ?
  `;

  db.query(query, [...params, parseInt(limit)], (error, results) => {
    if (error) {
      console.error('âŒ Error al obtener top productos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener productos mÃ¡s vendidos'
      });
    }

    const datosFormateados = results.map(r => ({
      ...r,
      precioUnitario: parseFloat(r.precioUnitario),
      ingresoTotal: parseFloat(r.ingresoTotal)
    }));

    console.log('âœ… Top productos obtenidos');

    res.status(200).json({
      success: true,
      message: 'Top productos obtenidos exitosamente',
      data: datosFormateados
    });
  });
};

// ==========================================
// Ventas por PerÃ­odo (para grÃ¡ficos)
// ==========================================

/**
 * Obtener ventas agrupadas por dÃ­a/semana/mes
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
    default: // dÃ­a
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
      console.error('âŒ Error al obtener ventas por perÃ­odo:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener ventas por perÃ­odo'
      });
    }

    const datosFormateados = results.map(r => ({
      fecha: r.fecha,
      totalVentas: parseFloat(r.totalVentas),
      numeroTransacciones: r.numeroTransacciones,
      ticketPromedio: parseFloat(r.ticketPromedio)
    }));

    console.log('âœ… Ventas por perÃ­odo obtenidas');

    res.status(200).json({
      success: true,
      message: 'Ventas por perÃ­odo obtenidas exitosamente',
      data: datosFormateados
    });
  });
};
/**
 * Obtener KPIs y productos vendidos por un vendedor específico
 */
const getVendedorDetalle = async (req, res) => {
  const { id } = req.params;
  const { fechaInicio, fechaFin } = req.query;

  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de vendedor invA�lido'
    });
  }

  const dateFilters = [];
  const dateParams = [];

  if (fechaInicio) {
    dateFilters.push('c.Fecha >= ?');
    dateParams.push(fechaInicio);
  }

  if (fechaFin) {
    dateFilters.push('c.Fecha < DATE_ADD(?, INTERVAL 1 DAY)');
    dateParams.push(fechaFin);
  }

  const dateClause = dateFilters.length ? ` AND ${dateFilters.join(' AND ')}` : '';

  try {
    const vendedorRows = await executeQuery(
      `
        SELECT 
          v.Id as id,
          v.Nombre as nombre,
          v.Apellido as apellido,
          v.Dni as dni,
          v.Sucursal_Id as sucursalId,
          s.Nombre as sucursalNombre,
          s.Ubicacion as sucursalUbicacion
        FROM Vendedores v
        JOIN Sucursales s ON v.Sucursal_Id = s.Id
        WHERE v.Id = ?
      `,
      [id]
    );

    if (!vendedorRows.length) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor no encontrado'
      });
    }

    const vendedor = vendedorRows[0];

    const ventasRows = await executeQuery(
      `
        SELECT 
          COALESCE(SUM(c.Total), 0) as ventasTotales,
          COUNT(c.Id) as numeroVentas,
          COALESCE(AVG(c.Total), 0) as ticketPromedio
        FROM Compras c
        WHERE c.Vendedor_Id = ?${dateClause}
      `,
      [id, ...dateParams]
    );

    const productoStatsRows = await executeQuery(
      `
        SELECT 
          COALESCE(SUM(dc.Cantidad), 0) as unidadesVendidas,
          COUNT(DISTINCT dc.Producto_Id) as productosVendidos
        FROM Detalle_Compra dc
        JOIN Compras c ON dc.Compra_Id = c.Id
        WHERE c.Vendedor_Id = ?${dateClause}
      `,
      [id, ...dateParams]
    );

    const timelineRows = await executeQuery(
      `
        SELECT 
          MIN(c.Fecha) as primeraVenta,
          MAX(c.Fecha) as ultimaVenta
        FROM Compras c
        WHERE c.Vendedor_Id = ?${dateClause}
      `,
      [id, ...dateParams]
    );

    const sucursalVentasRows = await executeQuery(
      `
        SELECT COALESCE(SUM(c.Total), 0) as ventasSucursal
        FROM Compras c
        WHERE c.Sucursal_Id = ?${dateClause}
      `,
      [vendedor.sucursalId, ...dateParams]
    );

    const productosRows = await executeQuery(
      `
        SELECT 
          p.Id as id,
          p.Nombre as nombre,
          p.Descripcion as descripcion,
          cat.Nombre as categoria,
          p.Precio_Uni as precioUnitario,
          SUM(dc.Cantidad) as unidadesVendidas,
          SUM(dc.Cantidad * dc.Precio_Compra) as ingresoTotal,
          COUNT(DISTINCT dc.Compra_Id) as numeroTransacciones
        FROM Detalle_Compra dc
        JOIN Producto p ON dc.Producto_Id = p.Id
        JOIN Categoria cat ON p.Categoria_Id = cat.Id
        JOIN Compras c ON dc.Compra_Id = c.Id
        WHERE c.Vendedor_Id = ?${dateClause}
        GROUP BY p.Id, p.Nombre, p.Descripcion, cat.Nombre, p.Precio_Uni
        ORDER BY ingresoTotal DESC
        LIMIT 12
      `,
      [id, ...dateParams]
    );

    const ventasData = ventasRows[0] || {
      ventasTotales: 0,
      numeroVentas: 0,
      ticketPromedio: 0
    };
    const productoStats = productoStatsRows[0] || {
      unidadesVendidas: 0,
      productosVendidos: 0
    };
    const timeline = timelineRows[0] || {
      primeraVenta: null,
      ultimaVenta: null
    };
    const ventasSucursal = sucursalVentasRows[0]?.ventasSucursal || 0;
    const participacion =
      ventasSucursal > 0
        ? parseFloat(((ventasData.ventasTotales / ventasSucursal) * 100).toFixed(2))
        : 0;

    const productos = productosRows.map((producto) => ({
      ...producto,
      precioUnitario: parseFloat(producto.precioUnitario),
      ingresoTotal: parseFloat(producto.ingresoTotal)
    }));

    res.status(200).json({
      success: true,
      message: 'Detalle de vendedor obtenido exitosamente',
      data: {
        vendedor: {
          id: vendedor.id,
          nombre: vendedor.nombre,
          apellido: vendedor.apellido,
          dni: vendedor.dni,
          sucursalId: vendedor.sucursalId,
          sucursalNombre: vendedor.sucursalNombre,
          sucursalUbicacion: vendedor.sucursalUbicacion
        },
        stats: {
          ventasTotales: parseFloat(ventasData.ventasTotales || 0),
          numeroVentas: ventasData.numeroVentas || 0,
          ticketPromedio: parseFloat(ventasData.ticketPromedio || 0),
          unidadesVendidas: Number(productoStats.unidadesVendidas || 0),
          productosVendidos: Number(productoStats.productosVendidos || 0),
          participacionSucursal: participacion,
          primeraVenta: timeline.primeraVenta,
          ultimaVenta: timeline.ultimaVenta
        },
        productos
      }
    });
  } catch (error) {
    console.error('Error al obtener detalle del vendedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener detalle del vendedor'
    });
  }
};

// Exportar todas las funciones
module.exports = {
  getGeneralKPIs,
  getRankingSucursales,
  getVentasPorCategoria,
  getTopProductos,
  getVentasPorPeriodo,
  getVendedorDetalle
};


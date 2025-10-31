// backend/src/controllers/sucursalesController.js
// Controlador para gestión de sucursales

const db = require('../config/database');

const runQuery = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.query(query, params, (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results);
    });
  });

// ==========================================
// OBTENER TODAS LAS SUCURSALES
// ==========================================
const getAllSucursales = (req, res) => {
  const query = `
    SELECT 
      s.Id as id,
      s.Nombre as nombre,
      s.Ubicacion as ubicacion,
      s.Telefono as telefono,
      COUNT(DISTINCT v.Id) as numeroVendedores,
      COUNT(DISTINCT i.Producto_Id) as numeroProductos,
      COALESCE(SUM(c.Total), 0) as ventasTotales,
      COUNT(DISTINCT c.Id) as numeroVentas
    FROM Sucursales s
    LEFT JOIN Vendedores v ON s.Id = v.Sucursal_Id
    LEFT JOIN Inventario i ON s.Id = i.Sucursal_Id
    LEFT JOIN Compras c ON s.Id = c.Sucursal_Id
    GROUP BY s.Id, s.Nombre, s.Ubicacion, s.Telefono
    ORDER BY s.Nombre ASC
  `;

  db.query(query, (error, results) => {
    if (error) {
      console.error('❌ Error al obtener sucursales:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener sucursales'
      });
    }

    const sucursalesFormateadas = results.map(s => ({
      ...s,
      ventasTotales: parseFloat(s.ventasTotales),
      telefono: s.telefono ? s.telefono.toString() : null
    }));

    console.log(`✅ Se obtuvieron ${results.length} sucursales`);

    res.status(200).json({
      success: true,
      message: 'Sucursales obtenidas exitosamente',
      count: results.length,
      data: sucursalesFormateadas
    });
  });
};

// ==========================================
// OBTENER SUCURSAL POR ID
// ==========================================
const getSucursalById = (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de sucursal inválido'
    });
  }

  const query = `
    SELECT 
      s.Id as id,
      s.Nombre as nombre,
      s.Ubicacion as ubicacion,
      s.Telefono as telefono,
      COUNT(DISTINCT v.Id) as numeroVendedores,
      COUNT(DISTINCT i.Producto_Id) as numeroProductos,
      COALESCE(SUM(c.Total), 0) as ventasTotales,
      COUNT(DISTINCT c.Id) as numeroVentas
    FROM Sucursales s
    LEFT JOIN Vendedores v ON s.Id = v.Sucursal_Id
    LEFT JOIN Inventario i ON s.Id = i.Sucursal_Id
    LEFT JOIN Compras c ON s.Id = c.Sucursal_Id
    WHERE s.Id = ?
    GROUP BY s.Id, s.Nombre, s.Ubicacion, s.Telefono
  `;

  db.query(query, [id], (error, results) => {
    if (error) {
      console.error('❌ Error al obtener sucursal:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener la sucursal'
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    const sucursal = {
      ...results[0],
      ventasTotales: parseFloat(results[0].ventasTotales),
      telefono: results[0].telefono ? results[0].telefono.toString() : null
    };

    console.log(`✅ Sucursal obtenida: ${sucursal.nombre}`);

    res.status(200).json({
      success: true,
      message: 'Sucursal obtenida exitosamente',
      data: sucursal
    });
  });
};

// ==========================================
// OBTENER VENDEDORES DE UNA SUCURSAL
// ==========================================
const getVendedoresBySucursal = (req, res) => {
  const { id } = req.params;
  const { fechaInicio, fechaFin } = req.query;

  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de sucursal inválido'
    });
  }

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
      v.Id as id,
      v.Nombre as nombre,
      v.Apellido as apellido,
      v.Dni as dni,
      COUNT(DISTINCT c.Id) as numeroVentas,
      COALESCE(SUM(c.Total), 0) as ventasTotales
    FROM Vendedores v
    LEFT JOIN Compras c ON v.Id = c.Vendedor_Id${dateFilterJoin}
    WHERE v.Sucursal_Id = ?
    GROUP BY v.Id, v.Nombre, v.Apellido, v.Dni
    ORDER BY ventasTotales DESC
  `;

  params.push(id);

  db.query(query, params, (error, results) => {
    if (error) {
      console.error('❌ Error al obtener vendedores:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener vendedores'
      });
    }

    const vendedores = results.map(v => ({
      ...v,
      ventasTotales: parseFloat(v.ventasTotales)
    }));

    console.log(`✅ Se obtuvieron ${results.length} vendedores`);

    res.status(200).json({
      success: true,
      message: 'Vendedores obtenidos exitosamente',
      count: results.length,
      data: vendedores
    });
  });
};

// ==========================================
// OBTENER INVENTARIO DE UNA SUCURSAL
// ==========================================
const getInventarioBySucursal = (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de sucursal inválido'
    });
  }

  const query = `
    SELECT 
      p.Id as id,
      p.Nombre as nombre,
      p.Descripcion as descripcion,
      p.Precio_Uni as precio,
      c.Nombre as categoria,
      i.Cantidad_stock as stock
    FROM Inventario i
    JOIN Producto p ON i.Producto_Id = p.Id
    JOIN Categoria c ON p.Categoria_Id = c.Id
    WHERE i.Sucursal_Id = ?
    ORDER BY i.Cantidad_stock DESC, p.Nombre ASC
  `;

  db.query(query, [id], (error, results) => {
    if (error) {
      console.error('❌ Error al obtener inventario:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener inventario'
      });
    }

    const inventario = results.map(item => ({
      ...item,
      precio: parseFloat(item.precio)
    }));

    console.log(`✅ Se obtuvieron ${results.length} productos en inventario`);

    res.status(200).json({
      success: true,
      message: 'Inventario obtenido exitosamente',
      count: results.length,
      data: inventario
    });
  });
};

// ==========================================
// CREAR NUEVA SUCURSAL
// ==========================================
const createSucursal = (req, res) => {
  const { nombre, ubicacion, telefono } = req.body;

  // Validaciones
  if (!nombre || !ubicacion) {
    return res.status(400).json({
      success: false,
      message: 'Nombre y ubicación son requeridos'
    });
  }

  if (telefono && isNaN(telefono)) {
    return res.status(400).json({
      success: false,
      message: 'El teléfono debe ser un número'
    });
  }

  const query = 'INSERT INTO Sucursales (Nombre, Ubicacion, Telefono) VALUES (?, ?, ?)';

  db.query(query, [nombre, ubicacion, telefono || null], (error, results) => {
    if (error) {
      console.error('❌ Error al crear sucursal:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear la sucursal'
      });
    }

    console.log(`✅ Sucursal creada: ${nombre}`);

    res.status(201).json({
      success: true,
      message: 'Sucursal creada exitosamente',
      data: {
        id: results.insertId,
        nombre,
        ubicacion,
        telefono: telefono || null
      }
    });
  });
};

// ==========================================
// ACTUALIZAR SUCURSAL
// ==========================================
const updateSucursal = (req, res) => {
  const { id } = req.params;
  const { nombre, ubicacion, telefono } = req.body;

  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de sucursal inválido'
    });
  }

  if (!nombre && !ubicacion && !telefono) {
    return res.status(400).json({
      success: false,
      message: 'Debe proporcionar al menos un campo para actualizar'
    });
  }

  if (telefono && isNaN(telefono)) {
    return res.status(400).json({
      success: false,
      message: 'El teléfono debe ser un número'
    });
  }

  // Construir query dinámica
  let updateFields = [];
  let values = [];

  if (nombre) {
    updateFields.push('Nombre = ?');
    values.push(nombre);
  }

  if (ubicacion) {
    updateFields.push('Ubicacion = ?');
    values.push(ubicacion);
  }

  if (telefono !== undefined) {
    updateFields.push('Telefono = ?');
    values.push(telefono || null);
  }

  values.push(id);

  const query = `UPDATE Sucursales SET ${updateFields.join(', ')} WHERE Id = ?`;

  db.query(query, values, (error, results) => {
    if (error) {
      console.error('❌ Error al actualizar sucursal:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar la sucursal'
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    console.log(`✅ Sucursal actualizada: ID ${id}`);

    res.status(200).json({
      success: true,
      message: 'Sucursal actualizada exitosamente'
    });
  });
};

// ==========================================
// ELIMINAR SUCURSAL
// ==========================================
const deleteSucursal = (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de sucursal inválido'
    });
  }

  const query = 'DELETE FROM Sucursales WHERE Id = ?';

  db.query(query, [id], (error, results) => {
    if (error) {
      console.error('❌ Error al eliminar sucursal:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar la sucursal'
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    console.log(`✅ Sucursal eliminada: ID ${id}`);

    res.status(200).json({
      success: true,
      message: 'Sucursal eliminada exitosamente'
    });
  });
};

// ==========================================
// ESTADÍSTICAS DE SUCURSALES
// ==========================================
const getSucursalesStats = async (req, res) => {
  try {
    const sucursalesMetricsQuery = `
      SELECT 
        s.Id as id,
        s.Nombre as nombre,
        COALESCE(v.cantidad, 0) as numeroVendedores,
        COALESCE(stock.totalStock, 0) as stockTotal,
        COALESCE(stock.productos, 0) as numeroProductos,
        COALESCE(vent.totalVentas, 0) as ventasTotales,
        COALESCE(vent.numeroVentas, 0) as numeroVentas
      FROM Sucursales s
      LEFT JOIN (
        SELECT Sucursal_Id, COUNT(*) as cantidad
        FROM Vendedores
        GROUP BY Sucursal_Id
      ) v ON v.Sucursal_Id = s.Id
      LEFT JOIN (
        SELECT 
          Sucursal_Id, 
          COALESCE(SUM(Cantidad_stock), 0) as totalStock,
          COUNT(DISTINCT Producto_Id) as productos
        FROM Inventario
        GROUP BY Sucursal_Id
      ) stock ON stock.Sucursal_Id = s.Id
      LEFT JOIN (
        SELECT 
          Sucursal_Id, 
          COALESCE(SUM(Total), 0) as totalVentas,
          COUNT(*) as numeroVentas
        FROM Compras
        GROUP BY Sucursal_Id
      ) vent ON vent.Sucursal_Id = s.Id
      ORDER BY ventasTotales DESC, nombre ASC
    `;

    const ventasUltimoMesQuery = `
      SELECT 
        COALESCE(SUM(Total), 0) as ventasUltimoMes,
        COALESCE(AVG(Total), 0) as ticketPromedio,
        COUNT(*) as transaccionesUltimoMes
      FROM Compras
      WHERE Fecha >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `;

    const ventasMensualesQuery = `
      SELECT 
        DATE_FORMAT(Fecha, '%Y-%m-01') as periodo,
        DATE_FORMAT(Fecha, '%b %Y') as etiqueta,
        COALESCE(SUM(Total), 0) as totalVentas,
        COUNT(*) as numeroVentas
      FROM Compras
      WHERE Fecha >= DATE_SUB(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL 5 MONTH)
      GROUP BY DATE_FORMAT(Fecha, '%Y-%m')
      ORDER BY periodo ASC
    `;

    const [sucursalesRaw, ventasUltimoMesRaw, ventasMensualesRaw] = await Promise.all([
      runQuery(sucursalesMetricsQuery),
      runQuery(ventasUltimoMesQuery),
      runQuery(ventasMensualesQuery)
    ]);

    const sucursalesData = sucursalesRaw.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      numeroVendedores: Number(row.numeroVendedores || 0),
      stockTotal: Number(row.stockTotal || 0),
      numeroProductos: Number(row.numeroProductos || 0),
      ventasTotales: parseFloat(row.ventasTotales || 0),
      numeroVentas: Number(row.numeroVentas || 0)
    }));

    const totalSucursales = sucursalesData.length;
    const totalVentas = sucursalesData.reduce((acc, row) => acc + row.ventasTotales, 0);
    const totalVendedores = sucursalesData.reduce((acc, row) => acc + row.numeroVendedores, 0);
    const totalProductosEnStock = sucursalesData.reduce((acc, row) => acc + row.stockTotal, 0);
    const sucursalesConVentas = sucursalesData.filter((row) => row.ventasTotales > 0).length;

    const ventasPorSucursal = sucursalesData.map((row) => ({
      ...row,
      porcentajeParticipacion: totalVentas > 0
        ? parseFloat(((row.ventasTotales / totalVentas) * 100).toFixed(1))
        : 0
    }));

    const mejorSucursal = ventasPorSucursal[0] || null;
    const sucursalConMenorVentas =
      ventasPorSucursal.length > 0 ? ventasPorSucursal[ventasPorSucursal.length - 1] : null;

    const resumenVentas = ventasUltimoMesRaw[0] || {
      ventasUltimoMes: 0,
      ticketPromedio: 0,
      transaccionesUltimoMes: 0
    };

    const ventasMensuales = ventasMensualesRaw.map((row) => ({
      periodo: row.periodo,
      etiqueta: row.etiqueta,
      totalVentas: parseFloat(row.totalVentas || 0),
      numeroVentas: Number(row.numeroVentas || 0)
    }));

    console.log('Estadisticas de sucursales obtenidas con informacion ampliada');

    res.status(200).json({
      success: true,
      message: 'Estadisticas obtenidas exitosamente',
      data: {
        totalSucursales,
        sucursalesConVentas,
        sucursalesSinVentas: Math.max(totalSucursales - sucursalesConVentas, 0),
        totalVendedores,
        totalProductosEnStock,
        ventasTotales: parseFloat(totalVentas.toFixed(2)),
        ventasUltimoMes: parseFloat((resumenVentas.ventasUltimoMes || 0).toFixed(2)),
        promedioVentasSucursal: totalSucursales > 0
          ? parseFloat((totalVentas / totalSucursales).toFixed(2))
          : 0,
        ticketPromedioUltimoMes: parseFloat((resumenVentas.ticketPromedio || 0).toFixed(2)),
        transaccionesUltimoMes: Number(resumenVentas.transaccionesUltimoMes || 0),
        mejorSucursal,
        sucursalConMenorVentas,
        ventasPorSucursal,
        ventasMensuales
      }
    });
  } catch (error) {
    console.error('Error al obtener estadisticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadisticas'
    });
  }
};

module.exports = {
  getAllSucursales,
  getSucursalById,
  getVendedoresBySucursal,
  getInventarioBySucursal,
  createSucursal,
  updateSucursal,
  deleteSucursal,
  getSucursalesStats
};




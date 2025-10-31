const db = require('../config/database');

const getAllProductos = (req, res) => {
  // Query para obtener todos los usuarios (sin mostrar las contraseñas)
  const query = `
    SELECT 
      Id as id,
      Nombre as nombre,
      Descripcion as descripcion,
      Precio_Uni as precioUni,
      Categoria_Id as categoriaId
    FROM Producto
    ORDER BY Id DESC
  `;

  db.query(query, (error, results) => {
    if (error) {
      console.error('❌ Error al obtener los productos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener la lista de productos'
      });
    }

    console.log(`✅ Se obtuvieron ${results.length} productos`);

    res.status(200).json({
      success: true,
      message: 'Productos obtenidos exitosamente',
      count: results.length,
      products: results
    });
  });
};

const getProductsById = (req, res) => {
  const { id } = req.params;

  // Validar que el ID sea un número
  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID del producto inválido'
    });
  }

  const query = `
    SELECT 
      Id as id,
      Nombre as nombre,
      Descripcion as descripcion,
      Precio_Uni as precioUni,
      Categoria_Id as categoriaId
    FROM Producto
    WHERE Id = ?
  `;

  db.query(query, [id], (error, results) => {
    if (error) {
      console.error('❌ Error al obtener el producto:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el producto'
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    console.log(`✅ Producto obtenido: ${results[0].nombre}`);

    res.status(200).json({
      success: true,
      message: 'Producto obtenido exitosamente',
      user: results[0]
    });
  });
};



module.exports = {
  getAllProductos,
  getProductsById
};
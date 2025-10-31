// backend/src/controllers/usersController.js
// Controlador para gestión completa de usuarios

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
// OBTENER TODOS LOS USUARIOS
// ==========================================
const getAllUsers = (req, res) => {
  // Query para obtener todos los usuarios (sin mostrar las contraseñas)
  const query = `
    SELECT 
      Id as id,
      Usuario as usuario,
      Mail as mail,
      Fecha_Crea as fechaCreacion
    FROM Usuarios
    ORDER BY Fecha_Crea DESC
  `;

  db.query(query, (error, results) => {
    if (error) {
      console.error('❌ Error al obtener usuarios:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener la lista de usuarios'
      });
    }

    console.log(`✅ Se obtuvieron ${results.length} usuarios`);

    res.status(200).json({
      success: true,
      message: 'Usuarios obtenidos exitosamente',
      count: results.length,
      users: results
    });
  });
};

// ==========================================
// OBTENER UN USUARIO POR ID
// ==========================================
const getUserById = (req, res) => {
  const { id } = req.params;

  // Validar que el ID sea un número
  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de usuario inválido'
    });
  }

  const query = `
    SELECT 
      Id as id,
      Usuario as usuario,
      Mail as mail,
      Fecha_Crea as fechaCreacion
    FROM Usuarios
    WHERE Id = ?
  `;

  db.query(query, [id], (error, results) => {
    if (error) {
      console.error('❌ Error al obtener usuario:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el usuario'
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    console.log(`✅ Usuario obtenido: ${results[0].usuario}`);

    res.status(200).json({
      success: true,
      message: 'Usuario obtenido exitosamente',
      user: results[0]
    });
  });
};

// ==========================================
// BUSCAR USUARIOS POR NOMBRE O EMAIL
// ==========================================
const searchUsers = (req, res) => {
  const { search } = req.query;

  if (!search || search.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Parámetro de búsqueda requerido'
    });
  }

  const searchTerm = `%${search}%`;
  const query = `
    SELECT 
      Id as id,
      Usuario as usuario,
      Mail as mail,
      Fecha_Crea as fechaCreacion
    FROM Usuarios
    WHERE Usuario LIKE ? OR Mail LIKE ?
    ORDER BY Fecha_Crea DESC
  `;

  db.query(query, [searchTerm, searchTerm], (error, results) => {
    if (error) {
      console.error('❌ Error al buscar usuarios:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al buscar usuarios'
      });
    }

    console.log(`✅ Búsqueda completada: ${results.length} resultados`);

    res.status(200).json({
      success: true,
      message: 'Búsqueda completada',
      count: results.length,
      users: results
    });
  });
};

// ==========================================
// ACTUALIZAR USUARIO
// ==========================================
const updateUser = (req, res) => {
  const { id } = req.params;
  const { usuario, mail } = req.body;

  // Validar ID
  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de usuario inválido'
    });
  }

  // Validar que al menos un campo venga para actualizar
  if (!usuario && !mail) {
    return res.status(400).json({
      success: false,
      message: 'Debe proporcionar al menos un campo para actualizar (usuario o mail)'
    });
  }

  // Validar formato de email si se proporciona
  if (mail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del email no es válido'
      });
    }
  }

  // Construir la query dinámicamente según los campos a actualizar
  let updateFields = [];
  let values = [];

  if (usuario) {
    updateFields.push('Usuario = ?');
    values.push(usuario);
  }

  if (mail) {
    updateFields.push('Mail = ?');
    values.push(mail);
  }

  values.push(id); // Agregar el ID al final para el WHERE

  const query = `UPDATE Usuarios SET ${updateFields.join(', ')} WHERE Id = ?`;

  db.query(query, values, (error, results) => {
    if (error) {
      console.error('❌ Error al actualizar usuario:', error);
      
      // Verificar si es un error de duplicado
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          message: 'El usuario o email ya está en uso'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error al actualizar el usuario'
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    console.log(`✅ Usuario actualizado: ID ${id}`);

    // Obtener los datos actualizados del usuario
    const selectQuery = `
      SELECT 
        Id as id,
        Usuario as usuario,
        Mail as mail,
        Fecha_Crea as fechaCreacion
      FROM Usuarios
      WHERE Id = ?
    `;

    db.query(selectQuery, [id], (error, results) => {
      if (error) {
        return res.status(200).json({
          success: true,
          message: 'Usuario actualizado exitosamente'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        user: results[0]
      });
    });
  });
};

// ==========================================
// ELIMINAR USUARIO
// ==========================================
const deleteUser = (req, res) => {
  const { id } = req.params;

  // Validar ID
  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de usuario inválido'
    });
  }

  // Prevenir eliminación del usuario admin (ID 1)
  if (id === '1') {
    return res.status(403).json({
      success: false,
      message: 'No se puede eliminar el usuario administrador'
    });
  }

  const query = 'DELETE FROM Usuarios WHERE Id = ?';

  db.query(query, [id], (error, results) => {
    if (error) {
      console.error('❌ Error al eliminar usuario:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar el usuario'
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    console.log(`✅ Usuario eliminado: ID ${id}`);

    res.status(200).json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  });
};

// ==========================================
// CAMBIAR CONTRASEÑA
// ==========================================
const changePassword = (req, res) => {
  const { id } = req.params;
  const { contraseñaActual, contraseñaNueva } = req.body;

  // Validaciones
  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de usuario inválido'
    });
  }

  if (!contraseñaActual || !contraseñaNueva) {
    return res.status(400).json({
      success: false,
      message: 'Contraseña actual y nueva son requeridas'
    });
  }

  if (contraseñaNueva.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'La nueva contraseña debe tener al menos 8 caracteres'
    });
  }

  // Encriptar contraseña actual para verificar
  const contraseñaActualEncriptada = Buffer.from(contraseñaActual).toString('base64');

  // Verificar contraseña actual
  const verifyQuery = 'SELECT Id FROM Usuarios WHERE Id = ? AND Contraseña = ?';

  db.query(verifyQuery, [id, contraseñaActualEncriptada], (error, results) => {
    if (error) {
      console.error('❌ Error al verificar contraseña:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar la contraseña'
      });
    }

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    // Encriptar nueva contraseña
    const contraseñaNuevaEncriptada = Buffer.from(contraseñaNueva).toString('base64');

    // Actualizar contraseña
    const updateQuery = 'UPDATE Usuarios SET Contraseña = ? WHERE Id = ?';

    db.query(updateQuery, [contraseñaNuevaEncriptada, id], (error, results) => {
      if (error) {
        console.error('❌ Error al cambiar contraseña:', error);
        return res.status(500).json({
          success: false,
          message: 'Error al cambiar la contraseña'
        });
      }

      console.log(`✅ Contraseña cambiada: ID ${id}`);

      res.status(200).json({
        success: true,
        message: 'Contraseña cambiada exitosamente'
      });
    });
  });
};

// ==========================================
// ESTADÍSTICAS DE USUARIOS
// ==========================================
const getUserStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as totalUsuarios,
        COUNT(CASE WHEN Fecha_Crea >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as nuevosUltimaSemana,
        COUNT(CASE WHEN Fecha_Crea >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as nuevosUltimoMes,
        COUNT(
          CASE 
            WHEN Fecha_Crea >= DATE_SUB(NOW(), INTERVAL 60 DAY)
              AND Fecha_Crea < DATE_SUB(NOW(), INTERVAL 30 DAY) 
            THEN 1 
          END
        ) as nuevosMesAnterior,
        ROUND(AVG(DATEDIFF(NOW(), Fecha_Crea)), 1) as promedioAntiguedadDias,
        COUNT(CASE WHEN Mail IS NULL OR Mail = '' THEN 1 END) as usuariosSinEmail
      FROM Usuarios
    `;

    const [statsRow] = await runQuery(statsQuery);

    const dominiosQuery = `
      SELECT 
        LOWER(TRIM(SUBSTRING_INDEX(Mail, '@', -1))) as dominio,
        COUNT(*) as cantidad
      FROM Usuarios
      WHERE Mail IS NOT NULL AND Mail <> ''
      GROUP BY dominio
      ORDER BY cantidad DESC
      LIMIT 3
    `;

    const extremosQuery = `
      SELECT *
      FROM (
        SELECT 
          Id as id,
          Usuario as usuario,
          Mail as mail,
          Fecha_Crea as fechaCreacion,
          'masReciente' as tipo
        FROM Usuarios
        ORDER BY Fecha_Crea DESC
        LIMIT 1
      ) ultimo
      UNION ALL
      SELECT *
      FROM (
        SELECT 
          Id as id,
          Usuario as usuario,
          Mail as mail,
          Fecha_Crea as fechaCreacion,
          'masAntiguo' as tipo
        FROM Usuarios
        ORDER BY Fecha_Crea ASC
        LIMIT 1
      ) primero
    `;

    const dominiosRows = await runQuery(dominiosQuery);
    const extremosRows = await runQuery(extremosQuery);

    const totalUsuarios = Number(statsRow?.totalUsuarios ?? 0);
    const nuevosUltimaSemana = Number(statsRow?.nuevosUltimaSemana ?? 0);
    const nuevosUltimoMes = Number(statsRow?.nuevosUltimoMes ?? 0);
    const nuevosMesAnterior = Number(statsRow?.nuevosMesAnterior ?? 0);
    const promedioAntiguedadDias =
      statsRow?.promedioAntiguedadDias !== null && statsRow?.promedioAntiguedadDias !== undefined
        ? parseFloat(statsRow.promedioAntiguedadDias)
        : 0;
    const usuariosSinEmail = Number(statsRow?.usuariosSinEmail ?? 0);

    const crecimientoMensual = nuevosMesAnterior > 0
      ? ((nuevosUltimoMes - nuevosMesAnterior) / nuevosMesAnterior) * 100
      : nuevosUltimoMes > 0
        ? 100
        : 0;

    const dominiosPrincipales = dominiosRows.map((row) => ({
      dominio: row.dominio,
      cantidad: Number(row.cantidad),
      porcentaje: totalUsuarios > 0
        ? parseFloat(((Number(row.cantidad) / totalUsuarios) * 100).toFixed(1))
        : 0
    }));

    const usuarioMasReciente = extremosRows.find((row) => row.tipo === 'masReciente') || null;
    const usuarioMasAntiguo = extremosRows.find((row) => row.tipo === 'masAntiguo') || null;

    console.log('�o. EstadA-sticas obtenidas con informaciA3n ampliada');

    res.status(200).json({
      success: true,
      message: 'EstadA-sticas obtenidas exitosamente',
      stats: {
        totalUsuarios,
        nuevosUltimaSemana,
        nuevosUltimoMes,
        nuevosMesAnterior,
        crecimientoMensual: parseFloat(crecimientoMensual.toFixed(1)),
        promedioAntiguedadDias,
        usuariosSinEmail,
        usuarioMasReciente,
        usuarioMasAntiguo,
        dominiosPrincipales
      }
    });
  } catch (error) {
    console.error('�?O Error al obtener estadA-sticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadA-sticas'
    });
  }
};
// Exportar todas las funciones
module.exports = {
  getAllUsers,
  getUserById,
  searchUsers,
  updateUser,
  deleteUser,
  changePassword,
  getUserStats
};


const db = require('../config/database');

// Función para hacer login
const login = (req, res) => {
  // Recibir los datos del frontend
  const { usuario, contraseña } = req.body;

  // Validar que vengan los datos
  if (!usuario || !contraseña) {
    return res.status(400).json({
      success: false,
      message: 'Usuario y contraseña son requeridos'
    });
  }

  // Encriptar la contraseña en Base64 (para comparar con la BD)
  const contraseñaEncriptada = Buffer.from(contraseña).toString('base64');

  // Buscar el usuario en la base de datos
  const query = 'SELECT * FROM Usuarios WHERE Usuario = ? AND Contraseña = ?';
  
  db.query(query, [usuario, contraseñaEncriptada], (error, results) => {

    if (error) {
      console.error('Error en la consulta:', error);
      return res.status(500).json({
        success: false,
        message: 'Error en el servidor'
      });
    }

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos'
      });
    }

    const usuario = results[0];
    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      user: {
        id: usuario.Id,
        usuario: usuario.Usuario,
        mail: usuario.Mail,
        fechaCreacion: usuario.Fecha_Crea
      }
    });
  });
};
const register = (req, res) => {
  const { usuario, contraseña, mail } = req.body;

  // Validaciones básicas
  if (!usuario || !contraseña || !mail) {
    return res.status(400).json({
      success: false,
      message: 'Usuario, contraseña y mail son requeridos'
    });
  }

  // Validar formato de mail sencillo
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(mail)) {
    return res.status(400).json({
      success: false,
      message: 'Formato de mail inválido'
    });
  }

  // Encriptar contraseña en Base64 (mantener compatibilidad con login actual)
  const contraseñaEncriptada = Buffer.from(contraseña).toString('base64');

  // 1) Verificar si el usuario o el mail ya existen
  const checkQuery = 'SELECT Usuario, Mail FROM Usuarios WHERE Usuario = ? OR Mail = ?';
  db.query(checkQuery, [usuario, mail], (checkError, checkResults) => {
    if (checkError) {
      console.error('Error en la consulta de verificación:', checkError);
      return res.status(500).json({
        success: false,
        message: 'Error en el servidor'
      });
    }

    if (checkResults.length > 0) {
      // Determinar qué está duplicado
      const usuarioExistente = checkResults.some(r => r.Usuario === usuario);
      const mailExistente = checkResults.some(r => r.Mail === mail);

      let message = 'Ya existe ';
      if (usuarioExistente && mailExistente) message += 'usuario y mail';
      else if (usuarioExistente) message += 'el usuario';
      else if (mailExistente) message += 'el mail';

      return res.status(409).json({
        success: false,
        message: message
      });
    }

    // 2) Insertar el nuevo usuario
    const insertQuery = 'INSERT INTO Usuarios (Usuario, Contraseña, Mail, Fecha_Crea) VALUES (?, ?, ?, NOW())';
    db.query(insertQuery, [usuario, contraseñaEncriptada, mail], (insertError, insertResult) => {
      if (insertError) {
        console.error('Error al insertar usuario:', insertError);
        return res.status(500).json({
          success: false,
          message: 'Error al crear el usuario'
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Usuario registrado correctamente',
        userId: insertResult.insertId
      });
    });
  });
};

module.exports = {
  login,
  register
};
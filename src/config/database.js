const mysql = require('mysql2');
require('dotenv').config();

// Crear la conexión a la base de datos
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

// Conectar a la base de datos
connection.connect((error) => {
  if (error) {
    console.error('❌ Error al conectar a la base de datos:', error.message);
    return;
  }
  console.log('✅ Conexión exitosa a MySQL - Base de datos:', process.env.DB_NAME);
});

// Exportar la conexión para usarla en otros archivos
module.exports = connection;
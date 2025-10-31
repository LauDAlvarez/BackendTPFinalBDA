-- Datos de ejemplo para poblar el dashboard de ventas
-- Ajusta el nombre de la base de datos si fuese diferente
USE dashboard_ventas;

-- Limpiar datos anteriores (excepto usuarios) para evitar duplicados
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Detalle_Compra;
TRUNCATE TABLE Compras;
TRUNCATE TABLE Inventario;
TRUNCATE TABLE Vendedores;
TRUNCATE TABLE Producto;
TRUNCATE TABLE Categoria;
TRUNCATE TABLE Sucursales;
SET FOREIGN_KEY_CHECKS = 1;

-- Usuarios base (se insertan solo si no existen)
INSERT INTO Usuarios (Id, Usuario, `Contraseña`, Mail, Fecha_Crea)
VALUES (1, 'admin', 'admin123', 'admin@dashboard.com', '2024-01-10 09:00:00')
ON DUPLICATE KEY UPDATE Mail = VALUES(Mail);

INSERT INTO Usuarios (Id, Usuario, `Contraseña`, Mail, Fecha_Crea)
VALUES (2, 'gerente_centro', 'centro123', 'centro@sales.com', '2024-01-12 09:00:00')
ON DUPLICATE KEY UPDATE Mail = VALUES(Mail);

INSERT INTO Usuarios (Id, Usuario, `Contraseña`, Mail, Fecha_Crea)
VALUES (3, 'gerente_norte', 'norte123', 'norte@sales.com', '2024-01-12 09:15:00')
ON DUPLICATE KEY UPDATE Mail = VALUES(Mail);

-- Sucursales
INSERT INTO Sucursales (Id, Nombre, Ubicacion, Telefono) VALUES
(1, 'Sucursal Centro', 'Av. Corrientes 1230, CABA', 1143567890),
(2, 'Sucursal Norte', 'Panamericana km 45, Escobar', 1122458890),
(3, 'Sucursal Oeste', 'Av. Rivadavia 8700, Moron', 1133347765),
(4, 'Sucursal Sur', 'Calle Mitre 640, Quilmes', 1145622300);

-- Categorias
INSERT INTO Categoria (Id, Nombre, Descripcion) VALUES
(1, 'Tecnologia', 'Dispositivos electronicos y accesorios'),
(2, 'Electrohogar', 'Linea blanca y climatizacion'),
(3, 'Deportes', 'Equipamiento y fitness'),
(4, 'Hogar', 'Articulos y pequenos electrodomesticos'),
(5, 'Belleza', 'Cuidado personal y spa');

-- Productos
INSERT INTO Producto (Id, Nombre, Descripcion, Precio_Uni, Categoria_Id) VALUES
(1, 'Notebook Pro 15', 'Notebook profesional 16GB RAM 512GB SSD', 450000, 1),
(2, 'Smartphone X200', 'Telefono 5G 256GB camara triple', 350000, 1),
(3, 'Smart TV 55 4K', 'Televisor 4K UHD con HDR', 520000, 2),
(4, 'Aire Acondicionado 4500W', 'Equipo split frio calor', 480000, 2),
(5, 'Bicicleta Trail 29', 'Bicicleta de montaña aluminio', 280000, 3),
(6, 'Parlante Bluetooth Go', 'Parlante portatil resistente al agua', 85000, 1),
(7, 'Juego Toallas Premium', 'Set de toallas de algodon egipcio', 45000, 4),
(8, 'Cafetera Espresso Max', 'Cafetera automatica con vaporizador', 120000, 4),
(9, 'Cinta de Correr FitRun', 'Cinta plegable con monitor cardiaco', 380000, 3),
(10, 'Robot de Cocina ChefPlus', 'Robot multifuncion 12 programas', 120000, 4);

-- Vendedores por sucursal
INSERT INTO Vendedores (Id, Nombre, Apellido, Dni, Sucursal_Id) VALUES
(1, 'Laura', 'Gomez', '30220111', 1),
(2, 'Juan', 'Perez', '29788994', 1),
(3, 'Florencia', 'Ruiz', '31566770', 1),
(4, 'Martin', 'Lopez', '28123456', 2),
(5, 'Sofia', 'Diaz', '30999887', 2),
(6, 'Pablo', 'Torres', '32345678', 2),
(7, 'Carolina', 'Vega', '30111222', 3),
(8, 'Diego', 'Soto', '28990765', 3),
(9, 'Mariana', 'Ponce', '32765432', 3),
(10, 'Nicolas', 'Rios', '29555111', 4),
(11, 'Valentina', 'Suarez', '31888666', 4),
(12, 'Hernan', 'Costa', '30666444', 4);

-- Inventario inicial
INSERT INTO Inventario (Id, Sucursal_Id, Producto_Id, Cantidad_stock) VALUES
(1, 1, 1, 12),
(2, 1, 2, 18),
(3, 1, 6, 30),
(4, 1, 8, 14),
(5, 2, 2, 16),
(6, 2, 3, 9),
(7, 2, 5, 20),
(8, 2, 9, 7),
(9, 3, 3, 8),
(10, 3, 4, 11),
(11, 3, 5, 15),
(12, 3, 6, 22),
(13, 4, 7, 28),
(14, 4, 8, 12),
(15, 4, 9, 6),
(16, 4, 10, 18);

-- Compras historicas
INSERT INTO Compras (Id, Sucursal_Id, Producto_Id, Vendedor_Id, Fecha, Total) VALUES
(1, 1, 1, 1, '2024-12-14 12:35:00', 450000),
(2, 2, 5, 4, '2025-01-08 15:20:00', 280000),
(3, 3, 3, 7, '2025-01-16 10:45:00', 520000),
(4, 4, 7, 10, '2025-01-26 17:10:00', 90000),
(5, 1, 2, 2, '2025-02-04 11:05:00', 700000),
(6, 2, 9, 5, '2025-02-22 16:25:00', 380000),
(7, 3, 4, 8, '2025-03-05 13:30:00', 480000),
(8, 4, 10, 11, '2025-03-18 18:55:00', 240000),
(9, 1, 6, 3, '2025-04-09 12:40:00', 255000),
(10, 2, 3, 6, '2025-04-15 15:15:00', 520000),
(11, 3, 5, 7, '2025-06-07 11:20:00', 560000),
(12, 4, 4, 12, '2025-06-22 17:45:00', 480000),
(13, 1, 8, 2, '2025-09-05 10:10:00', 240000),
(14, 2, 2, 4, '2025-09-12 14:25:00', 1050000),
(15, 3, 6, 8, '2025-09-20 19:05:00', 340000),
(16, 4, 5, 11, '2025-09-28 12:55:00', 280000),
(17, 1, 1, 3, '2025-10-06 11:45:00', 450000),
(18, 2, 9, 5, '2025-10-12 16:35:00', 380000),
(19, 3, 3, 7, '2025-10-19 13:05:00', 520000),
(20, 4, 7, 10, '2025-10-24 17:20:00', 180000);

-- Detalle de cada compra (precios unitarios)
INSERT INTO Detalle_Compra (Id, Sucursal_Id, Producto_Id, Vendedor_Id, Compra_Id, Fecha, Cantidad, Precio_Compra) VALUES
(1, 1, 1, 1, 1, '2024-12-14 12:35:00', 1, 450000),
(2, 2, 5, 4, 2, '2025-01-08 15:20:00', 1, 280000),
(3, 3, 3, 7, 3, '2025-01-16 10:45:00', 1, 520000),
(4, 4, 7, 10, 4, '2025-01-26 17:10:00', 2, 45000),
(5, 1, 2, 2, 5, '2025-02-04 11:05:00', 2, 350000),
(6, 2, 9, 5, 6, '2025-02-22 16:25:00', 1, 380000),
(7, 3, 4, 8, 7, '2025-03-05 13:30:00', 1, 480000),
(8, 4, 10, 11, 8, '2025-03-18 18:55:00', 2, 120000),
(9, 1, 6, 3, 9, '2025-04-09 12:40:00', 3, 85000),
(10, 2, 3, 6, 10, '2025-04-15 15:15:00', 1, 520000),
(11, 3, 5, 7, 11, '2025-06-07 11:20:00', 2, 280000),
(12, 4, 4, 12, 12, '2025-06-22 17:45:00', 1, 480000),
(13, 1, 8, 2, 13, '2025-09-05 10:10:00', 2, 120000),
(14, 2, 2, 4, 14, '2025-09-12 14:25:00', 3, 350000),
(15, 3, 6, 8, 15, '2025-09-20 19:05:00', 4, 85000),
(16, 4, 5, 11, 16, '2025-09-28 12:55:00', 1, 280000),
(17, 1, 1, 3, 17, '2025-10-06 11:45:00', 1, 450000),
(18, 2, 9, 5, 18, '2025-10-12 16:35:00', 1, 380000),
(19, 3, 3, 7, 19, '2025-10-19 13:05:00', 1, 520000),
(20, 4, 7, 10, 20, '2025-10-24 17:20:00', 4, 45000);

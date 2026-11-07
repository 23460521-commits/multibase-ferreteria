-- Base relacional de la ferretería (MySQL 8 / MariaDB)
SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS ferreteria CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ferreteria;

-- Si se vuelve a ejecutar, el script reinicia las tablas y los datos de ejemplo.
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS categorias;

-- Todas las tablas incluyen "eliminado" y "eliminado_en" para el borrado lógico.

CREATE TABLE IF NOT EXISTS categorias (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(80)  NOT NULL,
  descripcion    VARCHAR(255) NULL,
  eliminado      TINYINT(1)   NOT NULL DEFAULT 0,
  creado_en      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  eliminado_en   DATETIME     NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS productos (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(120)  NOT NULL,
  descripcion    VARCHAR(255)  NULL,
  precio         DECIMAL(10,2) NOT NULL,
  stock          INT           NOT NULL DEFAULT 0,
  categoria_id   INT           NULL,
  eliminado      TINYINT(1)    NOT NULL DEFAULT 0,
  creado_en      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  eliminado_en   DATETIME      NULL,
  CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  CONSTRAINT chk_precio CHECK (precio >= 0),
  CONSTRAINT chk_stock  CHECK (stock >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clientes (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(120) NOT NULL,
  email          VARCHAR(120) NOT NULL,
  telefono       VARCHAR(20)  NULL,
  direccion      VARCHAR(255) NULL,
  eliminado      TINYINT(1)   NOT NULL DEFAULT 0,
  creado_en      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  eliminado_en   DATETIME     NULL
) ENGINE=InnoDB;

-- Datos de ejemplo
INSERT INTO categorias (nombre, descripcion) VALUES
  ('Herramientas manuales', 'Martillos, desarmadores, llaves y pinzas'),
  ('Herramientas eléctricas', 'Taladros, esmeriladoras y sierras'),
  ('Plomería', 'Tubería, conexiones y selladores'),
  ('Pinturas', 'Vinílicas, esmaltes y accesorios');

INSERT INTO productos (nombre, descripcion, precio, stock, categoria_id) VALUES
  ('Martillo de uña 16 oz', 'Mango de fibra de vidrio', 189.50, 25, 1),
  ('Desarmador plano 6"', 'Punta imantada', 65.00, 40, 1),
  ('Llave perica 10"', 'Acero al cromo-vanadio', 210.00, 15, 1),
  ('Taladro percutor 1/2"', '750 W, velocidad variable', 1299.00, 8, 2),
  ('Cinta de teflón', 'Rollo de 12 mm x 10 m', 12.50, 120, 3),
  ('Pintura vinílica blanca 19 L', 'Interior/exterior, acabado mate', 1450.00, 10, 4);

INSERT INTO clientes (nombre, email, telefono, direccion) VALUES
  ('María López Ramírez', 'maria.lopez@example.com', '3121234567', 'Av. Tecnológico 1, Villa de Álvarez, Col.'),
  ('Carlos Mendoza Ruiz', 'carlos.mendoza@example.com', '3127654321', 'Calle Madero 45, Colima, Col.'),
  ('Construcciones del Pacífico', 'compras@cdelpacifico.example.com', '3141112233', 'Blvd. Costero 200, Manzanillo, Col.');

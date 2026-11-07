// Conexión al motor RELACIONAL (MySQL) mediante un pool de conexiones.
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3307,
  user: process.env.MYSQL_USER || 'ferreteria',
  password: process.env.MYSQL_PASSWORD ?? 'ferreteria123',
  database: process.env.MYSQL_DATABASE || 'ferreteria',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true, // DECIMAL llega como número y no como texto
  dateStrings: true,
  charset: 'utf8mb4'
});

async function probarMySQL() {
  await pool.query('SELECT 1');
}

module.exports = { pool, probarMySQL };

const express = require('express');
const { pool } = require('./config/mysql');
const { getDb } = require('./config/mongo');
const { redis } = require('./config/redis');
const { HttpError, asyncHandler } = require('./utils/errores');

const app = express();
app.use(express.json());

// Índice de recursos
const recursos = [
  { recurso: 'categorias', motor: 'MySQL (relacional)', ruta: '/api/categorias' },
  { recurso: 'productos', motor: 'MySQL (relacional)', ruta: '/api/productos' },
  { recurso: 'clientes', motor: 'MySQL (relacional)', ruta: '/api/clientes' },
  { recurso: 'proveedores', motor: 'MongoDB (NoSQL documental)', ruta: '/api/proveedores' },
  { recurso: 'resenas', motor: 'MongoDB (NoSQL documental)', ruta: '/api/resenas' },
  { recurso: 'cupones', motor: 'Redis (clave-valor)', ruta: '/api/cupones' }
];

app.get(['/', '/api'], (req, res) => {
  res.json({ servicio: 'Web Service Multibase - Ferretería', metodos: ['GET', 'POST', 'PATCH', 'DELETE'], recursos });
});

// Estado de las tres conexiones
app.get('/api/salud', asyncHandler(async (req, res) => {
  const revisar = async (fn) => { try { await fn(); return 'ok'; } catch (e) { return `error: ${e.message}`; } };
  const motores = {
    mysql: await revisar(() => pool.query('SELECT 1')),
    mongodb: await revisar(() => getDb().command({ ping: 1 })),
    redis: await revisar(() => redis.ping())
  };
  const ok = Object.values(motores).every((v) => v === 'ok');
  res.status(ok ? 200 : 503).json({ estado: ok ? 'ok' : 'degradado', motores });
}));

app.use('/api/categorias', require('./routes/categorias.routes'));
app.use('/api/productos', require('./routes/productos.routes'));
app.use('/api/clientes', require('./routes/clientes.routes'));
app.use('/api/proveedores', require('./routes/proveedores.routes'));
app.use('/api/resenas', require('./routes/resenas.routes'));
app.use('/api/cupones', require('./routes/cupones.routes'));

// Ruta no encontrada
app.use((req, res) => res.status(404).json({ error: `Ruta ${req.method} ${req.originalUrl} no encontrada` }));

// Manejador central de errores
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.detalles && { detalles: err.detalles }) });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(422).json({ error: 'La referencia indicada no existe (llave foránea)' });
  }
  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return res.status(400).json({ error: 'Los datos no cumplen las restricciones de la tabla' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;

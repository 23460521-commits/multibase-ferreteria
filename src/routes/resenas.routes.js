// Recurso RESEÑAS — MongoDB (NoSQL documental).
// Ejemplo de integración multibase: antes de guardar se verifica en MySQL
// que el producto y el cliente existan y no estén eliminados.
const { Router } = require('express');
const rutasCrud = require('./rutasCrud');
const { crearControladorMongo } = require('../services/mongoCrud');
const { existeActivoMySQL, obtenerNombresProductos } = require('../services/mysqlCrud');
const { getDb } = require('../config/mongo');
const { HttpError, asyncHandler } = require('../utils/errores');

const controlador = crearControladorMongo({
  coleccion: 'resenas',
  etiqueta: 'la reseña',
  filtros: { productoId: 'integer', clienteId: 'integer' },
  esquema: {
    productoId: { tipo: 'integer', requerido: true, min: 1 },
    clienteId: { tipo: 'integer', requerido: true, min: 1 },
    calificacion: { tipo: 'integer', requerido: true, min: 1, max: 5 },
    comentario: { tipo: 'string', maxLen: 500 }
  },
  validarRelaciones: async ({ productoId, clienteId }) => {
    if (productoId !== undefined && !(await existeActivoMySQL('productos', productoId))) {
      throw new HttpError(422, `El producto ${productoId} no existe en MySQL o está eliminado`);
    }
    if (clienteId !== undefined && !(await existeActivoMySQL('clientes', clienteId))) {
      throw new HttpError(422, `El cliente ${clienteId} no existe en MySQL o está eliminado`);
    }
  }
});

const router = Router();

// GET /api/resenas/resumen
// Promedio de calificación y total de reseñas por producto, usando el pipeline
// de agregación de MongoDB y enriqueciendo los datos con el nombre del producto desde MySQL.
// Solo toma en cuenta reseñas sin borrado lógico.
// Se registra antes de las rutas CRUD para que "/resumen" no se confunda con "/:id".
router.get('/resumen', asyncHandler(async (req, res) => {
  const resultado = await getDb().collection('resenas').aggregate([
    { $match: { eliminado: false } },
    {
      $group: {
        _id: '$productoId',
        promedio: { $avg: '$calificacion' },
        totalResenas: { $sum: 1 }
      }
    },
    { $sort: { promedio: -1 } }
  ]).toArray();

  const productoIds = resultado.map((r) => r._id);
  const mapaNombres = await obtenerNombresProductos(productoIds);

  const datos = resultado.map((r) => ({
    productoId: r._id,
    producto: mapaNombres.get(r._id) || 'Producto no encontrado',
    promedio: Math.round(r.promedio * 10) / 10,
    totalResenas: r.totalResenas
  }));
  res.json({ total: datos.length, datos });
}));

router.use(rutasCrud(controlador));

module.exports = router;
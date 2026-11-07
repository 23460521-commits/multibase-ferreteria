// Recurso RESEÑAS — MongoDB (NoSQL documental).
// Ejemplo de integración multibase: antes de guardar se verifica en MySQL
// que el producto y el cliente existan y no estén eliminados.
const rutasCrud = require('./rutasCrud');
const { crearControladorMongo } = require('../services/mongoCrud');
const { existeActivoMySQL } = require('../services/mysqlCrud');
const { HttpError } = require('../utils/errores');

module.exports = rutasCrud(
  crearControladorMongo({
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
  })
);

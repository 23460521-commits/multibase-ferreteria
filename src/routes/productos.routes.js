// Recurso PRODUCTOS — MySQL (relacional), con llave foránea a categorías
const rutasCrud = require('./rutasCrud');
const { crearControladorMySQL, existeActivoMySQL } = require('../services/mysqlCrud');
const { HttpError } = require('../utils/errores');

module.exports = rutasCrud(
  crearControladorMySQL({
    tabla: 'productos',
    etiqueta: 'el producto',
    filtros: ['categoria_id'],
    esquema: {
      nombre: { tipo: 'string', requerido: true, maxLen: 120 },
      descripcion: { tipo: 'string', maxLen: 255 },
      precio: { tipo: 'number', requerido: true, min: 0 },
      stock: { tipo: 'integer', min: 0 },
      categoria_id: { tipo: 'integer', min: 1 }
    },
    validarRelaciones: async ({ categoria_id }) => {
      if (categoria_id != null && !(await existeActivoMySQL('categorias', categoria_id))) {
        throw new HttpError(422, `La categoría ${categoria_id} no existe o está eliminada`);
      }
    }
  })
);

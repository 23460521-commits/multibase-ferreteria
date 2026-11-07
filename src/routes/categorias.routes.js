// Recurso CATEGORÍAS — MySQL (relacional)
const rutasCrud = require('./rutasCrud');
const { crearControladorMySQL } = require('../services/mysqlCrud');

module.exports = rutasCrud(
  crearControladorMySQL({
    tabla: 'categorias',
    etiqueta: 'la categoría',
    esquema: {
      nombre: { tipo: 'string', requerido: true, maxLen: 80 },
      descripcion: { tipo: 'string', maxLen: 255 }
    }
  })
);

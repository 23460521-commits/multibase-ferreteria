// Recurso PROVEEDORES — MongoDB (NoSQL documental).
// Admite objetos y arreglos anidados: cada proveedor puede tener una forma distinta.
// Integración multibase: productosSuministrados guarda ids de productos de MySQL,
// así que antes de guardar se verifica que todos existan y no estén eliminados.
const rutasCrud = require('./rutasCrud');
const { crearControladorMongo } = require('../services/mongoCrud');
const { idsInexistentesMySQL } = require('../services/mysqlCrud');
const { HttpError } = require('../utils/errores');

module.exports = rutasCrud(
  crearControladorMongo({
    coleccion: 'proveedores',
    etiqueta: 'el proveedor',
    filtros: { nombre: 'string', rfc: 'string' },
    esquema: {
      nombre: { tipo: 'string', requerido: true, maxLen: 120 },
      rfc: { tipo: 'string', maxLen: 13 },
      email: { tipo: 'email' },
      telefonos: { tipo: 'array', items: 'string' },
      contacto: { tipo: 'object' },   // { nombre, telefono, ... }
      direccion: { tipo: 'object' },  // { calle, ciudad, cp, ... }
      productosSuministrados: { tipo: 'array', items: 'integer' }, // ids de productos en MySQL
      etiquetas: { tipo: 'array', items: 'string' },
      sitioWeb: { tipo: 'string', maxLen: 200 }
    },
    validarRelaciones: async ({ productosSuministrados }) => {
      if (!Array.isArray(productosSuministrados)) return;
      const faltantes = await idsInexistentesMySQL('productos', productosSuministrados);
      if (faltantes.length) {
        throw new HttpError(422, `Estos productos no existen en MySQL o están eliminados: ${faltantes.join(', ')}`);
      }
    }
  })
);

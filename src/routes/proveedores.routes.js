// Recurso PROVEEDORES — MongoDB (NoSQL documental).
// Admite objetos y arreglos anidados: cada proveedor puede tener una forma distinta.
const rutasCrud = require('./rutasCrud');
const { crearControladorMongo } = require('../services/mongoCrud');

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
      etiquetas: { tipo: 'array', items: 'string' }
    }
  })
);

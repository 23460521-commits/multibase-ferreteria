// Recurso CLIENTES — MySQL (relacional)
const rutasCrud = require('./rutasCrud');
const { crearControladorMySQL } = require('../services/mysqlCrud');

module.exports = rutasCrud(
  crearControladorMySQL({
    tabla: 'clientes',
    etiqueta: 'el cliente',
    filtros: ['email'],
    esquema: {
      nombre: { tipo: 'string', requerido: true, maxLen: 120 },
      email: { tipo: 'email', requerido: true, maxLen: 120 },
      telefono: { tipo: 'string', maxLen: 20 },
      direccion: { tipo: 'string', maxLen: 255 }
    }
  })
);

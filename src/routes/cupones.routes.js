// Recurso CUPONES — Redis (clave-valor). El identificador es el código del cupón.
const rutasCrud = require('./rutasCrud');
const controlador = require('../controllers/cupones.controller');

module.exports = rutasCrud(controlador, 'codigo');

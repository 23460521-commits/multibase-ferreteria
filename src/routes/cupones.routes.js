// Recurso CUPONES — Redis (clave-valor). El identificador es el código del cupón.
const rutasCrud = require('./rutasCrud');
const controlador = require('../controllers/cupones.controller');

const router = rutasCrud(controlador, 'codigo');

// Canje de un cupón: revisa la vigencia y cuenta los usos con INCR.
router.post('/:codigo/canjear', controlador.canjear);

module.exports = router;

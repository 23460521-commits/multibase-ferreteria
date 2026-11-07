// Registra los 5 endpoints estándar de un recurso.
const { Router } = require('express');

function rutasCrud(controlador, parametro = 'id') {
  const router = Router();
  router.get('/', controlador.listar);
  router.get(`/:${parametro}`, controlador.obtener);
  router.post('/', controlador.crear);
  router.patch(`/:${parametro}`, controlador.actualizar);
  router.delete(`/:${parametro}`, controlador.eliminar);
  return router;
}

module.exports = rutasCrud;

// Fábrica de controladores CRUD para tablas de MySQL con borrado lógico.
const { pool } = require('../config/mysql');
const { HttpError, asyncHandler } = require('../utils/errores');
const { validar } = require('../utils/validacion');

function parsearId(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'El id debe ser un entero positivo');
  return id;
}

const formatear = (fila) => ({ ...fila, eliminado: Boolean(fila.eliminado) });

async function buscarActivo(tabla, id) {
  const [filas] = await pool.query('SELECT * FROM ?? WHERE id = ? AND eliminado = 0', [tabla, id]);
  return filas[0] ? formatear(filas[0]) : null;
}

// Útil para validar referencias, incluso desde otros motores (p. ej. reseñas en MongoDB).
async function existeActivoMySQL(tabla, id) {
  return Boolean(await buscarActivo(tabla, id));
}

/**
 * @param {object} opciones
 * @param {string} opciones.tabla        Nombre de la tabla
 * @param {string} opciones.etiqueta     Nombre legible en singular para los mensajes
 * @param {object} opciones.esquema      Reglas de validación (ver utils/validacion.js)
 * @param {string[]} [opciones.filtros]  Columnas por las que se puede filtrar con ?columna=valor
 * @param {Function} [opciones.validarRelaciones] async (datos) => void, lanza HttpError si algo no existe
 */
function crearControladorMySQL({ tabla, etiqueta, esquema, filtros = [], validarRelaciones = async () => {} }) {
  const noEncontrado = (id) => new HttpError(404, `No existe ${etiqueta} con id ${id} (o fue eliminado)`);

  return {
    listar: asyncHandler(async (req, res) => {
      const condiciones = [];
      const valores = [tabla];
      if (req.query.incluirEliminados !== 'true') condiciones.push('eliminado = 0');
      for (const campo of filtros) {
        if (req.query[campo] !== undefined) {
          condiciones.push('?? = ?');
          valores.push(campo, req.query[campo]);
        }
      }
      const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
      const [filas] = await pool.query(`SELECT * FROM ?? ${where} ORDER BY id`, valores);
      res.json({ total: filas.length, datos: filas.map(formatear) });
    }),

    obtener: asyncHandler(async (req, res) => {
      const id = parsearId(req.params.id);
      const registro = await buscarActivo(tabla, id);
      if (!registro) throw noEncontrado(id);
      res.json(registro);
    }),

    crear: asyncHandler(async (req, res) => {
      const datos = validar(req.body, esquema);
      await validarRelaciones(datos);
      const [resultado] = await pool.query('INSERT INTO ?? SET ?', [tabla, datos]);
      res.status(201).json(await buscarActivo(tabla, resultado.insertId));
    }),

    actualizar: asyncHandler(async (req, res) => {
      const id = parsearId(req.params.id);
      const datos = validar(req.body, esquema, { parcial: true });
      if (!(await buscarActivo(tabla, id))) throw noEncontrado(id);
      await validarRelaciones(datos);
      await pool.query('UPDATE ?? SET ? WHERE id = ?', [tabla, datos, id]);
      res.json(await buscarActivo(tabla, id));
    }),

    // Borrado LÓGICO: solo se marca el registro, nunca se ejecuta DELETE.
    eliminar: asyncHandler(async (req, res) => {
      const id = parsearId(req.params.id);
      const [resultado] = await pool.query(
        'UPDATE ?? SET eliminado = 1, eliminado_en = NOW() WHERE id = ? AND eliminado = 0',
        [tabla, id]
      );
      if (resultado.affectedRows === 0) throw noEncontrado(id);
      res.json({ mensaje: `Borrado lógico aplicado: ${etiqueta} ${id}` });
    })
  };
}

module.exports = { crearControladorMySQL, existeActivoMySQL };

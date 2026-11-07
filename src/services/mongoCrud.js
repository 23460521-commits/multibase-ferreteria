// Fábrica de controladores CRUD para colecciones de MongoDB con borrado lógico.
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/mongo');
const { HttpError, asyncHandler } = require('../utils/errores');
const { validar } = require('../utils/validacion');

function parsearObjectId(valor) {
  if (!/^[a-f\d]{24}$/i.test(valor)) throw new HttpError(400, 'El id debe ser un ObjectId válido (24 caracteres hexadecimales)');
  return new ObjectId(valor);
}

const formatear = ({ _id, ...resto }) => ({ id: _id.toString(), ...resto });

const convertidores = {
  string: (v) => v,
  integer: (v) => {
    const n = Number(v);
    if (!Number.isInteger(n)) throw new HttpError(400, `El filtro "${v}" debe ser un entero`);
    return n;
  }
};

/**
 * @param {object} opciones
 * @param {string} opciones.coleccion   Nombre de la colección
 * @param {string} opciones.etiqueta    Nombre legible en singular para los mensajes
 * @param {object} opciones.esquema     Reglas de validación
 * @param {object} [opciones.filtros]   { campo: 'string' | 'integer' } para filtrar con ?campo=valor
 * @param {Function} [opciones.validarRelaciones] async (datos) => void
 */
function crearControladorMongo({ coleccion, etiqueta, esquema, filtros = {}, validarRelaciones = async () => {} }) {
  const col = () => getDb().collection(coleccion);
  const noEncontrado = (id) => new HttpError(404, `No existe ${etiqueta} con id ${id} (o fue eliminado)`);

  return {
    listar: asyncHandler(async (req, res) => {
      const consulta = {};
      if (req.query.incluirEliminados !== 'true') consulta.eliminado = false;
      for (const [campo, tipo] of Object.entries(filtros)) {
        if (req.query[campo] !== undefined) consulta[campo] = convertidores[tipo](req.query[campo]);
      }
      const docs = await col().find(consulta).sort({ creadoEn: 1 }).toArray();
      res.json({ total: docs.length, datos: docs.map(formatear) });
    }),

    obtener: asyncHandler(async (req, res) => {
      const _id = parsearObjectId(req.params.id);
      const doc = await col().findOne({ _id, eliminado: false });
      if (!doc) throw noEncontrado(req.params.id);
      res.json(formatear(doc));
    }),

    crear: asyncHandler(async (req, res) => {
      const datos = validar(req.body, esquema);
      await validarRelaciones(datos);
      const ahora = new Date();
      const doc = { ...datos, eliminado: false, creadoEn: ahora, actualizadoEn: ahora, eliminadoEn: null };
      const { insertedId } = await col().insertOne(doc);
      res.status(201).json(formatear({ _id: insertedId, ...doc }));
    }),

    actualizar: asyncHandler(async (req, res) => {
      const _id = parsearObjectId(req.params.id);
      const datos = validar(req.body, esquema, { parcial: true });
      if (!(await col().findOne({ _id, eliminado: false }))) throw noEncontrado(req.params.id);
      await validarRelaciones(datos);
      const doc = await col().findOneAndUpdate(
        { _id, eliminado: false },
        { $set: { ...datos, actualizadoEn: new Date() } },
        { returnDocument: 'after' }
      );
      if (!doc) throw noEncontrado(req.params.id);
      res.json(formatear(doc));
    }),

    // Borrado LÓGICO: se marca el documento, nunca se usa deleteOne.
    eliminar: asyncHandler(async (req, res) => {
      const _id = parsearObjectId(req.params.id);
      const { matchedCount } = await col().updateOne(
        { _id, eliminado: false },
        { $set: { eliminado: true, eliminadoEn: new Date() } }
      );
      if (matchedCount === 0) throw noEncontrado(req.params.id);
      res.json({ mensaje: `Borrado lógico aplicado: ${etiqueta} ${req.params.id}` });
    })
  };
}

module.exports = { crearControladorMongo };

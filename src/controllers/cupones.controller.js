// Recurso CUPONES sobre Redis (clave-valor).
// Cada cupón se guarda como JSON en la clave  cupon:<CODIGO>
// y el conjunto  cupones:codigos  funciona como índice para poder listarlos.
// No se usa EXPIRE/TTL a propósito: Redis borraría físicamente la clave y
// el requisito es borrado lógico. La vigencia se guarda como dato.
const { redis } = require('../config/redis');
const { HttpError, asyncHandler } = require('../utils/errores');
const { validar, sinCampos } = require('../utils/validacion');

const PREFIJO = 'cupon:';
const INDICE = 'cupones:codigos';

const esquema = {
  codigo: { tipo: 'string', requerido: true, maxLen: 20 },
  descripcion: { tipo: 'string', maxLen: 200 },
  descuento: { tipo: 'number', requerido: true, min: 1, max: 100 }, // porcentaje
  vigencia: { tipo: 'fecha' }, // ISO 8601, p. ej. "2026-12-31"
  usosMaximos: { tipo: 'integer', min: 1 }
};
const esquemaPatch = sinCampos(esquema, 'codigo'); // la clave no se puede cambiar

function normalizarCodigo(valor) {
  const codigo = String(valor).trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,20}$/.test(codigo)) {
    throw new HttpError(400, 'El código debe tener de 3 a 20 caracteres: letras, números, guion o guion bajo');
  }
  return codigo;
}

async function leer(codigo) {
  const json = await redis.get(PREFIJO + codigo);
  return json ? JSON.parse(json) : null;
}

async function leerActivo(codigoCrudo) {
  const codigo = normalizarCodigo(codigoCrudo);
  const cupon = await leer(codigo);
  if (!cupon || cupon.eliminado) throw new HttpError(404, `No existe el cupón ${codigo} (o fue eliminado)`);
  return cupon;
}

const guardar = (cupon) => redis.set(PREFIJO + cupon.codigo, JSON.stringify(cupon));

module.exports = {
  listar: asyncHandler(async (req, res) => {
    const codigos = (await redis.sMembers(INDICE)).sort();
    const valores = codigos.length ? await redis.mGet(codigos.map((c) => PREFIJO + c)) : [];
    let cupones = valores.filter(Boolean).map((v) => JSON.parse(v));
    if (req.query.incluirEliminados !== 'true') cupones = cupones.filter((c) => !c.eliminado);
    res.json({ total: cupones.length, datos: cupones });
  }),

  obtener: asyncHandler(async (req, res) => {
    res.json(await leerActivo(req.params.codigo));
  }),

  crear: asyncHandler(async (req, res) => {
    const datos = validar(req.body, esquema);
    const ahora = new Date().toISOString();
    const cupon = {
      ...datos,
      codigo: normalizarCodigo(datos.codigo),
      eliminado: false,
      creadoEn: ahora,
      actualizadoEn: ahora,
      eliminadoEn: null
    };
    // NX: solo escribe si la clave no existe (evita sobrescribir, incluso cupones eliminados).
    const ok = await redis.set(PREFIJO + cupon.codigo, JSON.stringify(cupon), { NX: true });
    if (!ok) throw new HttpError(409, `Ya existe un cupón con el código ${cupon.codigo}`);
    await redis.sAdd(INDICE, cupon.codigo);
    res.status(201).json(cupon);
  }),

  actualizar: asyncHandler(async (req, res) => {
    const cupon = await leerActivo(req.params.codigo);
    const datos = validar(req.body, esquemaPatch, { parcial: true });
    const actualizado = { ...cupon, ...datos, actualizadoEn: new Date().toISOString() };
    await guardar(actualizado);
    res.json(actualizado);
  }),

  // Borrado LÓGICO: la clave sigue existiendo, solo cambia la bandera.
  eliminar: asyncHandler(async (req, res) => {
    const cupon = await leerActivo(req.params.codigo);
    await guardar({ ...cupon, eliminado: true, eliminadoEn: new Date().toISOString() });
    res.json({ mensaje: `Borrado lógico aplicado al cupón ${cupon.codigo}` });
  })
};

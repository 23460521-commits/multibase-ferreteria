// Recurso CUPONES sobre Redis (clave-valor).
// Claves que se usan:
//   cupon:<CODIGO>        JSON con los datos del cupón (incluida la bandera de borrado lógico)
//   cupon:<CODIGO>:usos   contador de canjes, que se incrementa con INCR (operación atómica)
//   cupones:codigos       conjunto (SET) que funciona como índice para poder listarlos
// No se usa EXPIRE/TTL a propósito: Redis borraría físicamente la clave y
// el requisito es borrado lógico. La vigencia se guarda como dato y se revisa al canjear.
const { redis } = require('../config/redis');
const { HttpError, asyncHandler } = require('../utils/errores');
const { validar, sinCampos } = require('../utils/validacion');

const PREFIJO = 'cupon:';
const INDICE = 'cupones:codigos';
const claveCupon = (codigo) => PREFIJO + codigo;
const claveUsos = (codigo) => `${PREFIJO}${codigo}:usos`;

const esquema = {
  codigo: { tipo: 'string', requerido: true, maxLen: 20 },
  descripcion: { tipo: 'string', maxLen: 200 },
  descuento: { tipo: 'number', requerido: true, min: 1, max: 100 }, // porcentaje
  vigencia: { tipo: 'fecha' }, // ISO 8601, p. ej. "2026-12-31" (válido hasta el final de ese día)
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

async function leerActivo(codigoCrudo) {
  const codigo = normalizarCodigo(codigoCrudo);
  const json = await redis.get(claveCupon(codigo));
  const cupon = json ? JSON.parse(json) : null;
  if (!cupon || cupon.eliminado) throw new HttpError(404, `No existe el cupón ${codigo} (o fue eliminado)`);
  return cupon;
}

const guardar = (cupon) => redis.set(claveCupon(cupon.codigo), JSON.stringify(cupon));
const conUsos = (cupon, usos) => ({ ...cupon, usos: Number(usos) || 0 });

// Una fecha sin hora ("2026-11-20") vale hasta el final de ese día en la hora del servidor.
function fechaLimite(vigencia) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(vigencia);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999) : new Date(vigencia);
}

module.exports = {
  listar: asyncHandler(async (req, res) => {
    const codigos = (await redis.sMembers(INDICE)).sort();
    if (codigos.length === 0) return res.json({ total: 0, datos: [] });
    const [valores, usos] = await Promise.all([
      redis.mGet(codigos.map(claveCupon)),
      redis.mGet(codigos.map(claveUsos))
    ]);
    let cupones = valores
      .map((v, i) => (v ? conUsos(JSON.parse(v), usos[i]) : null))
      .filter(Boolean);
    if (req.query.incluirEliminados !== 'true') cupones = cupones.filter((c) => !c.eliminado);
    res.json({ total: cupones.length, datos: cupones });
  }),

  obtener: asyncHandler(async (req, res) => {
    const cupon = await leerActivo(req.params.codigo);
    res.json(conUsos(cupon, await redis.get(claveUsos(cupon.codigo))));
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
    // MULTI: el alta del cupón y su registro en el índice se ejecutan juntos.
    // SET con NX solo escribe si la clave no existe (evita sobrescribir, incluso cupones eliminados).
    // Si el código ya existía, SADD no cambia nada porque el código ya estaba en el conjunto.
    const [resultadoSet] = await redis
      .multi()
      .set(claveCupon(cupon.codigo), JSON.stringify(cupon), { NX: true })
      .sAdd(INDICE, cupon.codigo)
      .exec();
    if (resultadoSet !== 'OK') throw new HttpError(409, `Ya existe un cupón con el código ${cupon.codigo}`);
    res.status(201).json(conUsos(cupon, 0));
  }),

  actualizar: asyncHandler(async (req, res) => {
    const cupon = await leerActivo(req.params.codigo);
    const datos = validar(req.body, esquemaPatch, { parcial: true });
    const actualizado = { ...cupon, ...datos, actualizadoEn: new Date().toISOString() };
    await guardar(actualizado);
    res.json(conUsos(actualizado, await redis.get(claveUsos(cupon.codigo))));
  }),

  // Borrado LÓGICO: la clave sigue existiendo, solo cambia la bandera.
  eliminar: asyncHandler(async (req, res) => {
    const cupon = await leerActivo(req.params.codigo);
    await guardar({ ...cupon, eliminado: true, eliminadoEn: new Date().toISOString() });
    res.json({ mensaje: `Borrado lógico aplicado al cupón ${cupon.codigo}` });
  }),

  // POST /api/cupones/:codigo/canjear
  // Revisa la vigencia y lleva la cuenta de usos con INCR. Como INCR es atómico,
  // dos canjes al mismo tiempo nunca obtienen el mismo número de uso.
  canjear: asyncHandler(async (req, res) => {
    const cupon = await leerActivo(req.params.codigo);

    if (cupon.vigencia && Date.now() > fechaLimite(cupon.vigencia).getTime()) {
      throw new HttpError(422, `El cupón ${cupon.codigo} venció el ${cupon.vigencia}`);
    }

    const usos = await redis.incr(claveUsos(cupon.codigo));
    if (cupon.usosMaximos && usos > cupon.usosMaximos) {
      await redis.decr(claveUsos(cupon.codigo)); // se revierte el incremento que no procedió
      throw new HttpError(409, `El cupón ${cupon.codigo} ya alcanzó su límite de ${cupon.usosMaximos} usos`);
    }

    res.json({
      mensaje: `Cupón ${cupon.codigo} canjeado`,
      codigo: cupon.codigo,
      descuento: cupon.descuento,
      usos,
      usosRestantes: cupon.usosMaximos ? cupon.usosMaximos - usos : null
    });
  })
};

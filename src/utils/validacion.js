const { HttpError } = require('./errores');

const esObjetoPlano = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const tipos = {
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  integer: (v) => Number.isInteger(v),
  boolean: (v) => typeof v === 'boolean',
  array: (v) => Array.isArray(v),
  object: esObjetoPlano,
  email: (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  fecha: (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v))
};

/**
 * Valida el cuerpo de una petición contra un esquema sencillo.
 * - Rechaza campos que no estén en el esquema (por ejemplo id o eliminado).
 * - En modo parcial (PATCH) ningún campo es obligatorio, pero debe venir al menos uno.
 *
 * Reglas por campo: { tipo, requerido, min, max, maxLen, enum, items }
 */
function validar(body, esquema, { parcial = false } = {}) {
  if (!esObjetoPlano(body)) throw new HttpError(400, 'El cuerpo debe ser un objeto JSON');

  const errores = [];
  const datos = {};

  for (const campo of Object.keys(body)) {
    if (!esquema[campo]) errores.push(`El campo "${campo}" no está permitido`);
  }

  for (const [campo, reglas] of Object.entries(esquema)) {
    let valor = body[campo];

    if (valor === undefined) {
      if (reglas.requerido && !parcial) errores.push(`El campo "${campo}" es obligatorio`);
      continue;
    }
    if (valor === null) {
      if (reglas.requerido) errores.push(`El campo "${campo}" no puede ser null`);
      else datos[campo] = null;
      continue;
    }
    if (!tipos[reglas.tipo](valor)) {
      errores.push(`El campo "${campo}" debe ser de tipo ${reglas.tipo}`);
      continue;
    }
    if (typeof valor === 'string') {
      valor = valor.trim();
      if (reglas.requerido && valor === '') errores.push(`El campo "${campo}" no puede estar vacío`);
      if (reglas.maxLen && valor.length > reglas.maxLen) {
        errores.push(`El campo "${campo}" admite máximo ${reglas.maxLen} caracteres`);
      }
    }
    if (typeof valor === 'number') {
      if (reglas.min !== undefined && valor < reglas.min) errores.push(`El campo "${campo}" debe ser >= ${reglas.min}`);
      if (reglas.max !== undefined && valor > reglas.max) errores.push(`El campo "${campo}" debe ser <= ${reglas.max}`);
    }
    if (reglas.enum && !reglas.enum.includes(valor)) {
      errores.push(`El campo "${campo}" debe ser uno de: ${reglas.enum.join(', ')}`);
    }
    if (Array.isArray(valor) && reglas.items && !valor.every(tipos[reglas.items])) {
      errores.push(`Todos los elementos de "${campo}" deben ser de tipo ${reglas.items}`);
    }
    datos[campo] = valor;
  }

  if (errores.length) throw new HttpError(400, 'Datos inválidos', errores);
  if (parcial && Object.keys(datos).length === 0) {
    throw new HttpError(400, 'Envía al menos un campo para modificar');
  }
  return datos;
}

// Quita un campo del esquema (por ejemplo, para que no pueda modificarse con PATCH).
const sinCampos = (esquema, ...campos) =>
  Object.fromEntries(Object.entries(esquema).filter(([c]) => !campos.includes(c)));

module.exports = { validar, sinCampos };

require('dotenv').config();
const app = require('./app');
const { pool, probarMySQL } = require('./config/mysql');
const { conectarMongo, clienteMongo } = require('./config/mongo');
const { redis, conectarRedis } = require('./config/redis');

const PUERTO = Number(process.env.PORT) || 3000;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Los contenedores tardan unos segundos en estar listos (MySQL sobre todo), así que se reintenta.
async function conReintentos(nombre, fn, intentos = 10, espera = 3000) {
  for (let i = 1; i <= intentos; i++) {
    try {
      await fn();
      console.log(`  ✔ ${nombre} conectado`);
      return;
    } catch (err) {
      console.log(`  … ${nombre} no disponible (intento ${i}/${intentos}): ${err.message}`);
      if (i === intentos) throw new Error(`No se pudo conectar a ${nombre}`);
      await esperar(espera);
    }
  }
}

async function iniciar() {
  console.log('Conectando a los motores de base de datos...');
  await conReintentos('MySQL', probarMySQL);
  await conReintentos('MongoDB', conectarMongo);
  await conReintentos('Redis', conectarRedis);

  const servidor = app.listen(PUERTO, () => {
    console.log(`\nWeb Service escuchando en http://localhost:${PUERTO}/api`);
  });

  const cerrar = async () => {
    console.log('\nCerrando conexiones...');
    servidor.close();
    await Promise.allSettled([pool.end(), clienteMongo.close(), redis.quit()]);
    process.exit(0);
  };
  process.on('SIGINT', cerrar);
  process.on('SIGTERM', cerrar);
}

iniciar().catch((err) => {
  console.error(`\n✘ ${err.message}. ¿Ya levantaste las bases con "docker compose up -d"?`);
  process.exit(1);
});

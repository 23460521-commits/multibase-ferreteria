// Conexión al motor CLAVE-VALOR (Redis).
const { createClient } = require('redis');

const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6380' });
redis.on('error', (err) => console.error('[Redis]', err.message));

async function conectarRedis() {
  if (!redis.isOpen) await redis.connect();
  await redis.ping();
  return redis;
}

module.exports = { redis, conectarRedis };

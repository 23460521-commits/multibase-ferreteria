// Conexión al motor NoSQL documental (MongoDB).
const { MongoClient } = require('mongodb');

const cliente = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27018', {
  serverSelectionTimeoutMS: 3000
});
let db = null;

async function conectarMongo() {
  await cliente.connect();
  db = cliente.db(process.env.MONGO_DB || 'ferreteria');
  await db.command({ ping: 1 });
  return db;
}

function getDb() {
  if (!db) throw new Error('MongoDB no está conectado');
  return db;
}

module.exports = { conectarMongo, getDb, clienteMongo: cliente };

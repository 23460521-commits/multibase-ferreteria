// Conexión al motor NoSQL documental (MongoDB).
const { MongoClient } = require('mongodb');

const cliente = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27018', {
  serverSelectionTimeoutMS: 3000
});
let db = null;

const validadorResenas = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['productoId', 'clienteId', 'calificacion', 'eliminado'],
    properties: {
      productoId: {
        bsonType: ['int', 'long', 'double'],
        minimum: 1,
        description: 'productoId debe ser un entero positivo que referencia a MySQL'
      },
      clienteId: {
        bsonType: ['int', 'long', 'double'],
        minimum: 1,
        description: 'clienteId debe ser un entero positivo que referencia a MySQL'
      },
      calificacion: {
        bsonType: ['int', 'long', 'double'],
        minimum: 1,
        maximum: 5,
        description: 'calificacion debe ser un entero entre 1 y 5'
      },
      comentario: {
        bsonType: ['string', 'null'],
        maxLength: 500
      },
      eliminado: {
        bsonType: 'bool',
        description: 'eliminado debe ser booleano para borrado lógico'
      }
    }
  }
};

const validadorProveedores = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['nombre', 'eliminado'],
    properties: {
      nombre: {
        bsonType: 'string',
        maxLength: 120,
        description: 'nombre debe ser un texto de hasta 120 caracteres'
      },
      rfc: {
        bsonType: ['string', 'null'],
        maxLength: 13,
        description: 'rfc opcional con máximo 13 caracteres'
      },
      email: {
        bsonType: ['string', 'null']
      },
      sitioWeb: {
        bsonType: ['string', 'null'],
        maxLength: 200
      },
      eliminado: {
        bsonType: 'bool',
        description: 'eliminado debe ser booleano para borrado lógico'
      }
    }
  }
};

async function inicializarEsquemasMongo(database) {
  try {
    const cols = await database.listCollections().toArray();
    const nombres = new Set(cols.map((c) => c.name));

    if (nombres.has('resenas')) {
      await database.command({ collMod: 'resenas', validator: validadorResenas });
    } else {
      await database.createCollection('resenas', { validator: validadorResenas });
    }

    if (nombres.has('proveedores')) {
      await database.command({ collMod: 'proveedores', validator: validadorProveedores });
    } else {
      await database.createCollection('proveedores', { validator: validadorProveedores });
    }

    // Índices de colecciones NoSQL
    await database.collection('resenas').createIndex({ productoId: 1 });
    await database.collection('proveedores').createIndex({ nombre: 1 });
    await database.collection('proveedores').createIndex({ rfc: 1 }, { unique: true, sparse: true });
  } catch (err) {
    console.warn(`  [MongoDB] Advertencia al configurar validaciones $jsonSchema: ${err.message}`);
  }
}

async function conectarMongo() {
  await cliente.connect();
  db = cliente.db(process.env.MONGO_DB || 'ferreteria');
  await db.command({ ping: 1 });
  await inicializarEsquemasMongo(db);
  return db;
}

function getDb() {
  if (!db) throw new Error('MongoDB no está conectado');
  return db;
}

module.exports = { conectarMongo, getDb, clienteMongo: cliente };

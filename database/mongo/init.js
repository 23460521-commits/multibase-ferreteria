// Se ejecuta automáticamente la primera vez que arranca el contenedor de MongoDB.
db = db.getSiblingDB('ferreteria');

const ahora = new Date();
const base = { eliminado: false, creadoEn: ahora, actualizadoEn: ahora, eliminadoEn: null };

// Validación de esquemas NoSQL mediante $jsonSchema
db.createCollection('proveedores', {
  validator: {
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
  }
});

db.createCollection('resenas', {
  validator: {
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
  }
});

// Los documentos de proveedores NO tienen todos la misma forma: así se aprovecha el esquema flexible.
db.proveedores.insertMany([
  {
    nombre: 'Truper Distribución Occidente',
    rfc: 'TDO010101AB1',
    email: 'ventas@truper-occ.example.com',
    contacto: { nombre: 'Laura Vázquez', telefono: '3331234567' },
    productosSuministrados: [1, 2, 3],
    etiquetas: ['herramientas', 'mayoreo'],
    sitioWeb: 'https://truper-occidente.example.com',
    ...base
  },
  {
    nombre: 'Comex Colima',
    email: 'colima@comex.example.com',
    direccion: { calle: 'Av. Constitución 300', ciudad: 'Colima', cp: '28017' },
    productosSuministrados: [6],
    ...base
  },
  {
    nombre: 'Plomería Rápida del Pacífico',
    telefonos: ['3141234567', '3149876543'],
    productosSuministrados: [5],
    ...base
  }
]);

// Las reseñas apuntan a productos y clientes que viven en MySQL.
db.resenas.insertMany([
  { productoId: 1, clienteId: 1, calificacion: 5, comentario: 'Muy resistente, buen balance.', ...base },
  { productoId: 4, clienteId: 3, calificacion: 4, comentario: 'Potente, aunque algo pesado.', ...base }
]);

db.resenas.createIndex({ productoId: 1 });
db.proveedores.createIndex({ nombre: 1 });
db.proveedores.createIndex({ rfc: 1 }, { unique: true, sparse: true });

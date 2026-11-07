// Se ejecuta automáticamente la primera vez que arranca el contenedor de MongoDB.
db = db.getSiblingDB('ferreteria');

const ahora = new Date();
const base = { eliminado: false, creadoEn: ahora, actualizadoEn: ahora, eliminadoEn: null };

// Los documentos de proveedores NO tienen todos la misma forma: así se aprovecha el esquema flexible.
db.proveedores.insertMany([
  {
    nombre: 'Truper Distribución Occidente',
    rfc: 'TDO010101AB1',
    email: 'ventas@truper-occ.example.com',
    contacto: { nombre: 'Laura Vázquez', telefono: '3331234567' },
    productosSuministrados: [1, 2, 3],
    etiquetas: ['herramientas', 'mayoreo'],
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

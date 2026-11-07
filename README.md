# Web Service Multibase — Ferretería

API REST en **Node.js + Express** que trabaja al mismo tiempo con **tres motores de base de datos**:

| Tipo de motor | Motor | Recursos |
|---|---|---|
| Relacional | **MySQL 8** | `categorias`, `productos`, `clientes` |
| NoSQL documental | **MongoDB 7** | `proveedores`, `resenas` |
| Clave-valor | **Redis 7** | `cupones` |

Los **6 recursos** exponen `GET`, `POST`, `PATCH` y `DELETE`. El `DELETE` hace **borrado lógico**: el registro nunca se elimina, solo se marca con `eliminado = true` y la fecha `eliminado_en` / `eliminadoEn`.

> Materia: Tópicos de Bases de Datos — Instituto Tecnológico de Colima (Agosto–Diciembre 2026)

## Integrantes

| Nombre | Matrícula | Recursos a su cargo |
|---|---|---|
| Julio Alberto Orozco Téllez | 23460521 | Estructura base, MySQL y Redis |
| Luis Fernando Machuca Carrillo | 23460516 | MongoDB |

## 1. Requisitos

- [Node.js](https://nodejs.org/) **18.11 o superior** (recomendado 20 LTS o 22 LTS)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye `docker compose`)
- Git

Verifica las versiones:

```bash
node -v
docker -v
docker compose version
```

## 2. Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/23460521-commits/multibase-ferreteria.git
cd multibase-ferreteria

# 2. Instalar dependencias de Node
npm install

# 3. Crear el archivo de variables de entorno
cp .env.example .env        # En Windows (PowerShell): copy .env.example .env
```

## 3. Ejecución

```bash
# 1. Levantar MySQL, MongoDB y Redis en Docker
docker compose up -d

# 2. Iniciar el Web Service
npm start          # o "npm run dev" para que se reinicie al guardar cambios
```

La primera vez, MySQL tarda unos 20–30 segundos en crear la base; el servidor reintenta la conexión automáticamente. Cuando todo está listo verás:

```
Conectando a los motores de base de datos...
  ✔ MySQL conectado
  ✔ MongoDB conectado
  ✔ Redis conectado

Web Service escuchando en http://localhost:3000/api
```

Comprueba las tres conexiones en <http://localhost:3000/api/salud>.

Las bases se crean con datos de ejemplo gracias a `database/mysql/init.sql` y `database/mongo/init.js`.

### Puertos utilizados

Se usan puertos distintos a los predeterminados para no chocar con un MySQL de XAMPP u otros contenedores que ya tengas:

| Motor | Puerto en tu equipo | Puerto dentro del contenedor |
|---|---|---|
| MySQL | 3307 | 3306 |
| MongoDB | 27018 | 27017 |
| Redis | 6380 | 6379 |

### Comandos útiles

```bash
docker compose ps                  # ver que los 3 contenedores estén "running"
docker compose logs -f mysql       # ver el log de un motor
npm run db:down                    # detener las bases (conserva los datos)
npm run db:reset                   # borrar los volúmenes y recrear las bases con los datos de ejemplo

# Entrar a cada motor
docker exec -it multibase-mysql mysql -u ferreteria -pferreteria123 ferreteria
docker exec -it multibase-mongo mongosh ferreteria
docker exec -it multibase-redis redis-cli
```

---

## 4. Endpoints

URL base: `http://localhost:3000/api`

Cada recurso tiene los mismos cinco endpoints:

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/<recurso>` | Lista los registros activos |
| `GET` | `/api/<recurso>/:id` | Obtiene un registro activo |
| `POST` | `/api/<recurso>` | Crea un registro |
| `PATCH` | `/api/<recurso>/:id` | Modifica solo los campos enviados |
| `DELETE` | `/api/<recurso>/:id` | Borrado lógico |

Recursos: `categorias`, `productos`, `clientes`, `proveedores`, `resenas`, `cupones`.

- En MySQL el `:id` es un entero; en MongoDB es un ObjectId (24 caracteres hexadecimales); en Redis es el **código del cupón** (`/api/cupones/BUENFIN26`).
- Agrega `?incluirEliminados=true` a cualquier `GET` de lista para ver también los registros con borrado lógico.
- Filtros disponibles: `productos?categoria_id=1`, `clientes?email=...`, `proveedores?nombre=...`, `resenas?productoId=1&clienteId=2`.

### Campos de cada recurso

| Recurso | Campos (* = obligatorio en POST) |
|---|---|
| categorias | `nombre`*, `descripcion` |
| productos | `nombre`*, `precio`*, `descripcion`, `stock`, `categoria_id` |
| clientes | `nombre`*, `email`*, `telefono`, `direccion` |
| proveedores | `nombre`*, `rfc`, `email`, `telefonos[]`, `contacto{}`, `direccion{}`, `productosSuministrados[]`, `etiquetas[]` |
| resenas | `productoId`*, `clienteId`*, `calificacion`* (1–5), `comentario` |
| cupones | `codigo`*, `descuento`* (1–100 %), `descripcion`, `vigencia` (fecha ISO), `usosMaximos` |

Los campos `id`, `eliminado` y las fechas los controla el servidor; si se envían, la petición se rechaza con `400`.

### Ejemplos con curl

```bash
# Crear un producto (MySQL)
curl -X POST http://localhost:3000/api/productos \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Pinzas de presión 10\"","precio":159.9,"stock":12,"categoria_id":1}'

# Modificar parcialmente
curl -X PATCH http://localhost:3000/api/productos/1 \
  -H "Content-Type: application/json" -d '{"precio":199}'

# Borrado lógico
curl -X DELETE http://localhost:3000/api/productos/1

# Crear una reseña (MongoDB) — valida en MySQL que el producto y el cliente existan
curl -X POST http://localhost:3000/api/resenas \
  -H "Content-Type: application/json" \
  -d '{"productoId":2,"clienteId":1,"calificacion":5,"comentario":"Excelente"}'

# Crear un cupón (Redis)
curl -X POST http://localhost:3000/api/cupones \
  -H "Content-Type: application/json" \
  -d '{"codigo":"BUENFIN26","descuento":15,"vigencia":"2026-11-20"}'
```

> En Windows usa Git Bash para estos comandos, o el archivo **`api.http`** con la extensión *REST Client* de VS Code, o Postman / Thunder Client.

### Códigos de respuesta

| Código | Cuándo |
|---|---|
| 200 | Consulta, modificación o borrado lógico correctos |
| 201 | Registro creado |
| 400 | JSON inválido, campos no permitidos o con tipo/valor incorrecto |
| 404 | El registro no existe o ya tiene borrado lógico |
| 409 | El código de cupón ya existe |
| 422 | Referencia inválida (categoría, producto o cliente inexistente o eliminado) |
| 503 | `/api/salud` cuando algún motor no responde |

---

## 5. Cómo se implementa el borrado lógico

| Motor | Implementación |
|---|---|
| MySQL | Columnas `eliminado TINYINT(1)` y `eliminado_en DATETIME`. `DELETE` ejecuta `UPDATE ... SET eliminado = 1, eliminado_en = NOW()`; las consultas filtran `WHERE eliminado = 0`. |
| MongoDB | Campos `eliminado` y `eliminadoEn` en cada documento. `DELETE` ejecuta `updateOne(..., { $set: { eliminado: true } })`; nunca `deleteOne`. |
| Redis | Cada cupón es un JSON en la clave `cupon:<CODIGO>` con la bandera `eliminado`. `DELETE` reescribe el valor con `eliminado: true`. No se usa `EXPIRE`/TTL porque Redis borraría la clave físicamente. |

Un registro eliminado deja de aparecer en `GET`, no se puede modificar con `PATCH` y su código/clave no se reutiliza.

## 6. Integración entre motores

- **Reseñas (MongoDB) → productos y clientes (MySQL):** antes de crear o modificar una reseña se consulta MySQL para confirmar que `productoId` y `clienteId` existen y no están eliminados.
- **Proveedores (MongoDB) → productos (MySQL):** `productosSuministrados` guarda ids de productos de MySQL; además, cada proveedor puede tener una estructura diferente (contacto, dirección, varios teléfonos), aprovechando el esquema flexible de MongoDB.
- **Productos → categorías (MySQL):** llave foránea `categoria_id`, validada también a nivel de aplicación.

## 7. Estructura del proyecto

```
multibase-ferreteria/
├── database/
│   ├── mysql/init.sql          # tablas y datos de ejemplo (MySQL)
│   └── mongo/init.js           # colecciones y datos de ejemplo (MongoDB)
├── src/
│   ├── config/                 # conexión a cada motor
│   │   ├── mysql.js
│   │   ├── mongo.js
│   │   └── redis.js
│   ├── services/
│   │   ├── mysqlCrud.js        # CRUD genérico con borrado lógico para MySQL
│   │   └── mongoCrud.js        # CRUD genérico con borrado lógico para MongoDB
│   ├── controllers/
│   │   └── cupones.controller.js   # CRUD sobre Redis
│   ├── routes/                 # un archivo por recurso
│   ├── utils/                  # validación y manejo de errores
│   ├── app.js                  # configuración de Express y rutas
│   └── server.js               # arranque y conexión a los 3 motores
├── api.http                    # peticiones de prueba
├── docker-compose.yml
├── .env.example
└── package.json
```

## 8. Alternativa sin Docker (XAMPP + instalaciones locales)

1. **MySQL (XAMPP):** importa `database/mysql/init.sql` desde phpMyAdmin y en `.env` usa `MYSQL_PORT=3306`, `MYSQL_USER=root` y `MYSQL_PASSWORD=` (vacío).
2. **MongoDB:** instala MongoDB Community Server, ejecuta `mongosh ferreteria database/mongo/init.js` y usa `MONGO_URI=mongodb://localhost:27017`.
3. **Redis:** en Windows se recomienda Memurai o Redis dentro de WSL; usa `REDIS_URL=redis://localhost:6379`.

## 9. Solución de problemas

| Problema | Solución |
|---|---|
| `No se pudo conectar a MySQL` | Revisa `docker compose ps`; la primera vez espera ~30 s y vuelve a ejecutar `npm start`. |
| `port is already allocated` | Cambia el puerto izquierdo en `docker-compose.yml` (p. ej. `"3308:3306"`) y el mismo valor en `.env`. |
| Los datos de ejemplo no aparecen | Los scripts de inicio solo corren con volúmenes nuevos: `npm run db:reset`. |
| Acentos mal mostrados en la consola de MySQL | Entra con `--default-character-set=utf8mb4`. |

## 10. Trabajo en equipo con Git

El repositorio debe mostrar commits de todos los integrantes. Flujo sugerido:

```bash
# Cada integrante configura SU nombre y correo (los mismos de su cuenta de GitHub)
git config --global user.name  "Nombre Apellido"
git config --global user.email "correo@ejemplo.com"

# Trabajar en una rama por recurso o tarea
git checkout -b feature/resenas
git add .
git commit -m "feat(resenas): valida producto y cliente en MySQL"
git push -u origin feature/resenas
# Abrir un Pull Request hacia main y fusionarlo
```

Ver la participación de cada integrante:

```bash
git shortlog -sn
git log --pretty=format:"%h %an %ad %s" --date=short
```

## 11. Declaratoria de uso de IA

Para el desarrollo de este proyecto se utilizó Claude (Anthropic) como apoyo en la generación de la estructura inicial del código, la configuración de Docker y la redacción de este README. El equipo revisó el código, ejecutó el proyecto localmente y probó los métodos GET, POST, PATCH y DELETE de los seis recursos, incluyendo el borrado lógico en los tres motores de base de datos.

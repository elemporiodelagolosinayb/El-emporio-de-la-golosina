# El Emporio de la Golosina — Tienda online mayorista

Tienda mayorista de golosinas (Yerba Buena, Tucumán) con catálogo, promociones, carrito, acceso de clientes por celular + PIN, pago por transferencia y panel de administración 100 % autoadministrable.

```
elemporio/
├── server/   API REST — Node.js + Express (ES Modules: import/export) + MongoDB Atlas
└── client/   Frontend — React + Vite + Tailwind
```

Front y back se despliegan **por separado** en Vercel.

---

## 1. Requisitos

- Node.js 18 o superior
- Una base de datos en **MongoDB Atlas** (el plan gratuito alcanza)
- Una cuenta de **Cloudinary** (para todas las imágenes)

---

## 2. Instalación local

### Forma rápida (recomendada)

Desde la carpeta raíz `elemporio/`:

```bash
npm install     # instala raíz + server + client
npm run dev     # levanta API (http://localhost:4000) y web (http://localhost:5173) juntas
```

- La primera vez crea `server/.env` y `client/.env` a partir de los `.env.example` (con secretos JWT aleatorios). Nunca pisa uno existente.
- Si `MONGO_URI` está **vacío**, usa una MongoDB local de desarrollo (guardada en `server/.devdb`) y carga sola los datos iniciales. Con `MONGO_URI` de Atlas usa Atlas (ahí corré `npm run seed` una vez).
- `npm run seed` corre todos los seeds sobre la base configurada.

### Por separado

#### Backend

```bash
cd server
cp .env.example .env      # completar las variables (ver sección 3)
npm install
npm run seed:all          # settings + categorías + proveedores + primer admin
npm run dev               # http://localhost:4000
```

#### Frontend

```bash
cd client
cp .env.example .env      # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev               # http://localhost:5173
```

- Tienda: http://localhost:5173
- Panel: http://localhost:5173/admin (con el email y la contraseña de `ADMIN_EMAIL` / `ADMIN_PASSWORD`)

---

## 3. Variables de entorno

### `server/.env`

| Variable | Descripción |
|---|---|
| `MONGO_URI` | Cadena de conexión de MongoDB Atlas (`mongodb+srv://…/emporio`) |
| `JWT_SECRET_ADMIN` | Secreto largo y aleatorio para los tokens del panel |
| `JWT_SECRET_CUSTOMER` | Otro secreto **distinto** para los tokens de clientes |
| `CLIENT_URL` | URL del front (whitelist de CORS). Varias separadas por coma, sin `/` final |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Credenciales de Cloudinary |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Solo para `seed:admin` |

Para generar secretos: `node -p "require('node:crypto').randomBytes(48).toString('hex')"`

### `client/.env`

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL de la API **terminada en `/api`** (ej. `https://emporio-api.vercel.app/api`) |
| `VITE_CLOUDINARY_CLOUD_NAME` | Nombre del cloud de Cloudinary (respaldo; la firma del back ya lo informa) |

---

## 4. Seeds

| Script | Qué hace |
|---|---|
| `npm run seed:settings` | Crea la configuración con los datos del negocio (dirección, horario, WhatsApp, Instagram). No pisa una existente. |
| `npm run seed:categories` | Crea las 11 categorías y actualiza **nombre y orden** por slug: Alfajores, Golosinas, Galletas, Chocolates, Turrones, Barritas, Chicles y Caramelos, Snacks, Variedades, Temporadas, Promos. El ícono y "activa" no se tocan si ya existe. Idempotente. |
| `npm run seed:suppliers` | Crea los 33 proveedores (los 15 originales + Solitas, Fibusia, Granix, Swift, Reno, Zingaras, Focu, Lheritier, Fel Fort, Nestlé, Good Show, Planeta Dulce, Docile, Paysandú, Que Rico, Bibi, Helatec, Ferrero). Un proveedor ya existe si coincide sin mayúsculas, tildes, apóstrofes ni espacios de más (`L'Heritier` = `Lheritier`); los existentes no se modifican. Idempotente. |
| `npm run seed:products` | Corre los dos anteriores y después carga `server/seeds/data/productos_emporio.csv` (546 productos, 136 para revisar) con **el mismo servicio** que la Planilla de productos del admin. Crea los nuevos ✔ · no actualiza existentes ✘ · marca de revisión ✔ (en los nuevos). Los que vienen sin precio o stock se crean con precio 0 / stock 0 y se publican como **"Consultar precio"**. Muestra creados, salteados, advertencias, errores y para revisar. Otro archivo: `npm run seed:products -- ruta/archivo.xlsx` (`.csv`, `.xlsx` o `.xls`). Idempotente. |
| `npm run seed:admin` | Crea el primer administrador con `ADMIN_EMAIL` / `ADMIN_PASSWORD`. |
| `npm run seed:all` | Settings + categorías + proveedores + admin (no carga productos). |
| `npm run migrate:categories` | Para bases que ya existían: "Artículos Varios" (`articulos-varios`) pasa a **Variedades** (`variedades`) **conservando el `_id`** (productos y promos no se tocan), crea **Snacks** y reordena. Si ya existían las dos, mueve los productos/promos a Variedades y borra la vieja. Se puede correr más de una vez. |
| `npm run test:import` | Prueba de ida y vuelta de la planilla sobre una **base temporal en memoria** (no toca Atlas): carga el CSV, exporta el .xlsx, lo vuelve a importar (también como CSV con `,` y con `;` + BOM) y verifica que no cambie nada; además prueba formatos de números (`1500,50`, `$1.500,50`, texto), si/no en minúscula y productos sin precio. |

Todos se corren desde `server/` (`cd server`). Los seeds son solo datos iniciales: después todo se edita desde el panel.

### Base que ya existe (orden recomendado)

```bash
cd server
npm run migrate:categories   # Artículos Varios → Variedades (mismo _id) + Snacks + orden nuevo
npm run seed:suppliers       # proveedores nuevos
npm run seed:products        # catálogo inicial (546 productos)
```

Después: **Productos → Planilla de productos → Descargar**, completar `precio` y `stock`, subirla eligiendo *Precio y stock*. Todos los productos tienen **Comprar** y **Consultar** (WhatsApp). Si un producto no tiene precio, se pide con **precio a confirmar**; si no tiene stock cargado (0), con **disponibilidad a confirmar** (sin límite de cantidad y sin descontar stock). El total del pedido suma solo lo que tiene precio y el pedido queda marcado "+ productos con precio a confirmar" (en Mis pedidos, el mensaje de WhatsApp del cliente y el admin). El pedido mínimo se controla solo cuando todos los precios están cargados.

---

## 5. Deploy en Vercel

### Backend (`server/`)

1. En Vercel: **Add New → Project**, importar el repo y elegir **Root Directory = `server`**.
2. Framework preset: **Other**. Sin comando de build.
3. Cargar todas las variables de `server/.env` en **Settings → Environment Variables** (`CLIENT_URL` = URL final del front).
4. Deploy. `server/vercel.json` reescribe todas las rutas a `api/index.js`, que exporta la app de Express (sin `listen`).
5. En **MongoDB Atlas → Network Access**, permitir `0.0.0.0/0` (Vercel no tiene IPs fijas).
6. Correr los seeds **una vez** desde tu compu apuntando al `MONGO_URI` de producción.

### Frontend (`client/`)

1. Nuevo proyecto en Vercel con **Root Directory = `client`**. Framework: **Vite**.
2. Variables: `VITE_API_URL` = `https://<tu-api>.vercel.app/api` y `VITE_CLOUDINARY_CLOUD_NAME`.
3. Deploy. `client/vercel.json` reescribe todo a `index.html` para que React Router funcione al recargar.
4. Volver al proyecto del backend y verificar que `CLIENT_URL` sea exactamente la URL del front (sin `/` final). Redeploy si la cambiaste.

### Por qué está armado así (límites de Vercel)

- **Body de ~4,5 MB:** las imágenes **no pasan por el backend**: el front pide una firma (`POST /api/admin/cloudinary/signature`) y sube directo a Cloudinary. El Excel está limitado a 4 MB.
- **Timeout de las funciones:** la importación usa `bulkWrite` (no inserciones una por una).
- **Conexión a MongoDB cacheada** en una variable global (`config/db.js`) para reutilizarla entre invocaciones.
- **Rate limit:** el bloqueo del login de clientes (5 intentos → 15 min) se guarda en el documento del cliente, porque la memoria no se comparte entre instancias.

---

## 6. Primeros pasos en el panel

1. **Configuración** → subir los dos logos (PNG con fondo transparente, recomendado), cargar el **alias** de transferencia (mientras esté vacío, la confirmación de compra dice "Te enviamos los datos de transferencia por WhatsApp") y revisar horarios.
2. **Productos → Planilla de productos** → descargar el Excel (columnas `codigo, nombre, categoria, proveedor, precio, stock, activo, revisar, nota_revision`; `categoria`, `proveedor`, `activo` y `revisar` con lista desplegable; encabezado fijo con filtros) → completar → subir y revisar la vista previa → **Guardar cambios**.
3. **Productos → Fotos** → arrastrar todas las fotos juntas, nombradas como el producto (`alfajor-jorgito-chocolate.jpg`) o su código (`ALF001.jpg`).
4. Para actualizar precios o stock: descargar la planilla, editar ese mismo archivo y volver a subirlo eligiendo qué columnas aplicar (el stock se reemplaza).
5. **Para revisar:** las filas con `revisar = SI` vienen en amarillo en el Excel y en la tabla de Productos (⚠️ con la nota). Filtro **Para revisar (N)** (se combina con categoría y proveedor), orden "Para revisar primero", y **Marcar como revisado / Marcar para revisar** por fila o en bloque (hasta 500). Editar un producto no quita la marca. En el Resumen aparece "Productos para revisar: N" cuando hay alguno. Para tomar `revisar`/`nota_revision` de la planilla en productos existentes, tildar **Actualizar marca de revisión** (a los nuevos se les aplica siempre).

---

## 7. Notas técnicas

- **Pedidos sin mail:** los pedidos no se envían por correo. Llegan al panel (**Pedidos**, con el total del día en **Resumen**) y el cliente manda el detalle por WhatsApp desde la confirmación de compra. En **Pedidos** y **Clientes** hay un botón **WhatsApp** para escribirle al cliente con un toque.
- **Mensajes claros:** los errores inesperados del servidor se muestran como "Algo salió mal de nuestro lado…" (el detalle técnico queda solo en el log).

- **Celulares:** `normalizePhone` (idéntica en `server/utils/phone.js` y `client/src/utils/phone.js`) lleva cualquier formato a `549XXXXXXXXXX`.
- **Fechas de promos:** se guardan como inicio del día "desde" y fin del día "hasta" en hora argentina (UTC-3, sin horario de verano).
- **Pedidos:** el back nunca confía en precios del front; recalcula todo, descuenta stock de forma atómica (`findOneAndUpdate` con `stock >= cantidad`, con rollback) y guarda un snapshot de cada ítem.
- **Colores:** las variables hex de la marca están en `client/src/index.css` (`--color-*`) junto con sus canales RGB (`--rgb-*`), que son los que usa `tailwind.config.js` para que funcionen las opacidades (`bg-mint/40`).
- **Bcrypt:** se usa `bcryptjs` (misma API y formato de hash que `bcrypt`, sin compilación nativa, ideal para Vercel).
- **SheetJS** se instala desde el CDN oficial (`cdn.sheetjs.com`, v0.20.3): la versión de npm está desactualizada y tiene vulnerabilidades conocidas. Solo lo usa el server: la planilla se arma en `server/services/excel.service.js` (`GET /api/admin/products/export` devuelve el .xlsx). Como SheetJS Community no escribe estilos, el encabezado fijo, las filas amarillas (fijas + formato condicional sobre `revisar`) y las listas desplegables se agregan editando el XML del .xlsx.
- **Importación** (`server/services/import.service.js`): lee solo la hoja "Productos" (o la primera), ignora columnas extra y filas vacías, acepta `.xlsx`/`.xls`/`.csv` (CSV con `;` o `,`, con o sin BOM) y números como texto o con formato argentino. Precio ≥ 0 (misma regla en Zod y express-validator). Un producto con precio 0 se vende "a confirmar" (`server/services/cart.service.js`): `priceToConfirm` / `stockTracked` quedan en cada ítem del pedido y `pricePending` en el pedido.
- **Revisión:** `needsReview`, `reviewNote` (≤ 200), `reviewedAt`, `reviewedBy` en `Product`. Endpoints `PATCH /api/admin/products/:id/review` y `PATCH /api/admin/products/review/bulk` (≤ 500 ids); `GET /api/admin/products?needsReview=true` y `reviewCount` en la respuesta. La API pública usa una lista blanca de campos, así que nunca los expone.
- **Módulos:** el server y los scripts usan ES Modules (`"type": "module"`, `import`/`export`, imports locales con extensión `.js`).
- **Futuro (no implementado):** validación por código OTP vía WhatsApp/SMS. El modelo `Customer` ya tiene `phoneVerified` y en `customerAuth.controller.js` están documentados los endpoints previstos.
# El-emporio-de-la-golosina

# Tienda Veloz (FeriaDeOfertas) — Funcionalidad y Arquitectura

> Catálogo digital mobile-first para vendedores informales. El vendedor crea su tienda en segundos, sube una foto y la IA redacta título y descripción. El cierre de venta ocurre por WhatsApp + transferencia (Alias/CBU).

Versión actual: `0.7.0-beta`

---

## 1. Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite 5, React Router 6 |
| Estilos | Tailwind CSS 3 |
| Iconos | lucide-react |
| Auth | Firebase Auth (solo Google Sign-In) |
| Base de datos | Firebase Firestore |
| Analytics | Firebase Analytics (opcional, falla silenciosa) |
| Storage de imágenes | Cloudflare R2 (S3-compatible) vía `@aws-sdk/client-s3` + presigned URLs |
| Backend serverless | Netlify Functions |
| IA | OpenAI `gpt-4o-mini` (visión + texto) |
| Pagos | Fuera de la app: Alias/CBU + deep link a Mercado Pago, confirmación manual por WhatsApp |
| Hosting | Netlify (SPA con redirect `/* → /index.html`) |

---

## 2. Funcionalidad

### 2.1 Vendedor — Dashboard (`/`)
- **Login con Google.** Al autenticarse se crea/lee el perfil en `users`.
- **Onboarding:** si el usuario no tiene `shopId` se muestra `CreateShop` (nombre 4–20 chars, descripción, WhatsApp, ubicación, Alias, CBU de 22 dígitos).
- **Panel:** se muestra con el tema de la tienda (encabezado, fondo y colores del catálogo). Logo y nombre de la tienda, enlace público (copiar / Web Share API / abrir en pestaña), alta de productos y catálogo propio con las mismas vistas y paginación que ve el comprador.
- **Modal de configuración**, 3 pestañas:
  - **Datos:** editar nombre, descripción, WhatsApp, ubicación, **zona en Google Maps** (opcional), Alias, CBU. El botón guardar solo se habilita si hay cambios.
    - **Zona en Google Maps:** texto libre con barrio o localidad (no la dirección exacta). Tiene un link "Probar en el mapa" para verificar qué muestra Maps. Solo se carga desde Datos (no en el onboarding).
  - **Personalizar** (cada cambio se guarda al instante, por tienda):
    - **Logo:** subir, cambiar o quitar. Se guarda como PNG (máx. 512 px, conserva la transparencia) y se muestra en el encabezado de la tienda y del panel. El logo reemplazado o quitado se borra de R2.
    - **Tema** (con vista previa). Colorea encabezado, fondo, filtros, orden y paginación, tanto en la tienda pública como en el panel del vendedor (el panel cambia en vivo al elegirlo).
      - **Regulares**, siempre disponibles: `classic` (Original, **tema por defecto**), `dark` (Oscuro), `nature` (Naturaleza, con hojas), `pink` (Rosa), `sunset` (Atardecer) y `minimal` (Minimalista).
      - **Especiales**, solo durante su fecha y en una sección aparte ("Temas especiales", con "Hasta el DD/MM"); fuera de fecha no se muestran: `christmas` (Navidad, con nieve) **solo en diciembre** de cada año, y `pope` (Visita del Papa 🕊️, celeste, blanco y dorado) por la visita de León XIV a la Argentina (8 al 11/11/2026), **hasta el 18/11/2026 inclusive**.
      - **Caducidad:** cuando termina la fecha de un tema especial, la tienda (y su panel) vuelve al tema por defecto. La elección no revive la temporada siguiente: si en diciembre de 2027 quiere Navidad, el vendedor la elige de nuevo. Las fechas se calculan con el calendario argentino.
    - **Vista inicial del catálogo:** grande o compacta.
    - **Botón "Comprar":** mostrar u ocultar. Oculto, el comprador solo ve "Preguntar por WhatsApp" (o "Consultar" en la vista compacta).
  - **Categorías:** hasta **30** por tienda (nombre de hasta 30 caracteres, sin duplicados ignorando mayúsculas). Alta, **edición en línea** (renombrar migra los productos de la categoría y conserva su posición; Enter guarda, Escape cancela), borrado con confirmación (avisa cuántos productos quedarán "Sin categoría") y **sugerencia por IA** cuando la tienda no tiene categorías.
    - **Ordenar:** el orden de la lista es el que ven los compradores en las pastillas del catálogo (y el del selector del alta de producto). El botón "Ordenar" abre un modo con la lista numerada: se seleccionan una o varias categorías y se llevan **al principio** o **al final** (respetando el orden que tenían entre ellas), o se mueven de a una con las flechas. Pensado para cambios de temporada (ej. poner primero las de verano y mandar atrás las de invierno) o para destacar categorías como "Ofertas". Cada cambio se guarda al instante; "Deshacer cambios" vuelve al orden que había al tocar "Ordenar", y "Listo" sale del modo. Las categorías nuevas se agregan al final.
- **Estado por defecto al crear un producto:** "Nuevo" si todos los productos disponibles de la tienda son nuevos; si no, el del último producto creado (recuerda la última opción elegida, en cualquier dispositivo). Tienda sin productos: "Usado". Al editar se respeta el estado del producto.
- **Botón "atrás" del celular:** con el modal de configuración o el de alta/edición de producto abierto, "atrás" lo cierra en vez de salir del sitio (igual que en el catálogo, ver 2.2).
- **Gestión de productos:** crear, editar, borrar, marcar **Vendido** (nota opcional del comprador + `soldAt`), volver a **Disponible** y compartir por WhatsApp. En la vista compacta, el botón "Gestionar" abre el detalle con todas estas acciones.

### 2.2 Comprador — Tienda pública (`/shop/:shopId` y `/shop/:shopId/p/:productId`)
- Encabezado con el tema y el logo de la tienda (o un ícono si no tiene), más efectos decorativos (`SnowEffect` en Navidad, `LeafEffect` en Naturaleza) y un adorno sobre el ícono según el tema (🎅, 🌻, 🕊️).
- Ficha con ubicación y aviso de contacto directo. Si la tienda cargó su zona, la ubicación es un link **"Ver en el mapa"** que abre Google Maps en esa zona (búsqueda por texto, sin API key).
- **Sin traducción automática:** la página se declara en español (`lang="es"`) y marcada como no traducible (`translate="no"`, `class="notranslate"` y `<meta name="google" content="notranslate">` en `index.html`), para que el traductor del navegador no cambie el nombre de la tienda ni los títulos de los productos.
- **Catálogo:** los productos vendidos **no** se muestran al público.
  - **Vista grande:** grilla 1→4 columnas, 12 productos por página. Click en la card la expande in-place (imagen 4:5 + descripción completa).
  - **Vista compacta:** grilla 2→6 columnas, 24 productos por página. Card con foto, título, precio y un único botón ("Comprar", o "Consultar" si la tienda ocultó Comprar). Click en la card abre el detalle.
  - La vista inicial la elige la tienda; el comprador la cambia con el selector "Vista grande / Vista compacta".
  - **Paginación** con anterior/siguiente y números de página (con "…" si hay muchas); al cambiar de página se vuelve al inicio del catálogo. Cambiar filtro, orden o vista vuelve a la página 1.
- **Filtro por categoría** (pills con contadores, en el orden que eligió el vendedor; con más de 10 categorías se muestran las 10 primeras y un botón "+N más"). Si hay productos con categoría y otros sin ella, aparece la pastilla **"Sin categoría"**: agrupa los que no tienen categoría o tienen una que ya no está en la lista de la tienda.
- **Orden:** Más recientes / Precio menor / Nuevos primero (esta última solo si la tienda tiene productos nuevos y usados). Los vendidos siempre quedan al final.
- **Pastilla Nuevo/Usado:** se muestra en las cards y en el detalle, salvo que **todos** los productos disponibles sean nuevos (en ese caso no aporta nada y se oculta). Con al menos un usado se muestran todas. No requiere configuración.
- **Detalle de producto (modal):** se abre desde la vista compacta o por deep link `/shop/:shopId/p/:productId` (se usa al compartir). Tiene las mismas acciones que la card: Comprar (si está habilitado), Preguntar y Compartir.
- **Botón "atrás" del celular:**
  - Con un modal abierto (detalle, pago, foto completa), "atrás" cierra el de más arriba en vez de salir del sitio. Usa `CloseWatcher` (Chrome, Edge y Samsung Internet desde la versión 120), que no agrega entradas al historial y funciona aunque el cliente no haya tocado la página.
  - **Link directo a un producto:** al llegar por `/shop/:shopId/p/:productId` se arma el historial [tienda → producto], así "atrás" (o la cruz) cierra el producto y deja al cliente en la tienda. Esto también cubre Safari/iPhone, que no tiene `CloseWatcher`.
  - En navegadores sin `CloseWatcher` (Safari, Firefox), los modales abiertos con un toque no se cierran con "atrás": "atrás" navega como siempre.
  - En la página principal de la tienda, "atrás" sale del sitio como en cualquier web (los navegadores no permiten retenerlo).
- **Flujo de compra:**
  - Con Alias o CBU cargados → modal "Confirmar Compra": instrucciones en 3 pasos, copiar Alias/CBU, "Abrir Mercado Pago" (intent en Android / scheme en iOS / web en desktop) y "Ya pagué, enviar comprobante" (WhatsApp con mensaje prearmado).
  - Sin datos de pago → va directo a WhatsApp (`buy_direct`).
  - "Preguntar por WhatsApp" incluye el link directo al producto en el mensaje.

### 2.3 IA
| Función | Endpoint | Modelo | Entrada | Salida |
|---|---|---|---|---|
| Autocompletar producto | `/.netlify/functions/analyze-image` | `gpt-4o-mini` (visión) | imagen base64 + `existingCategories` (opcional) | `{ title, description, category? }` |
| Sugerir categorías | `/.netlify/functions/suggest-categories` | `gpt-4o-mini` | lista de `{id, title, description}` | `{ categories[], assignments{productId: categoria} }` |

- Ambas usan `response_format: json_object` y responden en español.
- `analyze-image` solo pide categoría si la tienda ya tiene categorías; el cliente valida que la categoría devuelta exista antes de aplicarla.
- `suggest-categories` pide el **mínimo** de categorías (máx. 6) y una asignación por producto. Al aceptar, la app pregunta si además quiere aplicar las asignaciones (`writeBatch`). Solo se aplican las asignaciones cuya categoría está en la lista aceptada (sin importar mayúsculas); el resto de los productos queda sin categoría.
- Las imágenes se **comprimen en el navegador** (`utils/image.js`, canvas) antes de ir a la IA y a R2: fotos de producto a JPEG máx. 1200 px q=0.8; logos a PNG máx. 512 px.

---

## 3. Arquitectura

```
main.jsx  → BrowserRouter → App.jsx
                              ├── LoggerProvider  (logs en memoria, últimos 50)
                              └── AuthProvider    (Firebase Auth + perfil Firestore)
                                    └── Routes
                                         ├── /                        → Dashboard (App.jsx)
                                         ├── /shop/:shopId            → ShopView
                                         └── /shop/:shopId/p/:prodId  → ShopView (modal abierto)
```

### Estructura de carpetas
```
src/
  App.jsx                 Dashboard del vendedor + modal de configuración (pestaña Datos) + rutas + footer
  main.jsx                Bootstrap de React
  components/
    CreateShop.jsx        Onboarding / alta de tienda
    AddProduct.jsx        Modal alta+edición de producto y "Autocompletar con IA"
    ProductList.jsx       Catálogo: vistas grande/compacta, paginación, filtros, orden y modales de detalle/compra/venta
    CategoryManager.jsx   Pestaña "Categorías": alta, edición, borrado, orden y sugerencia con IA
    ShopCustomization.jsx Pestaña "Personalizar": logo, tema, vista inicial y botón Comprar
    SnowEffect.jsx        Decoración tema Navidad
    LeafEffect.jsx        Decoración tema Naturaleza
    SystemLogger.jsx      Consola de logs en pantalla (apagada: SHOW_LOGS = false en App.jsx)
  context/
    AuthContext.jsx       user, userProfile, loading, profileError, login/logout/refresh
    LoggerContext.jsx     addLog(message, type), clearLogs
  hooks/
    useImageUrl.js        Resuelve una key de R2 a URL mostrable (logo)
    useCloseOnBack.js     "Atrás" del celular cierra el modal abierto (CloseWatcher)
  pages/
    ShopView.jsx          Tienda pública
  services/
    firebase.js           Init de Firebase (auth, db, analytics)
    db.js                 Capa de datos Firestore
    storage.js            Subida, borrado y resolución de URLs de imágenes en R2
  utils/
    themes.js             Temas (clases de Tailwind por zona), temas especiales con fecha y resolución del tema efectivo (resolveTheme)
    image.js              compressImage: redimensionado/recompresión en el navegador
    maps.js               getMapsSearchUrl: link de Google Maps para la zona de la tienda
netlify/functions/
  analyze-image.js        IA: foto → título/descripción/categoría
  suggest-categories.js   IA: productos → categorías + asignaciones
```

### Notas de diseño
- **No hay estado global de datos.** Cada componente consulta Firestore bajo demanda; el refresco se fuerza con un contador (`refreshTrigger` / `refreshProducts`). Los componentes de configuración guardan en Firestore y avisan al Dashboard (`onShopUpdated`, `onCategoriesChange`) para actualizar `shopData` local.
- `SystemLogger` está desactivado con la constante `SHOW_LOGS` en `App.jsx`, pero `addLog` se sigue llamando en toda la app y escribe a consola.
- El `shopId` es un **slug legible** generado del nombre + sufijo aleatorio (ej. `modas-claudia-a3f9`). Renombrar la tienda **no** cambia el enlace.
- El WhatsApp se persiste normalizado como `549XXXXXXXXXX`.
- **Imágenes en R2:** cuando una imagen deja de usarse (borrar producto, reemplazar foto o logo, fallo al guardar después de subir) se borra con `deleteFiles()`, siempre después de persistir en Firestore y en modo best-effort.
- La paginación, el filtro y el orden se resuelven en el cliente sobre el catálogo completo de la tienda.
- **Tema efectivo:** `resolveTheme(shop)` decide qué tema se muestra. Devuelve el tema por defecto (`classic`) si la tienda no eligió tema, si el tema no existe o si es un tema especial que no se eligió dentro de su ventana vigente (`themeSelectedOn`). No hay procesos programados ni migraciones: la caducidad se resuelve al mostrar la tienda.

---

## 4. Modelo de Datos (Firestore)

### `users/{uid}`
| Campo | Tipo | Notas |
|---|---|---|
| `uid`, `email`, `displayName`, `photoURL` | string | Desde Google |
| `shopId` | string | Se agrega al crear la tienda |
| `createdAt` | timestamp | |

### `shops/{slug}`
| Campo | Tipo | Notas |
|---|---|---|
| `ownerId` | string | uid del dueño |
| `name` | string | 4–20 caracteres |
| `description` | string | opcional |
| `whatsapp` | string | `549` + número |
| `location` | string | |
| `mapArea` | string | Zona para Google Maps (barrio/localidad, texto libre). Ausente o `''` = sin link al mapa |
| `alias` | string | uppercase, Mercado Pago |
| `cbu` | string | 22 dígitos, opcional |
| `theme` | string | `classic` \| `dark` \| `nature` \| `pink` \| `sunset` \| `minimal` \| `christmas` \| `pope`. Ausente, desconocido o especial caducado = `classic` |
| `themeSelectedOn` | string | `YYYY-MM-DD` (calendario argentino) en que se eligió el tema. Un tema especial solo vale si esta fecha cae dentro de su ventana vigente |
| `logo` | string | key de R2 del logo (PNG). Ausente o `''` = sin logo |
| `defaultView` | string | `grid` \| `compact`. Ausente = `grid` |
| `showBuyButton` | boolean | Ausente = `true` (las tiendas creadas antes de v0.3 lo muestran) |
| `categories` | string[] | máx. 30. El orden del array es el orden en que se muestran |
| `active` | boolean | |
| `createdAt` / `updatedAt` | timestamp | |

> `theme`, `themeSelectedOn`, `logo`, `defaultView`, `showBuyButton` y `mapArea` no se crean con la tienda: se leen siempre con su valor por defecto. Las tiendas que tenían `christmas` guardado de antes de la v0.4.0 (sin `themeSelectedOn`) se muestran con el tema por defecto.

### `products/{autoId}`
| Campo | Tipo | Notas |
|---|---|---|
| `shopId` | string | |
| `title`, `description` | string | |
| `price` | number | sin separadores |
| `condition` | string | `used` \| `new` |
| `category` | string | debe existir en `shops.categories`; `''` = sin categoría |
| `images` | string[] | keys de R2 (o URLs absolutas legacy) |
| `status` | string | `available` \| `pending` \| `sold` \| `inactive` |
| `buyerInfo` | string | nota al marcar vendido |
| `createdAt` / `updatedAt` / `soldAt` | timestamp | |

### `orders/{autoId}` — definida en `db.js` pero **sin uso actual**
`buyerId`, `shopId`, `productId`, `productTitle`, `price`, `status: 'pending_payment'`, `createdAt`.

### API de `services/db.js`
`createUserProfile`, `getUserProfile`, `createShop`, `getShopByOwner`, `getShopById`, `updateShop`, `addProduct`, `getShopProducts`, `updateProduct`, `deleteProduct`, `updateProductStatus`, `updateShopCategories`, `batchUpdateProductCategories`, `clearCategoryFromProducts`, `renameCategory`, `createOrder`.

> `getShopProducts(shopId)` filtra `status in ['available','pending','sold']` — los `inactive` nunca se listan. El filtrado dueño/público, el orden y la paginación se resuelven en el cliente.
> `clearCategoryFromProducts` y `renameCategory` actualizan los productos en tandas de hasta 500 escrituras (límite de `writeBatch`).

### API de `services/storage.js`
`uploadFile(file) → key`, `deleteFiles(keys)` (ignora URLs absolutas; intenta todas y lanza un único error si alguna falla), `getImageUrl(key) → url`.

---

## 5. Variables de Entorno

### Cliente (`.env`, prefijo `VITE_`)
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

VITE_R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
VITE_R2_ACCESS_KEY_ID=
VITE_R2_SECRET_ACCESS_KEY=
VITE_R2_BUCKET_NAME=
VITE_R2_PUBLIC_DOMAIN=     # opcional; si falta se usan URLs firmadas (1h)

VITE_APP_VERSION=0.4.0-beta   # ignorada: vite.config.js la inyecta desde package.json
```

### Netlify Functions (solo servidor)
```
OPENAI_API_KEY=
```

---

## 6. Puesta en Marcha

```powershell
npm install
npm run dev        # UI sin funciones IA
netlify dev        # UI + Netlify Functions (necesario para "Autocompletar con IA")
npm run build      # → dist/
```

### Firebase
1. Crear proyecto → **Authentication** → habilitar Google.
2. Crear **Firestore Database**.
3. Autorizar el dominio de Netlify en Authentication → Settings → Authorized domains.

### Cloudflare R2
1. Crear bucket.
2. Generar token S3 API con permisos Object Read/Write.
3. Aplicar CORS (`apply-cors.js` o `r2-cors.json`) permitiendo `localhost` y el dominio de producción. Debe incluir `PUT` y `DELETE` (subida y limpieza de imágenes).

### Netlify
- Build: `npm run build`, publish: `dist` (ya definido en `netlify.toml`).
- Cargar todas las variables `VITE_*` más `OPENAI_API_KEY`.

---

## 7. Deuda Técnica y Riesgos Conocidos

1. **Credenciales de R2 expuestas en el bundle del cliente** (`VITE_R2_ACCESS_KEY_ID` / `VITE_R2_SECRET_ACCESS_KEY`). Cualquiera puede extraerlas del JS y escribir/borrar en el bucket. *Recomendado: mover la firma de URLs (subida y borrado) a una Netlify Function que verifique al dueño.*
2. **`apply-cors.js` tiene endpoint, access key y secret hardcodeados** en el repositorio (público). Esas claves deberían rotarse y moverse a variables de entorno.
3. `SECRETS_SCAN_ENABLED = "false"` en `netlify.toml` desactiva el escaneo de secretos del build.
4. No hay reglas de seguridad de Firestore versionadas en el repo.
5. `orders` está implementada en `db.js` pero nunca se invoca.
6. Sin tests automatizados y sin configuración de ESLint (`npm run lint` falla). Los `test-*.js` de prueba manual de OpenAI/funciones están en `.gitignore` (solo existen en local).
7. El modelo soporta múltiples imágenes por producto (`images[]`), pero la UI maneja una sola y la reemplaza al editar.
8. `getShopProducts` trae todos los productos de la tienda y filtra/ordena/pagina en cliente — no escala con catálogos muy grandes (cientos de productos).
9. Las categorías se guardan por nombre (no hay IDs): renombrar implica reescribir los productos de esa categoría.
10. Las imágenes que quedaron huérfanas en R2 antes de la v0.3.0 (borrados y reemplazos previos a la limpieza automática) siguen en el bucket.

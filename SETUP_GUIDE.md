# Tienda Veloz (FeriaDeOfertas) — Funcionalidad y Arquitectura

> Catálogo digital mobile-first para vendedores informales. El vendedor crea su tienda en segundos, sube una foto y la IA redacta título y descripción. El cierre de venta ocurre por WhatsApp + transferencia (Alias/CBU).

Versión actual: `0.2.1-beta`

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
- **Panel:** enlace público de la tienda (copiar / Web Share API / abrir en pestaña), alta de productos y grilla de productos propios.
- **Modal de configuración**, 3 pestañas:
  - **Datos:** editar nombre, descripción, WhatsApp, ubicación, Alias, CBU. El botón guardar solo se habilita si hay cambios.
  - **Tema:** 4 temas disponibles (`classic`, `dark`, `christmas`, `nature`).
  - **Categorías:** hasta 8 por tienda. Alta manual, borrado con confirmación (avisa cuántos productos quedarán "Sin categoría") y **sugerencia por IA**.
- **Gestión de productos:** crear, editar, borrar, marcar **Vendido** (nota opcional del comprador + `soldAt`), volver a **Disponible** y compartir por WhatsApp.

### 2.2 Comprador — Tienda pública (`/shop/:shopId` y `/shop/:shopId/p/:productId`)
- Header con el tema aplicado y efectos decorativos (`SnowEffect` en Navidad, `LeafEffect` en Naturaleza).
- Ficha con ubicación y aviso de contacto directo.
- **Catálogo:** grilla responsive (1→4 columnas). Los productos vendidos **no** se muestran al público.
- **Filtro por categoría** (pills con contadores) y **orden**: Más recientes / Precio menor / Nuevos primero. Los vendidos siempre quedan al final.
- Click en la card la expande in-place (imagen 4:5 + descripción completa).
- **Deep link de producto:** `/shop/:shopId/p/:productId` abre el modal de detalle directamente (se usa al compartir).
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
- `suggest-categories` pide el **mínimo** de categorías (máx. 6) y una asignación por producto. Al aceptar, la app pregunta si además quiere aplicar las asignaciones (`writeBatch`).
- Las imágenes se **comprimen en el navegador** (canvas, máx 1200px, JPEG q=0.8) antes de ir a la IA y a R2.

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
  App.jsx                 Dashboard del vendedor + rutas + footer
  main.jsx                Bootstrap de React
  components/
    CreateShop.jsx        Onboarding / alta de tienda
    AddProduct.jsx        Modal alta+edición, compresión de imagen y "Autocompletar con IA"
    ProductList.jsx       Grilla, filtros, orden y modales de compra/venta/detalle
    SnowEffect.jsx        Decoración tema Navidad
    LeafEffect.jsx        Decoración tema Naturaleza
    SystemLogger.jsx      Consola de logs en pantalla (apagada: SHOW_LOGS = false en App.jsx)
  context/
    AuthContext.jsx       user, userProfile, loading, profileError, login/logout/refresh
    LoggerContext.jsx     addLog(message, type), clearLogs
  pages/
    ShopView.jsx          Tienda pública
  services/
    firebase.js           Init de Firebase (auth, db, analytics)
    db.js                 Capa de datos Firestore
    storage.js            Subida y resolución de URLs de imágenes en R2
  utils/
    themes.js             Definición de los 4 temas
netlify/functions/
  analyze-image.js        IA: foto → título/descripción/categoría
  suggest-categories.js   IA: productos → categorías + asignaciones
```

### Notas de diseño
- **No hay estado global de datos.** Cada componente consulta Firestore bajo demanda; el refresco se fuerza con un contador (`refreshTrigger` / `refreshProducts`).
- `SystemLogger` está desactivado con la constante `SHOW_LOGS` en `App.jsx`, pero `addLog` se sigue llamando en toda la app y escribe a consola.
- El `shopId` es un **slug legible** generado del nombre + sufijo aleatorio (ej. `modas-claudia-a3f9`). Renombrar la tienda **no** cambia el enlace.
- El WhatsApp se persiste normalizado como `549XXXXXXXXXX`.

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
| `alias` | string | uppercase, Mercado Pago |
| `cbu` | string | 22 dígitos, opcional |
| `theme` | string | `classic` \| `dark` \| `christmas` \| `nature` |
| `categories` | string[] | máx. 8 |
| `active` | boolean | |
| `createdAt` / `updatedAt` | timestamp | |

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
`createUserProfile`, `getUserProfile`, `createShop`, `getShopByOwner`, `getShopById`, `updateShop`, `addProduct`, `getShopProducts`, `updateProduct`, `deleteProduct`, `updateProductStatus`, `updateShopCategories`, `batchUpdateProductCategories`, `clearCategoryFromProducts`, `createOrder`.

> `getShopProducts(shopId)` filtra `status in ['available','pending','sold']` — los `inactive` nunca se listan. El filtrado dueño/público y el orden se resuelven en el cliente.

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

VITE_APP_VERSION=0.2.1-beta   # ignorada: vite.config.js la inyecta desde package.json
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
3. Aplicar CORS (`apply-cors.js` o `r2-cors.json`) permitiendo `localhost` y el dominio de producción.

### Netlify
- Build: `npm run build`, publish: `dist` (ya definido en `netlify.toml`).
- Cargar todas las variables `VITE_*` más `OPENAI_API_KEY`.

---

## 7. Deuda Técnica y Riesgos Conocidos

1. **Credenciales de R2 expuestas en el bundle del cliente** (`VITE_R2_ACCESS_KEY_ID` / `VITE_R2_SECRET_ACCESS_KEY`). Cualquiera puede extraerlas del JS y escribir/borrar en el bucket. *Recomendado: mover la firma de URLs a una Netlify Function.*
2. **`apply-cors.js` tiene endpoint, access key y secret hardcodeados** en el repositorio. Esas claves deberían rotarse y moverse a variables de entorno.
3. `SECRETS_SCAN_ENABLED = "false"` en `netlify.toml` desactiva el escaneo de secretos del build.
4. No hay reglas de seguridad de Firestore versionadas en el repo.
5. `orders` está implementada en `db.js` pero nunca se invoca.
6. Sin tests automatizados y sin configuración de ESLint (`npm run lint` falla). Los `test-*.js` de prueba manual de OpenAI/funciones están en `.gitignore` (solo existen en local).
7. El modelo soporta múltiples imágenes por producto (`images[]`), pero la UI maneja una sola y la reemplaza al editar.
8. `getShopProducts` trae todos los productos de la tienda y filtra/ordena en cliente — no escala con catálogos grandes.

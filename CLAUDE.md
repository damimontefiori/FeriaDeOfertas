# CLAUDE.md

Guía para Claude Code al trabajar en este repositorio. Complementa a `SETUP_GUIDE.md` (importada abajo), que es la referencia funcional: features, modelo de datos Firestore, variables de entorno, setup de servicios y deuda técnica. Este archivo cubre **cómo trabajar** en el código y **qué no romper**.

@SETUP_GUIDE.md

---

## Resumen

**Tienda Veloz** (nombre de repo/paquete: `feriadeofertas`) es una PWA mobile-first en español para vendedores informales de Argentina. El vendedor entra con Google, crea su tienda, sube una foto y la IA redacta el producto. El comprador ve el catálogo público y cierra la compra **fuera de la app**: transferencia por Alias/CBU (Mercado Pago) + comprobante por WhatsApp. No hay pasarela de pagos, carrito ni cuentas de comprador.

SPA React 18 + Vite 5 + Tailwind 3 → Firebase (Auth Google + Firestore) → Cloudflare R2 (imágenes) → Netlify (hosting + 2 Functions que llaman a OpenAI `gpt-4o-mini`).

## Comandos

```powershell
npm install
npm run dev       # Vite en :5173. SIN Netlify Functions: "Autocompletar con IA" y "Sugerir con IA" fallan (404)
netlify dev       # UI + Functions. Requiere netlify-cli global (no está en devDependencies) y OPENAI_API_KEY
npm run build     # → dist/. Es el ÚNICO chequeo automático que funciona hoy
npm run preview
```

- **No hay tests.** **`npm run lint` falla**: hay dependencias de ESLint 8 pero ningún archivo de configuración. Validá los cambios con `npm run build` + prueba manual en el navegador.
- El build emite un warning de chunk > 500 kB (bundle único de ~930 kB, sobre todo Firebase + AWS SDK). Es conocido, no es un error.
- Deploy: push a `main` → Netlify buildea solo (`netlify.toml`). No hay ramas de staging.
- Sin `.env` la app arranca pero Firebase falla al hacer login. Las variables están documentadas en SETUP_GUIDE §5 (`.env.example` está desactualizado: le faltan `VITE_R2_PUBLIC_DOMAIN` y `OPENAI_API_KEY`).

## Mapa del código: dónde tocar qué

| Necesito cambiar… | Archivo |
|---|---|
| Rutas, Dashboard del vendedor, cáscara del modal de configuración y su pestaña "Datos" | `src/App.jsx` (componente `Dashboard`) |
| Pestaña "Personalizar": logo, tema, vista inicial del catálogo, botón Comprar | `src/components/ShopCustomization.jsx` |
| Pestaña "Categorías": alta, edición, borrado, sugerencia con IA, límite `MAX_CATEGORIES` | `src/components/CategoryManager.jsx` |
| Catálogo: vistas grande/compacta, paginación (`PAGE_SIZE`), filtros, orden, modales de detalle / compra / venta / lightbox, mensajes de WhatsApp, deep link a Mercado Pago | `src/components/ProductList.jsx` (la usan **dueño y público**, según la prop `isOwner`) |
| Alta/edición de producto, llamada a `analyze-image` | `src/components/AddProduct.jsx` |
| Onboarding / alta de tienda | `src/components/CreateShop.jsx` |
| Página pública de la tienda (encabezado con tema y logo, ubicación con link al mapa) | `src/pages/ShopView.jsx` (+ `src/utils/maps.js` para el link de Google Maps) |
| Idioma de la página y bloqueo del traductor del navegador | `index.html` |
| Botón "atrás" del celular: cerrar modales y historial del link directo | `src/hooks/useCloseOnBack.js` (+ efecto de historial en `src/pages/ShopView.jsx`) |
| Cualquier lectura/escritura en Firestore | `src/services/db.js` |
| Subida, borrado y resolución de URLs de imágenes | `src/services/storage.js` (+ hook `src/hooks/useImageUrl.js` para mostrar una key) |
| Compresión de imágenes en el navegador | `src/utils/image.js` (`compressImage`) |
| Temas visuales, temas especiales (con fecha) y tema por defecto | `src/utils/themes.js` (+ `SnowEffect` / `LeafEffect` si el tema tiene animación) |
| Prompts y llamadas a OpenAI | `netlify/functions/analyze-image.js`, `netlify/functions/suggest-categories.js` |

## Convenciones

- **Idioma:** UI, mensajes de error, prompts de IA, comentarios y commits en **español de Argentina**. El código más nuevo usa voseo ("Tenés", "Querés", "Eliminá"). Usalo en textos nuevos. Identificadores en inglés.
- **JS + JSX sin TypeScript.** Componentes funcionales con hooks. Todo es ESM (`"type": "module"`), incluidas las Functions (`export const handler`).
- **Capa de datos:** los componentes **no** importan `firebase/firestore` directamente. Toda operación va por una función exportada de `services/db.js`, y las imágenes por `services/storage.js`. Si necesitás una query nueva, agregala en `db.js`.
- **Sin estado global de datos** (no hay Redux, React Query ni listeners `onSnapshot`). Cada vista hace fetch al montar. Para refrescar la lista después de una mutación, el padre incrementa un contador (`setRefreshProducts(prev => prev + 1)` → prop `refreshTrigger`). Para cambios en la tienda, el componente hijo guarda en Firestore y avisa al Dashboard con `onShopUpdated(updates)` / `onCategoriesChange(categories)`, que hace `setShopData(prev => ({ ...prev, ...updates }))`.
- **Temas:** cada tema de `themes.js` define **todas** las claves (`bg`, `header`, `text`, `muted`, `surface`, `heading`, `label`, `badge`, `backButton`, `pill`, `pillAlt`, `ring`) con clases de Tailwind **completas y literales**: Tailwind no genera clases armadas dinámicamente. Claves opcionales: `snow` / `leaf` (efecto animado), `badgeEmoji` (adorno sobre el ícono) y `special` (ver "Temas especiales"). El tema de la tienda se aplica a la tienda pública (`ShopView`) **y** al panel del vendedor (`Dashboard` en `App.jsx`, se actualiza en vivo al cambiarlo); ambos le pasan el tema a `ProductList` (prop `theme`). Un tema nuevo tiene que verse bien en los dos encabezados, tanto con texto claro (gradientes) como oscuro (`minimal`): por eso `muted`/`surface` existen. Los encabezados con efectos usan `relative isolate overflow-hidden` y el contenido `relative z-20`; sin `isolate`, el contenido del encabezado del panel tapa los modales.
- **Contextos:** `useAuth()` → `{ user, userProfile, loading, profileError, loginWithGoogle, logout, refreshProfile }`. `useLogger()` → `addLog(msg, 'info' | 'success' | 'error')`, que también escribe en consola. Usá `addLog` para eventos relevantes. El panel `SystemLogger` está oculto (`SHOW_LOGS = false` en `App.jsx`).
- **Feedback al usuario:** `alert()` / `window.confirm()` para validaciones y errores, o un panel/modal inline para confirmaciones con contexto (ej. borrar categoría, marcar vendido). No hay librería de toasts.
- **Estilos:** solo clases de Tailwind inline, sin CSS propio (salvo `index.css`) y con `tailwind.config.js` sin extender. Los colores de marca van como valores arbitrarios: `#252D61` (azul marino, primario), `#5A99CB` (azul), `#75D2C1` (menta). Los inputs llevan `text-base` para evitar el zoom automático de iOS. Modales con `fixed inset-0 bg-black/50|60 ... z-50`.
- **Iconos:** `lucide-react`.
- **Commits:** Conventional Commits en minúscula y en español: `feat: …`, `fix: …`, `style: …`, `refactor: …`, `chore: …`, `docs: …`.
- **Versión:** la fuente de verdad es `version` en `package.json` (actual `0.6.0-beta`; actualizala con `npm version <x> --no-git-tag-version` para que también cambie `package-lock.json`). `vite.config.js` la inyecta como `import.meta.env.VITE_APP_VERSION`, pisando el `.env`, y se muestra en el pie de la app (`v0.6.0-beta`). **Subí la versión en cada entrega que se despliega** (funcionalidad nueva → minor, ajuste o fix → patch) y actualizá "Versión actual" en `SETUP_GUIDE.md`: el usuario la verifica en el pie de producción.
- **Documentación:** si cambiás funcionalidad, modelo de datos o variables de entorno, actualizá `SETUP_GUIDE.md` en el mismo cambio.

## Invariantes del dominio (no romper)

- **URLs públicas:** `/shop/:shopId` y `/shop/:shopId/p/:productId` ya circulan por WhatsApp. No cambies su formato.
- **`shopId` = ID del documento = slug** `nombre-normalizado-xxxx` (4 caracteres base36), generado en `createShop`. Es **inmutable**: renombrar la tienda no cambia el ID.
- **Una tienda por usuario.** El vínculo es `users/{uid}.shopId`, y el `Dashboard` decide qué pantalla mostrar según exista (login → onboarding → panel).
- **WhatsApp** se guarda como `549` + solo dígitos (sin `+`), listo para `https://wa.me/<whatsapp>`. El modal de configuración le quita el `549` para mostrarlo y lo vuelve a agregar al guardar.
- **Precio:** se guarda como `number`. La UI lo muestra con separador de miles `.` y lo limpia (`replace(/\./g, '')`) antes de guardar.
- **Validaciones de la tienda** (nombre de 4 a 20 caracteres, CBU de exactamente 22 dígitos si se carga, alias en mayúsculas) están **duplicadas** en `CreateShop.jsx` y en `handleSaveSettings` de `App.jsx`. Si cambiás una, cambiá la otra.
- **`status` del producto:** `available` | `sold` en la práctica (`pending` e `inactive` existen en el modelo pero ninguna UI los asigna). `getShopProducts` excluye `inactive`. El público **no** ve los `sold`. El dueño los ve en gris y siempre al final de la lista.
- **Categorías:** `shops.categories` es un `string[]` (máximo `MAX_CATEGORIES` = 30, nombres de hasta 30 caracteres, únicos sin importar mayúsculas), y el producto guarda el **nombre** en `category` (no hay IDs; `''` = sin categoría). Por eso:
  - Borrar una categoría exige limpiar los productos (`clearCategoryFromProducts`).
  - Renombrar exige migrar los productos: usá `renameCategory`, que actualiza primero los productos y después la lista (conservando la posición). Ambas escriben en tandas de 500 (límite de `writeBatch`).
  - Cualquier categoría que venga de la IA se valida contra la lista de la tienda antes de aplicarla.
  - `ProductList` ignora una categoría seleccionada que ya no existe (vuelve a "Todos").
  - **"Sin categoría"** agrupa los productos con `category` vacía **o huérfana** (que no está en `shops.categories`). La pastilla solo aparece si además hay productos con categoría; su valor de filtro es el Symbol `UNCATEGORIZED`, para no chocar con ningún nombre que cargue el vendedor.
- **Personalización por tienda:** `theme`, `themeSelectedOn`, `logo`, `defaultView` y `showBuyButton` son campos **opcionales** de `shops` (las tiendas viejas no los tienen y `createShop` no los crea). Leelos siempre con default: el tema **solo** vía `resolveTheme(shop)` / `resolveThemeKey(shop)` (nunca `themes[shop.theme]` directo), `defaultView || 'grid'`, `showBuyButton !== false`, logo vacío = sin logo. No hagas migraciones para agregarlos.
- **Temas especiales:** un tema con `special` solo se puede elegir dentro de su ventana (`{ month }` = ese mes cada año; `{ from?, until }` = evento único, fechas inclusive) y solo se aplica si `themeSelectedOn` cae en la ventana vigente. Fuera de ella, la tienda y el panel muestran `DEFAULT_THEME` (`classic`), y la elección no revive la temporada siguiente. Las fechas son del calendario argentino (`todayInArgentina()`), no de la zona horaria del navegador. Al elegir un tema hay que guardar `themeSelectedOn` junto con `theme`. Para agregar un tema de temporada o evento alcanza con definirlo en `themes.js` con su `special`: el selector, la caducidad y la vuelta al default ya lo resuelven.
- **Pastilla Nuevo/Usado:** es automática, sin campo de configuración. Se oculta si **todos** los productos disponibles (no vendidos) son `new` (`showConditionBadge` en `ProductList`); con al menos un usado se muestran todas, porque "Usado" sí informa. El orden "Nuevos primero" solo aparece si la tienda mezcla nuevos y usados. Se calcula sobre toda la tienda, no sobre el filtro activo. El alta de producto arranca con `getDefaultCondition(products)` (`AddProduct.jsx`): `new` si todos los disponibles son nuevos; si no, el del último creado; sin productos, `used`. El panel lo recibe de `ProductList` vía `onProductsChange` (no vuelve a leer Firestore). Si cambiás la regla de la pastilla, revisá que sigan siendo coherentes.
- **Zona en el mapa:** `mapArea` es un campo **opcional** de `shops` (se carga solo en la pestaña Datos, no en el onboarding). Es texto libre con barrio o localidad, no coordenadas ni dirección exacta: la idea es mostrar la región, no el domicilio. El link se arma siempre con `getMapsSearchUrl()` (`utils/maps.js`, formato oficial de Maps URLs, sin API key). Sin `mapArea`, la ubicación se muestra como texto.
- **Sin traducción automática:** `index.html` declara `lang="es"`, `translate="no"`, `class="notranslate"` y `<meta name="google" content="notranslate">`. No los quites: el traductor del navegador cambiaba nombres de tiendas y títulos de productos. Si algún texto puntual tuviera que traducirse, se marca ese elemento con `translate="yes"`.
- **Botón "atrás":** todo modal nuevo llama a `useCloseOnBack(isOpen, onClose)` (`hooks/useCloseOnBack.js`), así "atrás" en Android lo cierra en vez de salir del sitio. Usa `CloseWatcher`, que **no** agrega entradas al historial: no abras modales con `history.pushState`, porque Chrome saltea las entradas agregadas sin interacción del usuario y además chocan con React Router. El link directo (`/p/:productId`) es el único caso que toca el historial: al llegar (`location.key === 'default'`), `ShopView` lo reemplaza por la tienda y empuja el producto con `state: { fromShop: true }`. En la página principal de la tienda, "atrás" sale del sitio a propósito: no intentes retenerlo.
- **Paginación:** es en el cliente. `PAGE_SIZE` (grande 12, compacta 24) es múltiplo de las columnas de cada grilla (1-4 y 2-6). Si cambiás columnas o tamaños, mantené esa relación para que no queden filas incompletas. Cambiar filtro, orden o vista vuelve a la página 1.
- **Modal de detalle:** lo abren la vista compacta y el deep link. Solo el abierto por deep link (`activeProductId`) cambia la URL al cerrarse: si `ShopView` armó el historial (`state.fromShop`) vuelve a la tienda con `navigate(-1)`; si no, reemplaza la URL (nunca empujes una entrada nueva: "atrás" reabriría el producto). Si la URL deja de apuntar al producto ("atrás" en Safari), `ProductList` cierra su detalle. Las acciones del dueño cierran el detalle antes de abrir otro modal; "Comprar" no lo cierra (el modal de pago queda encima).
- **Imágenes:** `images[]` guarda **keys** de R2 (`<uuid>.<ext>`), no URLs. Resolvelas siempre con `getImageUrl()` (dominio público si está configurado; si no, URL firmada de 1 h). `ProductList` sigue soportando el campo legacy `imageUrl` como fallback. La UI usa solo `images[0]` y, al editar con una foto nueva, reemplaza el array.
- **Limpieza en R2:** cada vez que una imagen deja de estar referenciada (borrar un producto, reemplazar su foto o el logo, quitar el logo, o fallar al guardar después de subir), se borra con `deleteFiles()` de `storage.js`. Se borra **después** de persistir en Firestore y es best-effort: si falla, se loguea con `addLog` y no bloquea al usuario. Mantené este orden en flujos nuevos.
- **Compresión:** toda imagen pasa por `compressImage` de `utils/image.js` antes de ir a R2 o a la IA: fotos de producto a JPEG (máx. 1200 px, q=0.8) y logos a PNG (máx. 512 px) para conservar la transparencia. El nombre del archivo resultante lleva la extensión real, que define la de la key en R2.

## Netlify Functions (IA)

Patrón de ambas funciones (respetalo en funciones nuevas):
1. Rechazan todo lo que no sea `POST` (405) y parsean el body con su propio `try` (400 si es inválido).
2. Leen `process.env.OPENAI_API_KEY` (500 si falta).
3. Hacen `fetch` directo a `https://api.openai.com/v1/chat/completions` (sin SDK), con `model: "gpt-4o-mini"` y `response_format: { type: "json_object" }`.
4. Los errores salen como `{ error, details }`, y el cliente muestra `details`.

El cliente las llama con `fetch('/.netlify/functions/<nombre>', { method: 'POST', body: JSON.stringify(...) })`. Los prompts están en español y piden **texto plano sin markdown ni asteriscos** en las descripciones, porque se renderizan con `whitespace-pre-wrap`.

## Seguridad: leer antes de tocar config, storage o datos

- **El repositorio es PÚBLICO en GitHub.** Nunca commitees secretos, `.env` ni scripts con credenciales. `.gitignore` ya excluye `.env*` y los `test-*.js` locales.
- `apply-cors.js` tiene endpoint y credenciales de R2 **hardcodeadas** (deuda conocida, ver SETUP_GUIDE §7). No las copies a otro lado ni agregues otras. Si lo modificás, pasalo a `process.env`.
- **Toda variable `VITE_*` termina en el bundle público.** Hoy eso incluye las credenciales de R2 (`VITE_R2_ACCESS_KEY_ID` / `VITE_R2_SECRET_ACCESS_KEY`). Los secretos nuevos van **solo** en Netlify Functions (`process.env`, sin prefijo `VITE_`).
- No hay reglas de Firestore versionadas en el repo. La propiedad de la tienda (`isOwner`, `ownerId`) se chequea **solo en la UI**, y `db.js` no verifica permisos.
- `netlify.toml` desactiva el escaneo de secretos (`SECRETS_SCAN_ENABLED = "false"`).

## Trampas conocidas (bugs y restos detectados)

- `handleShare` (App.jsx) no hace nada si el navegador no soporta la Web Share API (no tiene fallback).
- Textos residuales de etapas anteriores: `'Mi Tienda en FeriaDeOfertas'` en `handleShare`, el bloque comentado de Azure en `analyze-image.js` e `index.html`, que apunta a `/vite.svg`, un archivo inexistente.
- `orders` / `createOrder` en `db.js` no se usan.
- `getShopProducts` trae todo el catálogo de la tienda y además pide una URL firmada por producto en cada carga (si no hay dominio público), aunque la página muestre 12 o 24. Filtrado, orden y paginación se hacen en el cliente.
- `AuthProvider` no renderiza nada hasta resolver el estado de auth, también en la tienda pública.

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
| Rutas, Dashboard del vendedor, modal de configuración (Datos / Tema / Categorías), gestión de categorías | `src/App.jsx` (componente `Dashboard`, ~850 líneas) |
| Grilla de productos, filtros, orden, modales de compra / venta / detalle / lightbox, mensajes de WhatsApp, deep link a Mercado Pago | `src/components/ProductList.jsx` (la usan **dueño y público**, según la prop `isOwner`) |
| Alta/edición de producto, compresión de imagen, llamada a `analyze-image` | `src/components/AddProduct.jsx` |
| Onboarding / alta de tienda | `src/components/CreateShop.jsx` |
| Página pública de la tienda (header con tema) | `src/pages/ShopView.jsx` |
| Cualquier lectura/escritura en Firestore | `src/services/db.js` |
| Subida de imágenes y resolución de URLs | `src/services/storage.js` |
| Temas visuales | `src/utils/themes.js` (+ `SnowEffect` / `LeafEffect` si el tema tiene animación) |
| Prompts y llamadas a OpenAI | `netlify/functions/analyze-image.js`, `netlify/functions/suggest-categories.js` |

## Convenciones

- **Idioma:** UI, mensajes de error, prompts de IA, comentarios y commits en **español de Argentina**. El código más nuevo usa voseo ("Tenés", "Querés", "Eliminá"). Usalo en textos nuevos. Identificadores en inglés.
- **JS + JSX sin TypeScript.** Componentes funcionales con hooks. Todo es ESM (`"type": "module"`), incluidas las Functions (`export const handler`).
- **Capa de datos:** los componentes **no** importan `firebase/firestore` directamente. Toda operación va por una función exportada de `services/db.js`, y las imágenes por `services/storage.js`. Si necesitás una query nueva, agregala en `db.js`.
- **Sin estado global de datos** (no hay Redux, React Query ni listeners `onSnapshot`). Cada vista hace fetch al montar. Para refrescar la lista después de una mutación, el padre incrementa un contador (`setRefreshProducts(prev => prev + 1)` → prop `refreshTrigger`). Para cambios en la tienda, el padre actualiza `shopData` local con `setShopData(prev => ({ ...prev, ...updates }))`.
- **Contextos:** `useAuth()` → `{ user, userProfile, loading, profileError, loginWithGoogle, logout, refreshProfile }`. `useLogger()` → `addLog(msg, 'info' | 'success' | 'error')`, que también escribe en consola. Usá `addLog` para eventos relevantes. El panel `SystemLogger` está oculto (`SHOW_LOGS = false` en `App.jsx`).
- **Feedback al usuario:** `alert()` / `window.confirm()` para validaciones y errores, o un panel/modal inline para confirmaciones con contexto (ej. borrar categoría, marcar vendido). No hay librería de toasts.
- **Estilos:** solo clases de Tailwind inline, sin CSS propio (salvo `index.css`) y con `tailwind.config.js` sin extender. Los colores de marca van como valores arbitrarios: `#252D61` (azul marino, primario), `#5A99CB` (azul), `#75D2C1` (menta). Los inputs llevan `text-base` para evitar el zoom automático de iOS. Modales con `fixed inset-0 bg-black/50|60 ... z-50`.
- **Iconos:** `lucide-react`.
- **Commits:** Conventional Commits en minúscula y en español: `feat: …`, `fix: …`, `style: …`, `refactor: …`, `chore: …`, `docs: …`.
- **Versión:** la fuente de verdad es `version` en `package.json` (actual `0.2.1-beta`). `vite.config.js` la inyecta como `import.meta.env.VITE_APP_VERSION`, pisando el `.env`, y se muestra en el footer.
- **Documentación:** si cambiás funcionalidad, modelo de datos o variables de entorno, actualizá `SETUP_GUIDE.md` en el mismo cambio.

## Invariantes del dominio (no romper)

- **URLs públicas:** `/shop/:shopId` y `/shop/:shopId/p/:productId` ya circulan por WhatsApp. No cambies su formato.
- **`shopId` = ID del documento = slug** `nombre-normalizado-xxxx` (4 caracteres base36), generado en `createShop`. Es **inmutable**: renombrar la tienda no cambia el ID.
- **Una tienda por usuario.** El vínculo es `users/{uid}.shopId`, y el `Dashboard` decide qué pantalla mostrar según exista (login → onboarding → panel).
- **WhatsApp** se guarda como `549` + solo dígitos (sin `+`), listo para `https://wa.me/<whatsapp>`. El modal de configuración le quita el `549` para mostrarlo y lo vuelve a agregar al guardar.
- **Precio:** se guarda como `number`. La UI lo muestra con separador de miles `.` y lo limpia (`replace(/\./g, '')`) antes de guardar.
- **Validaciones de la tienda** (nombre de 4 a 20 caracteres, CBU de exactamente 22 dígitos si se carga, alias en mayúsculas) están **duplicadas** en `CreateShop.jsx` y en `handleSaveSettings` de `App.jsx`. Si cambiás una, cambiá la otra.
- **`status` del producto:** `available` | `sold` en la práctica (`pending` e `inactive` existen en el modelo pero ninguna UI los asigna). `getShopProducts` excluye `inactive`. El público **no** ve los `sold`. El dueño los ve en gris y siempre al final de la lista.
- **Categorías:** `shops.categories` es un `string[]` (máximo 8), y el producto guarda el **nombre** en `category` (no hay IDs; `''` = sin categoría). Por eso:
  - Borrar una categoría exige limpiar los productos (`clearCategoryFromProducts`).
  - Renombrar una categoría exigiría migrar los productos. Hoy no existe esa función.
  - Cualquier categoría que venga de la IA se valida contra la lista de la tienda antes de aplicarla.
- **Imágenes:** `images[]` guarda **keys** de R2 (`<uuid>.<ext>`), no URLs. Resolvelas siempre con `getImageUrl()` (dominio público si está configurado; si no, URL firmada de 1 h). `ProductList` sigue soportando el campo legacy `imageUrl` como fallback. La UI usa solo `images[0]` y, al editar con una foto nueva, reemplaza el array.
- **Compresión:** toda imagen pasa por `compressImage` (canvas, máx. 1200 px, JPEG q=0.8) antes de ir a R2 o a la IA.

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

- `AddProduct.handleMagicFill`: el `fetch` corre dentro de `reader.onloadend`, fuera del `try/catch`. Si la Function falla, el error queda sin capturar y el spinner de IA gira para siempre.
- Borrar un producto o reemplazar su foto **no borra el objeto en R2**, así que quedan archivos huérfanos.
- El modal de deep link (`selectedProductView` en `ProductList`) no tiene botón "Comprar", solo "Preguntar" y "Compartir".
- `handleShare` (App.jsx) no hace nada si el navegador no soporta la Web Share API (no tiene fallback).
- Textos residuales de etapas anteriores: `'Mi Tienda en FeriaDeOfertas'` en `handleShare`, log `"Consultando a Azure Vision..."` en `AddProduct` (ahora es OpenAI), el bloque comentado de Azure en `analyze-image.js` e `index.html`, que apunta a `/vite.svg`, un archivo inexistente.
- `orders` / `createOrder` en `db.js` no se usan.
- `getShopProducts` trae todo el catálogo de la tienda y además pide una URL firmada por producto en cada carga (si no hay dominio público). Filtrado y orden se hacen en el cliente.
- `AuthProvider` no renderiza nada hasta resolver el estado de auth, también en la tienda pública.

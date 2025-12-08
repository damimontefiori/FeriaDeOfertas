# FeriaDeOfertas - Guía de Configuración

## Stack Tecnológico
- **Frontend:** React + Vite
- **Estilos:** Tailwind CSS
- **Base de Datos:** Firebase Firestore (Plan Spark)
- **Auth:** Firebase Auth (Google Only)
- **Storage:** Cloudflare R2 (Object Storage)
- **Pagos:** MercadoPago (Link generado en cliente, validación manual por WhatsApp)

## Instalación

1. Clonar el repositorio.
2. Ejecutar `npm install` para instalar dependencias.
   - *Dependencias clave:* `firebase`, `react-router-dom`, `@aws-sdk/client-s3` (para R2).
3. Crear un archivo `.env` basado en el ejemplo provisto arriba.

## Configuración de Servicios

### Firebase
1. Crear proyecto en Firebase Console.
2. Habilitar **Authentication** -> Sign-in method -> Google.
3. Habilitar **Firestore Database**.
   - Reglas de seguridad (Iniciales): Permitir lectura pública, escritura solo autenticados.

### Cloudflare R2
1. Crear un Bucket en Cloudflare R2.
2. Generar Tokens de API (S3 API) con permisos de Lectura y Escritura (Object Read/Write).
3. Configurar CORS en el bucket para permitir peticiones desde `localhost` y el dominio de producción.

## Estructura de Carpetas
- `/src/components`: Componentes UI reutilizables.
- `/src/context`: Estados globales (Auth, Logger).
- `/src/services`: Lógica de conexión con Firebase y R2.
- `/temp_Scripts`: Scripts de prueba aislados.

## Notas de Seguridad
- Las claves de R2 están expuestas en el cliente en esta versión MVP. Asegurar configurar CORS estricto en Cloudflare y considerar rotación de claves periódica.

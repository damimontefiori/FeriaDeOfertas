// src/services/storage.js
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from 'uuid';

const R2_BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME;
const R2_PUBLIC_DOMAIN = import.meta.env.VITE_R2_PUBLIC_DOMAIN || ''; 

const r2Client = new S3Client({
  region: "auto",
  endpoint: import.meta.env.VITE_R2_ENDPOINT,
  forcePathStyle: true, // IMPORTANTE para R2: Evita problemas de DNS con buckets
  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
  },
});

export const uploadFile = async (file) => {
  const fileExtension = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExtension}`;
  
  // Estrategia robusta: Generar URL firmada y usar fetch nativo
  // Esto evita problemas de compatibilidad con Streams en el SDK de AWS para navegadores
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileName,
    ContentType: file.type,
  });

  try {
    // 1. Obtener URL temporal para subir (PUT)
    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 600 });

    // 2. Subir archivo directamente usando fetch
    const response = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });

    if (!response.ok) {
      throw new Error(`Error en subida: ${response.status} ${response.statusText}`);
    }

    return fileName;
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw error;
  }
};

export const getImageUrl = async (path) => {
  // Si tenemos un dominio público configurado y el path no es una URL completa
  if (R2_PUBLIC_DOMAIN && !path.startsWith('http')) {
    return `${R2_PUBLIC_DOMAIN}/${path}`;
  }
  
  // Si ya es una URL (ej: migración futura), devolverla tal cual
  if (path.startsWith('http')) return path;

  // Si no, generar URL firmada (válida por 1 hora)
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: path,
    });
    // Expira en 3600 segundos (1 hora)
    return await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return null;
  }
};

export default r2Client;

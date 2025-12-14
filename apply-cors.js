
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const R2_ENDPOINT = "https://2308deada1ba23f4d42930692fe605d9.r2.cloudflarestorage.com";
const R2_BUCKET_NAME = "feriadeofertas";
const R2_ACCESS_KEY_ID = "f95c2162009fd9e4e72c662ab625eefb";
const R2_SECRET_ACCESS_KEY = "ecb58ea1285ad60b85a6d2cdbd61fcc413a93d3fa0526ad6bba3bde4c04639a9";

const client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const corsRules = [
  {
    AllowedOrigins: ["*"],
    AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
    AllowedHeaders: ["*"],
    ExposeHeaders: ["ETag"],
    MaxAgeSeconds: 3000,
  },
];

const run = async () => {
  console.log("Aplicando configuración CORS al bucket:", R2_BUCKET_NAME);
  try {
    const command = new PutBucketCorsCommand({
      Bucket: R2_BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: corsRules,
      },
    });

    await client.send(command);
    console.log("✅ ¡CORS aplicado exitosamente!");
  } catch (err) {
    console.error("❌ Error aplicando CORS:", err);
  }
};

run();

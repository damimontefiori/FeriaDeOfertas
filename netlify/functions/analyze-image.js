export const handler = async (event) => {
  // Solo permitir método POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { imageBase64 } = JSON.parse(event.body);
    
    // Obtener credenciales desde variables de entorno
    const azureKey = process.env.AZURE_VISION_KEY;
    const azureEndpoint = process.env.AZURE_VISION_ENDPOINT;

    if (!azureKey || !azureEndpoint) {
      console.error("Faltan credenciales de Azure");
      return { statusCode: 500, body: JSON.stringify({ error: "Error de configuración del servidor (Azure)" }) };
    }

    // Convertir base64 a Buffer binario
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // Construir URL para la API v3.2 (Estándar para recursos ComputerVision)
    // Pedimos Descripción y Tags en Español
    const apiUrl = `${azureEndpoint}vision/v3.2/analyze?visualFeatures=Description,Tags&language=es`;

    // Llamada a la API de Azure
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureKey,
        'Content-Type': 'application/octet-stream'
      },
      body: imageBuffer
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Azure API Error:", errorText);
      throw new Error(`Azure rechazó la solicitud: ${response.status}`);
    }

    const data = await response.json();

    // Procesar la respuesta de Azure (v3.2)
    // Estructura típica: { description: { captions: [{ text: "..." }] }, tags: [...] }
    
    const captionRaw = data.description?.captions?.[0]?.text || "Producto excelente";
    const tags = data.tags?.map(t => t.name).slice(0, 5).join(", ") || "";

    // --- MAGIA DE MARKETING ---
    // Convertimos la descripción técnica de Azure en un texto de venta
    
    // Título: Capitalizar primera letra
    const title = captionRaw.charAt(0).toUpperCase() + captionRaw.slice(1);

    // Descripción: Agregar emojis y formato de venta
    const description = `¡Mira este ${captionRaw}! 😍\n\nCaracterísticas destacadas: ${tags}.\n\n✅ Estado impecable\n✅ Ideal para ti\n\n¡Escríbeme para coordinar la entrega! 🚚💨`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        title: title.substring(0, 50), // Limitar largo del título
        description: description
      }),
      headers: { "Content-Type": "application/json" }
    };

  } catch (error) {
    console.error("Error en Function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error analizando imagen", details: error.message })
    };
  }
};

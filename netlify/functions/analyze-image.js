export const handler = async (event) => {
  // Solo permitir método POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { imageBase64 } = JSON.parse(event.body);
    
    // --- CONFIGURACIÓN AZURE OPENAI (GPT-4o mini) ---
    const AOAI_KEY = process.env.AZURE_OPENAI_KEY;
    const AOAI_RESOURCE = process.env.AZURE_OPENAI_RESOURCE || "damimontefioriacc-resource";
    const AOAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini"; 
    const AOAI_API_VERSION = "2024-04-01-preview";
    
    if (!AOAI_KEY) {
      console.error("Falta la clave AZURE_OPENAI_KEY");
      return { statusCode: 500, body: JSON.stringify({ error: "Error de configuración del servidor (AI)" }) };
    }

    const aoaiEndpoint = `https://${AOAI_RESOURCE}.cognitiveservices.azure.com/openai/deployments/${AOAI_DEPLOYMENT}/chat/completions?api-version=${AOAI_API_VERSION}`;

    // --- NUEVA IMPLEMENTACIÓN: GPT-4o mini ---
    try {
      const response = await fetch(aoaiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': AOAI_KEY
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "Eres un experto en marketing digital y copywriting para e-commerce. Tu tarea es analizar la imagen de un producto y generar un título atractivo y una descripción de venta persuasiva. Responde EXCLUSIVAMENTE en formato JSON con las claves 'title' y 'description'."
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Analiza esta imagen y crea un título corto (max 50 chars) y una descripción vendedora con emojis y bullets." },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
              ]
            }
          ],
          max_tokens: 300,
          temperature: 0.7,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Azure OpenAI Error:", errText);
        throw new Error(`Azure OpenAI falló: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);

      return {
        statusCode: 200,
        body: JSON.stringify({
          title: content.title,
          description: content.description
        }),
        headers: { "Content-Type": "application/json" }
      };

    } catch (aiError) {
      console.error("Fallo GPT-4o mini, intentando fallback a Computer Vision...", aiError);
      // Si falla GPT-4o, podríamos caer al código antiguo, pero por ahora lanzamos el error
      // para que el usuario sepa que debe arreglar el deployment name.
      throw aiError;
    }

    /* 
    // --- CÓDIGO ANTERIOR (LEGACY: AZURE COMPUTER VISION) ---
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
    */

  } catch (error) {
    console.error("Error en Function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error analizando imagen", details: error.message })
    };
  }
};

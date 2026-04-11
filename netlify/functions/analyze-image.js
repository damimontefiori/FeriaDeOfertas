export const handler = async (event) => {
  // Solo permitir método POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    let bodyData;
    try {
      bodyData = JSON.parse(event.body);
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON", details: "El cuerpo de la solicitud no es un JSON válido." }) };
    }
    
    const { imageBase64, existingCategories } = bodyData;
    
    if (!imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing Data", details: "Falta la imagen en base64." }) };
    }

    const hasCategories = Array.isArray(existingCategories) && existingCategories.length > 0;

    // --- CONFIGURACIÓN OPENAI (Standard) ---
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_KEY) {
      console.error("Falta la clave OPENAI_API_KEY");
      return { statusCode: 500, body: JSON.stringify({ error: "Config Error", details: "Falta la clave OPENAI_API_KEY en las variables de entorno de Netlify." }) };
    }

    const openaiEndpoint = "https://api.openai.com/v1/chat/completions";

    // --- IMPLEMENTACIÓN: GPT-4o mini (OpenAI Direct) ---
    try {
      const response = await fetch(openaiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: hasCategories
                ? "Eres un experto en marketing digital y copywriting para e-commerce. Tu tarea es analizar la imagen de un producto y generar un título atractivo, una descripción de venta persuasiva y asignar la categoría más apropiada. Responde EXCLUSIVAMENTE en formato JSON con las claves 'title', 'description' y 'category'."
                : "Eres un experto en marketing digital y copywriting para e-commerce. Tu tarea es analizar la imagen de un producto y generar un título atractivo y una descripción de venta persuasiva. Responde EXCLUSIVAMENTE en formato JSON con las claves 'title' y 'description'."
            },
            {
              role: "user",
              content: [
                { type: "text", text: hasCategories
                  ? `Analiza esta imagen y crea un título corto (max 50 chars) y una descripción vendedora con emojis y bullets. IMPORTANTE: No uses asteriscos (*) ni formato markdown para negritas en la descripción. Usa texto plano. Las categorías de esta tienda son: [${existingCategories.join(', ')}]. Asigna la categoría más apropiada de esta lista en el campo 'category'. Si ninguna aplica, deja 'category' como cadena vacía.`
                  : "Analiza esta imagen y crea un título corto (max 50 chars) y una descripción vendedora con emojis y bullets. IMPORTANTE: No uses asteriscos (*) ni formato markdown para negritas en la descripción. Usa texto plano."
                },
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
        console.error("OpenAI API Error:", errText);
        return { 
          statusCode: response.status, 
          body: JSON.stringify({ error: "OpenAI Error", details: `OpenAI respondió con error: ${response.status} - ${errText.substring(0, 200)}` }) 
        };
      }

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);

      const result = {
        title: content.title,
        description: content.description
      };
      if (hasCategories && content.category) {
        result.category = content.category;
      }

      return {
        statusCode: 200,
        body: JSON.stringify(result),
        headers: { "Content-Type": "application/json" }
      };

    } catch (aiError) {
      console.error("Fallo GPT-4o mini (OpenAI), revisa logs...", aiError);
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: "Execution Error", details: `Error ejecutando la IA: ${aiError.message}` }) 
      };
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

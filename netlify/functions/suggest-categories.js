export const handler = async (event) => {
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

    const { products } = bodyData;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing Data", details: "Se requiere un array de productos." }) };
    }

    const OPENAI_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_KEY) {
      console.error("Falta la clave OPENAI_API_KEY");
      return { statusCode: 500, body: JSON.stringify({ error: "Config Error", details: "Falta la clave OPENAI_API_KEY en las variables de entorno de Netlify." }) };
    }

    const openaiEndpoint = "https://api.openai.com/v1/chat/completions";

    // Construir lista de productos para el prompt
    const productList = products.map(p => `- ID: ${p.id} | Título: ${p.title} | Descripción: ${(p.description || '').substring(0, 100)}`).join('\n');

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
              content: "Eres un experto en e-commerce y organización de catálogos. Tu tarea es analizar una lista de productos y sugerir el MÍNIMO número de categorías necesarias para organizarlos de forma eficiente. Las categorías deben ser cortas (1-3 palabras), claras y en español. Máximo 6 categorías. Responde EXCLUSIVAMENTE en formato JSON con las claves 'categories' (array de strings) y 'assignments' (objeto donde cada clave es el ID del producto y el valor es la categoría asignada)."
            },
            {
              role: "user",
              content: `Analiza estos ${products.length} productos y sugiere el menor número de categorías posibles para organizarlos eficientemente. Cada producto debe quedar asignado a exactamente una categoría.\n\nProductos:\n${productList}`
            }
          ],
          max_tokens: 500,
          temperature: 0.3,
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

      return {
        statusCode: 200,
        body: JSON.stringify({
          categories: content.categories,
          assignments: content.assignments
        }),
        headers: { "Content-Type": "application/json" }
      };

    } catch (aiError) {
      console.error("Fallo GPT-4o mini (suggest-categories):", aiError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Execution Error", details: `Error ejecutando la IA: ${aiError.message}` })
      };
    }

  } catch (error) {
    console.error("Error general:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Server Error", details: error.message }) };
  }
};

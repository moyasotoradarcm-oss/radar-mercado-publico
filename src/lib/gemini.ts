export async function analyzeTDR(content: any) {
  try {
    const apiKey = "AQ.Ab8RN6IbJ9zmwt9bfcV38bc4QI5e3Mx-KHh2jkJUhWlF4a4Diw";
    const textContent = typeof content === 'string' ? content : JSON.stringify(content);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Eres un experto en licitaciones públicas de Mercado Público Chile. Analiza el siguiente documento/TDR y entrega un resumen de evaluación con puntos clave, requisitos del proveedor y potenciales riesgos:\n\n${textContent}`
          }]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Error en la respuesta de Google AI');
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Análisis completado sin observaciones.';
  } catch (error: any) {
    console.error("Error en analyzeTDR:", error);
    throw error;
  }
}

export const generateAIAnalysis = analyzeTDR;
export const evaluateTender = analyzeTDR;

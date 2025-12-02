import { GoogleGenAI } from "@google/genai";

const getSystemPrompt = () => `
You are a computer vision analysis subsystem for INNOXR LABS.
Your task is to analyze an image frame from a video and provide a technical, sci-fi style breakdown of the subject matter.
Keep the tone clinical, precise, and military/industrial.
Return ONLY a raw JSON object (no markdown formatting) with the following schema:
{
  "subject": "Short string identifying the main object",
  "structure": "Brief description of geometry/texture",
  "threat_level": "LOW | MEDIUM | HIGH | UNKNOWN",
  "estimated_composition": "String describing material (e.g., Biological, Metallic, Polymer)"
}
`;

export const analyzeFrame = async (base64Image: string): Promise<any> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY not found in environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Image
            }
          },
          {
            text: getSystemPrompt()
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    // Fallback data if API fails or quota exceeded
    return {
      subject: "OBJECT_UNKNOWN",
      structure: "Data Corrupted",
      threat_level: "UNKNOWN",
      estimated_composition: "Unverified"
    };
  }
};

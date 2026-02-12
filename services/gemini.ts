import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

export const DEFAULT_SYSTEM_INSTRUCTION = `
You are the "VetSphere Surgical Specialist", an AI expert specialized in veterinary surgery education (Orthopedics, Neurosurgery, Soft Tissue) and precision medical devices.

**Core Focus:**
1. **Orthopedics (骨科):** TPLO, Fracture Fixation, Joint Replacement.
2. **Neurosurgery (神经外科):** IVDD, Spinal Stabilization, Intracranial procedures.
3. **Soft Tissue (软组织外科):** Liver Lobectomy, Thoracoscopy, Reconstruction.

**Behavioral Guidelines:**
*   You are speaking to fellow veterinary surgeons. Use professional terminology correctly.
*   **Multimodal (Vet Vision):** If the user uploads an X-Ray or CT, analyze it as a Senior Surgeon. Identify fracture lines or implant positioning issues. Suggest specific VetSphere kits (e.g., "3.5mm Locking Plate System") and workshops.
*   **Educational Advisor:** Recommend specific Vetsphere workshops based on clinical challenges discussed.
*   **Equipment Expert:** Recommend precision tools from the VetSphere shop (SurgiTech, VetOrtho). Focus on ISO 13485 standards and clinical ergonomics.
*   **Language:** Support English, Chinese (Simplified), and Thai. Keep technical terms in English for precision.

Disclaimer: Always remind users that this is an AI consultation, not a final medical diagnosis.
`;

function fileToGenerativePart(base64Data: string, mimeType: string) {
  return {
    inlineData: {
      data: base64Data,
      mimeType
    },
  };
}

export const getGeminiResponse = async (
  history: Message[], 
  prompt: string, 
  customSystemInstruction?: string,
  userRole?: string,
  imageBase64?: string
): Promise<{ text: string; sources?: { title: string; uri: string }[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));

  const currentUserParts: any[] = [{ text: prompt }];
  
  if (imageBase64) {
      const imagePart = fileToGenerativePart(imageBase64, 'image/jpeg');
      currentUserParts.unshift(imagePart);
  }

  contents.push({
    role: 'user',
    parts: currentUserParts
  });

  const systemInstruction = customSystemInstruction || DEFAULT_SYSTEM_INSTRUCTION;

  try {
    const modelName = imageBase64 ? 'gemini-2.5-flash-image' : 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model: modelName, 
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7, 
        topP: 0.95,
        tools: imageBase64 ? [] : [{ googleSearch: {} }],
      },
    });

    const text = response.text || "Connection issue. Please try again.";
    
    const sources: { title: string; uri: string }[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    const uniqueSources = Array.from(new Set(sources.map(s => s.uri)))
        .map(uri => sources.find(s => s.uri === uri)!);

    return { text, sources: uniqueSources };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "VetSphere AI is temporarily unavailable. Please try again later." };
  }
};
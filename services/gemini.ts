
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

// Helper to get/set dynamic instructions
export const getSystemInstruction = () => {
  return localStorage.getItem('VS_SYSTEM_PROMPT') || DEFAULT_SYSTEM_INSTRUCTION;
};

export const saveSystemInstruction = (instruction: string) => {
  localStorage.setItem('VS_SYSTEM_PROMPT', instruction);
};

export const getAIConfig = () => {
    const saved = localStorage.getItem('VS_AI_CONFIG');
    return saved ? JSON.parse(saved) : { temperature: 0.7, topP: 0.95 };
};

export const saveAIConfig = (config: { temperature: number, topP: number }) => {
    localStorage.setItem('VS_AI_CONFIG', JSON.stringify(config));
};

function fileToGenerativePart(base64Data: string, mimeType: string) {
  return {
    inlineData: {
      data: base64Data,
      mimeType
    },
  };
}

// Specialized function for structured data generation (e.g. Course Outlines)
export const generateStructuredData = async (prompt: string): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // Force a specific system instruction for data generation tasks to avoid persona pollution
        systemInstruction: "You are a professional veterinary curriculum designer. Output strict JSON only.",
        temperature: 0.7,
      },
    });
    
    const text = response.text;
    if (!text) throw new Error("No data returned from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Structured Data Error:", error);
    throw error;
  }
};

// Specialized function to translate course content
export const generateCourseTranslations = async (
  sourceTitle: string, 
  sourceDesc: string, 
  sourceLang: 'en' | 'zh' | 'th'
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Task: Translate the following Veterinary Course content into the missing languages (English, Chinese Simplified, Thai).
    
    Source Language: ${sourceLang}
    Source Title: "${sourceTitle}"
    Source Description: "${sourceDesc}"
    
    Requirements:
    1. Maintain professional veterinary medical terminology (e.g., TPLO, IVDD, Osteotomy).
    2. Keep the tone academic and professional.
    3. Output JSON format ONLY.
    
    Expected Output Structure:
    {
      "en": { "title": "...", "description": "..." },
      "zh": { "title": "...", "description": "..." },
      "th": { "title": "...", "description": "..." }
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3, // Lower temperature for more accurate translation
      },
    });
    
    const text = response.text;
    if (!text) throw new Error("No translation returned");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    throw error;
  }
};

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

  // Use custom instruction if provided (for specific tasks), otherwise fallback to stored/default
  const systemInstruction = customSystemInstruction || getSystemInstruction();
  const config = getAIConfig();

  try {
    const modelName = imageBase64 ? 'gemini-2.5-flash-image' : 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model: modelName, 
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: config.temperature, 
        topP: config.topP,
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


import OpenAI from "openai";
import { Message } from "../types";

const apiKey = import.meta.env.VITE_AI_API_KEY;
const rawBaseURL = import.meta.env.VITE_AI_BASE_URL;
// Normalize baseURL: most proxies expect /v1 at the end
const baseURL = rawBaseURL && !rawBaseURL.includes('/v1') 
  ? (rawBaseURL.endsWith('/') ? `${rawBaseURL}v1` : `${rawBaseURL}/v1`)
  : rawBaseURL;

const modelName = import.meta.env.VITE_AI_MODEL || "google/gemini-3-flash-preview";

const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: baseURL,
  dangerouslyAllowBrowser: true // Since we are calling from frontend
});

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

// Specialized function for structured data generation (e.g. Course Outlines)
export const generateStructuredData = async (prompt: string): Promise<any> => {
  try {
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: "You are a professional veterinary curriculum designer. Output strict JSON only." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    
    const text = response.choices[0].message.content;
    if (!text) throw new Error("No data returned from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Structured Data Error:", error);
    throw error;
  }
};

// Specialized function to translate course content
export const generateCourseTranslations = async (
  sourceTitle: string, 
  sourceDesc: string, 
  sourceLang: 'en' | 'zh' | 'th'
): Promise<any> => {
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
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    
    const text = response.choices[0].message.content;
    if (!text) throw new Error("No translation returned");
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Translation Error:", error);
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
  
  // history already includes the latest user message from AIChat.tsx
  const messages: any[] = history.map(msg => ({
    role: msg.role === 'model' ? 'assistant' : 'user',
    content: msg.content
  }));

  const systemInstruction = customSystemInstruction || getSystemInstruction();
  messages.unshift({ role: "system", content: systemInstruction });

  // If there's an image, we should attach it to the last user message
  if (imageBase64 && messages.length > 0 && messages[messages.length - 1].role === 'user') {
      const lastMsg = messages[messages.length - 1];
      lastMsg.content = [
          { type: "text", text: typeof lastMsg.content === 'string' ? lastMsg.content : prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`
            }
          }
      ];
  }

  const config = getAIConfig();

  try {
    const response = await openai.chat.completions.create({
      model: modelName, 
      messages: messages,
      temperature: config.temperature, 
      top_p: config.topP,
    });

    const text = response.choices[0].message.content || "Connection issue. Please try again.";
    return { text, sources: [] };

  } catch (error) {
    console.error("AI API Error:", error);
    // Return the error message to the UI so the user knows what happened
    return { text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your API configuration.` };
  }
};

import { Message } from "@/types";

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

export const getSystemInstruction = () => {
  if (typeof window === 'undefined') return DEFAULT_SYSTEM_INSTRUCTION;
  return localStorage.getItem('VS_SYSTEM_PROMPT') || DEFAULT_SYSTEM_INSTRUCTION;
};

export const saveSystemInstruction = (instruction: string) => {
  localStorage.setItem('VS_SYSTEM_PROMPT', instruction);
};

export const getAIConfig = () => {
  if (typeof window === 'undefined') return { temperature: 0.7, topP: 0.95 };
  const saved = localStorage.getItem('VS_AI_CONFIG');
  return saved ? JSON.parse(saved) : { temperature: 0.7, topP: 0.95 };
};

export const saveAIConfig = (config: { temperature: number, topP: number }) => {
  localStorage.setItem('VS_AI_CONFIG', JSON.stringify(config));
};

// Helper to call AI API route
async function callAI(messages: any[], options: { temperature?: number; topP?: number; responseFormat?: string } = {}) {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      temperature: options.temperature ?? 0.7,
      topP: options.topP ?? 0.95,
      responseFormat: options.responseFormat,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'AI request failed');
  }

  return response.json();
}

export const generateStructuredData = async (prompt: string): Promise<any> => {
  try {
    const result = await callAI(
      [
        { role: "system", content: "You are a professional veterinary curriculum designer. Output strict JSON only." },
        { role: "user", content: prompt }
      ],
      { temperature: 0.7, responseFormat: 'json' }
    );
    
    if (!result.content) throw new Error("No data returned from AI");
    return JSON.parse(result.content);
  } catch (error) {
    console.error("AI Structured Data Error:", error);
    throw error;
  }
};

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
    const result = await callAI(
      [{ role: "user", content: prompt }],
      { temperature: 0.3, responseFormat: 'json' }
    );
    
    if (!result.content) throw new Error("No translation returned");
    return JSON.parse(result.content);
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
  const messages: any[] = history.map(msg => ({
    role: msg.role === 'model' ? 'assistant' : 'user',
    content: msg.content
  }));

  const systemInstruction = customSystemInstruction || getSystemInstruction();
  messages.unshift({ role: "system", content: systemInstruction });

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
    const result = await callAI(messages, {
      temperature: config.temperature,
      topP: config.topP,
    });
    
    const text = result.content || "Connection issue. Please try again.";
    return { text, sources: [] };
  } catch (error) {
    console.error("AI API Error:", error);
    return { text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your API configuration.` };
  }
};

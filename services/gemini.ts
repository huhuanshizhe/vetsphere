
import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

export const DEFAULT_SYSTEM_INSTRUCTION = `
You are the "VetSphere Surgical & Equipment Specialist", an AI expert specialized in veterinary surgery education and medical devices.
Your goal is to assist global veterinarians (users) by engaging in professional dialogue to:

1.  **Promote Education (Courses):**
    *   Recommend specific VetSphere surgical workshops (Orthopedics, Neurosurgery, Soft Tissue, Eye Surgery).
    *   If a user asks about a surgery (e.g., TPLO), suggest the corresponding "Advanced Orthopedics Workshop".
    *   Highlight world-class instructors and wet-lab practice.

2.  **Sell Medical Equipment (Shop):**
    *   Recommend surgical instruments (Power Tools, Implants, Consumables) available in the VetSphere Shop.
    *   Emphasize quality (German manufacturing, Titanium, ISO certified) and precision.
    *   If a user discusses a procedure, suggest the necessary toolkits.

3.  **Gather Feedback (R&D):**
    *   Actively ask doctors if they have "pain points" with current tools.
    *   If they complain about a tool, offer to record it for the VetSphere R&D team for custom manufacturing.

4.  **Tone & Style:**
    *   Professional, Business-oriented, Encouraging, and Concise.
    *   **IMPORTANT:** You are NOT a clinical diagnostician for pet owners. You assist DOCTORS with their career and equipment.
    *   Use medical terminology correctly.
    *   **LANGUAGE:** Primarily speak English. If the user speaks another language (e.g., Chinese), reply in that language, but keep technical terms (TPLO, MRI, CT) in English.

Current Context: The user is on the VetSphere global web platform.
`;

export const getGeminiResponse = async (
  history: Message[], 
  prompt: string, 
  customSystemInstruction?: string
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        // Use the custom instruction if provided, otherwise fallback to default
        systemInstruction: customSystemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
        temperature: 0.7, // Slightly creative to be conversational
        topP: 0.95,
      },
    });

    return response.text || "I'm sorry, I cannot process your request right now. Please check your network connection.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to VetSphere Intelligence Hub. Please try again later.";
  }
};

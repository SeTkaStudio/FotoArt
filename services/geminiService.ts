import { GoogleGenAI, Modality } from "@google/genai";
import { ImageFile } from '../types';
import { AspectRatio, FaceSelectionAspectRatio } from '../constants';

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generatePortrait = async (
  imageFile: ImageFile,
  fullPrompt: string,
  backgroundFile: ImageFile | null,
  clothingFile: ImageFile | null,
  apiKey?: string,
): Promise<string> => {
  // ИСПРАВЛЕНО: Используем import.meta.env.VITE_GEMINI_API_KEY
  const effectiveApiKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY;
  if (!effectiveApiKey) {
    throw new Error("API_KEY is not set in the environment.");
  }
  const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

  const parts = [];
  
  parts.push({
    inlineData: {
      data: imageFile.base64,
      mimeType: imageFile.mimeType,
    },
  });
  
  if (clothingFile) {
    parts.push({
      inlineData: {
        data: clothingFile.base64,
        mimeType: clothingFile.mimeType,
      },
    });
  }
  
  if (backgroundFile) {
    parts.push({
      inlineData: {
        data: backgroundFile.base64,
        mimeType: backgroundFile.mimeType,
      },
    });
  }

  parts.push({
    text: fullPrompt,
  });

  let attempt = 1;
  while (attempt <= MAX_RETRIES + 1) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: parts,
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      const candidate = response.candidates?.[0];

      if (!candidate || !candidate.content || !candidate.content.parts) {
        console.error("Invalid response structure from Gemini API:", JSON.stringify(response, null, 2));
        const finishReason = candidate?.finishReason;
        const safetyRatings = candidate?.safetyRatings;
        let errorMessage = "Invalid or empty response from Gemini API.";
        if (finishReason) errorMessage += ` Finish reason: ${finishReason}.`;
        if (safetyRatings?.length) errorMessage += ` Safety ratings: ${JSON.stringify(safetyRatings)}.`;
        if (response.promptFeedback) errorMessage += ` Prompt feedback: ${JSON.stringify(response.promptFeedback)}.`;
        throw new Error(errorMessage);
      }

      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      throw new Error("No image data found in the response parts.");

    } catch (error) {
      const errorStr = String(error);
      const isRateLimitError = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED');

      if (isRateLimitError && attempt <= MAX_RETRIES) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`Rate limit hit. Retrying in ${delay / 1000}s... (Attempt ${attempt}/${MAX_RETRIES})`);
        await sleep(delay);
        attempt++;
      } else {
        console.error(`Error generating portrait on attempt ${attempt}:`, error);
        throw error;
      }
    }
  }
  
  throw new Error("Generation failed after exhausting all retries.");
};

export const generateImageWithGemini = async (prompt: string, aspectRatio: AspectRatio, resolution: string, formatFile: ImageFile, apiKey?: string): Promise<string> => {
    // ИСПРАВЛЕНО: Используем import.meta.env.VITE_GEMINI_API_KEY
    const effectiveApiKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY;
    if (!effectiveApiKey) throw new Error("API_KEY is not set in the environment.");
    const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

    const fullPrompt = `The provided image is a black template that defines the required aspect ratio. Your output MUST match this aspect ratio. The user's prompt is: "${prompt}". The image should be 8k, ultra high detail, photorealistic.`;
    
    const parts = [
      { inlineData: { data: formatFile.base64, mimeType: formatFile.mimeType } },
      { text: fullPrompt }
    ];

    let attempt = 1;
    while (attempt <= MAX_RETRIES + 1) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: parts },
                config: { responseModalities: [Modality.IMAGE] },
            });
            
            const candidate = response.candidates?.[0];
            if (!candidate || !candidate.content || !candidate.content.parts) {
                console.error("Invalid response structure from Gemini API (generateImageWithGemini):", JSON.stringify(response, null, 2));
                const finishReason = candidate?.finishReason;
                const safetyRatings = candidate?.safetyRatings;
                let errorMessage = "Invalid or empty response from Gemini API.";
                if (finishReason) errorMessage += ` Finish reason: ${finishReason}.`;
                if (safetyRatings?.length) errorMessage += ` Safety ratings: ${JSON.stringify(safetyRatings)}.`;
                if (response.promptFeedback) errorMessage += ` Prompt feedback: ${JSON.stringify(response.promptFeedback)}.`;
                if (finishReason === 'SAFETY') throw new Error(errorMessage);
                throw new Error("Retriable error: empty or invalid response received.");
            }

            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            throw new Error("No image data found in Gemini

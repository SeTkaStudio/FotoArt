

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
  // FIX: Use process.env.API_KEY as per guidelines and to fix TypeScript error.
  const effectiveApiKey = apiKey || process.env.API_KEY;
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
    // FIX: Use process.env.API_KEY as per guidelines and to fix TypeScript error.
    const effectiveApiKey = apiKey || process.env.API_KEY;
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
            throw new Error("No image data found in Gemini API response.");

        } catch (error) {
            const errorStr = String(error);
            const isRetriableError = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('Retriable error');

            if (isRetriableError && attempt <= MAX_RETRIES) {
                const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(`Retriable error on Gemini generation. Retrying in ${delay / 1000}s... (Attempt ${attempt}/${MAX_RETRIES})`);
                await sleep(delay);
                attempt++;
            } else {
                console.error(`Error generating image with Gemini on attempt ${attempt}:`, error);
                throw error;
            }
        }
    }
    throw new Error("Gemini generation failed after exhausting all retries.");
};

export const generateImagesWithImagen = async (prompt: string, aspectRatio: AspectRatio, numberOfImages: number, resolution: string, apiKey?: string): Promise<string[]> => {
    // FIX: Use process.env.API_KEY as per guidelines and to fix TypeScript error.
    const effectiveApiKey = apiKey || process.env.API_KEY;
    if (!effectiveApiKey) throw new Error("API_KEY is not set in the environment.");
    const ai = new GoogleGenAI({ apiKey: effectiveApiKey });
    
    const fullPrompt = `${prompt}. 8k, ultra high detail, photorealistic, aim for a high resolution around ${resolution} pixels.`

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: fullPrompt,
        config: {
            numberOfImages: numberOfImages,
            outputMimeType: 'image/png',
            aspectRatio: aspectRatio,
        },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
        // FIX: Properties 'promptFeedback' and 'safetyRatings' do not exist on type 'GenerateImagesResponse'.
        const errorMessage = "No images were generated by Imagen API.";
        console.error("Imagen generation failed:", JSON.stringify(response, null, 2));
        throw new Error(errorMessage);
    }
    
    return response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);
};

export const generateImageVariation = async (
  baseImage: ImageFile,
  fullPrompt: string,
  resolution: string,
  aspectRatio: AspectRatio,
  apiKey?: string,
): Promise<string> => {
  // FIX: Use process.env.API_KEY as per guidelines and to fix TypeScript error.
  const effectiveApiKey = apiKey || process.env.API_KEY;
  if (!effectiveApiKey) throw new Error("API_KEY is not set in the environment.");
  const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

  const finalPrompt = `Use the provided image as the main content reference. Follow these instructions to create a new, modified image: "${fullPrompt}"`;

  const parts = [
    {
      inlineData: {
        data: baseImage.base64,
        mimeType: baseImage.mimeType,
      },
    },
    {
      text: finalPrompt,
    },
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
      if (!candidate?.content?.parts) {
        console.error("Invalid response structure from Gemini API (generateImageVariation):", JSON.stringify(response, null, 2));
        const finishReason = candidate?.finishReason;
        const safetyRatings = candidate?.safetyRatings;
        let errorMessage = "Invalid or empty response from Gemini API.";
        if (finishReason) {
          errorMessage += ` Finish reason: ${finishReason}.`;
          // FIX: This comparison appears to be unintentional because the types 'FinishReason' and '"IMAGE_OTHER"' have no overlap.
          if (String(finishReason) === 'IMAGE_OTHER') errorMessage += ' This may indicate an issue with the input image or a temporary model error. Retrying might help.';
        }
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
       const isRetriableError = (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('IMAGE_OTHER')) || (errorStr.includes('Invalid or empty response') && !errorStr.includes('SAFETY'));
 
       if (isRetriableError && attempt <= MAX_RETRIES) {
         const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
         console.warn(`Retriable error on variation generation. Retrying in ${delay / 1000}s... (Attempt ${attempt}/${MAX_RETRIES})`);
         await sleep(delay);
         attempt++;
       } else {
         console.error(`Error generating variation on attempt ${attempt}:`, error);
         throw error;
       }
    }
  }
  throw new Error("Variation generation failed after exhausting all retries.");
};

export const generateFace = async (
    prompt: string, 
    model: string, 
    aspectRatio: FaceSelectionAspectRatio, 
    formatFile: ImageFile | null,
    apiKey?: string,
): Promise<string> => {
    // FIX: Use process.env.API_KEY as per guidelines and to fix TypeScript error.
    const effectiveApiKey = apiKey || process.env.API_KEY;
    if (!effectiveApiKey) throw new Error("API_KEY is not set in the environment.");
    const ai = new GoogleGenAI({ apiKey: effectiveApiKey });
    
    if (model === 'imagen-4.0-generate-001') {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: aspectRatio,
            },
        });

        if (!response.generatedImages || response.generatedImages.length === 0 || !response.generatedImages[0].image.imageBytes) {
            // FIX: Properties 'promptFeedback' and 'safetyRatings' do not exist on type 'GenerateImagesResponse'.
            const errorMessage = "No images were generated by Imagen API for face selection.";
            console.error("Imagen face generation failed:", JSON.stringify(response, null, 2));
            throw new Error(errorMessage);
        }
        
        return `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
    } else {
        const parts = [];
        let finalPrompt = prompt;

        if (formatFile) {
            finalPrompt = `The provided image is a black template that defines the required aspect ratio. Your output MUST match this aspect ratio. The user's prompt is: "${prompt}".`;
            parts.push({ inlineData: { data: formatFile.base64, mimeType: formatFile.mimeType } });
        }
        
        parts.push({ text: finalPrompt });
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        const candidate = response.candidates?.[0];
        if (!candidate || !candidate.content || !candidate.content.parts) {
            console.error("Invalid response structure from Nano Banana API:", JSON.stringify(response, null, 2));
            let errorMessage = "Invalid or empty response from Nano Banana API.";
            if (candidate?.finishReason) errorMessage += ` Finish reason: ${candidate.finishReason}.`;
            if (candidate?.safetyRatings?.length) errorMessage += ` Safety ratings: ${JSON.stringify(candidate.safetyRatings)}.`;
            if (response.promptFeedback) errorMessage += ` Prompt feedback: ${JSON.stringify(response.promptFeedback)}.`;
            throw new Error(errorMessage);
        }

        for (const part of candidate.content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image data found in Nano Banana response parts.");
    }
};
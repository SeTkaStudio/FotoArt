
import { GoogleGenAI } from "@google/genai";
import type { GenerationConfig } from '../types';

if (!process.env.API_KEY) {
  // This is a placeholder check. In a real environment, the key would be set.
  // We don't throw an error here to allow the app to load,
  // but API calls will fail without the key.
  console.warn("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const generateImagesFromPrompt = async (config: GenerationConfig): Promise<string[]> => {
    try {
        const response = await ai.models.generateImages({
            model: config.model,
            prompt: config.prompt,
            config: {
                numberOfImages: config.numberOfImages,
                outputMimeType: 'image/jpeg',
                aspectRatio: config.aspectRatio,
            },
        });

        if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new Error("The API did not return any images.");
        }

        return response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
    } catch (error) {
        console.error("Error generating images:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        throw new Error(`Failed to generate images. ${errorMessage}`);
    }
};

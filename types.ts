
export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export interface GenerationConfig {
    prompt: string;
    model: string;
    aspectRatio: AspectRatio;
    numberOfImages: number;
}

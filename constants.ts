
import { AspectRatio } from './types';

export const MODELS = [
    { id: 'imagen-4.0-generate-001', name: 'Imagen 4.0 (High Quality)' },
];

export const ASPECT_RATIOS: { id: AspectRatio; name: string }[] = [
    { id: '1:1', name: 'Square (1:1)' },
    { id: '16:9', name: 'Widescreen (16:9)' },
    { id: '9:16', name: 'Portrait (9:16)' },
    { id: '4:3', name: 'Landscape (4:3)' },
    { id: '3:4', name: 'Tall (3:4)' },
];

export const IMAGE_COUNTS = [
    { id: 1, name: '1 Image' },
    { id: 2, name: '2 Images' },
    { id: 3, name: '3 Images' },
    { id: 4, name: '4 Images' },
];

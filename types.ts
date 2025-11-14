
export enum OutputMode {
  Angles = "Различные Ракурсы (3D-Адаптация)",
  Expressions = "Различные Выражения Лица",
}

export enum ShotType {
  CloseUp = "Крупный план лица",
  WaistUp = "От пояса до головы",
  KneeUp = "От колена до головы",
  FullBody = "В полный рост",
}

export enum FaceSelectionShotType {
  CloseUp = "Крупный план лица",
  ChestUp = "От груди до лица",
  WaistUp = "От пояса до лица",
  KneeUp = "От колен до лица",
  FullBody = "В полный рост",
}

export enum BackgroundOption {
  Automatic = "Автоматически",
  White = "Белый фон",
  Green = "Зеленый фон",
  Desert = "Пустыня",
  Sea = "Море",
  Mountains = "Горы",
  Upload = "Загрузить свой фон",
}

export enum ClothingOption {
  Classic = "Классика",
  Leisure = "Отдых",
  Beach = "Пляж",
  Custom = "Вписать вариант",
  Upload = "Загрузить пример",
}

export enum ResolutionOption {
  Square = "Квадрат (1:1)",
  Landscape = "Горизонтальное (16:9)",
  Portrait = "Вертикальное (9:16)",
}

export interface ImageFile {
  preview: string;
  base64: string;
  mimeType: string;
  originalFile?: File; // Added to allow reprocessing when resolution changes
}

export interface GeneratedImage {
  id: string;
  src: string | null;
  prompt: string;
  status: 'pending' | 'success' | 'error';
  resolution: ResolutionOption;
  backgroundPrompt: string;
}

// New types for structured favorites
export interface FavoritesFolder {
  id: string;
  name: string;
  images: string[];
}

export interface FavoritesCategory {
  root: string[];
  folders: FavoritesFolder[];
}

export interface UserFavorites {
  photos: FavoritesCategory;
  avatars: FavoritesCategory;
}

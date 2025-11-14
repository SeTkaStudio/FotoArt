import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { SelectInput } from './SelectInput';
import { ImageGallery } from './ImageGallery';
import { ImageModal } from './ImageModal';
import { AddToFavoritesModal } from './AddToFavoritesModal';
import { GeneratedImage, ImageFile, ResolutionOption } from '../types';
import { PHOTO_GENERATION_MODELS, MODEL_ASPECT_RATIOS, AspectRatio, IMAGE_VARIATION_BASE_PROMPT, VARIATION_STRENGTH_PROMPT_MAP, RESOLUTION_OPTIONS_MAP } from '../constants';
import { generateImageWithGemini, generateImagesWithImagen, generateImageVariation } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const mapAspectRatioToResolutionOption = (aspectRatio: AspectRatio): ResolutionOption => {
    switch (aspectRatio) {
        case '1:1': return ResolutionOption.Square;
        case '16:9':
        case '4:3': return ResolutionOption.Landscape;
        case '9:16':
        case '3:4': return ResolutionOption.Portrait;
        default: return ResolutionOption.Square;
    }
};

const getNumericAspectRatio = (ratio: AspectRatio): number => {
  const [w, h] = ratio.split(':').map(Number);
  if (h === 0) return 1;
  return w / h;
};

const processImage = (file: File, targetAspectRatioValue: AspectRatio): Promise<ImageFile> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                const targetAspectRatio = getNumericAspectRatio(targetAspectRatioValue);
                const CANVAS_WIDTH = 1024;
                const CANVAS_HEIGHT = CANVAS_WIDTH / targetAspectRatio;

                canvas.width = CANVAS_WIDTH;
                canvas.height = CANVAS_HEIGHT;
                
                const imgAspectRatio = img.width / img.height;
                let sx = 0, sy = 0, sw = img.width, sh = img.height;

                if (imgAspectRatio > targetAspectRatio) {
                    sw = img.height * targetAspectRatio;
                    sx = (img.width - sw) / 2;
                } else if (imgAspectRatio < targetAspectRatio) {
                    sh = img.width / targetAspectRatio;
                    sy = (img.height - sh) / 2;
                }
                
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

                const dataUrl = canvas.toDataURL(file.type, 0.9);
                const base64String = dataUrl.split(',')[1];
                
                resolve({
                    preview: dataUrl,
                    base64: base64String,
                    mimeType: file.type,
                    originalFile: file,
                });
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
}

const createFormatFile = (aspectRatioValue: AspectRatio): Promise<ImageFile> => {
    return new Promise((resolve) => {
        const targetAspectRatio = getNumericAspectRatio(aspectRatioValue);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const CANVAS_WIDTH = 256; 
        const CANVAS_HEIGHT = Math.round(CANVAS_WIDTH / targetAspectRatio);

        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        ctx.fillStyle = '#111111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/png');
        const base64String = dataUrl.split(',')[1];
        
        resolve({
            preview: dataUrl,
            base64: base64String,
            mimeType: 'image/png',
        });
    });
};


interface PhotoGenerationPageProps {
  onNavigateBack: () => void;
}

export const PhotoGenerationPage: React.FC<PhotoGenerationPageProps> = ({ onNavigateBack }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState(PHOTO_GENERATION_MODELS[0].id);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [numberOfImages, setNumberOfImages] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  
  const [baseImage, setBaseImage] = useState<ImageFile | null>(null);
  const [variationStrength, setVariationStrength] = useState(5);
  
  const isGenerationCancelled = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { currentUser, decrementCredits, removeFavorite, isFavorite } = useAuth();
  const [creditError, setCreditError] = useState('');
  const [imageToFavorite, setImageToFavorite] = useState<string | null>(null);

  const currentModel = useMemo(() => PHOTO_GENERATION_MODELS.find(m => m.id === selectedModel)!, [selectedModel]);
  const aspectRatioOptions = useMemo(() => MODEL_ASPECT_RATIOS[selectedModel] || [], [selectedModel]);
  
  const maxResolution = useMemo(() => {
      const options = RESOLUTION_OPTIONS_MAP[aspectRatio] || [];
      return options.length > 0 ? options[0].value : '2048x2048';
  }, [aspectRatio]);

  const generationCost = currentUser?.paymentMethod === 'apiKey' ? 0 : numberOfImages;
  
  useEffect(() => {
    if (numberOfImages > currentModel.maxImages) {
      setNumberOfImages(currentModel.maxImages);
    }
    if (!aspectRatioOptions.some(opt => opt.ratio === aspectRatio)) {
        const newAspectRatio = aspectRatioOptions[0]?.ratio || '1:1';
        setAspectRatio(newAspectRatio);
    }
    if (!currentModel.supportsImageInput) {
        setBaseImage(null);
    }
  }, [selectedModel, numberOfImages, aspectRatio, aspectRatioOptions, currentModel.maxImages, currentModel.supportsImageInput]);

  useEffect(() => {
    const reprocess = async () => {
        if (baseImage?.originalFile) {
            const processedFile = await processImage(baseImage.originalFile, aspectRatio);
            setBaseImage(processedFile);
        }
    };
    reprocess();
  }, [aspectRatio, baseImage?.originalFile]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const processedFile = await processImage(file, aspectRatio);
      setBaseImage(processedFile);
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  const runVariationGeneration = async (placeholders: GeneratedImage[]) => {
      if (!baseImage) return;

      const textPromptPart = prompt ? `Text prompt: "${prompt}".` : 'Use your creative judgment to interpret the image.';
      const variationPrompt = VARIATION_STRENGTH_PROMPT_MAP[variationStrength];
      const fullPrompt = `${textPromptPart} ${IMAGE_VARIATION_BASE_PROMPT} ${variationPrompt}`;
      const apiKey = currentUser?.paymentMethod === 'apiKey' ? currentUser.apiKey : undefined;

      for (const placeholder of placeholders) {
        if (isGenerationCancelled.current) break;
        try {
            const resultSrc = await generateImageVariation(baseImage, fullPrompt, maxResolution, aspectRatio, apiKey);
            if (isGenerationCancelled.current) break;
            setGeneratedImages(prev => prev.map(img => img.id === placeholder.id ? { ...img, src: resultSrc, status: 'success' } : img));
        } catch (error) {
            console.error(`Failed to generate image variation for id ${placeholder.id}:`, error);
            setGeneratedImages(prev => prev.map(img => img.id === placeholder.id ? { ...img, status: 'error' } : img));
        }
        if (placeholders.length > 1) await sleep(2500);
      }
  };

  const runTextToImageGeneration = async (placeholders: GeneratedImage[], formatFile: ImageFile) => {
    const apiKey = currentUser?.paymentMethod === 'apiKey' ? currentUser.apiKey : undefined;
    try {
        // ИСПРАВЛЕНО: Проверяем на 'imagen-3.0-generate-002'
        if (selectedModel === 'imagen-3.0-generate-002') { 
            const results = await generateImagesWithImagen(prompt, aspectRatio, numberOfImages, maxResolution, apiKey);
            if (isGenerationCancelled.current) return;
            setGeneratedImages(prev => prev.map((img, i) => ({
                ...img,
                src: results[i] || null,
                status: results[i] ? 'success' : 'error',
            })));
        } else if (selectedModel === 'gemini-2.5-flash-image') {
            for (const placeholder of placeholders) {
                if (isGenerationCancelled.current) break;
                try {
                    const resultSrc = await generateImageWithGemini(prompt, aspectRatio, maxResolution, formatFile, apiKey);
                    if (isGenerationCancelled.current) break;
                    setGeneratedImages(prev => prev.map(img => img.id === placeholder.id ? { ...img, src: resultSrc, status: 'success' } : img));
                } catch (error) {
                    console.error(`Failed to generate image for id ${placeholder.id}:`, error);
                    setGeneratedImages(prev => prev.map(img => img.id === placeholder.id ? { ...img, status: 'error' } : img));
                }
                if (placeholders.length > 1) await sleep(2500);
            }
        }
    } catch (error) {
        console.error("An error occurred during text-to-image generation:", error);
        setGeneratedImages(prev => prev.map(img => ({ ...img, status: 'error' })));
    }
  };


  const handleSubmit = useCallback(async () => {
    if (!currentUser) return;
    if ((!prompt && !baseImage) || !maxResolution) {
        alert("Пожалуйста, введите текстовый промпт или загрузите изображение.");
        return;
    }
    if (currentUser.paymentMethod === 'credits' && currentUser.credits < generationCost) {
      setCreditError(`Недостаточно кредитов. Требуется: ${generationCost}, у вас: ${currentUser.credits}`);
      return;
    }
    if (currentUser.paymentMethod === 'apiKey' && !currentUser.apiKey) {
        setCreditError('Выбран способ оплаты "свой API ключ", но ключ не указан в профиле.');
        return;
    }

    if (currentUser.paymentMethod === 'credits') {
      const creditsDecremented = await decrementCredits(generationCost);
      if (!creditsDecremented) {
          setCreditError('Не удалось списать кредиты. Попробуйте снова.');
          return;
      }
    }

    setCreditError('');
    isGenerationCancelled.current = false;
    setIsLoading(true);

    const placeholders: GeneratedImage[] = Array.from({ length: numberOfImages }).map((_, i) => ({
      id: `gen_${Date.now()}_${i}`,
      src: null,
      prompt: prompt || `Variation of uploaded image (Strength: ${variationStrength})`,
      status: 'pending',
      resolution: mapAspectRatioToResolutionOption(aspectRatio),
      backgroundPrompt: `Model: ${currentModel.name}`,
    }));
    setGeneratedImages(placeholders);

    if (baseImage && currentModel.supportsImageInput) {
        await runVariationGeneration(placeholders);
    } else {
        const formatFile = await createFormatFile(aspectRatio);
        await runTextToImageGeneration(placeholders, formatFile);
    }
    
    setIsLoading(false);

  }, [prompt, selectedModel, aspectRatio, numberOfImages, baseImage, variationStrength, currentModel, maxResolution, currentUser, decrementCredits, generationCost]);

  const handleStopGeneration = () => {
    isGenerationCancelled.current = true;
    setIsLoading(false);
    setGeneratedImages(prev => prev.map(img => img.status === 'pending' ? { ...img, status: 'error' } : img));
  };
  
  const handleRegenerate = useCallback(async (imageId: string) => {
    const imageToRegen = generatedImages.find(img => img.id === imageId);
    if (!imageToRegen || !maxResolution || !currentUser) return;

    if (currentUser.paymentMethod === 'credits' && currentUser.credits < 1) {
      alert("Недостаточно кредитов для перегенерации.");
      return;
    }
    if (currentUser.paymentMethod === 'apiKey' && !currentUser.apiKey) {
        alert('Выбран способ оплаты "свой API ключ", но ключ не указан в профиле.');
        return;
    }
    
    if (currentUser.paymentMethod === 'credits') {
      const creditsDecremented = await decrementCredits(1);
      if (!creditsDecremented) {
          alert("Не удалось списать кредиты. Попробуйте снова.");
          return;
      }
    }

    setGeneratedImages(prev => prev.map(img => img.id === imageId ? { ...img, status: 'pending' } : img));
    const apiKey = currentUser.paymentMethod === 'apiKey' ? currentUser.apiKey : undefined;

    try {
        let resultSrc: string | null = null;
        if (baseImage && currentModel.supportsImageInput) {
             const textPromptPart = imageToRegen.prompt.startsWith('Variation') ? '' : `Text prompt: "${imageToRegen.prompt}".`;
             const variationPrompt = VARIATION_STRENGTH_PROMPT_MAP[variationStrength];
             const fullPrompt = `${textPromptPart} ${IMAGE_VARIATION_BASE_PROMPT} ${variationPrompt}`;
             resultSrc = await generateImageVariation(baseImage, fullPrompt, maxResolution, aspectRatio, apiKey);
        } else if (selectedModel === 'imagen-3.0-generate-002') { // <-- ИСПРАВЛЕНО
            const results = await generateImagesWithImagen(imageToRegen.prompt, aspectRatio, 1, maxResolution, apiKey);
            resultSrc = results[0];
        } else {
            const formatFile = await createFormatFile(aspectRatio);
            resultSrc = await generateImageWithGemini(imageToRegen.prompt, aspectRatio, maxResolution, formatFile, apiKey);
        }
        setGeneratedImages(prev => prev.map(img => img.id === imageId ? { ...img, src: resultSrc, status: 'success' } : img));
    } catch (error) {
        console.error(`Failed to regenerate image for id ${imageId}:`, error);
        setGeneratedImages(prev => prev.map(img => img.id === imageId ? { ...img, status: 'error' } : img));
    }
  }, [generatedImages, selectedModel, aspectRatio, baseImage, variationStrength, currentModel, maxResolution, currentUser, decrementCredits]);


  const handleDelete = (imageId: string) => {
      const imageToDelete = generatedImages.find(img => img.id === imageId);
      if (imageToDelete?.src && isFavorite(imageToDelete.src)) {
        removeFavorite(imageToDelete.src);
      }
      setGeneratedImages(prev => prev.filter(img => img.id !== imageId));
      if (selectedImage?.id === imageId) {
        setSelectedImage(null);
      }
  };
  
  const handleDownload = (src: string, filename?: string) => {
      const link = document.createElement('a');
      link.href = src;
      link.download = filename || `generated_image_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    generatedImages.forEach((image, index) => {
        if (image.src && image.status === 'success') {
            setTimeout(() => {
                handleDownload(image.src!, `image_${image.id}_${index + 1}.png`);
            }, index * 300);
        }
    });
  };

  const handleImageClick = (image: GeneratedImage) => {
    if (image.status === 'success' && image.src) {
        setSelectedImage(image);
    }
  };

  const isSubmitDisabled = (!prompt && !baseImage) || isLoading ||
    (currentUser?.paymentMethod === 'credits' && (currentUser?.credits ?? 0) < generationCost) ||
    (currentUser?.paymentMethod === 'apiKey' && !currentUser?.apiKey);


  return (
    <div className="min-h-screen bg-brand-primary flex flex-col md:flex-row">
      <header className="md:hidden p-4 bg-brand-secondary/50 backdrop-blur-sm border-b border-brand-secondary flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-text-primary">Генерация фото</h1>
          <button onClick={onNavigateBack} title="Назад в меню" className="text-brand-text-secondary hover:text-brand-accent transition-colors">
            <BackIcon />
          </button>
      </header>

      <aside className="w-full md:w-96 bg-brand-secondary/30 p-4 md:p-6 flex-shrink-0 space-y-6 md:h-screen md:overflow-y-auto">
        <div className="hidden md:block">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-brand-text-primary">Генерация Фото</h1>
                <p className="text-sm text-brand-text-secondary">Текст в изображение</p>
              </div>
               <button onClick={onNavigateBack} title="Назад в меню" className="flex items-center gap-2 text-brand-text-secondary hover:text-brand-accent transition-colors p-1 -mr-1 text-sm">
                <BackIcon />
              </button>
            </div>
        </div>

        {baseImage && currentModel.supportsImageInput && (
             <div>
                <label htmlFor="variation-strength" className="block text-sm font-medium text-brand-text-secondary mb-1">
                    Сила вариации (фантазия): <span className="font-bold text-brand-accent">{variationStrength}</span>
                </label>
                <input
                    id="variation-strength"
                    type="range"
                    min="1"
                    max="10"
                    value={variationStrength}
                    onChange={(e) => setVariationStrength(Number(e.target.value))}
                    className="w-full h-2 bg-brand-secondary rounded-lg appearance-none cursor-pointer accent-brand-accent"
                />
                 <p className="mt-2 text-xs text-brand-text-secondary">1 = мин. изменения, 10 = макс. фантазии.</p>
            </div>
        )}
        
        <div>
            <label htmlFor="main-prompt" className="block text-sm font-medium text-brand-text-secondary mb-1">
                Ваш промпт
            </label>
            <div className="relative">
                <textarea
                    id="main-prompt"
                    rows={5}
                    className="block w-full text-sm bg-brand-secondary border-gray-600 focus:outline-none focus:ring-brand-accent focus:border-brand-accent rounded-md text-brand-text-primary p-2 pr-12"
                    placeholder={baseImage ? "Например: 'сделай его киберпанком'" : "Например: 'эпичный портрет космонавта'"}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                />
                {currentModel.supportsImageInput && (
                    <>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            title="Прикрепить изображение"
                            className="absolute top-2 right-2 p-2 rounded-full text-brand-text-secondary hover:bg-brand-primary hover:text-brand-accent transition-colors"
                        >
                            <UploadIcon />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="sr-only"
                            onChange={handleFileChange}
                            accept="image/png, image/jpeg"
                        />
                    </>
                )}
            </div>
             {baseImage && (
                <div className="mt-2 relative w-20 h-20 rounded-md overflow-hidden border-2 border-brand-secondary">
                    <img src={baseImage.preview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                        onClick={() => setBaseImage(null)}
                        className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                        title="Удалить изображение"
                    >
                        <CloseIcon />
                    </button>
                </div>
            )}
             {!currentModel.supportsImageInput && (
                <p className="mt-2 text-xs text-brand-text-secondary">
                    Модель {currentModel.name} не поддерживает загрузку изображений.
                </p>
            )}
        </div>

        <div>
          <label htmlFor="model-select" className="block text-sm font-medium text-brand-text-secondary">
            Модель генерации
          </label>
          <select
            id="model-select"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-brand-secondary border-gray-600 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm rounded-md text-brand-text-primary"
            value={selectedModel}
            onChange={(e) => {
                const model = PHOTO_GENERATION_MODELS.find(m => m.id === e.target.value);
                if (model && model.enabled) {
                    setSelectedModel(e.target.value)
                }
            }}
          >
            {PHOTO_GENERATION_MODELS.map((model) => (
              <option key={model.id} value={model.id} disabled={!model.enabled}>{model.name}</option>
            ))}
          </select>
        </div>

        <SelectInput
          label="Формат изображения"
          options={aspectRatioOptions.map(opt => opt.label)}
          value={aspectRatioOptions.find(opt => opt.ratio === aspectRatio)?.label || ''}
          onChange={(val) => {
              const selectedOpt = aspectRatioOptions.find(opt => opt.label === val);
              if (selectedOpt) {
                setAspectRatio(selectedOpt.ratio);
              }
          }}
        />

        <div>
            <label htmlFor="image-count" className="block text-sm font-medium text-brand-text-secondary mb-1">
                Количество изображений: <span className="font-bold text-brand-accent">{numberOfImages}</span>
            </label>
            <input
                id="image-count"
                type="range"
                min="1"
                max={currentModel.maxImages}
                value={numberOfImages}
                onChange={(e) => setNumberOfImages(Number(e.target.value))}
                className="w-full h-2 bg-brand-secondary rounded-lg appearance-none cursor-pointer accent-brand-accent"
            />
             <p className="mt-2 text-xs text-brand-text-secondary">
                {currentModel.name} генерирует до {currentModel.maxImages} изображений.
             </p>
        </div>

        <div className="pt-4 sticky bottom-0 bg-brand-secondary/30 md:bg-transparent pb-4 md:pb-0">
           {isLoading ? (
              <button
                onClick={handleStopGeneration}
                className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-md hover:bg-red-500 transition-colors flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 5a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V6a1 1 0 00-1-1H5z" clipRule="evenodd" />
                </svg>
                Стоп
              </button>
        ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                className="w-full bg-brand-accent text-brand-primary font-bold py-3 px-4 rounded-md hover:bg-amber-400 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
              >
                { currentUser?.paymentMethod === 'apiKey' 
                  ? 'Сгенерировать (свой API ключ)'
                  : `Сгенерировать (${generationCost} ${generationCost === 1 ? 'кредит' : (generationCost > 1 && generationCost < 5) ? 'кредита' : 'кредитов'})`
              }
              </button>
           )}
           {creditError && <p className="text-sm text-center text-red-500 mt-2">{creditError}</p>}
           {currentUser?.paymentMethod === 'credits' && (currentUser?.credits ?? 0) < generationCost && !isLoading && !creditError && <p className="text-sm text-center text-yellow-400 mt-2">Недостаточно кредитов для генерации {generationCost} изображений.</p>}
        </div>
      </aside>

      <main className="flex-1 bg-brand-primary">
        <ImageGallery 
          title="Сгенерированные изображения"
          images={generatedImages}
          onDownload={handleDownload}
          onRegenerate={handleRegenerate}
          onDelete={handleDelete}
          onDownloadAll={handleDownloadAll}
          onImageClick={handleImageClick}
          isFavorite={isFavorite}
          onAddToFavorites={(src) => setImageToFavorite(src)}
        />
      </main>

      {selectedImage && (
        <ImageModal 
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onDownload={handleDownload}
          onRegenerate={handleRegenerate}
          onDelete={handleDelete}
          isFavorite={selectedImage.src ? isFavorite(selectedImage.src) : false}
          onAddToFavorites={(src) => setImageToFavorite(src)}
          onRemoveFromFavorites={removeFavorite}
        />
      )}
      {imageToFavorite && <AddToFavoritesModal imageSrc={imageToFavorite} onClose={() => setImageToFavorite(null)} />}
</div>
s);
};

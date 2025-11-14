import React, { useState, useCallback, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { SelectInput } from './components/SelectInput';
import { ImageGallery } from './components/ImageGallery';
import { ImageModal } from './components/ImageModal';
import { ToggleSwitch } from './components/ToggleSwitch';
import { AddToFavoritesModal } from './components/AddToFavoritesModal';
import { ImageFile, OutputMode, GeneratedImage, ResolutionOption, BackgroundOption, ShotType, ClothingOption } from './types';
import { RESOLUTION_OPTIONS, VARIATION_PROMPTS, BASE_PROMPT, RESOLUTION_PROMPT_MAP, BACKGROUND_OPTIONS, BACKGROUND_PROMPT_MAP, SHOT_TYPE_OPTIONS, SHOT_TYPE_PROMPT_MAP, CLOTHING_OPTIONS, CLOTHING_PROMPT_MAP, AUTOMATIC_BACKGROUND_SUGGESTIONS } from './constants';
import { generatePortrait } from './services/geminiService';
import { useAuth } from './contexts/AuthContext';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);


interface AppProps {
  onNavigateHome: () => void;
}

const App: React.FC<AppProps> = ({ onNavigateHome }) => {
  const [imageFile, setImageFile] = useState<ImageFile | null>(null);
  const [withEmotions, setWithEmotions] = useState(false);
  const [shotType, setShotType] = useState<ShotType>(ShotType.CloseUp);
  const [resolution, setResolution] = useState<ResolutionOption>(ResolutionOption.Square);
  const [background, setBackground] = useState<BackgroundOption>(BackgroundOption.Automatic);
  const [backgroundFile, setBackgroundFile] = useState<ImageFile | null>(null);
  
  const [clothingOption, setClothingOption] = useState<ClothingOption>(ClothingOption.Classic);
  const [customClothingPrompt, setCustomClothingPrompt] = useState('');
  const [clothingFile, setClothingFile] = useState<ImageFile | null>(null);

  const [numberOfImages, setNumberOfImages] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  
  const isGenerationCancelled = useRef(false);

  const { currentUser, decrementCredits, removeFavorite, isFavorite } = useAuth();
  const [creditError, setCreditError] = useState('');
  
  const [imageToFavorite, setImageToFavorite] = useState<string | null>(null);

  const generationCost = currentUser?.paymentMethod === 'apiKey' ? 0 : numberOfImages;

  const runGeneration = useCallback(async (baseImg: ImageFile, prompt: string, variationId: string, backgroundPromptForRun: string) => {
      const resolutionPrompt = RESOLUTION_PROMPT_MAP[resolution];
      const shotTypePrompt = SHOT_TYPE_PROMPT_MAP[shotType];
      
      let clothingPrompt = '';
      let finalClothingFile: ImageFile | null = null;
      
      const personIdx = 1;
      
      switch (clothingOption) {
        case ClothingOption.Custom:
            clothingPrompt = customClothingPrompt;
            break;
        case ClothingOption.Upload:
            finalClothingFile = clothingFile;
            break;
        default:
            clothingPrompt = CLOTHING_PROMPT_MAP[clothingOption] || '';
            break;
      }

      let mainPrompt: string;
      let bgFile: ImageFile | null = null;
      if (background === BackgroundOption.Upload && backgroundFile) {
        bgFile = backgroundFile;
      }

      if (clothingOption === ClothingOption.Upload && finalClothingFile) {
        let compositionInstruction = `Your task is to create a new photorealistic portrait based on the provided images.
- **Image 1 (PERSON):** This is the subject. Perfectly preserve their identity, face, hair, and body shape/figure from this image.
- **Image 2 (CLOTHING):** This is a clothing reference ONLY. Extract the clothing's style, color, and type. **CRITICAL**: IGNORE the person, pose, lighting, and background from Image 2.
- **Goal:** Create a new photograph of the PERSON from Image 1 wearing the CLOTHING from Image 2. Invent a new, natural pose.`;
        
        if (background === BackgroundOption.Upload && backgroundFile) {
            compositionInstruction += `
- **Image 3 (BACKGROUND):** Place the newly generated person and their clothing into this background realistically.`;
        } else {
            compositionInstruction += `
- **Background:** The background for the new photograph should be: ${backgroundPromptForRun}.`;
        }
    
        mainPrompt = `${compositionInstruction} Now, apply this artistic variation to the scene: "${prompt}". Regarding the final framing of the shot: ${shotTypePrompt}. ${BASE_PROMPT}`;
      } else {
        if (background === BackgroundOption.Upload && backgroundFile) {
          mainPrompt = `${clothingPrompt} The final image should be a cohesive, photorealistic photograph. Apply the following style variation: ${prompt}. ${shotTypePrompt}. Maintain 100% identity of the person (from image ${personIdx}). ${BASE_PROMPT}`;
        } else {
          mainPrompt = `A photorealistic portrait of the same person from the provided image (image ${personIdx}). Maintain 100% identity. ${clothingPrompt}. ${shotTypePrompt}. ${prompt}. ${backgroundPromptForRun}. ${BASE_PROMPT}`;
        }
      }

      const fullPrompt = `${mainPrompt} **CRITICAL FINAL INSTRUCTION**: ${resolutionPrompt}`;

      try {
        const apiKey = currentUser?.paymentMethod === 'apiKey' ? currentUser.apiKey : undefined;
        const src = await generatePortrait(baseImg, fullPrompt, bgFile, finalClothingFile, apiKey);
        return { id: variationId, src, prompt, status: 'success' as const };
      } catch (error) {
        console.error(`Failed to generate image for id ${variationId}:`, error);
        return { id: variationId, src: null, prompt, status: 'error' as const };
      }
  }, [resolution, background, backgroundFile, shotType, clothingOption, customClothingPrompt, clothingFile, currentUser]);


  const handleSubmit = useCallback(async () => {
    if (!imageFile || !currentUser) return;
    if (background === BackgroundOption.Upload && !backgroundFile) {
      alert("Пожалуйста, загрузите файл фона.");
      return;
    }
    if (clothingOption === ClothingOption.Upload && !clothingFile) {
      alert("Пожалуйста, загрузите файл с примером одежды.");
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

    const anglePrompts = VARIATION_PROMPTS[OutputMode.Angles].slice(0, numberOfImages);
    const expressionPrompts = VARIATION_PROMPTS[OutputMode.Expressions];

    const promptsToRun = anglePrompts.map((anglePrompt, index) => {
        let combinedText = anglePrompt.text;
        if (withEmotions) {
            const expression = expressionPrompts[index % expressionPrompts.length];
            const anglePart = anglePrompt.text.replace(/\.$/, '');
            const expressionPart = expression.text.replace(/^A portrait /i, '');
            combinedText = `${anglePart} ${expressionPart}.`;
        }
        return {
            id: anglePrompt.id,
            text: combinedText
        };
    });
    
    let batchBackgroundPrompt = '';
    if (background === BackgroundOption.Automatic) {
        const randomIndex = Math.floor(Math.random() * AUTOMATIC_BACKGROUND_SUGGESTIONS.length);
        batchBackgroundPrompt = AUTOMATIC_BACKGROUND_SUGGESTIONS[randomIndex];
    } else if (background !== BackgroundOption.Upload) {
        batchBackgroundPrompt = BACKGROUND_PROMPT_MAP[background] || '';
    }

    const initialImages: GeneratedImage[] = promptsToRun.map(p => ({
      id: p.id,
      src: null,
      prompt: p.text,
      status: 'pending',
      resolution: resolution,
      backgroundPrompt: batchBackgroundPrompt,
    }));
    setGeneratedImages(initialImages);

    for (const [index, variationPrompt] of promptsToRun.entries()) {
        if (isGenerationCancelled.current) {
          console.log("Generation stopped by user.");
          break;
        }

        if (index > 0) await sleep(2500);

        const result = await runGeneration(imageFile, variationPrompt.text, variationPrompt.id, batchBackgroundPrompt);
        if (isGenerationCancelled.current) break;
        setGeneratedImages(prev => prev.map(img => img.id === result.id ? { ...img, ...result } : img));
    }

    setIsLoading(false);
  }, [imageFile, withEmotions, numberOfImages, runGeneration, background, backgroundFile, resolution, clothingOption, clothingFile, currentUser, decrementCredits, generationCost]);

  const handleStopGeneration = () => {
    isGenerationCancelled.current = true;
    setIsLoading(false);
  };

  const handleRegenerate = useCallback(async (imageId: string) => {
    if (!imageFile || !currentUser) return;
     if (background === BackgroundOption.Upload && !backgroundFile) {
      alert("Пожалуйста, загрузите файл фона, чтобы перегенерировать изображение.");
      return;
    }
    if (clothingOption === ClothingOption.Upload && !clothingFile) {
      alert("Пожалуйста, загрузите файл с примером одежды, чтобы перегенерировать изображение.");
      return;
    }
    
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

    const imageToRegen = generatedImages.find(img => img.id === imageId);
    if (!imageToRegen) return;

    setGeneratedImages(prev => prev.map(img => img.id === imageId ? { ...img, status: 'pending' } : img));
    const result = await runGeneration(imageFile, imageToRegen.prompt, imageId, imageToRegen.backgroundPrompt);
    setGeneratedImages(prev => prev.map(img => img.id === result.id ? { ...img, ...result, resolution: resolution } : img));
  }, [imageFile, generatedImages, runGeneration, background, backgroundFile, resolution, clothingOption, clothingFile, currentUser, decrementCredits]);

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
      link.download = filename || `portrait_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    generatedImages.forEach((image, index) => {
        if (image.src && image.status === 'success') {
            setTimeout(() => {
                handleDownload(image.src!, `portrait_${image.id}_${index + 1}.png`);
            }, index * 300);
        }
    });
  };

  const handleImageClick = (image: GeneratedImage) => {
    if (image.status === 'success' && image.src) {
        setSelectedImage(image);
    }
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  const isSubmitDisabled = !imageFile || 
    (background === BackgroundOption.Upload && !backgroundFile) || 
    (clothingOption === ClothingOption.Upload && !clothingFile) ||
    (currentUser?.paymentMethod === 'credits' && (currentUser?.credits ?? 0) < generationCost) ||
    (currentUser?.paymentMethod === 'apiKey' && !currentUser?.apiKey);

  return (
    <div className="min-h-screen bg-brand-primary flex flex-col md:flex-row">
      <header className="md:hidden p-4 bg-brand-secondary/50 backdrop-blur-sm border-b border-brand-secondary flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brand-text-primary">SeTka Project</h1>
          <button onClick={onNavigateHome} title="На главную" className="text-brand-text-secondary hover:text-brand-accent transition-colors">
            <HomeIcon />
          </button>
      </header>
      <aside className="w-full md:w-96 bg-brand-secondary/30 p-4 md:p-6 flex-shrink-0 space-y-6 md:h-screen md:overflow-y-auto">
        <div className="hidden md:block">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-brand-text-primary">SeTka Project</h1>
                <p className="text-sm text-brand-text-secondary">Портретный Адаптер</p>
              </div>
               <button onClick={onNavigateHome} title="На главную" className="text-brand-text-secondary hover:text-brand-accent transition-colors p-1 -mr-1">
                <HomeIcon />
              </button>
            </div>
        </div>

        <FileUpload 
          id="face-file-upload"
          label="Загрузите Фото Лица"
          description="Загрузите четкое фото. Оно будет автоматически вписано в выбранный формат."
          selectedFile={imageFile}
          onFileSelect={setImageFile}
          targetResolution={resolution}
        />
        
        <SelectInput
          label="Одежда"
          description="Выберите стиль одежды для портрета."
          options={CLOTHING_OPTIONS}
          value={clothingOption}
          onChange={(val) => setClothingOption(val as ClothingOption)}
        />

        {clothingOption === ClothingOption.Custom && (
            <div>
              <label htmlFor="custom-clothing-prompt" className="block text-sm font-medium text-brand-text-secondary">
                Опишите одежду
              </label>
              <textarea
                id="custom-clothing-prompt"
                rows={3}
                className="mt-1 block w-full text-sm bg-brand-secondary border-gray-600 focus:outline-none focus:ring-brand-accent focus:border-brand-accent rounded-md text-brand-text-primary p-2"
                placeholder="Например: 'в красном платье в горошек'"
                value={customClothingPrompt}
                onChange={(e) => setCustomClothingPrompt(e.target.value)}
              />
            </div>
        )}

        {clothingOption === ClothingOption.Upload && (
            <FileUpload
                id="clothing-file-upload"
                label="Загрузите Пример Одежды"
                description="Загрузите фото с одеждой. Оно будет автоматически вписано в выбранный формат."
                selectedFile={clothingFile}
                onFileSelect={setClothingFile}
                targetResolution={resolution}
            />
        )}

        <ToggleSwitch
          label="Добавить эмоции"
          description="Включите, чтобы добавить случайные эмоции (улыбка, удивление и т.д.) к генерируемым ракурсам."
          enabled={withEmotions}
          onChange={setWithEmotions}
        />
        
        <SelectInput
          label="План"
          description="Выберите кадрирование портрета."
          options={SHOT_TYPE_OPTIONS}
          value={shotType}
          onChange={(val) => setShotType(val as ShotType)}
        />

        <SelectInput
          label="Выбор фона"
          description="Выберите фон для портрета."
          options={BACKGROUND_OPTIONS}
          value={background}
          onChange={(val) => {
            setBackground(val as BackgroundOption);
            if (val !== BackgroundOption.Upload) {
              setBackgroundFile(null);
            }
          }}
        />
        
        {background === BackgroundOption.Upload && (
          <FileUpload
            id="background-file-upload"
            label="Загрузите Файл Фона"
            description="Выберите изображение для фона. Оно будет автоматически вписано в выбранный формат."
            selectedFile={backgroundFile}
            onFileSelect={setBackgroundFile}
            targetResolution={resolution}
          />
        )}


        <SelectInput
          label="Разрешение и Соотношение Сторон"
          options={RESOLUTION_OPTIONS}
          value={resolution}
          onChange={(val) => setResolution(val as ResolutionOption)}
        />

        <div>
            <label htmlFor="image-count" className="block text-sm font-medium text-brand-text-secondary mb-1">
                Количество изображений: <span className="font-bold text-brand-accent">{numberOfImages}</span>
            </label>
            <input
                id="image-count"
                type="range"
                min="1"
                max="20"
                value={numberOfImages}
                onChange={(e) => setNumberOfImages(Number(e.target.value))}
                className="w-full h-2 bg-brand-secondary rounded-lg appearance-none cursor-pointer accent-brand-accent"
            />
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
           {currentUser?.paymentMethod === 'credits' && (currentUser?.credits ?? 0) < generationCost && !creditError && <p className="text-sm text-center text-yellow-400 mt-2">Недостаточно кредитов для генерации {generationCost} изображений.</p>}
        </div>
      </aside>

      <main className="flex-1 bg-brand-primary">
        <ImageGallery 
          title="Ваши адаптивные портреты" 
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
          onClose={handleCloseModal}
          onDownload={handleDownload}
          onRegenerate={handleRegenerate}
          onDelete={handleDelete}
          isFavorite={selectedImage.src ? isFavorite(selectedImage.src) : false}
          onAddToFavorites={(src) => setImageToFavorite(src)}
          onRemoveFromFavorites={(src) => removeFavorite(src)}
        />
      )}
      {imageToFavorite && <AddToFavoritesModal imageSrc={imageToFavorite} onClose={() => setImageToFavorite(null)} />}
    </div>
  );
};

export default App;

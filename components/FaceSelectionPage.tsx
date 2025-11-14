import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { SelectInput } from './SelectInput';
import { ToggleSwitch } from './ToggleSwitch';
import { ImageModal } from './ImageModal';
import { AddToFavoritesModal } from './AddToFavoritesModal';
import { GeneratedImage, ResolutionOption, ImageFile, FaceSelectionShotType } from '../types';
import { FACE_SELECTION_OPTIONS, FACE_SELECTION_MODELS, FACE_SELECTION_ASPECT_RATIOS, FaceSelectionAspectRatio, ETHNIC_FEATURE_MAP, IMAGE_VARIATION_BASE_PROMPT, FACE_SELECTION_SHOT_TYPE_OPTIONS, FACE_SELECTION_SHOT_TYPE_PROMPT_MAP } from '../constants';
import { generateFace, generateImageVariation } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const LoadingSpinner = () => (
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent"></div>
);

const ErrorIcon = ({ isSmall = false }: { isSmall?: boolean }) => (
    <div className="text-center text-red-500">
        <svg xmlns="http://www.w3.org/2000/svg" className={`${isSmall ? 'h-8 w-8' : 'h-12 w-12'} mx-auto`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {!isSmall && <p className="mt-2 text-xs text-brand-text-secondary">Ошибка</p>}
    </div>
);

const PlaceholderCard = () => (
    <div className="w-full h-full bg-brand-secondary rounded-lg flex items-center justify-center">
        <svg className="w-16 h-16 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
    </div>
);

const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const StarIcon = ({ isFavorite }: { isFavorite: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isFavorite ? 'text-yellow-400' : 'text-white'}`} viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);


const getAspectRatioClass = (ratio: FaceSelectionAspectRatio) => {
    switch (ratio) {
        case '16:9': return 'aspect-video';
        case '9:16': return 'aspect-[9/16]';
        default: return 'aspect-square';
    }
}

const mapFaceAspectRatioToResolutionOption = (aspectRatio: FaceSelectionAspectRatio): ResolutionOption => {
    switch (aspectRatio) {
        case '1:1': return ResolutionOption.Square;
        case '16:9': return ResolutionOption.Landscape;
        case '9:16': return ResolutionOption.Portrait;
        default: return ResolutionOption.Square;
    }
};

const getNumericAspectRatio = (ratio: FaceSelectionAspectRatio): number => {
  const [w, h] = ratio.split(':').map(Number);
  if (h === 0) return 1;
  return w / h;
};

const createFormatFile = (aspectRatioValue: FaceSelectionAspectRatio): Promise<ImageFile> => {
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
        resolve({ preview: dataUrl, base64: base64String, mimeType: 'image/png' });
    });
};

const emotionOptions = [
    'Нейтральное', 'Легкая улыбка', 'Широкая улыбка', 'Смех', 'Удивление', 'Злость', 'Гнев', 'Крик', 'Заплаканное лицо'
];

const emotionPrompts: { [key: string]: string } = {
    'Нейтральное': 'A portrait with a neutral, calm expression.',
    'Легкая улыбка': 'A portrait with a light, gentle smile.',
    'Широкая улыбка': 'A portrait with a wide, joyful smile showing teeth.',
    'Смех': 'A portrait that is laughing heartily.',
    'Удивление': 'A portrait with a surprised expression (mouth slightly open, eyebrows raised).',
    'Злость': 'A portrait showing an angry expression, with furrowed brows and a tense jaw.',
    'Гнев': 'A portrait showing a furious, rage-filled expression.',
    'Крик': 'A portrait of the person shouting or screaming with their mouth wide open.',
    'Заплаканное лицо': 'A portrait of the person crying, with visible tears on their face.'
};

const initialExpressionMap: { [key: string]: string | undefined } = {
  'Нейтральное (спокойное)': 'Нейтральное',
  'Легкая улыбка (дружелюбное)': 'Легкая улыбка',
  'Широкая улыбка (счастливое)': 'Широкая улыбка',
  'Серьезное': 'Нейтральное',
  'Задумчивое': 'Нейтральное',
  'Уверенное (с ухмылкой)': 'Легкая улыбка',
};

const variationButtons = [
    { label: "Сгенерировать поворот головы налево и направо", prompts: [{ id: 'angle_right_60', text: 'The person keeps their body still, facing forward, but performs a strong, clear turn of their head 60 degrees to the right. The side profile of their face, including the jawline and right ear, should be prominent. Their gaze must follow the direction of the turn. This is a distinct rotation of the entire head, not just the eyes.' }, { id: 'angle_left_60', text: 'The person keeps their body still, facing forward, but performs a strong, clear turn of their head 60 degrees to the left. The side profile of their face, including the jawline and left ear, should be prominent. Their gaze must follow the direction of the turn. This is a distinct rotation of the entire head, not just the eyes.' }] },
    { label: "Наклон головы вниз и вверх", prompts: [{ id: 'tilt_down_strong', text: 'The person strongly tilts their head down, chin towards chest, and also slightly turns their head to the side, looking down.' }, { id: 'tilt_up_strong', text: 'The person strongly raises their head up, chin high, their gaze directed upwards.' }] },
    { label: "вид снизу и вид сверху", prompts: [{ id: 'view_from_below', text: 'Low-angle shot. The camera is positioned very low, at the person\'s waist level, and is pointing upwards. The person is looking down directly into the camera lens.' }, { id: 'view_from_above', text: 'High-angle shot, also known as a bird\'s-eye view. The camera is positioned high above the person\'s head, pointing down. The person is looking up directly into the camera lens.' }] },
    { label: "Поворот туловища влево и вправо", prompts: [{ id: 'torso_left_60', text: 'A portrait where the person has turned their entire torso 60 degrees to the left. The result is an almost profile view of the person.' }, { id: 'torso_right_60', text: 'A portrait where the person has turned their entire torso 60 degrees to the right. The result is an almost profile view of the person.' }] },
    { label: "Вид сзади", prompts: [{ id: 'back_view_left_profile', text: 'A portrait from behind. The person is standing with their back to the camera but has turned their head 90 degrees to the left, showing their left profile.' }, { id: 'back_view_straight', text: 'A photograph taken directly from behind the person. The image must clearly show the back of the person\'s head (occiput) and their back. The person is standing with their back completely to the camera and is not turning.' }, { id: 'back_view_right_profile', text: 'A portrait from behind. The person is standing with their back to the camera but has turned their head 90 degrees to the right, showing their right profile.' }] }
];

interface FaceSelectionPageProps { onNavigateBack: () => void; }

export const FaceSelectionPage: React.FC<FaceSelectionPageProps> = ({ onNavigateBack }) => {
    const [model, setModel] = useState(FACE_SELECTION_MODELS[0].id);
    const [shotType, setShotType] = useState<FaceSelectionShotType>(FaceSelectionShotType.CloseUp);
    const [aspectRatio, setAspectRatio] = useState<FaceSelectionAspectRatio>('16:9');
    const [ethnicCoherence, setEthnicCoherence] = useState(true);
    const [gender, setGender] = useState(FACE_SELECTION_OPTIONS.gender[1]);
    const [ageRange, setAgeRange] = useState(FACE_SELECTION_OPTIONS.age_range[0]);
    const [ethnicity, setEthnicity] = useState(FACE_SELECTION_OPTIONS.ethnicity[0]);
    const [skinTone, setSkinTone] = useState(FACE_SELECTION_OPTIONS.skin_tone[0]);
    const [faceShape, setFaceShape] = useState(FACE_SELECTION_OPTIONS.face_shape[0]);
    const [eyesShape, setEyesShape] = useState(FACE_SELECTION_OPTIONS.eyes_shape[0]);
    const [eyeColor, setEyeColor] = useState(FACE_SELECTION_OPTIONS.eye_color[0]);
    const [noseShape, setNoseShape] = useState(FACE_SELECTION_OPTIONS.nose_shape[0]);
    const [lipsShape, setLipsShape] = useState(FACE_SELECTION_OPTIONS.lips_shape[0]);
    const [hairLength, setHairLength] = useState(FACE_SELECTION_OPTIONS.hair_length[0]);
    const [hairColor, setHairColor] = useState(FACE_SELECTION_OPTIONS.hair_color[0]);
    const [hairTexture, setHairTexture] = useState(FACE_SELECTION_OPTIONS.hair_texture[0]);
    const [facialHair, setFacialHair] = useState(FACE_SELECTION_OPTIONS.facial_hair[0]);
    const [expression, setExpression] = useState(FACE_SELECTION_OPTIONS.expression[1]);

    const [isLoading, setIsLoading] = useState(false);
    const [generatedImageObject, setGeneratedImageObject] = useState<GeneratedImage | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [variations, setVariations] = useState<GeneratedImage[]>([]);
    const [isVariationLoading, setIsVariationLoading] = useState(false);
    const [selectedVariation, setSelectedVariation] = useState<GeneratedImage | null>(null);
    const [isWorkModeActive, setIsWorkModeActive] = useState(false);

    const [emotionCache, setEmotionCache] = useState<Record<string, GeneratedImage>>({});
    const [currentEmotion, setCurrentEmotion] = useState<string>('Нейтральное');
    const [isEmotionLoading, setIsEmotionLoading] = useState(false);
    
    const { currentUser, decrementCredits, removeFavorite, isFavorite } = useAuth();
    const [imageToFavorite, setImageToFavorite] = useState<string | null>(null);

    const [selectedVariationSet, setSelectedVariationSet] = useState<string>(variationButtons[0].label);

    const getFilteredOptions = useCallback((featureType: keyof typeof ETHNIC_FEATURE_MAP[string]) => {
        const fullList = FACE_SELECTION_OPTIONS[featureType as keyof typeof FACE_SELECTION_OPTIONS] || [];
        if (!ethnicCoherence || ethnicity === 'Случайный выбор' || !ETHNIC_FEATURE_MAP[ethnicity]) return fullList;
        const mapping = ETHNIC_FEATURE_MAP[ethnicity];
        const filteredList = mapping?.[featureType];
        return (filteredList && filteredList.length > 0) ? ['Случайный выбор', ...filteredList] : fullList;
    }, [ethnicCoherence, ethnicity]);

    const skinToneOptions = useMemo(() => getFilteredOptions('skin_tone'), [getFilteredOptions]);
    const eyesShapeOptions = useMemo(() => getFilteredOptions('eyes_shape'), [getFilteredOptions]);
    const eyeColorOptions = useMemo(() => getFilteredOptions('eye_color'), [getFilteredOptions]);
    const noseShapeOptions = useMemo(() => getFilteredOptions('nose_shape'), [getFilteredOptions]);
    const hairTextureOptions = useMemo(() => getFilteredOptions('hair_texture'), [getFilteredOptions]);
    const hairColorOptions = useMemo(() => getFilteredOptions('hair_color'), [getFilteredOptions]);

    useEffect(() => { if (!skinToneOptions.includes(skinTone)) setSkinTone(skinToneOptions[0]); }, [skinToneOptions, skinTone]);
    useEffect(() => { if (!eyesShapeOptions.includes(eyesShape)) setEyesShape(eyesShapeOptions[0]); }, [eyesShapeOptions, eyesShape]);
    useEffect(() => { if (!eyeColorOptions.includes(eyeColor)) setEyeColor(eyeColorOptions[0]); }, [eyeColorOptions, eyeColor]);
    useEffect(() => { if (!noseShapeOptions.includes(noseShape)) setNoseShape(noseShapeOptions[0]); }, [noseShapeOptions, noseShape]);
    useEffect(() => { if (!hairTextureOptions.includes(hairTexture)) setHairTexture(hairTextureOptions[0]); }, [hairTextureOptions, hairTexture]);
    useEffect(() => { if (!hairColorOptions.includes(hairColor)) setHairColor(hairColorOptions[0]); }, [hairColorOptions, hairColor]);

    const buildPrompt = useCallback(() => {
        const genderPromptPart = gender === 'Женщина' ? 'a woman' : 'a man';
        let clothingPromptPart = '';
        if (shotType !== FaceSelectionShotType.CloseUp) {
            if (gender === 'Женщина') {
                const top = 'a gray cropped tank top with thin straps';
                clothingPromptPart = (shotType === FaceSelectionShotType.WaistUp || shotType === FaceSelectionShotType.KneeUp || shotType === FaceSelectionShotType.FullBody) ? `wearing ${top} and gray sports bikini bottoms` : `wearing ${top}`;
            } else {
                const top = 'a simple plain gray tank top';
                clothingPromptPart = (shotType === FaceSelectionShotType.WaistUp || shotType === FaceSelectionShotType.KneeUp || shotType === FaceSelectionShotType.FullBody) ? `wearing ${top} and tight-fitting gray sports shorts` : `wearing ${top}`;
            }
        }
        const shotTypePrompt = FACE_SELECTION_SHOT_TYPE_PROMPT_MAP[shotType];
        const basePrompt = shotType === FaceSelectionShotType.CloseUp ? `${shotTypePrompt} of ${genderPromptPart}` : `${shotTypePrompt} of ${genderPromptPart}, facing camera`;
        const parts = ['masterpiece, highest quality, png format', basePrompt, clothingPromptPart, 'on a solid neutral gray studio background', '8k, ultra-high detail', 'professional DSLR photograph, cinematic soft lighting, sharp focus'];
        const addPart = (value: string) => { if (value && value !== 'Случайный выбор') parts.push(value.toLowerCase()); };
        if (ethnicCoherence && ethnicity !== 'Случайный выбор') parts.push(`a person of typical ${ethnicity} ethnicity`);
        addPart(ageRange);
        if (!ethnicCoherence || ethnicity === 'Случайный выбор') addPart(ethnicity);
        addPart(skinTone); addPart(faceShape); addPart(eyesShape); addPart(eyeColor); addPart(noseShape); addPart(lipsShape); addPart(hairColor); addPart(hairLength); addPart(hairTexture);
        if (gender === 'Мужчина') addPart(facialHair);
        addPart(expression);
        return parts.filter(p => p).join(', ');
    }, [gender, shotType, ethnicCoherence, ethnicity, ageRange, skinTone, faceShape, eyesShape, eyeColor, noseShape, lipsShape, hairColor, hairLength, hairTexture, facialHair, expression]);
    
    const handleSingleVariation = useCallback(async (
        variationPrompt: string,
        baseImage: GeneratedImage,
        variationId: string,
        isEmotionVariation: boolean = false,
        emotionKey?: string
    ) => {
        if (!isEmotionVariation) {
            const placeholder: GeneratedImage = { id: variationId, src: null, prompt: variationPrompt, status: 'pending', resolution: baseImage.resolution, backgroundPrompt: '' };
            setVariations(prev => [placeholder, ...prev]);
        }

        try {
            const base64Data = baseImage.src!.split(',')[1];
            const mimeType = baseImage.src!.match(/data:(.*);/)?.[1] || 'image/png';
            const baseImageFile: ImageFile = { preview: baseImage.src!, base64: base64Data, mimeType: mimeType };
            const fullPrompt = `${IMAGE_VARIATION_BASE_PROMPT} CRITICAL: The face must perfectly match the reference image. Now, apply this specific change: "${variationPrompt}"`;
            
            const apiKey = currentUser?.paymentMethod === 'apiKey' ? currentUser.apiKey : undefined;
            const resultSrc = await generateImageVariation(baseImageFile, fullPrompt, "2048x2048", aspectRatio, apiKey);
            
            const newImage: GeneratedImage = { id: variationId, src: resultSrc, status: 'success' as const, prompt: variationPrompt, resolution: baseImage.resolution, backgroundPrompt: '' };

            if (isEmotionVariation && emotionKey) {
                setEmotionCache(prev => ({ ...prev, [emotionKey]: newImage }));
                setGeneratedImageObject(newImage);
            } else {
                setVariations(prev => prev.map(v => v.id === variationId ? newImage : v));
            }
        } catch (error) {
            console.error(`Failed to generate variation:`, error);
            if (!isEmotionVariation) {
                setVariations(prev => prev.map(v => v.id === variationId ? { ...v, status: 'error' } : v));
            }
            throw error;
        }
    }, [aspectRatio, currentUser]);
    
    const handleGenerate = useCallback(async () => {
        if (!currentUser) return;
        if (currentUser.paymentMethod === 'credits' && currentUser.credits < 1) {
            setError("Недостаточно кредитов для генерации.");
            return;
        }
        if (currentUser.paymentMethod === 'apiKey' && !currentUser.apiKey) {
            setError('Выбран способ оплаты "свой API ключ", но ключ не указан в профиле.');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setGeneratedImageObject(null);
        setVariations([]);
        setEmotionCache({});
        setIsWorkModeActive(false);
        
        if (currentUser.paymentMethod === 'credits') {
            const creditsDecremented = await decrementCredits(1);
            if (!creditsDecremented) {
                setError("Не удалось списать кредиты. Попробуйте снова.");
                setIsLoading(false);
                return;
            }
        }
        
        const prompt = buildPrompt();
        try {
            const formatFile = await createFormatFile(aspectRatio);
            const apiKey = currentUser.paymentMethod === 'apiKey' ? currentUser.apiKey : undefined;
            const src = await generateFace(prompt, model, aspectRatio, formatFile, apiKey);
            const newImage = { id: `gen_${Date.now()}`, src, prompt, status: 'success' as const, resolution: mapFaceAspectRatioToResolutionOption(aspectRatio), backgroundPrompt: '' };
            
            const emotionKey = initialExpressionMap[expression] || 'Нейтральное';
            
            setGeneratedImageObject(newImage);
            setEmotionCache({ [emotionKey]: newImage });
            setCurrentEmotion(emotionKey);
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsLoading(false);
        }
    }, [buildPrompt, model, aspectRatio, expression, currentUser, decrementCredits]);

    const handleEmotionChange = async (emotionKey: string) => {
        setCurrentEmotion(emotionKey);

        const cachedImage = emotionCache[emotionKey];
        if (cachedImage) {
            setGeneratedImageObject(cachedImage);
            return;
        }

        const baseForEmotion = generatedImageObject;
        if (!baseForEmotion || isEmotionLoading || isVariationLoading || !currentUser) return;
        
        if (currentUser.paymentMethod === 'credits' && currentUser.credits < 1) {
            alert("Недостаточно кредитов для смены эмоции.");
            return;
        }
        if (currentUser.paymentMethod === 'apiKey' && !currentUser.apiKey) {
            alert('Выбран способ оплаты "свой API ключ", но ключ не указан в профиле.');
            return;
        }
        
        setIsEmotionLoading(true);
        
        if (currentUser.paymentMethod === 'credits') {
            const creditsDecremented = await decrementCredits(1);
            if (!creditsDecremented) {
                alert("Не удалось списать кредиты.");
                setIsEmotionLoading(false);
                return;
            }
        }

        try {
            await handleSingleVariation(
                emotionPrompts[emotionKey],
                baseForEmotion,
                `emo_var_${Date.now()}`,
                true,
                emotionKey
            );
        } catch (e) {
            console.error("Error generating emotion:", e);
            setGeneratedImageObject(baseForEmotion);
        } finally {
            setIsEmotionLoading(false);
        }
    };

    const handleVariationGenerate = async () => {
        if (!generatedImageObject || !generatedImageObject.src || isVariationLoading || !currentUser) return;
        const selectedSet = variationButtons.find(b => b.label === selectedVariationSet);
        if (!selectedSet) return;
        
        const cost = currentUser.paymentMethod === 'apiKey' ? 0 : selectedSet.prompts.length;
        if (currentUser.paymentMethod === 'credits' && currentUser.credits < cost) {
            alert(`Недостаточно кредитов. Требуется: ${cost}`);
            return;
        }
        if (currentUser.paymentMethod === 'apiKey' && !currentUser.apiKey) {
            alert('Выбран способ оплаты "свой API ключ", но ключ не указан в профиле.');
            return;
        }
        
        setIsVariationLoading(true);
        
        if (currentUser.paymentMethod === 'credits') {
            const creditsDecremented = await decrementCredits(cost);
            if (!creditsDecremented) {
                alert("Не удалось списать кредиты.");
                setIsVariationLoading(false);
                return;
            }
        }
        
        for (const p of selectedSet.prompts) {
            await handleSingleVariation(p.text, generatedImageObject, p.id);
        }
        setIsVariationLoading(false);
    };

    const handleDeleteVariation = (id: string) => {
        const variationToDelete = variations.find(v => v.id === id);
        if (variationToDelete?.src && isFavorite(variationToDelete.src)) {
            removeFavorite(variationToDelete.src);
        }
        setVariations(prev => prev.filter(v => v.id !== id));
    };
    
    const handleDownload = (src: string) => {
        const link = document.createElement('a');
        link.href = src;
        link.download = `avatar_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const ParameterSelect: React.FC<{ label: string, value: string, onChange: (v: any) => void, options: string[], description?: string }> = ({ label, value, onChange, options, description }) => (
        <div>
            <SelectInput label={label} value={value} onChange={onChange} options={options} description={description}/>
        </div>
    );
    
    return (
        <div className="min-h-screen bg-brand-primary flex flex-col md:flex-row">
            <header className="md:hidden p-4 bg-brand-secondary/50 backdrop-blur-sm border-b border-brand-secondary flex items-center gap-4">
                <button onClick={onNavigateBack} title="Назад в меню" className="text-brand-text-secondary hover:text-brand-accent transition-colors">
                    <BackIcon />
                </button>
                <h1 className="text-xl font-bold text-brand-text-primary">Создание Аватара</h1>
            </header>
            
            <aside className={`w-full md:w-96 bg-brand-secondary/30 p-4 md:p-6 flex-shrink-0 space-y-6 md:h-screen md:overflow-y-auto ${isWorkModeActive ? 'hidden md:hidden' : 'block'}`}>
                <div className="hidden md:flex items-center gap-4">
                    <button onClick={onNavigateBack} title="Назад в меню" className="text-brand-text-secondary hover:text-brand-accent transition-colors">
                        <BackIcon />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-brand-text-primary">Создание Аватара</h1>
                        <p className="text-sm text-brand-text-secondary">Конструктор персонажей</p>
                    </div>
                </div>

                <SelectInput label="Модель" value={FACE_SELECTION_MODELS.find(m => m.id === model)!.name} onChange={(val) => setModel(FACE_SELECTION_MODELS.find(m => m.name === val)!.id)} options={FACE_SELECTION_MODELS.map(m => m.name)} />
                <SelectInput label="План" value={shotType} onChange={(v) => setShotType(v as FaceSelectionShotType)} options={FACE_SELECTION_SHOT_TYPE_OPTIONS} />
                <SelectInput label="Формат" value={FACE_SELECTION_ASPECT_RATIOS.find(r => r.id === aspectRatio)!.name} onChange={(val) => setAspectRatio(FACE_SELECTION_ASPECT_RATIOS.find(r => r.name === val)!.id)} options={FACE_SELECTION_ASPECT_RATIOS.map(r => r.name)} />
                <ToggleSwitch label="Привязать все черты лица к выбранной этнической принадлежности?" description="Вкл: черты лица соответствуют этносу. Выкл: точное следование всем параметрам." enabled={ethnicCoherence} onChange={setEthnicCoherence} />
                
                <div className="space-y-4 pt-4 border-t border-brand-secondary">
                    <h2 className="text-lg font-semibold text-brand-text-primary">Персонаж</h2>
                    <ParameterSelect label="Пол" value={gender} onChange={setGender} options={FACE_SELECTION_OPTIONS.gender} />
                    <ParameterSelect label="Возраст" value={ageRange} onChange={setAgeRange} options={FACE_SELECTION_OPTIONS.age_range} />
                    <ParameterSelect label="Этнос" value={ethnicity} onChange={setEthnicity} options={FACE_SELECTION_OPTIONS.ethnicity} />
                    <ParameterSelect label="Тон кожи" value={skinTone} onChange={setSkinTone} options={skinToneOptions} />
                </div>
                
                <div className="space-y-4 pt-4 border-t border-brand-secondary">
                     <h2 className="text-lg font-semibold text-brand-text-primary">Черты лица</h2>
                     <ParameterSelect label="Форма лица" value={faceShape} onChange={setFaceShape} options={FACE_SELECTION_OPTIONS.face_shape} />
                     <ParameterSelect label="Форма глаз" value={eyesShape} onChange={setEyesShape} options={eyesShapeOptions} />
                     <ParameterSelect label="Цвет глаз" value={eyeColor} onChange={setEyeColor} options={eyeColorOptions} />
                     <ParameterSelect label="Форма носа" value={noseShape} onChange={setNoseShape} options={noseShapeOptions} />
                     <ParameterSelect label="Форма губ" value={lipsShape} onChange={setLipsShape} options={FACE_SELECTION_OPTIONS.lips_shape} />
                </div>

                <div className="space-y-4 pt-4 border-t border-brand-secondary">
                     <h2 className="text-lg font-semibold text-brand-text-primary">Волосы</h2>
                     <ParameterSelect label="Длина волос" value={hairLength} onChange={setHairLength} options={FACE_SELECTION_OPTIONS.hair_length} />
                     <ParameterSelect label="Цвет волос" value={hairColor} onChange={setHairColor} options={hairColorOptions} />
                     <ParameterSelect label="Текстура волос" value={hairTexture} onChange={setHairTexture} options={hairTextureOptions} />
                     {gender === "Мужчина" && <ParameterSelect label="Растительность на лице" value={facialHair} onChange={setFacialHair} options={FACE_SELECTION_OPTIONS.facial_hair} />}
                </div>

                 <div className="space-y-4 pt-4 border-t border-brand-secondary">
                     <h2 className="text-lg font-semibold text-brand-text-primary">Эмоции</h2>
                     <ParameterSelect label="Выражение лица" value={expression} onChange={setExpression} options={FACE_SELECTION_OPTIONS.expression} />
                </div>

                <div className="pt-4 sticky bottom-0 bg-brand-secondary/30 md:bg-transparent pb-4 md:pb-0"><button onClick={handleGenerate} disabled={isLoading || (currentUser?.paymentMethod === 'credits' && (currentUser?.credits ?? 0) < 1) || (currentUser?.paymentMethod === 'apiKey' && !currentUser?.apiKey)} className="w-full bg-brand-accent text-brand-primary font-bold py-3 px-4 rounded-md hover:bg-amber-400 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">{isLoading ? 'Генерация...' : `Сгенерировать ${currentUser?.paymentMethod === 'apiKey' ? '(свой API ключ)' : '(1 кредит)'}`}</button></div>
            </aside>

            <main className={`flex-1 bg-brand-primary p-4 md:pt-6 md:px-6 flex justify-center items-start ${isWorkModeActive ? 'w-full md:w-full' : ''}`}>
                <div className="w-full flex flex-col items-center gap-6">
                    <div className="w-full md:max-w-md lg:max-w-lg">
                        {generatedImageObject && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-brand-text-secondary mb-1">Изменение эмоции {currentUser?.paymentMethod === 'apiKey' ? '(свой API ключ)' : '(1 кредит)'}</label>
                                <select value={currentEmotion} onChange={(e) => handleEmotionChange(e.target.value)} disabled={isVariationLoading || isEmotionLoading || (currentUser?.paymentMethod === 'credits' && (currentUser?.credits ?? 0) < 1) || (currentUser?.paymentMethod === 'apiKey' && !currentUser?.apiKey)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-brand-secondary border-gray-600 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm rounded-md text-brand-text-primary disabled:opacity-50">
                                    {emotionOptions.map(e => (
                                        <option key={e} value={e}>
                                            {e}{emotionCache[e] ? ' ✓' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className={`relative ${getAspectRatioClass(aspectRatio)} rounded-lg overflow-hidden bg-brand-secondary/30 group`}>
                            {(isLoading || isEmotionLoading) && <div className="w-full h-full flex items-center justify-center"><LoadingSpinner/></div>}
                            {error && !isLoading && !isEmotionLoading && <div className="w-full h-full flex items-center justify-center p-4"><ErrorIcon /></div>}
                            {generatedImageObject && !isLoading && !isEmotionLoading && (
                                <>
                                    <img src={generatedImageObject.src!} alt="Generated Face" className="w-full h-full object-cover cursor-pointer" onClick={() => setIsModalOpen(true)}/>
                                     <button
                                      onClick={(e) => { e.stopPropagation(); isFavorite(generatedImageObject.src!) ? removeFavorite(generatedImageObject.src!) : setImageToFavorite(generatedImageObject.src!); }}
                                      title={isFavorite(generatedImageObject.src!) ? "Убрать из избранного" : "Добавить в избранное"}
                                      className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10 opacity-0 group-hover:opacity-100"
                                    >
                                      <StarIcon isFavorite={isFavorite(generatedImageObject.src!)} />
                                    </button>
                                </>
                            )}
                            {!generatedImageObject && !isLoading && !isEmotionLoading && !error && <PlaceholderCard/>}
                        </div>
                        {generatedImageObject && (
                            <div className="mt-4 space-y-4">
                                <div className="space-y-4 p-4 bg-brand-secondary/30 rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-brand-text-secondary mb-1">Изменение положения</label>
                                        <select value={selectedVariationSet} onChange={e => setSelectedVariationSet(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-brand-secondary border-gray-600 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm rounded-md text-brand-text-primary">
                                            {variationButtons.map(btn => <option key={btn.label} value={btn.label}>{btn.label}</option>)}
                                        </select>
                                    </div>
                                    <button onClick={handleVariationGenerate} disabled={isVariationLoading || (currentUser?.paymentMethod === 'credits' && (currentUser?.credits ?? 0) < (variationButtons.find(b=>b.label === selectedVariationSet)?.prompts.length || 99)) || (currentUser?.paymentMethod === 'apiKey' && !currentUser?.apiKey)} className="w-full bg-brand-accent text-brand-primary font-bold py-2 px-4 rounded-md hover:bg-amber-400 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                                        {isVariationLoading ? 'Генерация...' : `Сгенерировать ${currentUser?.paymentMethod === 'apiKey' ? '(свой API ключ)' : `(${(variationButtons.find(b=>b.label === selectedVariationSet)?.prompts.length)} кредитов)`}`}
                                    </button>
                                </div>
                                <ToggleSwitch label="Работать с этим аватаром" description="Скрывает панель настроек для удобства работы с ракурсами." enabled={isWorkModeActive} onChange={setIsWorkModeActive} />
                            </div>
                        )}
                    </div>
                    {generatedImageObject && (
                        <div className="w-full pt-6 border-t border-brand-secondary">
                            <h3 className="text-lg font-semibold text-brand-text-primary mb-4">Ракурсы</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {variations.map(variation => {
                                    const isFav = variation.src ? isFavorite(variation.src) : false;
                                    return (
                                        <div key={variation.id} className={`${getAspectRatioClass(aspectRatio)} bg-brand-secondary rounded-lg overflow-hidden flex items-center justify-center group relative`}>
                                            {variation.status === 'pending' && <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent"></div>}
                                            {variation.status === 'error' && <ErrorIcon isSmall />}
                                            {variation.status === 'success' && variation.src && (
                                                <>
                                                    <img src={variation.src} alt={variation.prompt} className="w-full h-full object-cover cursor-pointer" onClick={() => setSelectedVariation(variation)}/>
                                                     <button
                                                        onClick={(e) => { e.stopPropagation(); isFav ? removeFavorite(variation.src!) : setImageToFavorite(variation.src!); }}
                                                        title={isFav ? "Убрать из избранного" : "Добавить в избранное"}
                                                        className="absolute top-1 right-1 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10 opacity-0 group-hover:opacity-100"
                                                    >
                                                        <StarIcon isFavorite={isFav} />
                                                    </button>
                                                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleDownload(variation.src!)} title="Скачать" className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"><DownloadIcon /></button>
                                                            <button onClick={() => handleDeleteVariation(variation.id)} title="Удалить" className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"><DeleteIcon /></button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </main>
            
            {isModalOpen && generatedImageObject && <ImageModal image={generatedImageObject} onClose={() => setIsModalOpen(false)} onDownload={handleDownload} onRegenerate={() => {}} onDelete={() => {}} showRegenerate={false} isFavorite={generatedImageObject.src ? isFavorite(generatedImageObject.src) : false} onAddToFavorites={setImageToFavorite} onRemoveFromFavorites={removeFavorite} />}
            {selectedVariation && <ImageModal image={selectedVariation} onClose={() => setSelectedVariation(null)} onDownload={handleDownload} onRegenerate={() => {}} onDelete={() => handleDeleteVariation(selectedVariation.id)} showRegenerate={false} isFavorite={selectedVariation.src ? isFavorite(selectedVariation.src) : false} onAddToFavorites={setImageToFavorite} onRemoveFromFavorites={removeFavorite} />}
            {imageToFavorite && <AddToFavoritesModal imageSrc={imageToFavorite} onClose={() => setImageToFavorite(null)} />}
        </div>
    );
};

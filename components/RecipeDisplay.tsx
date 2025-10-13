import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Recipe, VoiceCommand, Favorites, UserProfile, InstructionStep, AlternativeRecipeSuggestion, OptionItem, MealType, CuisineOption, CookingMethod } from '../types';
import { interpretUserCommand, generateRecipeImage, calculateRecipeCost, simplifyRecipe, generateInstructionImage, generateAlternativeRecipeSuggestions } from '../services/geminiService';
import * as imageStore from '../services/imageStore';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useNotification } from '../contexts/NotificationContext';
import KitchenTimer from './KitchenTimer';
import SaveRecipeModal from './SaveToFavoritesModal';
import ImageDisplayModal from './ImageDisplayModal';
import ErrorMessage from './ErrorMessage';
import InstructionCarousel from './InstructionCarousel';
import { DIET_OPTIONS, MEAL_TYPES, COOKING_METHODS, CUISINE_OPTIONS, MEAL_TYPES_STORAGE_KEY, CUISINE_OPTIONS_STORAGE_KEY, COOKING_METHODS_STORAGE_KEY } from '../constants';
import ShareFallbackModal from './ShareFallbackModal';
import { konyhaMikiLogo as konyhaMikiLogoBase64 } from '../assets';
import StarRating from './StarRating';
import FavoriteStatusModal from './FavoriteStatusModal';


interface RecipeDisplayProps {
  recipe: Recipe;
  onClose: () => void;
  onRefine: () => void;
  isFromFavorites: boolean;
  favorites: Favorites;
  onSave: (recipe: Recipe, category: string) => void;
  onAddItemsToShoppingList: (items: string[]) => void;
  isLoading: boolean;
  onRecipeUpdate: (updatedRecipe: Recipe, originalRecipe: Recipe) => void;
  users: UserProfile[];
  onUpdateFavoriteStatus: (recipeName: string, category: string, favoritedByIds: string[]) => void;
  shouldGenerateImageInitially: boolean;
  onGenerateFromSuggestion: (suggestion: AlternativeRecipeSuggestion) => void;
  mealTypes: OptionItem[];
  cuisineOptions: OptionItem[];
  cookingMethodsList: OptionItem[];
}

const loadOptions = (key: string, defaultValue: readonly any[]) => {
    try {
        const stored = localStorage.getItem(key);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (e) {
        console.error(`Failed to load options from localStorage for key "${key}":`, e);
    }
    return [...defaultValue];
};


type VoiceMode = 'idle' | 'intro' | 'ingredients' | 'cooking';

const NutritionalInfo: React.FC<{ recipe: Recipe, isEditing?: boolean, onChange?: (field: keyof Recipe, value: string) => void }> = ({ recipe, isEditing, onChange }) => {
    const fields: (keyof Recipe)[] = ['calories', 'carbohydrates', 'protein', 'fat', 'glycemicIndex'];
    const info = fields.map(field => ({
        field,
        label: {
            calories: 'Kalória',
            carbohydrates: 'Szénhidrát',
            protein: 'Fehérje',
            fat: 'Zsír',
            glycemicIndex: 'Glikémiás Index',
        }[field] || '',
        value: recipe[field] as string,
        icon: {
            calories: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM10 18a1 1 0 01.707.293l2.5 2.5a1 1 0 11-1.414 1.414l-2.5-2.5A1 1 0 0110 18zM10 4a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /><path d="M10 18a7.953 7.953 0 01-4.16-1.115l-1.558 1.558a1 1 0 11-1.414-1.414l1.558-1.558A8 8 0 1110 18zm0-2a6 6 0 100-12 6 6 0 000 12z" /></svg>,
            carbohydrates: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 20 20" fill="currentColor"><path d="M17 5a2 2 0 10-4 0v.586a1 1 0 01-.293.707l-3.414 3.414a1 1 0 01-1.414 0l-1.414-1.414A1 1 0 017 8.586V7a2 2 0 10-4 0v1.586a1 1 0 01-.293.707l-3.414 3.414a1 1 0 01-1.414 0l-1.414-1.414a1 1 0 010-1.414l3.414-3.414A1 1 0 015 6.586V5a2 2 0 104 0v.586a1 1 0 01.293.707l1.414 1.414a1 1 0 010 1.414l-1.414 1.414A1 1 0 019 10.414V12a2 2 0 104 0v-1.586a1 1 0 01.293-.707l3.414-3.414a1 1 0 01-1.414-1.414L13 8.586V7a2 2 0 10-4 0v.586a1 1 0 01-.293.707L7.293 9.707a1 1 0 01-1.414 0L4.464 8.293A1 1 0 014 7.586V6a2 2 0 10-4 0v1.586a1 1 0 01.293.707l1.414 1.414a1 1 0 010 1.414l-1.414 1.414A1 1 0 01.293 12.414V14a2 2 0 104 0v-.586a1 1 0 01.293-.707l3.414-3.414a1 1 0 011.414 0l1.414 1.414a1 1 0 01.293.707V15a2 2 0 104 0v-1.586a1 1 0 01.293-.707l1.414-1.414a1 1 0 011.414 0l1.414 1.414a1 1 0 01.293.707V17a2 2 0 104 0v-1.586a1 1 0 01-.293-.707l-3.414-3.414a1 1 0 010-1.414l1.414-1.414A1 1 0 0115 8.414V7a2 2 0 10-4 0v.586a1 1 0 01.293.707l1.414 1.414a1 1 0 01-1.414 1.414L9.586 9.414A1 1 0 019 8.586V7a2 2 0 10-4 0v.586a1 1 0 01-.293.707L3.293 9.707a1 1 0 01-1.414 0L.464 8.293A1 1 0 010 7.586V6a2 2 0 104 0v.586a1 1 0 01.293.707l1.414 1.414a1 1 0 011.414 0l1.414-1.414A1 1 0 019 6.586V5a2 2 0 10-4 0v.586a1 1 0 01-.293.707l-1.414 1.414a1 1 0 01-1.414-1.414l1.414-1.414A1 1 0 014.586 5H6a2 2 0 100-4h1.586a1 1 0 01.707.293l1.414 1.414a1 1 0 010 1.414l-1.414 1.414A1 1 0 018.586 6H7a2 2 0 100 4h1.586a1 1 0 01.707.293l1.414 1.414a1 1 0 010 1.414l-1.414 1.414A1 1 0 019.586 15H8a2 2 0 100 4h1.586a1 1 0 01.707-.293l3.414-3.414a1 1 0 011.414 0l1.414 1.414a1 1 0 01.293.707V18a2 2 0 104 0v-1.586a1 1 0 01-.293-.707l-1.414-1.414a1 1 0 010-1.414l1.414-1.414A1 1 0 0115.586 12H17a2 2 0 100-4h-1.586a1 1 0 01-.707-.293l-3.414-3.414a1 1 0 010-1.414l3.414-3.414A1 1 0 0115.414 3H17a2 2 0 100-4h-1.586a1 1 0 01-.707.293l-1.414 1.414a1 1 0 01-1.414 0l-1.414-1.414A1 1 0 019.586 0H8a2 2 0 100 4h.586a1 1 0 01.707.293l1.414 1.414a1 1 0 010 1.414l-1.414 1.414A1 1 0 019.586 8H8a2 2 0 100 4h.586a1 1 0 01.707.293l1.414 1.414a1 1 0 01-1.414 1.414l-1.414-1.414A1 1 0 016.586 13H5a2 2 0 100 4h1.586a1 1 0 01.707.293l1.414 1.414a1 1 0 011.414 0l1.414 1.414A1 1 0 0110.414 19H12a2 2 0 100-4h-.586a1 1 0 01-.707-.293L7.293 11.293a1 1 0 010-1.414L8.707 8.464A1 1 0 019.414 8H11a2 2 0 100-4h-.586a1 1 0 01-.707-.293L8.293 2.293a1 1 0 01-1.414 0L5.464 3.707A1 1 0 014.586 4H3a2 2 0 100-4h.586a1 1 0 01.707.293l1.414 1.414a1 1 0 011.414 0l1.414-1.414A1 1 0 0110.414 0H12a2 2 0 100 4h-.586a1 1 0 01-.707-.293l-1.414-1.414a1 1 0 010-1.414l1.414-1.414A1 1 0 0111.414 0H13a2 2 0 100-4h-.586a1 1 0 01-.707.293L10.293-1.121a1 1 0 01-1.414 0l-1.414 1.414A1 1 0 016.586.293H5a2 2 0 100 4h.586a1 1 0 01.707.293l1.414 1.414a1 1 0 010 1.414l-1.414 1.414A1 1 0 015.586 8H4a2 2 0 100 4h.586a1 1 0 01.707.293l1.414 1.414a1 1 0 011.414 0l1.414-1.414A1 1 0 0110.414 11H12a2 2 0 100-4h-.586a1 1 0 01-.707-.293L9.293 5.293a1 1 0 010-1.414L10.707 2.464A1 1 0 0111.414 2H13a2 2 0 100-4h-.586a1 1 0 01-.707.293L10.293-1.121a1 1 0 01-1.414 0L7.464.293A1 1 0 016.586 1H5a2 2 0 100 4z" /></svg>,
            protein: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 6a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm1 3a1 1 0 000 2h8a1 1 0 100-2H5z" /><path fillRule="evenodd" d="M2 10a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6zm2-1a1 1 0 00-1 1v6a1 1 0 001 1h12a1 1 0 001-1v-6a1 1 0 00-1-1H4z" clipRule="evenodd" /></svg>,
            fat: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9a1 1 0 000 2h12a1 1 0 100-2H4z" clipRule="evenodd" /></svg>,
            glycemicIndex: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>,
        }[field]
    })).filter(info => info.value);

    if (info.length === 0 && !isEditing) return null;

    return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Tápérték adatok <span className="text-sm font-normal text-gray-500">(becsült / 100g)</span></h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {info.map(({ field, label, value, icon }) => (
                    <div key={field} className="flex items-center gap-3">
                        <div className="w-8 h-8 p-1.5 bg-primary-100 text-primary-600 rounded-full flex-shrink-0">
                           {icon}
                        </div>
                        <div>
                            <span className="text-sm text-gray-500 block">{label}</span>
                            {isEditing ? (
                                <input 
                                    type="text"
                                    value={value || ''}
                                    onChange={(e) => onChange?.(field, e.target.value)}
                                    className="text-md font-bold text-gray-900 bg-white border border-gray-300 rounded p-1 w-full"
                                />
                            ) : (
                                <span className="text-md font-bold text-gray-900">{value}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const addWatermark = (imageUrl: string, recipe: Recipe): Promise<string> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = imageUrl;

        image.onload = () => {
            const canvas = document.createElement('canvas');
            const targetWidth = 1024;
            canvas.width = targetWidth;
            canvas.height = (image.height / image.width) * targetWidth;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('A vászon kontextus nem elérhető.'));

            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

            const overlayHeight = 120;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, canvas.height - overlayHeight, canvas.width, overlayHeight);
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 28px "Trebuchet MS", Arial, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            
            const wrapText = (context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
                const words = text.split(' ');
                let line = '';
                for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = context.measureText(testLine);
                    const testWidth = metrics.width;
                    if (testWidth > maxWidth && n > 0) {
                        context.fillText(line, x, y);
                        line = words[n] + ' ';
                        y += lineHeight;
                    } else {
                        line = testLine;
                    }
                }
                context.fillText(line, x, y);
            }
            wrapText(ctx, recipe.recipeName, 20, canvas.height - 65, canvas.width - 150, 32);

            ctx.font = '18px "Trebuchet MS", Arial, sans-serif';
            const details = [
                `Előkészítés: ${recipe.prepTime}`,
                `Főzés: ${recipe.cookTime}`,
                `Adag: ${recipe.servings}`
            ].join('  |  ');
            ctx.fillText(details, 20, canvas.height - 25);

            const logo = new Image();
            logo.src = konyhaMikiLogoBase64;
            logo.onload = () => {
                const logoHeight = 60;
                const logoWidth = (logo.width / logo.height) * logoHeight;
                ctx.drawImage(logo, canvas.width - logoWidth - 20, canvas.height - overlayHeight/2 - logoHeight/2, logoWidth, logoHeight);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            logo.onerror = () => {
                console.warn("A logó nem tölthető be a vízjelhez.");
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
        };
        image.onerror = () => {
            reject(new Error('A kép betöltése sikertelen a vízjelezéshez.'));
        };
    });
};

const RecipeDisplay: React.FC<RecipeDisplayProps> = ({
  recipe,
  onClose,
  onRefine,
  isFromFavorites,
  favorites,
  onSave,
  onAddItemsToShoppingList,
  isLoading: isSubmitting,
  onRecipeUpdate,
  users,
  onUpdateFavoriteStatus,
  shouldGenerateImageInitially,
  onGenerateFromSuggestion,
  mealTypes,
  cuisineOptions,
  cookingMethodsList,
}) => {
    const { showNotification } = useNotification();
    const originalRecipeRef = useRef(recipe);
    
    const [editableRecipe, setEditableRecipe] = useState<Recipe>(() => JSON.parse(JSON.stringify(recipe)));
    const [isEditing, setIsEditing] = useState(false);
    
    // Image states
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [generatingImageError, setGeneratingImageError] = useState<string | null>(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [activeImageUrl, setActiveImageUrl] = useState('');
    const [activeImageTitle, setActiveImageTitle] = useState('');
    const [imageLoaded, setImageLoaded] = useState(false);

    // Other async states
    const [isCalculatingCost, setIsCalculatingCost] = useState(false);
    const [isSimplifying, setIsSimplifying] = useState(false);
    const [alternativeSuggestions, setAlternativeSuggestions] = useState<AlternativeRecipeSuggestion[] | null>(null);
    const [isLoadingAlternatives, setIsLoadingAlternatives] = useState(false);
    const [textToShare, setTextToShare] = useState('');
    
    // Modal states
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isTimerOpen, setIsTimerOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isFavoriteStatusModalOpen, setIsFavoriteStatusModalOpen] = useState(false);
    const [timerInitialValues, setTimerInitialValues] = useState<{ hours?: number; minutes?: number; seconds?: number } | null>(null);

    // Voice reading states
    const [voiceMode, setVoiceMode] = useState<VoiceMode>('idle');
    const [currentSpeechStep, setCurrentSpeechStep] = useState(0);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Instruction Carousel states
    const [instructionStep, setInstructionStep] = useState(0);
    const [generatingInstructionImageFor, setGeneratingInstructionImageFor] = useState<number | null>(null);
    const [resolvedInstructions, setResolvedInstructions] = useState<InstructionStep[]>([]);

    useEffect(() => {
        const resolveInstructionImages = async () => {
            if (!editableRecipe.instructions) {
                setResolvedInstructions([]);
                return;
            }
            
            const newInstructions = await Promise.all(
                editableRecipe.instructions.map(async (inst) => {
                    if (inst.imageUrl && inst.imageUrl.startsWith('indexeddb:')) {
                        const imageId = inst.imageUrl.substring(10);
                        const imageData = await imageStore.getImage(imageId);
                        return { ...inst, imageUrl: imageData || undefined };
                    }
                    return inst;
                })
            );
            setResolvedInstructions(newInstructions);
        };

        resolveInstructionImages();
    }, [editableRecipe.instructions]);

    const stopSpeech = useCallback(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        setVoiceMode('idle');
    }, []);

    const handleSpeechError = useCallback((error: string) => {
        if (error === 'not-allowed') {
            showNotification('A mikrofon használata le lett tiltva. A funkció használatához engedélyezze a böngészőben.', 'info');
        }
    }, [showNotification]);

    const handleVoiceResult = useCallback(async (transcript: string) => {
        try {
            const { command, payload } = await interpretUserCommand(transcript);
            switch(command) {
                case VoiceCommand.NEXT:
                    if (voiceMode === 'cooking' && instructionStep < editableRecipe.instructions.length - 1) {
                        const nextStep = instructionStep + 1;
                        setInstructionStep(nextStep);
                        setCurrentSpeechStep(nextStep);
                    }
                    break;
                case VoiceCommand.STOP:
                    stopSpeech();
                    break;
                case VoiceCommand.READ_INTRO:
                    setVoiceMode('intro');
                    break;
                case VoiceCommand.READ_INGREDIENTS:
                    setVoiceMode('ingredients');
                    break;
                case VoiceCommand.START_COOKING:
                    setVoiceMode('cooking');
                    setCurrentSpeechStep(0);
                    setInstructionStep(0);
                    break;
                case VoiceCommand.START_TIMER:
                    if (payload) {
                        setTimerInitialValues(payload);
                        setIsTimerOpen(true);
                    }
                    break;
                default:
                    // Maybe provide feedback for unknown command
                    break;
            }
        } catch(e: any) {
            showNotification(e.message, 'info');
        }
    }, [voiceMode, instructionStep, editableRecipe.instructions.length, stopSpeech, showNotification]);

    const { isListening, startListening, stopListening, permissionState } = useSpeechRecognition({
        onResult: handleVoiceResult,
        continuous: false,
        onError: handleSpeechError,
    });

    const speak = useCallback((text: string, onEnd: () => void) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        stopSpeech();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'hu-HU';
        utterance.rate = 0.9;
        utterance.onend = onEnd;
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [stopSpeech]);

    useEffect(() => {
        return () => stopSpeech(); // Cleanup on unmount
    }, [stopSpeech]);
    
    useEffect(() => {
        if (voiceMode === 'idle') return;

        if (voiceMode === 'intro') {
            speak(`${editableRecipe.recipeName}. ${editableRecipe.description}`, () => setVoiceMode('idle'));
        } else if (voiceMode === 'ingredients') {
            const ingredientsText = "A hozzávalók a következők: " + editableRecipe.ingredients.join(', ');
            speak(ingredientsText, () => setVoiceMode('idle'));
        } else if (voiceMode === 'cooking') {
            if (currentSpeechStep < editableRecipe.instructions.length) {
                const text = editableRecipe.instructions[currentSpeechStep].text;
                speak(`${currentSpeechStep + 1}. lépés: ${text}`, () => {
                    if (currentSpeechStep < editableRecipe.instructions.length - 1) {
                       // Do not auto-advance. Wait for "NEXT" command.
                    } else {
                        speak("Az étel elkészült. Jó étvágyat!", () => setVoiceMode('idle'));
                    }
                });
            }
        }
    }, [voiceMode, editableRecipe, speak, currentSpeechStep]);

    const handleGenerateImage = useCallback(async (regenerate = false) => {
        if (!regenerate && editableRecipe.imageUrl) return;

        setIsGeneratingImage(true);
        setGeneratingImageError(null);
        setImageLoaded(false);

        try {
            const cookingMethodLabels = editableRecipe.cookingMethods.map(cm => cookingMethodsList.find(c => c.value === cm)?.label || '').filter(Boolean);
            const imageBytes = await generateRecipeImage(editableRecipe, cookingMethodLabels);
            const rawImageUrl = `data:image/jpeg;base64,${imageBytes}`;
            const watermarkedImageUrl = await addWatermark(rawImageUrl, editableRecipe);
            
            const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            await imageStore.saveImage(imageId, watermarkedImageUrl);

            const updatedRecipe = { ...editableRecipe, imageUrl: `indexeddb:${imageId}` };
            setEditableRecipe(updatedRecipe);
            if (isFromFavorites) {
                onRecipeUpdate(updatedRecipe, originalRecipeRef.current);
            }
        } catch (e: any) {
            setGeneratingImageError(e.message);
        } finally {
            setIsGeneratingImage(false);
        }
    }, [editableRecipe, onRecipeUpdate, isFromFavorites, cookingMethodsList]);

    useEffect(() => {
        if (shouldGenerateImageInitially && !recipe.imageUrl) {
            handleGenerateImage();
        }
    }, [shouldGenerateImageInitially, recipe.imageUrl, handleGenerateImage]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
    
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showNotification('A képfájl mérete túl nagy (maximum 5MB).', 'info');
            return;
        }
    
        const reader = new FileReader();
        reader.onload = async (e) => {
            setIsGeneratingImage(true); // Show loading state
            setGeneratingImageError(null);
            setImageLoaded(false);
            try {
                const imageDataUrl = e.target?.result as string;
                const watermarkedImageUrl = await addWatermark(imageDataUrl, editableRecipe);
    
                const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                await imageStore.saveImage(imageId, watermarkedImageUrl);
    
                const updatedRecipe = { ...editableRecipe, imageUrl: `indexeddb:${imageId}` };
                setEditableRecipe(updatedRecipe);
                if (isFromFavorites) {
                    onRecipeUpdate(updatedRecipe, originalRecipeRef.current);
                }
                showNotification('Kép sikeresen feltöltve és vízjelezve!', 'success');
    
            } catch (err: any) {
                setGeneratingImageError(err.message);
            } finally {
                 setIsGeneratingImage(false);
            }
        };
        reader.onerror = () => {
            showNotification('Hiba történt a fájl olvasása közben.', 'info');
        };
        reader.readAsDataURL(file);
    
        event.target.value = '';
    };

    // Load image from IndexedDB
    useEffect(() => {
        if (editableRecipe.imageUrl && editableRecipe.imageUrl.startsWith('indexeddb:')) {
            const imageId = editableRecipe.imageUrl.substring(10);
            imageStore.getImage(imageId).then(imageData => {
                if (imageData) {
                    setActiveImageUrl(imageData);
                } else {
                    console.warn(`Image with id ${imageId} not found in IndexedDB.`);
                    // Optionally clear the invalid URL
                    setEditableRecipe(prev => ({...prev, imageUrl: undefined}));
                }
            });
        } else if (editableRecipe.imageUrl) {
            // It might be a data URL from an old backup
            setActiveImageUrl(editableRecipe.imageUrl);
        } else {
            setActiveImageUrl('');
        }
    }, [editableRecipe.imageUrl]);
    
    const handleAddToShoppingList = () => {
        onAddItemsToShoppingList(editableRecipe.ingredients);
    };

    const handleSaveEdit = () => {
        onRecipeUpdate(editableRecipe, originalRecipeRef.current);
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditableRecipe(JSON.parse(JSON.stringify(originalRecipeRef.current)));
        setIsEditing(false);
    };

    const handleFieldChange = (field: keyof Recipe, value: string) => {
        setEditableRecipe(prev => ({...prev, [field]: value}));
    };
    
    const handleRatingChange = (newRating: number | undefined) => {
        const updatedRecipe = { ...editableRecipe, rating: newRating };
        setEditableRecipe(updatedRecipe);
        onRecipeUpdate(updatedRecipe, originalRecipeRef.current);
    }
    
    const handleGenerateInstructionImage = async (stepIndex: number) => {
        if (generatingInstructionImageFor !== null) return;
        
        setGeneratingInstructionImageFor(stepIndex);
        try {
            const cookingMethodLabels = editableRecipe.cookingMethods.map(cm => cookingMethodsList.find(c => c.value === cm)?.label || '').filter(Boolean);
            const imageBytes = await generateInstructionImage(editableRecipe.recipeName, editableRecipe.instructions[stepIndex].text, cookingMethodLabels);
            const imageUrl = `data:image/jpeg;base64,${imageBytes}`;
            const imageId = `inst_${Date.now()}_${stepIndex}`;
            await imageStore.saveImage(imageId, imageUrl);
            
            const updatedInstructions = [...editableRecipe.instructions];
            updatedInstructions[stepIndex] = { ...updatedInstructions[stepIndex], imageUrl: `indexeddb:${imageId}`};
            
            const updatedRecipe = {...editableRecipe, instructions: updatedInstructions };
            setEditableRecipe(updatedRecipe);
            if (isFromFavorites) {
                onRecipeUpdate(updatedRecipe, originalRecipeRef.current);
            }

        } catch (e: any) {
            showNotification(e.message, 'info');
        } finally {
            setGeneratingInstructionImageFor(null);
        }
    };

    const handleShare = async () => {
        const shareText = `Recept: ${editableRecipe.recipeName}\n\nLeírás: ${editableRecipe.description}\n\nHozzávalók:\n- ${editableRecipe.ingredients.join('\n- ')}\n\nElkészítés:\n${editableRecipe.instructions.map((step, i) => `${i + 1}. ${step.text}`).join('\n\n')}`;
        setTextToShare(shareText);

        if (navigator.share) {
            try {
                await navigator.share({
                    title: editableRecipe.recipeName,
                    text: `Nézd meg ezt a finom receptet: ${editableRecipe.recipeName}!`,
                });
                showNotification('Recept sikeresen megosztva!', 'success');
            } catch (error) {
                console.log('Megosztás megszakítva vagy sikertelen', error);
            }
        } else {
            setIsShareModalOpen(true);
        }
    };

    const handleSimplify = async () => {
        setIsSimplifying(true);
        try {
            const simplified = await simplifyRecipe(editableRecipe);
            onRecipeUpdate(simplified, originalRecipeRef.current);
            showNotification('A recept sikeresen egyszerűsítve lett!', 'success');
        } catch (e: any) {
            showNotification(`Hiba a recept egyszerűsítése közben: ${e.message}`, 'info');
        } finally {
            setIsSimplifying(false);
        }
    };

    const handleGetAlternatives = async () => {
        setIsLoadingAlternatives(true);
        try {
            const result = await generateAlternativeRecipeSuggestions(editableRecipe, cookingMethodsList);
            setAlternativeSuggestions(result.suggestions);
        } catch(e: any) {
            showNotification(e.message, 'info');
        } finally {
            setIsLoadingAlternatives(false);
        }
    };

    const handlePrint = () => {
        // 1. Copy title to clipboard
        navigator.clipboard.writeText(editableRecipe.recipeName).then(() => {
          showNotification(`'${editableRecipe.recipeName}' a vágólapra másolva!`, 'success');
        }).catch(err => {
          console.error('Failed to copy text: ', err);
          showNotification('A vágólapra másolás nem sikerült.', 'info');
        });
    
        // 2. Prepare image HTML
        const mainImageHtml = activeImageUrl
          ? `<img src="${activeImageUrl}" alt="Recept fotó" class="main-image">`
          : '';
      
        // 3. Generate HTML content string for the new window
        const printContent = `
          <!DOCTYPE html>
          <html lang="hu">
          <head>
            <meta charset="UTF-8">
            <title>Nyomtatás: ${editableRecipe.recipeName}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 30px;
              }
              h1 {
                color: #854d24;
                border-bottom: 2px solid #f6e8d6;
                padding-bottom: 10px;
              }
              h2 {
                color: #a65b25;
                margin-top: 2em;
                border-bottom: 1px solid #efd8ba;
                padding-bottom: 5px;
              }
              .main-image {
                width: 100%;
                max-width: 500px;
                height: auto;
                border-radius: 8px;
                margin: 1em auto 2em;
                display: block;
                page-break-inside: avoid;
              }
              .instruction-image {
                width: 100%;
                max-width: 300px;
                height: auto;
                border-radius: 8px;
                margin-top: 1em;
                display: block;
              }
              .details {
                display: flex;
                gap: 20px;
                padding: 10px;
                background-color: #fbf6ef;
                border: 1px solid #f6e8d6;
                border-radius: 8px;
                margin-bottom: 2em;
                page-break-inside: avoid;
              }
              .details div {
                flex: 1;
              }
              .details strong {
                display: block;
                font-size: 0.9em;
                color: #a65b25;
              }
              ul, ol {
                padding-left: 20px;
              }
              li {
                margin-bottom: 0.5em;
              }
              .instruction-step {
                page-break-inside: avoid;
                margin-bottom: 1.5em;
              }
              @media print {
                body { margin: 1cm; }
                .main-image, .instruction-image {
                    max-width: 90%;
                }
              }
            </style>
          </head>
          <body>
            <h1>${editableRecipe.recipeName}</h1>
            ${mainImageHtml}
            <div class="details">
              <div><strong>Előkészítés:</strong> ${editableRecipe.prepTime}</div>
              <div><strong>Főzési idő:</strong> ${editableRecipe.cookTime}</div>
              <div><strong>Adag:</strong> ${editableRecipe.servings}</div>
            </div>
            <h2>Hozzávalók</h2>
            <ul>
              ${editableRecipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}
            </ul>
            <h2>Elkészítés</h2>
            <ol>
              ${
                resolvedInstructions.map(inst => {
                  const instImageHtml = inst.imageUrl
                    ? `<img src="${inst.imageUrl}" alt="Illusztráció" class="instruction-image">`
                    : '';
                  return `<li class="instruction-step">${inst.text}${instImageHtml}</li>`;
                }).join('')
              }
            </ol>
            <script>
              window.onafterprint = function() {
                window.close();
              };
              // Wait for images to load before printing
              Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => new Promise(resolve => { img.onload = img.onerror = resolve; }))).then(() => {
                window.print();
              });
            </script>
          </body>
          </html>
        `;
      
        // 4. Open new window, write content, and trigger print
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(printContent);
          printWindow.document.close();
        } else {
          showNotification('A felugró ablakok le vannak tiltva. Kérjük, engedélyezze őket a nyomtatáshoz.', 'info');
        }
    };

    const ActionButton: React.FC<{ onClick: () => void; disabled?: boolean; children: React.ReactNode; label: string; }> = ({ onClick, disabled, children, label }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-white shadow-sm border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label={label}
        >
            {children}
        </button>
    );
    
    const mealTypeLabel = mealTypes.find(m => m.value === editableRecipe.mealType)?.label || editableRecipe.mealType;
    const cuisineLabel = cuisineOptions.find(c => c.value === editableRecipe.cuisine)?.label || editableRecipe.cuisine;
    const cookingMethodLabels = editableRecipe.cookingMethods
        .map(cm => cookingMethodsList.find(c => c.value === cm)?.label || cm)
        .join(', ');

  return (
    <>
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                {isEditing ? (
                    <input type="text" value={editableRecipe.recipeName} onChange={e => handleFieldChange('recipeName', e.target.value)} className="text-3xl font-bold text-primary-800 bg-yellow-50 border-2 border-primary-200 rounded-lg p-2 w-full"/>
                ) : (
                    <h2 className="text-3xl font-bold text-primary-800">{editableRecipe.recipeName}</h2>
                )}

                <div className="flex items-center gap-2 flex-shrink-0">
                    {isEditing ? (
                        <>
                            <button onClick={handleSaveEdit} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700">Módosítások mentése</button>
                            <button onClick={handleCancelEdit} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Mégse</button>
                        </>
                    ) : (
                        <>
                            {isFromFavorites && <button onClick={() => setIsEditing(true)} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-600">Szerkesztés</button>}
                            <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">{isFromFavorites ? 'Vissza a mentettekhez' : 'Új recept készítése'}</button>
                        </>
                    )}
                </div>
            </div>
            
            {/* Description & Rating */}
            {isEditing ? (
                <textarea value={editableRecipe.description} onChange={e => handleFieldChange('description', e.target.value)} rows={3} className="text-gray-600 text-lg w-full bg-yellow-50 border-2 border-primary-200 rounded-lg p-2" />
            ) : (
                <p className="text-gray-600 text-lg">{editableRecipe.description}</p>
            )}
            <div>
              {isFromFavorites && <StarRating rating={editableRecipe.rating} onRatingChange={isEditing ? undefined : handleRatingChange} readOnly={isEditing} />}
            </div>

            {/* Action Buttons */}
            <div className="my-6 p-4 bg-gray-100 rounded-lg">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    <ActionButton onClick={() => setIsSaveModalOpen(true)} label="Recept mentése">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v10l-5-4-5 4V4z" />
                        </svg>
                        <span className="text-xs font-semibold text-gray-700">Mentés</span>
                    </ActionButton>
                    <ActionButton onClick={handleShare} label="Recept megosztása">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                        </svg>
                        <span className="text-xs font-semibold text-gray-700">Megosztás</span>
                    </ActionButton>
                    <ActionButton onClick={handleSimplify} disabled={isSimplifying} label="Recept egyszerűsítése">
                        {isSimplifying ? (
                            <svg className="animate-spin h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.523 7.023a1 1 0 01.633-1.265l4-1.25a1 1 0 11.382 1.956L6.5 7.983a1 1 0 01-1.618-.96zm10.354 1.956a1 1 0 01-1.618.96l-4-1.25a1 1 0 11.382-1.956l4 1.25a1 1 0 011.236 1z" clipRule="evenodd" /></svg>
                        )}
                        <span className="text-xs font-semibold text-gray-700">{isSimplifying ? "Egyszerűsítés..." : "Egyszerűsítés"}</span>
                    </ActionButton>
                    <ActionButton onClick={() => setIsTimerOpen(true)} label="Konyhai időzítő">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                        <span className="text-xs font-semibold text-gray-700">Időzítő</span>
                    </ActionButton>
                    <ActionButton onClick={handleGetAlternatives} disabled={isLoadingAlternatives} label="Hasonló receptek">
                        {isLoadingAlternatives ? (
                            <svg className="animate-spin h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        )}
                        <span className="text-xs font-semibold text-gray-700">{isLoadingAlternatives ? "Keresés..." : "Hasonló receptek"}</span>
                    </ActionButton>
                    <ActionButton onClick={handlePrint} label="Recept nyomtatása">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M5 4v3h10V4H5zm-2 2a2 2 0 012-2h10a2 2 0 012 2v3h2a2 2 0 012 2v5a2 2 0 01-2 2H3a2 2 0 01-2-2v-5a2 2 0 012-2h2V6zm14 3H3v5h14V9zM7 13a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-semibold text-gray-700">Nyomtatás</span>
                    </ActionButton>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                    {/* Image Section */}
                    <div>
                        {isGeneratingImage ? (
                            <div className="aspect-[4/3] rounded-lg bg-gray-100 flex flex-col items-center justify-center p-4 border animate-pulse-bg">
                                <svg className="animate-spin h-10 w-10 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="mt-4 text-lg font-semibold text-gray-700">Ételkép feldolgozása...</p>
                                <p className="text-sm text-gray-500">Ez eltarthat egy pillanatig.</p>
                            </div>
                        ) : generatingImageError ? (
                            <div className="aspect-[4/3] rounded-lg bg-red-50 flex flex-col items-center justify-center p-4 border-2 border-dashed border-red-300">
                                <p className="text-red-700 font-semibold text-center mb-2">Hiba történt a kép generálása közben.</p>
                                <p className="text-red-600 text-sm text-center mb-4">{generatingImageError}</p>
                                <button
                                    onClick={() => handleGenerateImage(true)}
                                    className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-red-700 transition-colors"
                                >
                                    Újrapróbálkozás
                                </button>
                            </div>
                        ) : activeImageUrl ? (
                            <div className="relative group">
                                <button
                                    onClick={() => {
                                        setActiveImageTitle(editableRecipe.recipeName);
                                        setIsImageModalOpen(true);
                                    }}
                                    className="w-full aspect-[4/3] rounded-lg overflow-hidden shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                    aria-label="Kép megtekintése nagyban"
                                >
                                    <img
                                        src={activeImageUrl}
                                        alt={`Fotó a receptről: ${editableRecipe.recipeName}`}
                                        className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                                        onLoad={() => setImageLoaded(true)}
                                    />
                                    {!imageLoaded && (
                                        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                                            <svg className="animate-spin h-8 w-8 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        </div>
                                    )}
                                </button>
                                <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleGenerateImage(true)}
                                        className="flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 bg-white/80 backdrop-blur-sm text-gray-800 rounded-full hover:bg-white shadow-md transition-colors"
                                        aria-label="Új ételfotó generálása"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                                        Újragenerálás
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 bg-white/80 backdrop-blur-sm text-gray-800 rounded-full hover:bg-white shadow-md transition-colors"
                                        aria-label="Új kép feltöltése"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                        Új kép feltöltése
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="aspect-[4/3] rounded-lg bg-gray-50 flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300">
                                <h4 className="text-lg font-semibold text-gray-700 mb-2">Ételfotó</h4>
                                <p className="text-gray-500 text-center text-sm mb-4">Generáljon egy képet a recepthez, vagy töltsön fel egy sajátot.</p>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={() => handleGenerateImage()}
                                        className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                                        Generálás AI-val
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                        Saját kép feltöltése
                                    </button>
                                </div>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            accept="image/png, image/jpeg, image/webp"
                            className="hidden"
                            aria-hidden="true"
                        />
                    </div>

                    {/* Details Section */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                        {[
                            { label: 'Előkészítés', value: editableRecipe.prepTime, field: 'prepTime' },
                            { label: 'Főzési idő', value: editableRecipe.cookTime, field: 'cookTime' },
                            { label: 'Adag', value: editableRecipe.servings, field: 'servings' },
                            { label: 'Étkezés', value: mealTypeLabel },
                            { label: 'Konyha', value: cuisineLabel || 'Nincs megadva' },
                            { label: 'Becsült költség', value: editableRecipe.estimatedCost, field: 'estimatedCost' },
                        ].filter(item => item.value).map(item => (
                            <div key={item.label} className="bg-primary-50 p-3 rounded-lg">
                                <p className="text-sm text-primary-700 font-semibold">{item.label}</p>
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        value={item.value || ''}
                                        onChange={(e) => handleFieldChange(item.field as keyof Recipe, e.target.value)}
                                        className="text-lg font-bold text-primary-900 bg-yellow-50 border border-primary-200 rounded p-1 w-full text-center"
                                    />
                                ) : (
                                    <p className="text-lg font-bold text-primary-900">{item.value}</p>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="bg-primary-50 p-3 rounded-lg">
                        <p className="text-sm text-primary-700 font-semibold text-center">Elkészítés módja</p>
                        {isEditing ? (
                            <div className="text-lg font-bold text-primary-900 text-center">
                                {/* Editing for cooking methods is not implemented in this view, show static */}
                                {cookingMethodLabels}
                            </div>
                        ) : (
                            <p className="text-lg font-bold text-primary-900 text-center">{cookingMethodLabels}</p>
                        )}
                    </div>

                    {/* Ingredients Section */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xl font-bold text-gray-800">Hozzávalók</h3>
                            <button onClick={handleAddToShoppingList} className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-primary-700">Bevásárló listára</button>
                        </div>
                        {isEditing ? (
                            <textarea value={editableRecipe.ingredients.join('\n')} onChange={e => setEditableRecipe(prev => ({...prev, ingredients: e.target.value.split('\n')}))} rows={8} className="text-gray-700 w-full bg-yellow-50 border-2 border-primary-200 rounded-lg p-3"/>
                        ) : (
                            <ul className="bg-primary-50 p-4 rounded-lg space-y-2 border border-primary-100">
                            {editableRecipe.ingredients.map((ing, i) => <li key={i} className="text-gray-700">{ing}</li>)}
                            </ul>
                        )}
                    </div>

                    {/* Nutritional Info */}
                    <NutritionalInfo recipe={editableRecipe} isEditing={isEditing} onChange={handleFieldChange} />

                    {/* Diabetic Advice */}
                    {editableRecipe.diabeticAdvice && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h3 className="text-lg font-bold text-blue-800 mb-2">Tipp cukorbetegeknek</h3>
                            {isEditing ? (
                                <textarea value={editableRecipe.diabeticAdvice} onChange={e => handleFieldChange('diabeticAdvice', e.target.value)} className="w-full bg-yellow-50 border-2 border-primary-200 rounded-lg p-2"/>
                            ) : (
                                <p className="text-blue-700">{editableRecipe.diabeticAdvice}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column (Instructions) */}
                 <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-800">Elkészítés</h3>

                    {/* Editing UI and Carousel for Screen */}
                    <div>
                        {isEditing ? (
                            <textarea 
                                value={editableRecipe.instructions.map(s => s.text).join('\n\n')} 
                                onChange={e => setEditableRecipe(prev => ({...prev, instructions: e.target.value.split('\n\n').map(text => ({ text }))}))} 
                                rows={15} 
                                className="text-gray-700 w-full bg-yellow-50 border-2 border-primary-200 rounded-lg p-3"
                            />
                        ) : (
                        <div>
                            <InstructionCarousel
                                instructions={resolvedInstructions}
                                currentStep={instructionStep}
                                onStepChange={setInstructionStep}
                                voiceModeActive={voiceMode === 'cooking'}
                                onGenerateImage={handleGenerateInstructionImage}
                                generatingImageForStep={generatingInstructionImageFor}
                                onImageClick={(url, title) => {
                                    setActiveImageUrl(url);
                                    setActiveImageTitle(title);
                                    setIsImageModalOpen(true);
                                }}
                            />
                        </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Alternative Suggestions */}
            {alternativeSuggestions && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Hasonló receptek kipróbálásra</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {alternativeSuggestions.map((suggestion, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white flex flex-col justify-between hover:shadow-lg transition-shadow">
                                <div>
                                    <h4 className="font-bold text-primary-800">{suggestion.recipeName}</h4>
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-3">{suggestion.description}</p>
                                </div>
                                <button
                                    onClick={() => onGenerateFromSuggestion(suggestion)}
                                    className="w-full mt-4 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-green-700"
                                >
                                    Recept generálása
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Modals */}
            {isSaveModalOpen && <SaveRecipeModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={(cat) => onSave(editableRecipe, cat)} existingCategories={Object.keys(favorites)} suggestedCategory={mealTypeLabel} />}
            {isTimerOpen && <KitchenTimer onClose={() => setIsTimerOpen(false)} initialValues={timerInitialValues} />}
            {isShareModalOpen && <ShareFallbackModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} textToCopy={textToShare} />}
            {isFavoriteStatusModalOpen && <FavoriteStatusModal isOpen={isFavoriteStatusModalOpen} onClose={() => setIsFavoriteStatusModalOpen(false)} onSave={(ids) => onUpdateFavoriteStatus(editableRecipe.recipeName, "mock_category", ids)} users={users} initialFavoritedByIds={editableRecipe.favoritedBy || []} recipeName={editableRecipe.recipeName} />}
            {isImageModalOpen && <ImageDisplayModal imageUrl={activeImageUrl} recipeName={activeImageTitle} onClose={() => setIsImageModalOpen(false)} />}
        </div>
    </>
  );
};

export default RecipeDisplay;
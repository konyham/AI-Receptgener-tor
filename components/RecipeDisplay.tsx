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
import { useTranslation } from '../hooks/useTranslation';


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

const NutritionalInfo: React.FC<{ recipe: Recipe, isEditing?: boolean, onChange?: (field: keyof Recipe, value: string) => void, t: (key: string) => string }> = ({ recipe, isEditing, onChange, t }) => {
    const fields: (keyof Recipe)[] = ['calories', 'carbohydrates', 'protein', 'fat', 'glycemicIndex'];
    const info = fields.map(field => ({
        field,
        label: {
            calories: t('recipeDisplay.nutrition.calories'),
            carbohydrates: t('recipeDisplay.nutrition.carbohydrates'),
            protein: t('recipeDisplay.nutrition.protein'),
            fat: t('recipeDisplay.nutrition.fat'),
            glycemicIndex: t('recipeDisplay.nutrition.glycemicIndex'),
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
            <h3 className="text-lg font-bold text-gray-800 mb-3">{t('recipeDisplay.nutritionTitle')} <span className="text-sm font-normal text-gray-500">{t('recipeDisplay.nutritionUnit')}</span></h3>
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
    const { t } = useTranslation();
    const { showNotification } = useNotification();
    const originalRecipeRef = useRef(recipe);
    
    const [editableRecipe, setEditableRecipe] = useState<Recipe>(() => JSON.parse(JSON.stringify(recipe)));
    const [isEditing, setIsEditing] = useState(false);
    
    // Image states
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

    const stopSpeech = useCallback(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        setVoiceMode('idle');
    }, []);

    const handleSpeechError = useCallback((error: string) => {
        if (error === 'not-allowed') {
            showNotification(t('voiceControl.micPermissionHint'), 'info');
        }
    }, [showNotification, t]);

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
            const imageUrl = `data:image/jpeg;base64,${imageBytes}`;
            const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            
            await imageStore.saveImage(imageId, imageUrl);

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
    
    // ... all other handlers ...

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
    
    const mealTypeLabel = mealTypes.find(m => m.value === editableRecipe.mealType)?.label || editableRecipe.mealType;
    const cuisineLabel = cuisineOptions.find(c => c.value === editableRecipe.cuisine)?.label || editableRecipe.cuisine;
    const cookingMethodLabels = editableRecipe.cookingMethods
        .map(cm => cookingMethodsList.find(c => c.value === cm)?.label || cm)
        .join(', ');

  return (
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
                        <button onClick={handleSaveEdit} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700">{t('recipeDisplay.saveChanges')}</button>
                        <button onClick={handleCancelEdit} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">{t('recipeDisplay.cancel')}</button>
                    </>
                ) : (
                    <>
                        {isFromFavorites && <button onClick={() => setIsEditing(true)} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-600">{t('recipeDisplay.editButton')}</button>}
                        <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">{isFromFavorites ? t('recipeDisplay.backToFavoritesButton') : t('recipeDisplay.newRecipeButton')}</button>
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
        {isFromFavorites && <StarRating rating={editableRecipe.rating} onRatingChange={isEditing ? undefined : handleRatingChange} readOnly={isEditing} />}


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
                {/* Image Section */}
                <div>
                     {/* Image Display */}
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                    {/* Time, Servings, etc. */}
                </div>

                {/* Ingredients Section */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-bold text-gray-800">{t('recipeDisplay.ingredients')}</h3>
                        <button onClick={handleAddToShoppingList} className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-primary-700">{t('recipeDisplay.addToShoppingList')}</button>
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
                <NutritionalInfo recipe={editableRecipe} isEditing={isEditing} onChange={handleFieldChange} t={t} />

                {/* Diabetic Advice */}
                {editableRecipe.diabeticAdvice && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h3 className="text-lg font-bold text-blue-800 mb-2">{t('recipeDisplay.diabeticTipTitle')}</h3>
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
                <h3 className="text-xl font-bold text-gray-800">{t('recipeDisplay.instructions')}</h3>
                {isEditing ? (
                    <textarea 
                        value={editableRecipe.instructions.map(s => s.text).join('\n\n')} 
                        onChange={e => setEditableRecipe(prev => ({...prev, instructions: e.target.value.split('\n\n').map(text => ({ text }))}))} 
                        rows={15} 
                        className="text-gray-700 w-full bg-yellow-50 border-2 border-primary-200 rounded-lg p-3"
                    />
                ) : (
                   <InstructionCarousel
                        instructions={editableRecipe.instructions}
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
                )}
            </div>
        </div>
        
        {/* Modals */}
        {isSaveModalOpen && <SaveRecipeModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={(cat) => onSave(editableRecipe, cat)} existingCategories={Object.keys(favorites)} suggestedCategory={mealTypeLabel} />}
        {isTimerOpen && <KitchenTimer onClose={() => setIsTimerOpen(false)} initialValues={timerInitialValues} />}
        {isShareModalOpen && <ShareFallbackModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} textToCopy={"mock text"} />}
        {isFavoriteStatusModalOpen && <FavoriteStatusModal isOpen={isFavoriteStatusModalOpen} onClose={() => setIsFavoriteStatusModalOpen(false)} onSave={(ids) => onUpdateFavoriteStatus(editableRecipe.recipeName, "mock_category", ids)} users={users} initialFavoritedByIds={editableRecipe.favoritedBy || []} recipeName={editableRecipe.recipeName} />}
        {isImageModalOpen && <ImageDisplayModal imageUrl={activeImageUrl} recipeName={activeImageTitle} onClose={() => setIsImageModalOpen(false)} />}
    </div>
  );
};

export default RecipeDisplay;

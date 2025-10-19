import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Recipe, VoiceCommand, Favorites, UserProfile, InstructionStep, AlternativeRecipeSuggestion, OptionItem, MealType, CuisineOption, CookingMethod, DietOption } from '../types';
import { interpretUserCommand, generateRecipeImage, calculateRecipeCost, simplifyRecipe } from '../services/geminiService';
import * as imageStore from '../services/imageStore';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useNotification } from '../contexts/NotificationContext';
import KitchenTimer from './KitchenTimer';
import SaveRecipeModal from './SaveToFavoritesModal';
import ImageDisplayModal from './ImageDisplayModal';
import ErrorMessage from './ErrorMessage';
import InstructionCarousel from './InstructionCarousel';
import { DIET_OPTIONS } from '../constants';
import { konyhaMikiLogo as konyhaMikiLogoBase64 } from '../assets';
import StarRating from './StarRating';
import FavoriteStatusModal from './FavoriteStatusModal';
import RecipeDetails from './RecipeDetails';


interface RecipeDisplayProps {
  recipe: Recipe;
  onClose: () => void;
  isFromFavorites: boolean;
  favorites: Favorites;
  onSave: (recipe: Recipe, category: string) => void;
  onAddItemsToShoppingList: (items: string[]) => void;
  isLoading: boolean;
  onRecipeUpdate: (updatedRecipe: Recipe, originalRecipe: Recipe) => void;
  users: UserProfile[];
  onUpdateFavoriteStatus: (recipeName: string, category: string, favoritedByIds: string[]) => void;
  shouldGenerateImageInitially: boolean;
  onGenerateVariations: (recipe: Recipe) => void;
  mealTypes: OptionItem[];
  cuisineOptions: OptionItem[];
  cookingMethodsList: OptionItem[];
  category: string | null;
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

const addWatermark = (imageUrl: string, recipe: Recipe, allMealTypes: OptionItem[], allCookingMethods: OptionItem[]): Promise<string> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = imageUrl;

        image.onload = () => {
            const canvas = document.createElement('canvas');
            const canvasWidth = 1280;
            const canvasHeight = 896;
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('A vászon kontextus nem elérhető.'));

            // 1. Draw image with center crop to fit the 1280x896 canvas
            const canvasAspect = canvasWidth / canvasHeight;
            const imageAspect = image.width / image.height;
            let sx, sy, sWidth, sHeight;

            if (imageAspect > canvasAspect) {
                sHeight = image.height;
                sWidth = sHeight * canvasAspect;
                sx = (image.width - sWidth) / 2;
                sy = 0;
            } else {
                sWidth = image.width;
                sHeight = sWidth / canvasAspect;
                sx = 0;
                sy = (image.height - sHeight) / 2;
            }
            ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, canvasWidth, canvasHeight);

            // --- Helper function for text with a more pronounced shadow ---
            const drawTextWithShadow = (text: string, x: number, y: number, font: string, color: string, align: 'left' | 'right' | 'center') => {
                ctx.font = font;
                ctx.fillStyle = color;
                ctx.textAlign = align;
                ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
                ctx.shadowBlur = 12;
                ctx.shadowOffsetX = 5;
                ctx.shadowOffsetY = 5;
                ctx.fillText(text, x, y);
                // Reset shadow
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            };

            const padding = 35;
            const cornerFont = 'bold 32px Arial, sans-serif';
            const cornerLineHeight = 40;

            // --- 2. Top-Left Text Block ---
            let topLeftY = padding + 32; // Start Y for top-left (font size)

            drawTextWithShadow('Elkészítés:', padding, topLeftY, cornerFont, 'white', 'left');
            topLeftY += cornerLineHeight;

            const cookingMethodLabels = recipe.cookingMethods
                .map(cmValue => allCookingMethods.find(opt => opt.value === cmValue)?.label)
                .filter((label): label is string => !!label);

            if (cookingMethodLabels.length > 0 && !(cookingMethodLabels.length === 1 && cookingMethodLabels[0] === 'Hagyományos')) {
                const fullLabelText = `• ${cookingMethodLabels.join(', ')}`;
                const maxWidth = canvas.width * 0.6; // Increased width to prevent early wrapping
                ctx.font = cornerFont;

                const words = fullLabelText.split(' ');
                let line = '';
                let currentY = topLeftY;

                for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > maxWidth && n > 0) {
                        drawTextWithShadow(line.trim(), padding, currentY, cornerFont, 'white', 'left');
                        line = words[n] + ' ';
                        currentY += cornerLineHeight;
                    } else {
                        line = testLine;
                    }
                }
                drawTextWithShadow(line.trim(), padding, currentY, cornerFont, 'white', 'left');
                topLeftY = currentY + cornerLineHeight;
            }

            const mealTypeLabel = allMealTypes.find(mt => mt.value === recipe.mealType)?.label || 'Nincs megadva';
            drawTextWithShadow(`Étkezés: ${mealTypeLabel}`, padding, topLeftY, cornerFont, 'white', 'left');
            topLeftY += cornerLineHeight;

            const dietLabel = DIET_OPTIONS.find(d => d.value === recipe.diet)?.label || 'Nincs megadva';
            drawTextWithShadow(`Diéta: ${dietLabel}`, padding, topLeftY, cornerFont, 'white', 'left');
            topLeftY += cornerLineHeight;

            // --- 3. Top-Right Text Block (Nutritional Info) ---
            let topRightY = padding + 32;
            let hasNutritionalInfo = false;

            if (recipe.calories) {
                drawTextWithShadow(`Kalória: ${recipe.calories}`, canvas.width - padding, topRightY, cornerFont, 'white', 'right');
                topRightY += cornerLineHeight;
                hasNutritionalInfo = true;
            }
            if (recipe.carbohydrates) {
                drawTextWithShadow(`Szénhidrát: ${recipe.carbohydrates}`, canvas.width - padding, topRightY, cornerFont, 'white', 'right');
                topRightY += cornerLineHeight;
                hasNutritionalInfo = true;
            }
            if (recipe.protein) {
                drawTextWithShadow(`Fehérje: ${recipe.protein}`, canvas.width - padding, topRightY, cornerFont, 'white', 'right');
                topRightY += cornerLineHeight;
                hasNutritionalInfo = true;
            }
            if (recipe.fat) {
                drawTextWithShadow(`Zsír: ${recipe.fat}`, canvas.width - padding, topRightY, cornerFont, 'white', 'right');
                topRightY += cornerLineHeight;
                hasNutritionalInfo = true;
            }
            
            if (hasNutritionalInfo) {
                topRightY += cornerLineHeight * 0.5; // Add a small gap after nutritional info
            }

            drawTextWithShadow('AI-val készítette:', canvas.width - padding, topRightY, cornerFont, 'white', 'right');
            topRightY += cornerLineHeight;
            drawTextWithShadow('Konyha Miki', canvas.width - padding, topRightY, cornerFont, 'white', 'right');


            // --- 4. Bottom Bar ---
            const wrapText = (context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, draw: boolean = true) => {
                const words = text.split(' ');
                let line = '';
                let lineCount = 1;
                let currentY = y;

                for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = context.measureText(testLine);
                    if (metrics.width > maxWidth && n > 0) {
                        if (draw) context.fillText(line.trim(), x, currentY);
                        line = words[n] + ' ';
                        currentY += lineHeight;
                        lineCount++;
                    } else {
                        line = testLine;
                    }
                }
                if (draw) context.fillText(line.trim(), x, currentY);
                return { height: lineCount * lineHeight };
            }
            
            const logo = new Image();
            logo.src = konyhaMikiLogoBase64;
            logo.onload = () => {
                // --- Title and bar calculation ---
                const titleFont = 'bold 45px Arial, sans-serif';
                const titleLineHeight = 50;
                const logoDisplayWidth = 375;
                const logoAreaWidth = logoDisplayWidth + padding;
                const recipeNameMaxWidth = canvas.width - logoAreaWidth - padding;
                
                // Measure text height to determine bar height
                ctx.font = titleFont;
                const { height: titleHeight } = wrapText(ctx, recipe.recipeName, 0, 0, recipeNameMaxWidth, titleLineHeight, false);
                
                const verticalPadding = 25;
                const minBarHeight = 125;
                const bottomBarHeight = Math.max(minBarHeight, titleHeight + (verticalPadding * 2));

                // Draw bottom bar
                ctx.fillStyle = 'rgba(30, 30, 30, 0.8)'; // Darker, more neutral bar
                ctx.fillRect(0, canvas.height - bottomBarHeight, canvas.width, bottomBarHeight);

                // Draw Logo
                const logoAspectRatio = logo.height / logo.width;
                const logoDisplayHeight = logoDisplayWidth * logoAspectRatio;
                const logoY = canvas.height - bottomBarHeight / 2 - logoDisplayHeight / 2;
                ctx.drawImage(logo, padding / 2, logoY, logoDisplayWidth, logoDisplayHeight);

                // Draw title text (vertically centered)
                ctx.fillStyle = 'white';
                ctx.font = titleFont;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                const startY = canvas.height - bottomBarHeight + (bottomBarHeight - titleHeight) / 2;
                wrapText(ctx, recipe.recipeName, logoAreaWidth, startY, recipeNameMaxWidth, titleLineHeight, true);

                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            logo.onerror = (e) => {
                console.error("Logo failed to load for watermarking:", e);
                reject(new Error("A logókép nem töltődött be a vízjelhez."));
            };
        };
        image.onerror = (e) => {
            console.error("Main image failed to load for watermarking:", e);
            reject(new Error('A kép betöltése sikertelen a vízjelezéshez.'));
        };
    });
};

const RecipeDisplay: React.FC<RecipeDisplayProps> = ({
  recipe,
  onClose,
  isFromFavorites,
  favorites,
  onSave,
  onAddItemsToShoppingList,
  isLoading: isSubmitting,
  onRecipeUpdate,
  users,
  onUpdateFavoriteStatus,
  shouldGenerateImageInitially,
  onGenerateVariations,
  mealTypes,
  cuisineOptions,
  cookingMethodsList,
  category,
}) => {
    const { showNotification } = useNotification();
    const originalRecipeRef = useRef(recipe);
    
    // This state is a buffer for form inputs when in edit mode.
    const [editableRecipe, setEditableRecipe] = useState<Recipe>(recipe);
    const [isEditing, setIsEditing] = useState(false);
    
    // Sync the internal state with the prop from the parent (App.tsx),
    // which is the source of truth. This avoids stale state issues.
    // We don't sync while actively editing, to avoid overwriting user input.
    useEffect(() => {
        if (!isEditing) {
            setEditableRecipe(recipe);
            originalRecipeRef.current = recipe;
        }
    }, [recipe, isEditing]);

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
    
    // Modal states
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isTimerOpen, setIsTimerOpen] = useState(false);
    const [isFavoriteStatusModalOpen, setIsFavoriteStatusModalOpen] = useState(false);
    const [timerInitialValues, setTimerInitialValues] = useState<{ hours?: number; minutes?: number; seconds?: number } | null>(null);

    // Voice reading states
    const [voiceMode, setVoiceMode] = useState<VoiceMode>('idle');
    const [currentSpeechStep, setCurrentSpeechStep] = useState(0);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Instruction Carousel states
    const [instructionStep, setInstructionStep] = useState(0);
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
        if
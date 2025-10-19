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
            const imageBytes = await generateRecipeImage(editableRecipe, []);
            const rawImageUrl = `data:image/jpeg;base64,${imageBytes}`;
            const watermarkedImageUrl = await addWatermark(rawImageUrl, editableRecipe, mealTypes, cookingMethodsList);
            
            const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            await imageStore.saveImage(imageId, watermarkedImageUrl);

            const updatedRecipe = { ...editableRecipe, imageUrl: `indexeddb:${imageId}` };
            onRecipeUpdate(updatedRecipe, originalRecipeRef.current);

        } catch (e: any) {
            setGeneratingImageError(e.message);
        } finally {
            setIsGeneratingImage(false);
        }
    }, [editableRecipe, onRecipeUpdate, isFromFavorites, mealTypes, cookingMethodsList]);

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
                const watermarkedImageUrl = await addWatermark(imageDataUrl, editableRecipe, mealTypes, cookingMethodsList);
    
                const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                await imageStore.saveImage(imageId, watermarkedImageUrl);
    
                const updatedRecipe = { ...editableRecipe, imageUrl: `indexeddb:${imageId}` };
                onRecipeUpdate(updatedRecipe, originalRecipeRef.current);
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
    
    const handleRemoveImage = useCallback(async () => {
        if (!editableRecipe.imageUrl) return;
    
        setIsGeneratingImage(true);
        setGeneratingImageError(null);
        setImageLoaded(false);
    
        try {
            if (editableRecipe.imageUrl.startsWith('indexeddb:')) {
                const imageId = editableRecipe.imageUrl.substring(10);
                await imageStore.deleteImage(imageId);
            }
            
            const updatedRecipe = { ...editableRecipe, imageUrl: undefined };
            onRecipeUpdate(updatedRecipe, originalRecipeRef.current);
            showNotification('Kép sikeresen eltávolítva!', 'success');
        } catch (e: any) {
            setGeneratingImageError('Hiba történt a kép törlése közben.');
            showNotification('Hiba a kép törlésekor.', 'info');
        } finally {
            setIsGeneratingImage(false);
        }
    }, [editableRecipe, onRecipeUpdate, showNotification]);

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
                    onRecipeUpdate({ ...editableRecipe, imageUrl: undefined }, originalRecipeRef.current);
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
        // The useEffect will sync the editableRecipe state back to the original prop
        setIsEditing(false);
    };

    const handleFieldChange = (field: keyof Recipe, value: string) => {
        setEditableRecipe(prev => ({...prev, [field]: value}));
    };
    
    const handleRatingChange = (newRating: number | undefined) => {
        // Create an updated recipe object based on the current editable state
        const updatedRecipe = { ...editableRecipe, rating: newRating };
    
        // Update the local state immediately for instant UI feedback
        setEditableRecipe(updatedRecipe);
    
        // Call the parent component to persist the change
        // We pass the *original* recipe before this change as the second argument,
        // which is what originalRecipeRef is for.
        onRecipeUpdate(updatedRecipe, originalRecipeRef.current);
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
                <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-7 gap-3">
                    <ActionButton onClick={() => setIsSaveModalOpen(true)} label="Recept mentése">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v10l-5-4-5 4V4z" />
                        </svg>
                        <span className="text-xs font-semibold text-gray-700">Mentés</span>
                    </ActionButton>
                    {isFromFavorites && (
                        <ActionButton onClick={() => setIsFavoriteStatusModalOpen(true)} label="Kedvencnek jelölés">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs font-semibold text-gray-700">Kedvencek</span>
                        </ActionButton>
                    )}
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
                    <ActionButton onClick={() => onGenerateVariations(recipe)} label="Recept variációk">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        <span className="text-xs font-semibold text-gray-700">Variációk</span>
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
                    <div className="space-y-2">
                        {isEditing ? (
                            <div className="p-4 border-2 border-dashed border-primary-300 rounded-lg space-y-4 bg-primary-50">
                                <h4 className="font-bold text-primary-800">Kép szerkesztése</h4>
                                <div className="relative">
                                    {isGeneratingImage ? (
                                        <div className="aspect-[4/3] rounded-lg bg-gray-100 flex flex-col items-center justify-center p-4 border animate-pulse-bg">
                                            <svg className="animate-spin h-10 w-10 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        </div>
                                    ) : activeImageUrl ? (
                                        <img
                                            src={activeImageUrl}
                                            alt={`Fotó a receptről: ${editableRecipe.recipeName}`}
                                            className="w-full aspect-[4/3] object-cover rounded-lg shadow-md"
                                        />
                                    ) : (
                                        <div className="aspect-[4/3] rounded-lg bg-gray-100 flex flex-col items-center justify-center p-4">
                                            <p className="text-gray-500 text-center">Nincs kép a recepthez.</p>
                                        </div>
                                    )}
                                </div>
                                {generatingImageError && <p className="text-red-600 text-sm text-center">{generatingImageError}</p>}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    <button type="button" onClick={() => handleGenerateImage(true)} disabled={isGeneratingImage} className="bg-primary-600 text-white font-bold py-2 px-3 rounded-lg shadow-md hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                                        Új AI kép
                                    </button>
                                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isGeneratingImage} className="bg-gray-600 text-white font-bold py-2 px-3 rounded-lg shadow-md hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                        Feltöltés
                                    </button>
                                    <button type="button" onClick={handleRemoveImage} disabled={isGeneratingImage || !activeImageUrl} className="sm:col-span-2 lg:col-span-1 bg-red-600 text-white font-bold py-2 px-3 rounded-lg shadow-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        Kép törlése
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                {isGeneratingImage ? (
                                    <div className="aspect-[4/3] rounded-lg bg-gray-100 flex flex-col items-center justify-center p-4 border animate-pulse-bg">
                                        <svg className="animate-spin h-10 w-10 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <p className="mt-4 text-lg font-semibold text-gray-700">Ételkép feldolgozása...</p>
                                        <p className="text-sm text-gray-500">Ez eltarthat egy pillanatig...</p>
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

                    <RecipeDetails
                        recipe={editableRecipe}
                        mealTypes={mealTypes}
                        cuisineOptions={cuisineOptions}
                        cookingMethodsList={cookingMethodsList}
                    />

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
            
            {/* Modals */}
            {isSaveModalOpen && <SaveRecipeModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={(cat) => onSave(editableRecipe, cat)} existingCategories={Object.keys(favorites)} suggestedCategory={mealTypeLabel} />}
            {isTimerOpen && <KitchenTimer onClose={() => setIsTimerOpen(false)} initialValues={timerInitialValues} />}
            {isFavoriteStatusModalOpen && <FavoriteStatusModal isOpen={isFavoriteStatusModalOpen} onClose={() => setIsFavoriteStatusModalOpen(false)} onSave={(ids) => {
                if (category) {
                    onUpdateFavoriteStatus(editableRecipe.recipeName, category, ids);
                    setIsFavoriteStatusModalOpen(false);
                } else {
                    showNotification("A recept kategóriája nem található, a kedvenc állapot mentése sikertelen.", "info");
                }
            }} users={users} initialFavoritedByIds={editableRecipe.favoritedBy || []} recipeName={editableRecipe.recipeName} />}
            {isImageModalOpen && <ImageDisplayModal imageUrl={activeImageUrl} recipeName={activeImageTitle} onClose={() => setIsImageModalOpen(false)} />}
        </div>
    </>
  );
};

export default RecipeDisplay;
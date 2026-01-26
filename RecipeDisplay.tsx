// FIX: Restored ingredients list with checkboxes and shopping list integration.
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Recipe, VoiceCommand, Favorites, UserProfile, InstructionStep, AlternativeRecipeSuggestion, OptionItem, MealType, CuisineOption, CookingMethod, DietOption, VoiceCommandResult } from './types';
import { generateRecipeImage, calculateRecipeCost, simplifyRecipe } from './services/geminiService';
import * as imageStore from './services/imageStore';
import { useNotification } from './contexts/NotificationContext';
import KitchenTimer from './components/KitchenTimer';
import SaveRecipeModal from './components/SaveToFavoritesModal';
import ImageDisplayModal from './components/ImageDisplayModal';
import InstructionCarousel from './components/InstructionCarousel';
import { DIET_OPTIONS } from './constants';
import LoadingSpinner from './components/LoadingSpinner';
import { konyhaMikiLogo as konyhaMikiLogoBase64 } from './assets';
import StarRating from './components/StarRating';
import FavoriteStatusModal from './components/FavoriteStatusModal';
import RecipeDetails from './components/RecipeDetails';
import CookingModeView from './components/CookingModeView';
import ShareFallbackModal from './ShareFallbackModal';

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
  isGeneratingVariations: boolean;
  mealTypes: OptionItem[];
  cuisineOptions: OptionItem[];
  cookingMethodsList: OptionItem[];
  category: string | null;
  command: VoiceCommandResult | null;
  onCommandProcessed: () => void;
  forceSpeakTrigger: number;
}

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

            const drawTextWithShadow = (text: string, x: number, y: number, font: string, color: string, align: 'left' | 'right' | 'center') => {
                ctx.font = font;
                ctx.fillStyle = color;
                ctx.textAlign = align;
                ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
                ctx.shadowBlur = 12;
                ctx.shadowOffsetX = 5;
                ctx.shadowOffsetY = 5;
                ctx.fillText(text, x, y);
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            };

            const padding = 35;
            const cornerFont = 'bold 32px Arial, sans-serif';
            const cornerLineHeight = 40;

            let topLeftY = padding + 32;

            drawTextWithShadow('Elkészítés:', padding, topLeftY, cornerFont, 'white', 'left');
            topLeftY += cornerLineHeight;

            const cookingMethodLabels = recipe.cookingMethods
                .map(cmValue => allCookingMethods.find(opt => opt.value === cmValue)?.label)
                .filter((label): label is string => !!label);

            if (cookingMethodLabels.length > 0 && !(cookingMethodLabels.length === 1 && cookingMethodLabels[0] === 'Hagyományos')) {
                const fullLabelText = `• ${cookingMethodLabels.join(', ')}`;
                const maxWidth = canvas.width * 0.6;
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
                topRightY += cornerLineHeight * 0.5;
            }

            drawTextWithShadow('AI-val készítette:', canvas.width - padding, topRightY, cornerFont, 'white', 'right');
            topRightY += cornerLineHeight;
            drawTextWithShadow('Konyha Miki', canvas.width - padding, topRightY, cornerFont, 'white', 'right');

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
                const titleFont = 'bold 45px Arial, sans-serif';
                const titleLineHeight = 50;
                const logoDisplayWidth = 375;
                const logoAreaWidth = logoDisplayWidth + padding;
                const recipeNameMaxWidth = canvas.width - logoAreaWidth - padding;
                
                ctx.font = titleFont;
                const { height: titleHeight } = wrapText(ctx, recipe.recipeName, 0, 0, recipeNameMaxWidth, titleLineHeight, false);
                
                const verticalPadding = 25;
                const minBarHeight = 125;
                const bottomBarHeight = Math.max(minBarHeight, titleHeight + (verticalPadding * 2));

                ctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
                ctx.fillRect(0, canvas.height - bottomBarHeight, canvas.width, bottomBarHeight);

                const logoAspectRatio = logo.height / logo.width;
                const logoDisplayHeight = logoDisplayWidth * logoAspectRatio;
                const logoY = canvas.height - bottomBarHeight / 2 - logoDisplayHeight / 2;
                ctx.drawImage(logo, padding / 2, logoY, logoDisplayWidth, logoDisplayHeight);

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
  isGeneratingVariations,
  mealTypes,
  cuisineOptions,
  cookingMethodsList,
  category,
  command,
  onCommandProcessed,
  forceSpeakTrigger,
}) => {
    const { showNotification } = useNotification();
    const originalRecipeRef = useRef(recipe);
    
    const [editableRecipe, setEditableRecipe] = useState<Recipe>(recipe);
    const [isEditing, setIsEditing] = useState(false);
    const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    
    useEffect(() => {
        if (!isEditing) {
            setEditableRecipe(recipe);
            originalRecipeRef.current = recipe;
        }
    }, [recipe, isEditing]);

    useEffect(() => {
        setCheckedIngredients(new Set());
    }, [recipe]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [generatingImageError, setGeneratingImageError] = useState<string | null>(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [activeImageUrl, setActiveImageUrl] = useState('');
    const [activeImageTitle, setActiveImageTitle] = useState('');
    const [imageLoaded, setImageLoaded] = useState(false);

    const [isSimplifying, setIsSimplifying] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isTimerOpen, setIsTimerOpen] = useState(false);
    const [isFavoriteStatusModalOpen, setIsFavoriteStatusModalOpen] = useState(false);
    const [timerInitialValues, setTimerInitialValues] = useState<{ hours?: number; minutes?: number; seconds?: number } | null>(null);
    const [isCookingModeActive, setIsCookingModeActive] = useState(false);

    const [instructionStep, setInstructionStep] = useState(0);
    const [resolvedInstructions, setResolvedInstructions] = useState<InstructionStep[]>([]);

    const handleIngredientCheck = (ingredient: string) => {
        setCheckedIngredients(prev => {
            const newSet = new Set(prev);
            if (newSet.has(ingredient)) {
                newSet.delete(ingredient);
            } else {
                newSet.add(ingredient);
            }
            return newSet;
        });
    };

    const handleSelectAllIngredients = () => {
        if (checkedIngredients.size === editableRecipe.ingredients.length) {
            setCheckedIngredients(new Set());
        } else {
            setCheckedIngredients(new Set(editableRecipe.ingredients));
        }
    };

    const handleAddSelectedToShoppingList = () => {
        const itemsToAdd = Array.from(checkedIngredients);
        if (itemsToAdd.length > 0) {
            onAddItemsToShoppingList(itemsToAdd);
            setCheckedIngredients(new Set()); 
            showNotification(`${itemsToAdd.length} hozzávaló hozzáadva a bevásárlólistához!`, 'success');
        }
    };

    const handleShare = async () => {
        const shareTitle = `Konyha Miki Recept: ${editableRecipe.recipeName}`;
        const shareText = `${editableRecipe.description}\n\nHozzávalók:\n${editableRecipe.ingredients.join('\n')}\n\nKészült az AI Receptgenerátorral - Konyha Miki módra.`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: window.location.href,
                });
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    console.error('Megosztás sikertelen:', err);
                    setIsShareModalOpen(true);
                }
            }
        } else {
            setIsShareModalOpen(true);
        }
    };

    useEffect(() => {
        if (command) {
            handleVoiceCommand(command);
            onCommandProcessed();
        }
    }, [command, onCommandProcessed]);

    const stopSpeech = useCallback(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }, []);

    const speak = useCallback((text: string, onEnd?: () => void) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        stopSpeech();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'hu-HU';
        utterance.rate = 0.9;
        if (onEnd) utterance.onend = onEnd;
        window.speechSynthesis.speak(utterance);
    }, [stopSpeech]);
    
    const readCurrentStep = useCallback(() => {
        const stepText = editableRecipe.instructions[instructionStep]?.text;
        if (stepText) {
            speak(`${instructionStep + 1}. lépés: ${stepText}`);
        }
    }, [instructionStep, editableRecipe.instructions, speak]);
    
    useEffect(() => {
        if (isCookingModeActive) { 
            readCurrentStep();
        }
    }, [instructionStep, isCookingModeActive, readCurrentStep]);

    const handleVoiceCommand = (voiceCommand: VoiceCommandResult) => {
        switch(voiceCommand.command) {
            case VoiceCommand.NEXT:
                setInstructionStep(prev => Math.min(prev + 1, editableRecipe.instructions.length - 1));
                break;
            case VoiceCommand.PREVIOUS:
                setInstructionStep(prev => Math.max(prev - 1, 0));
                break;
            case VoiceCommand.REPEAT:
                readCurrentStep();
                break;
            case VoiceCommand.START_COOKING:
                setIsCookingModeActive(true);
                break;
            case VoiceCommand.READ_INTRO:
                speak(`${editableRecipe.recipeName}. ${editableRecipe.description}`);
                break;
            case VoiceCommand.READ_INGREDIENTS:
                speak(`Hozzávalók: ${editableRecipe.ingredients.join(', ')}`);
                break;
            case VoiceCommand.START_TIMER:
                if (voiceCommand.payload) {
                    setTimerInitialValues(voiceCommand.payload);
                    setIsTimerOpen(true);
                }
                break;
            case VoiceCommand.STOP:
                onClose();
                break;
        }
    };

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

    const handleGenerateImage = useCallback(async (regenerate = false) => {
        if (!regenerate && editableRecipe.imageUrl) return;
        setIsGeneratingImage(true);
        setGeneratingImageError(null);
        setImageLoaded(false);
        try {
            const imageBytes = await generateRecipeImage(editableRecipe);
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
    }, [editableRecipe, onRecipeUpdate, mealTypes, cookingMethodsList]);

    useEffect(() => {
        if (shouldGenerateImageInitially && !recipe.imageUrl) {
            handleGenerateImage();
        }
    }, [shouldGenerateImageInitially, recipe.imageUrl, handleGenerateImage]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { 
            showNotification('A képfájl mérete túl nagy (maximum 5MB).', 'info');
            return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            setIsGeneratingImage(true);
            try {
                const imageDataUrl = e.target?.result as string;
                const watermarkedImageUrl = await addWatermark(imageDataUrl, editableRecipe, mealTypes, cookingMethodsList);
                const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                await imageStore.saveImage(imageId, watermarkedImageUrl);
                const updatedRecipe = { ...editableRecipe, imageUrl: `indexeddb:${imageId}` };
                onRecipeUpdate(updatedRecipe, originalRecipeRef.current);
                showNotification('Kép sikeresen feltöltve!', 'success');
            } catch (err: any) {
                setGeneratingImageError(err.message);
            } finally {
                 setIsGeneratingImage(false);
            }
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };
    
    const handleRemoveImage = useCallback(async () => {
        if (!editableRecipe.imageUrl) return;
        setIsGeneratingImage(true);
        try {
            if (editableRecipe.imageUrl.startsWith('indexeddb:')) {
                const imageId = editableRecipe.imageUrl.substring(10);
                await imageStore.deleteImage(imageId);
            }
            const updatedRecipe = { ...editableRecipe, imageUrl: undefined };
            onRecipeUpdate(updatedRecipe, originalRecipeRef.current);
            showNotification('Kép eltávolítva!', 'success');
        } catch (e: any) {
            setGeneratingImageError('Hiba történt a kép törlése közben.');
        } finally {
            setIsGeneratingImage(false);
        }
    }, [editableRecipe, onRecipeUpdate, showNotification]);

    useEffect(() => {
        if (editableRecipe.imageUrl && editableRecipe.imageUrl.startsWith('indexeddb:')) {
            const imageId = editableRecipe.imageUrl.substring(10);
            imageStore.getImage(imageId).then(imageData => {
                if (imageData) setActiveImageUrl(imageData);
                else onRecipeUpdate({ ...editableRecipe, imageUrl: undefined }, originalRecipeRef.current);
            });
        } else if (editableRecipe.imageUrl) {
            setActiveImageUrl(editableRecipe.imageUrl);
        } else {
            setActiveImageUrl('');
        }
    }, [editableRecipe.imageUrl]);
    
    const handleSaveEdit = () => {
        onRecipeUpdate(editableRecipe, originalRecipeRef.current);
        setIsEditing(false);
    };

    const handleFieldChange = (field: keyof Recipe, value: any) => {
        setEditableRecipe(prev => ({...prev, [field]: value}));
    };
    
    const handleRatingChange = (newRating: number | undefined) => {
        const updatedRecipe = { ...editableRecipe, rating: newRating };
        setEditableRecipe(updatedRecipe);
        onRecipeUpdate(updatedRecipe, originalRecipeRef.current);
    };
    
    const handleSimplify = async () => {
        setIsSimplifying(true);
        try {
            const simplified = await simplifyRecipe(editableRecipe);
            onRecipeUpdate(simplified, originalRecipeRef.current);
            showNotification('A recept sikeresen egyszerűsítve lett!', 'success');
        } catch (e: any) {
            showNotification(`Hiba: ${e.message}`, 'info');
        } finally {
            setIsSimplifying(false);
        }
    };

    const handlePrint = () => {
        const mainImageHtml = activeImageUrl ? `<img src="${activeImageUrl}" alt="Recept fotó" style="width:100%;max-width:500px;display:block;margin:1em auto;">` : '';
        const printContent = `
          <!DOCTYPE html>
          <html lang="hu">
          <head><meta charset="UTF-8"><title>${editableRecipe.recipeName}</title><style>body{font-family:sans-serif;line-height:1.6;margin:30px;}h1{color:#854d24;border-bottom:2px solid #f6e8d6;}ul,ol{padding-left:20px;}</style></head>
          <body>
            <h1>${editableRecipe.recipeName}</h1>
            ${mainImageHtml}
            <p><strong>Előkészítés:</strong> ${editableRecipe.prepTime} | <strong>Főzés:</strong> ${editableRecipe.cookTime} | <strong>Adag:</strong> ${editableRecipe.servings}</p>
            <h2>Hozzávalók</h2><ul>${editableRecipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}</ul>
            <h2>Elkészítés</h2><ol>${resolvedInstructions.map(inst => `<li>${inst.text}</li>`).join('')}</ol>
            <script>window.onload=function(){window.print();window.close();};</script>
          </body>
          </html>
        `;
        const printWindow = window.open('', '_blank');
        if (printWindow) { printWindow.document.write(printContent); printWindow.document.close(); }
    };

    const ActionButton: React.FC<{ onClick: () => void; disabled?: boolean; children: React.ReactNode; label: string; }> = ({ onClick, disabled, children, label }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-white shadow-sm border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
            aria-label={label}
        >
            {children}
        </button>
    );

  return (
    <>
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                {isEditing ? (
                    <input type="text" value={editableRecipe.recipeName} onChange={e => handleFieldChange('recipeName', e.target.value)} className="text-3xl font-bold text-primary-800 bg-yellow-50 border-2 border-primary-200 rounded-lg p-2 w-full"/>
                ) : (
                    <h2 className="text-3xl font-bold text-primary-800">{editableRecipe.recipeName}</h2>
                )}
                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                    {isEditing ? (
                        <>
                            <button onClick={handleSaveEdit} className="flex-1 sm:flex-none bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700">Mentés</button>
                            <button onClick={() => setIsEditing(false)} className="flex-1 sm:flex-none bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Mégse</button>
                        </>
                    ) : (
                        <>
                            <button onClick={handleShare} className="flex-1 sm:flex-none bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700 flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                                <span>Megosztás</span>
                            </button>
                            {isFromFavorites && <button onClick={() => setIsEditing(true)} className="flex-1 sm:flex-none bg-blue-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-600">Szerkesztés</button>}
                            <button onClick={onClose} className="flex-1 sm:flex-none bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">{isFromFavorites ? 'Vissza' : 'Új recept'}</button>
                        </>
                    )}
                </div>
            </div>
            
            {isEditing ? (
                <textarea value={editableRecipe.description} onChange={e => handleFieldChange('description', e.target.value)} rows={3} className="text-gray-600 text-lg w-full bg-yellow-50 border-2 border-primary-200 rounded-lg p-2" />
            ) : (
                <p className="text-gray-600 text-lg">{editableRecipe.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-4">
              {isFromFavorites && <StarRating rating={editableRecipe.rating} onRatingChange={isEditing ? undefined : handleRatingChange} readOnly={isEditing} />}
            </div>

            <div className="p-4 bg-gray-100 rounded-lg">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    <ActionButton onClick={() => setIsSaveModalOpen(true)} label="Recept mentése"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v10l-5-4-5 4V4z" /></svg><span className="text-xs font-semibold">Mentés</span></ActionButton>
                    {isFromFavorites && <ActionButton onClick={() => setIsFavoriteStatusModalOpen(true)} label="Kedvencnek jelölés"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg><span className="text-xs font-semibold">Kedvencek</span></ActionButton>}
                    <ActionButton onClick={handleSimplify} disabled={isSimplifying} label="Recept egyszerűsítése">{isSimplifying ? <svg className="animate-spin h-6 w-6 text-primary-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.523 7.023a1 1 0 01.633-1.265l4-1.25a1 1 0 11.382 1.956L6.5 7.983a1 1 0 01-1.618-.96zm10.354 1.956a1 1 0 01-1.618.96l-4-1.25a1 1 0 11.382-1.956l4 1.25a1 1 0 011.236 1z" clipRule="evenodd" /></svg>}<span className="text-xs font-semibold">Egyszerűsítés</span></ActionButton>
                    <ActionButton onClick={() => setIsTimerOpen(true)} label="Időzítő"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg><span className="text-xs font-semibold">Időzítő</span></ActionButton>
                    <ActionButton onClick={() => onGenerateVariations(recipe)} label="Variációk"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg><span className="text-xs font-semibold">Variációk</span></ActionButton>
                    <ActionButton onClick={handlePrint} label="Nyomtatás"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3h10V4H5zm-2 2a2 2 0 012-2h10a2 2 0 012 2v3h2a2 2 0 012 2v5a2 2 0 01-2 2H3a2 2 0 01-2-2v-5a2 2 0 012-2h2V6zm14 3H3v5h14V9zM7 13a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" /></svg><span className="text-xs font-semibold">Nyomtatás</span></ActionButton>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div>
                        {isGeneratingImage ? (
                            <div className="aspect-[4/3] rounded-lg bg-gray-100 flex flex-col items-center justify-center p-4 border animate-pulse-bg">
                                <svg className="animate-spin h-10 w-10 text-primary-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <p className="mt-4 text-lg font-semibold text-gray-700">Feldolgozás...</p>
                            </div>
                        ) : activeImageUrl ? (
                            <div className="relative group">
                                <button onClick={() => { setActiveImageTitle(editableRecipe.recipeName); setIsImageModalOpen(true); }} className="w-full aspect-[4/3] rounded-lg overflow-hidden shadow-lg border border-gray-200">
                                    <img src={activeImageUrl} alt={editableRecipe.recipeName} className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setImageLoaded(true)} />
                                </button>
                                <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleGenerateImage(true)} className="text-xs font-semibold py-1.5 px-3 bg-white/80 text-gray-800 rounded-full hover:bg-white shadow-md">Új AI kép</button>
                                    <button onClick={() => fileInputRef.current?.click()} className="text-xs font-semibold py-1.5 px-3 bg-white/80 text-gray-800 rounded-full hover:bg-white shadow-md">Feltöltés</button>
                                    <button onClick={handleRemoveImage} className="text-xs font-semibold py-1.5 px-3 bg-white/80 text-red-600 rounded-full hover:bg-white shadow-md">Törlés</button>
                                </div>
                            </div>
                        ) : (
                            <div className="aspect-[4/3] rounded-lg bg-gray-50 flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300">
                                <button onClick={() => handleGenerateImage()} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700">Kép generálása AI-val</button>
                                <button onClick={() => fileInputRef.current?.click()} className="mt-2 text-primary-600 font-semibold hover:underline">Saját kép feltöltése</button>
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    </div>
                    <RecipeDetails recipe={editableRecipe} mealTypes={mealTypes} cuisineOptions={cuisineOptions} cookingMethodsList={cookingMethodsList} />
                    
                    {/* Hozzávalók szekció visszaállítva */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Hozzávalók</h3>
                            {!isEditing && (
                                <button
                                    onClick={handleSelectAllIngredients}
                                    className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                                >
                                    {checkedIngredients.size === editableRecipe.ingredients.length ? 'Kijelölés törlése' : 'Összes kijelölése'}
                                </button>
                            )}
                        </div>
                        {isEditing ? (
                             <textarea 
                                value={editableRecipe.ingredients.join('\n')} 
                                onChange={e => setEditableRecipe(prev => ({...prev, ingredients: e.target.value.split('\n').filter(line => line.trim() !== '')}))} 
                                rows={10} 
                                className="w-full bg-yellow-50 border-2 border-primary-200 rounded-lg p-3 text-gray-700 font-medium" 
                            />
                        ) : (
                            <div className="bg-primary-50 dark:bg-gray-700/50 p-4 rounded-lg border border-primary-100 dark:border-gray-700">
                                <ul className="space-y-2">
                                    {editableRecipe.ingredients.map((ingredient, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                id={`ingredient-${index}`}
                                                checked={checkedIngredients.has(ingredient)}
                                                onChange={() => handleIngredientCheck(ingredient)}
                                                className="mt-1 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                            />
                                            <label htmlFor={`ingredient-${index}`} className={`flex-grow cursor-pointer text-gray-700 dark:text-gray-300 ${checkedIngredients.has(ingredient) ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                                                {ingredient}
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={handleAddSelectedToShoppingList}
                                    disabled={checkedIngredients.size === 0}
                                    className="mt-4 w-full bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed dark:disabled:bg-gray-600"
                                >
                                    {checkedIngredients.size > 0 ? `${checkedIngredients.size} elem hozzáadása a listához` : 'Válasszon hozzávalókat'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-gray-800">Elkészítés</h3>
                        <button onClick={() => setIsCookingModeActive(true)} className="flex items-center gap-2 bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-primary-700 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6c0 1.888.768 3.63 2 4.898V18a2 2 0 002 2h4a2 2 0 002-2v-5.102c1.232-1.268 2-3.01 2-4.898a6 6 0 00-6-6z" /></svg>
                            <span>Főzés Mód</span>
                        </button>
                    </div>
                    {isEditing ? (
                        <textarea value={editableRecipe.instructions.map(s => s.text).join('\n\n')} onChange={e => setEditableRecipe(prev => ({...prev, instructions: e.target.value.split('\n\n').map(text => ({ text }))}))} rows={15} className="text-gray-700 w-full bg-yellow-50 border-2 border-primary-200 rounded-lg p-3" />
                    ) : (
                        <InstructionCarousel instructions={resolvedInstructions} currentStep={instructionStep} onStepChange={setInstructionStep} voiceModeActive={false} onImageClick={(url, title) => { setActiveImageUrl(url); setActiveImageTitle(title); setIsImageModalOpen(true); }} />
                    )}
                </div>
            </div>
            
            {isSaveModalOpen && <SaveRecipeModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={(cat) => onSave(editableRecipe, cat)} existingCategories={Object.keys(favorites)} suggestedCategory={mealTypes.find(m => m.value === editableRecipe.mealType)?.label || editableRecipe.mealType} />}
            {isTimerOpen && <KitchenTimer onClose={() => setIsTimerOpen(false)} initialValues={timerInitialValues} />}
            {isFavoriteStatusModalOpen && <FavoriteStatusModal isOpen={isFavoriteStatusModalOpen} onClose={() => setIsFavoriteStatusModalOpen(false)} onSave={(ids) => {
                if (category) { onUpdateFavoriteStatus(editableRecipe.recipeName, category, ids); setIsFavoriteStatusModalOpen(false); }
                else showNotification("Hiba a mentéskor.", "info");
            }} users={users} initialFavoritedByIds={editableRecipe.favoritedBy || []} recipeName={editableRecipe.recipeName} />}
            {isImageModalOpen && <ImageDisplayModal imageUrl={activeImageUrl} recipeName={activeImageTitle} onClose={() => setIsImageModalOpen(false)} />}
            {isCookingModeActive && (
              <CookingModeView isOpen={isCookingModeActive} onClose={() => setIsCookingModeActive(false)} instructions={resolvedInstructions} currentStep={instructionStep} onStepChange={setInstructionStep} recipeName={editableRecipe.recipeName} forceSpeakTrigger={forceSpeakTrigger} />
            )}
            {isShareModalOpen && (
                <ShareFallbackModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    textToCopy={`${editableRecipe.recipeName}\n\n${editableRecipe.description}\n\nHozzávalók:\n${editableRecipe.ingredients.join('\n')}`}
                />
            )}
        </div>
    </>
  );
};

export default RecipeDisplay;

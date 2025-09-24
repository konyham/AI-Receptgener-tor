import React, { useState, useEffect, useRef, useCallback } from 'react';
// FIX: The `GenerateVideosMetadata` type is not exported from `@google/genai`. It has been removed.
import type { Operation, GenerateVideosResponse } from '@google/genai';
import { Recipe, VoiceCommand, Favorites, CookingMethod } from './types';
import { interpretUserCommand, generateRecipeVideo, getVideosOperationStatus, generateRecipeImage, calculateRecipeCost } from './services/geminiService';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useNotification } from './contexts/NotificationContext';
import KitchenTimer from './components/KitchenTimer';
import SaveToFavoritesModal from './components/SaveToFavoritesModal';
import VideoGenerationModal from './components/VideoGenerationModal';
import VideoPlayerModal from './components/VideoPlayerModal';
import ImageDisplayModal from './components/ImageDisplayModal';
import ErrorMessage from './components/ErrorMessage';
import InstructionCarousel from './components/InstructionCarousel';


// FIX: Added missing props to the interface to match the usage in App.tsx.
interface RecipeDisplayProps {
  recipe: Recipe;
  onClose: () => void;
  onRefine: () => void;
  isFromFavorites: boolean;
  favorites: Favorites;
  onSave: (recipe: Recipe, category: string) => void;
  onAddItemsToShoppingList: (items: string[]) => void;
  isLoading: boolean;
  onRecipeUpdate: (updatedRecipe: Recipe) => void;
  shouldGenerateImageInitially: boolean;
}

type VoiceMode = 'idle' | 'intro' | 'ingredients' | 'cooking';

const NutritionalInfo: React.FC<{ recipe: Recipe }> = ({ recipe }) => {
    const info = [
        { label: 'Kalória', value: recipe.calories, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM10 18a1 1 0 01.707.293l2.5 2.5a1 1 0 11-1.414 1.414l-2.5-2.5A1 1 0 0110 18zM10 4a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /><path d="M10 18a7.953 7.953 0 01-4.16-1.115l-1.558 1.558a1 1 0 11-1.414-1.414l1.558-1.558A8 8 0 1110 18zm0-2a6 6 0 100-12 6 6 0 000 12z" /></svg> },
        { label: 'Szénhidrát', value: recipe.carbohydrates, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 20 20" fill="currentColor"><path d="M17 5a2 2 0 10-4 0v.586a1 1 0 01-.293.707l-3.414 3.414a1 1 0 01-1.414 0l-1.414-1.414A1 1 0 017 8.586V7a2 2 0 10-4 0v1.586a1 1 0 01-.293.707l-3.414 3.414a1 1 0 01-1.414 0l-1.414-1.414a1 1 0 010-1.414l3.414-3.414A1 1 0 015 6.586V5a2 2 0 104 0v.586a1 1 0 01.293.707l1.414 1.414a1 1 0 010 1.414l-1.414 1.414A1 1 0 019 10.414V12a2 2 0 104 0v-1.586a1 1 0 01.293-.707l3.414-3.414a1 1 0 011.414 0l1.414 1.414a1 1 0 010 1.414l-3.414 3.414A1 1 0 0115 13.414V15a2 2 0 104 0v-1.586a1 1 0 01-.293-.707l-3.414-3.414a1 1 0 010-1.414l1.414-1.414A1 1 0 0117 7.414V5z" /></svg> },
        { label: 'Fehérje', value: recipe.protein, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v1.999l4.873.001a1 1 0 01.999 1V16a1 1 0 01-1 1h-4.872l-.001 2.001a1 1 0 01-1.664.748l-6-6A1 1 0 012 12V5a1 1 0 011-1h4.872L7.873 2a1 1 0 01.748-1.664l2.678-.001zM11 4.414V8a1 1 0 001 1h2.586L12 6.414 11 5.414zM9 14.586V11a1 1 0 00-1-1H5.414L8 12.586 9 13.586z" clipRule="evenodd" /></svg> },
        { label: 'Zsír', value: recipe.fat, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 8a1 1 0 012 0v1.586l1.293-1.293a1 1 0 111.414 1.414L9.414 12l2.293 2.293a1 1 0 01-1.414 1.414L8 13.414V15a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg> },
        { label: 'Glikémiás Index', value: recipe.glycemicIndex, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm8-7a7 7 0 100 14 7 7 0 000-14zm-1 3a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm-1 4a1 1 0 112 0v4a1 1 0 11-2 0V9z" /></svg> },
    ].filter(i => i.value);

    if (info.length === 0) return null;

    return (
        <>
            <div className="my-6 border-t border-gray-200"></div>
            <div className="px-6 md:px-8">
                <h3 className="text-2xl font-semibold text-primary-700 mb-4 text-center">Tápérték adatok <span className="text-base font-normal text-gray-500">(becsült / 100g)</span></h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
                    {info.map(({ label, value, icon }) => (
                        <div key={label} className="bg-primary-50 p-4 rounded-xl border border-primary-100 flex flex-col items-center justify-center">
                            <div className="h-8 w-8 text-primary-600 mb-2">{icon}</div>
                            <span className="text-lg font-bold text-primary-900">{value}</span>
                            <span className="text-sm text-primary-700">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

const DiabeticAdvice: React.FC<{ advice: string | undefined }> = ({ advice }) => {
    if (!advice) return null;
    return (
        <div className="px-6 md:px-8 mt-6">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <h4 className="text-md font-bold text-blue-800">Tipp cukorbetegeknek</h4>
                        <p className="text-sm text-blue-700 mt-1">{advice}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const addWatermark = (base64Image: string, recipeName: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = Math.max(1, img.width / 800); // Scale font size for larger images
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Nem sikerült a vászon kontextusát lekérni.'));
            }

            // 1. Eredeti kép rajzolása
            ctx.drawImage(img, 0, 0);

            // 2. Vízjel szövegének és stílusának előkészítése
            const appName = "Konyha Miki AI";
            const recipeTitle = recipeName;
            const padding = 20 * scale;

            // 3. Recept nevének stílusa és mérése
            ctx.font = `bold ${28 * scale}px "Helvetica Neue", Arial, sans-serif`;
            const recipeMetrics = ctx.measureText(recipeTitle);
            const recipeX = canvas.width - recipeMetrics.width - padding;
            const recipeY = canvas.height - padding;

            // 4. Alkalmazás nevének stílusa és mérése
            ctx.font = `italic ${18 * scale}px "Helvetica Neue", Arial, sans-serif`;
            const appMetrics = ctx.measureText(appName);
            const appX = canvas.width - appMetrics.width - padding;
            const appY = recipeY - (32 * scale);

            // 5. Félig áttetsző háttér rajzolása mindkét sorhoz
            const bgX = Math.min(recipeX, appX) - (10 * scale);
            const bgY = appY - (22 * scale);
            const bgWidth = Math.max(recipeMetrics.width, appMetrics.width) + (20 * scale);
            const bgHeight = (60 * scale);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

            // 6. Szöveg rajzolása a háttérre
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.textBaseline = 'bottom';
            
            ctx.font = `italic ${18 * scale}px "Helvetica Neue", Arial, sans-serif`;
            ctx.fillText(appName, appX, appY);

            ctx.font = `bold ${28 * scale}px "Helvetica Neue", Arial, sans-serif`;
            ctx.fillText(recipeTitle, recipeX, recipeY);

            // 7. Visszatérés az új képpel
            resolve(canvas.toDataURL('image/jpeg', 0.9)); // JPEG használata minőséggel a kisebb méretért
        };
        img.onerror = (err) => {
            console.error("A kép betöltése a vízjelezéshez sikertelen:", err);
            reject(new Error('A kép betöltése a vízjelezéshez sikertelen.'));
        };
        // A bejövő base64 a nyers bájt, szüksége van a data URL prefixre
        img.src = `data:image/jpeg;base64,${base64Image}`;
    });
};


const RecipeDisplay: React.FC<RecipeDisplayProps> = ({ recipe, onClose, onRefine, isFromFavorites, favorites, onSave, onAddItemsToShoppingList, isLoading, onRecipeUpdate, shouldGenerateImageInitially }) => {
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('idle');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [voiceControlActive, setVoiceControlActive] = useState(true);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerInitialValues, setTimerInitialValues] = useState<{ hours?: number; minutes?: number; seconds?: number } | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoGenerationProgress, setVideoGenerationProgress] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoGenerationError, setVideoGenerationError] = useState<string | null>(null);

  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [isCostLoading, setIsCostLoading] = useState<boolean>(false);
  const [costError, setCostError] = useState<string | null>(null);


  const debounceTimerRef = useRef<number | null>(null);
  const isInterpretingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const { showNotification } = useNotification();

  const handleGenerateImage = useCallback(async () => {
    if (isImageLoading) return;
    setIsImageLoading(true);
    setImageError(null);
    try {
        const base64Image = await generateRecipeImage(recipe);
        const watermarkedImage = await addWatermark(base64Image, recipe.recipeName);
        onRecipeUpdate({ ...recipe, imageUrl: watermarkedImage });
    } catch (err: any) {
        const errorMsg = err.message || 'Ismeretlen hiba történt az ételfotó generálása közben.';
        setImageError(errorMsg);
        showNotification('Az ételfotó generálása nem sikerült.', 'info');
    } finally {
        setIsImageLoading(false);
    }
  }, [recipe, onRecipeUpdate, isImageLoading, showNotification]);

  useEffect(() => {
    if (shouldGenerateImageInitially && !recipe.imageUrl) {
        handleGenerateImage();
    }
  }, [shouldGenerateImageInitially, recipe.imageUrl, handleGenerateImage]);

  useEffect(() => {
    return () => {
        if (generatedVideoUrl) {
            URL.revokeObjectURL(generatedVideoUrl);
        }
    };
  }, [generatedVideoUrl]);

  const handleSpeechError = useCallback((error: string) => {
    if (error === 'not-allowed') {
        showNotification('A hangvezérléshez engedélyezze a mikrofon használatát a böngészőben.', 'info');
    }
  }, [showNotification]);

  const handleVoiceResult = useCallback((transcript: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsInterpreting(true);

    debounceTimerRef.current = window.setTimeout(async () => {
      if (isInterpretingRef.current) return;

      isInterpretingRef.current = true;
      try {
        const { command, payload } = await interpretUserCommand(transcript);
        let notificationMessage = '';

        switch (command) {
          case VoiceCommand.STOP:
            notificationMessage = 'Parancs: Felolvasás leállítva';
            setVoiceMode('idle');
            break;
          case VoiceCommand.NEXT:
            notificationMessage = 'Parancs: Következő';
            if (voiceMode === 'ingredients' || voiceMode === 'cooking') {
              setCurrentStepIndex((prev) => prev + 1);
            }
            break;
          case VoiceCommand.READ_INTRO:
            notificationMessage = 'Parancs: Leírás felolvasása';
            setVoiceMode('intro');
            break;
          case VoiceCommand.READ_INGREDIENTS:
            notificationMessage = 'Parancs: Hozzávalók felolvasása';
            setCurrentStepIndex(0);
            setVoiceMode('ingredients');
            break;
          case VoiceCommand.START_COOKING:
            notificationMessage = 'Parancs: Főzés indítása';
            setCurrentStepIndex(0);
            setVoiceMode('cooking');
            break;
          case VoiceCommand.START_TIMER:
            if (payload) {
              const { hours = 0, minutes = 0, seconds = 0 } = payload;
              const timeParts = [];
              if (hours > 0) timeParts.push(`${hours} óra`);
              if (minutes > 0) timeParts.push(`${minutes} perc`);
              if (seconds > 0) timeParts.push(`${seconds} másodperc`);
              notificationMessage = `Időzítő indítása: ${timeParts.join(' ')}`;
              setTimerInitialValues(payload);
              setIsTimerOpen(true);
            }
            break;
          default:
            break;
        }

        if (notificationMessage) {
          showNotification(notificationMessage, 'info');
        }

      } catch (error: any) {
        console.error("Error processing voice command:", error);
        let errorMessage = "Hiba a hangparancs feldolgozása közben.";
        // Check for specific API rate limit error
        if (typeof error.message === 'string' && error.message.includes('RESOURCE_EXHAUSTED')) {
          errorMessage = "Túl sok kérés. A hangvezérlés szünetel.";
          setVoiceControlActive(false); // Automatically pause voice control
        }
        showNotification(errorMessage, 'info');
      } finally {
        isInterpretingRef.current = false;
        setIsInterpreting(false);
      }
    }, 2000); // 2-second delay
  }, [voiceMode, showNotification]);

  const { 
    isSupported: recognitionIsSupported, 
    startListening, 
    stopListening,
    permissionState,
  } = useSpeechRecognition({
    onResult: handleVoiceResult,
    continuous: false,
    onError: handleSpeechError,
  });

  const synthesisIsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const isSupported = recognitionIsSupported && synthesisIsSupported;

  useEffect(() => {
    if (!isSupported || !voiceControlActive || permissionState === 'denied') {
      window.speechSynthesis.cancel();
      stopListening();
      return;
    }

    const speak = (text: string, onEndCallback?: () => void) => {
      stopListening();
      window.speechSynthesis.cancel();
      isSpeakingRef.current = true;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hu-HU';
      utterance.onend = () => {
        isSpeakingRef.current = false;
        if (onEndCallback) {
            onEndCallback();
        }
      };
      window.speechSynthesis.speak(utterance);
    };

    switch (voiceMode) {
      case 'intro':
        speak(`${recipe.recipeName}. ${recipe.description}`, () => setVoiceMode('idle'));
        break;
      
      case 'ingredients':
        if (currentStepIndex >= recipe.ingredients.length) {
          speak('Végeztél a hozzávalókkal. Mondd, hogy "főzés indítása" a folytatáshoz.', () => setVoiceMode('idle'));
        } else {
          speak(`${currentStepIndex + 1}. hozzávaló: ${recipe.ingredients[currentStepIndex]}`, startListening);
        }
        break;

      case 'cooking':
        if (currentStepIndex >= recipe.instructions.length) {
          speak('Elkészültél a főzéssel. Jó étvágyat!', () => setVoiceMode('idle'));
        } else {
          speak(`${currentStepIndex + 1}. lépés: ${recipe.instructions[currentStepIndex]}`, startListening);
        }
        break;
    
      case 'idle':
        window.speechSynthesis.cancel();
        if (!isSpeakingRef.current && !isInterpretingRef.current) {
            startListening();
        }
        break;
    }

    return () => {
      window.speechSynthesis.cancel();
      stopListening();
    };
  }, [voiceMode, currentStepIndex, recipe, isSupported, voiceControlActive, permissionState, startListening, stopListening]);


  const handleToggleVoiceControl = () => {
      setVoiceControlActive(prev => {
          if (prev) {
            setVoiceMode('idle');
          }
          return !prev;
      });
  };

  const handleReadIntro = () => {
    if (!voiceControlActive) setVoiceControlActive(true);
    setVoiceMode('intro');
  };
  const handleReadIngredients = () => {
    if (!voiceControlActive) setVoiceControlActive(true);
    setCurrentStepIndex(0);
    setVoiceMode('ingredients');
  };
  const handleStartCooking = () => {
    if (!voiceControlActive) setVoiceControlActive(true);
    setCurrentStepIndex(0);
    setVoiceMode('cooking');
  };
  
  const handlePrint = () => {
    // Sanitize the recipe name to create a filesystem-friendly filename.
    const safeFilename = recipe.recipeName.replace(/[^a-z0-9\u00C0-\u017F_-\s]/gi, '').trim() || 'recept';
    
    const imageHtml = recipe.imageUrl
      ? `<div style="text-align: center; margin: 1.5rem 0; break-inside: avoid;"><img src="${recipe.imageUrl}" alt="Fotó a receptről: ${recipe.recipeName}" style="max-width: 100%; max-height: 400px; border-radius: 8px; object-fit: cover; display: inline-block;"></div>`
      : '';

    const printHtml = `
      <html>
        <head>
          <title>${safeFilename}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              line-height: 1.6; 
              color: #374151;
              margin: 2rem;
            }
            @media print {
              body {
                margin: 0;
              }
            }
            h1, h2, h3 {
              color: #14532d; /* primary-900 */
              border-bottom: 2px solid #dcfce7; /* primary-100 */
              padding-bottom: 8px;
              break-after: avoid;
            }
            h1 { font-size: 2.25rem; }
            h2 { font-size: 1.5rem; margin-top: 1.5rem; }
            h3 { font-size: 1.25rem; margin-top: 1.25rem; border-bottom-style: dashed; }
            p { margin-bottom: 1rem; }
            em { color: #374151; }
            ul, ol { padding-left: 1.5rem; }
            li { margin-bottom: 0.5rem; break-inside: avoid; }
            .meta-info { 
              display: flex; 
              gap: 1.5rem; 
              background-color: #f0fdf4; /* primary-50 */
              padding: 1rem; 
              border-radius: 0.5rem; 
              margin: 1.5rem 0;
              border: 1px solid #dcfce7; /* primary-100 */
              break-inside: avoid;
              flex-wrap: wrap;
            }
            .meta-info div { flex: 1; min-width: 120px; }
            .meta-info span { font-weight: 600; display: block; font-size: 0.875rem; color: #166534; /* primary-800 */ }
            .nutritional-info { margin: 1.5rem 0; break-inside: avoid; }
            .nutritional-info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 1rem; }
            .nutritional-info-item { text-align: center; padding: 0.5rem; background-color: #f0fdf4; border-radius: 0.5rem; }
            .diabetic-advice { margin: 1.5rem 0; padding: 1rem; background-color: #eff6ff; border-left: 4px solid #60a5fa; break-inside: avoid; }
            .diabetic-advice h4 { font-weight: bold; color: #1e3a8a; margin-top: 0; }
          </style>
        </head>
        <body>
          <h1>${recipe.recipeName}</h1>
          <p><em>${recipe.description}</em></p>
          ${imageHtml}
          <div class="meta-info">
            <div><span>Előkészítés:</span> ${recipe.prepTime}</div>
            <div><span>Főzési idő:</span> ${recipe.cookTime}</div>
            <div><span>Adag:</span> ${recipe.servings}</div>
            ${recipe.estimatedCost ? `<div><span>Becsült költség:</span> ${recipe.estimatedCost}</div>` : ''}
          </div>
          ${(recipe.calories || recipe.carbohydrates) ? `
          <div class="nutritional-info">
            <h3>Tápérték adatok (becsült / 100g)</h3>
            <div class="nutritional-info-grid">
              ${recipe.calories ? `<div class="nutritional-info-item"><span>Kalória</span><br>${recipe.calories}</div>` : ''}
              ${recipe.carbohydrates ? `<div class="nutritional-info-item"><span>Szénhidrát</span><br>${recipe.carbohydrates}</div>` : ''}
              ${recipe.protein ? `<div class="nutritional-info-item"><span>Fehérje</span><br>${recipe.protein}</div>` : ''}
              ${recipe.fat ? `<div class="nutritional-info-item"><span>Zsír</span><br>${recipe.fat}</div>` : ''}
              ${recipe.glycemicIndex ? `<div class="nutritional-info-item"><span>Glikémiás Index</span><br>${recipe.glycemicIndex}</div>` : ''}
            </div>
          </div>` : ''}
          ${recipe.diabeticAdvice ? `
            <div class="diabetic-advice">
              <h4>Tipp cukorbetegeknek</h4>
              <p>${recipe.diabeticAdvice}</p>
            </div>
          ` : ''}
          <h2>Hozzávalók</h2>
          <ul>
            ${recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}
          </ul>
          <h2>Elkészítés</h2>
          <ol>
            ${recipe.instructions.map(inst => `<li>${inst}</li>`).join('')}
          </ol>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('A nyomtatási ablak megnyitását a böngészője letiltotta. Kérjük, engedélyezze a felugró ablakokat ehhez az oldalhoz a nyomtatáshoz.');
      return;
    }

    printWindow.document.write(printHtml);
    printWindow.document.close();

    // The title tag in the HTML should be sufficient, but setting it explicitly is a good fallback.
    printWindow.document.title = safeFilename;

    setTimeout(() => {
        try {
            printWindow.focus();
            printWindow.print();
        } catch (e) {
            console.error('Print failed:', e);
            alert('A nyomtatás nem sikerült. Lehet, hogy manuálisan kell elindítania a nyomtatást az új ablakban (Ctrl+P vagy Cmd+P).');
        }
    }, 500);
  };

  const handleSave = (category: string) => {
    // To ensure favorites can always be saved without hitting browser storage limits,
    // we save the recipe data *without* the generated image's large data URL.
    // The image will be automatically re-generated whenever the favorite is viewed.
    const { imageUrl, ...recipeToSave } = recipe;
    onSave(recipeToSave as Recipe, category);
    setIsSaveModalOpen(false);
  };

  const handleGenerateVideo = async () => {
    setIsGeneratingVideo(true);
    setVideoGenerationError(null);
    setGeneratedVideoUrl(null);

    const progressMessages = [
        "A séf felveszi a kötényt...",
        "Hozzávalók előkészítése a forgatáshoz...",
        "Kamera indul, felvétel!",
        "A legfontosabb lépések rögzítése...",
        "Vágás és utómunka...",
        "Zene és effektek hozzáadása...",
        "A videó renderelése, mindjárt kész!",
    ];
    let messageIndex = 0;
    setVideoGenerationProgress(progressMessages[messageIndex]);

    const messageInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % progressMessages.length;
        setVideoGenerationProgress(progressMessages[messageIndex]);
    }, 8000);

    try {
        // FIX: The `Operation` generic type takes only one argument.
        let operation: Operation<GenerateVideosResponse> = await generateRecipeVideo(recipe);

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
            operation = await getVideosOperationStatus(operation);
        }

        clearInterval(messageInterval);

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
            // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!response.ok) {
                throw new Error('Nem sikerült letölteni a generált videót.');
            }
            const videoBlob = await response.blob();
            const videoUrl = URL.createObjectURL(videoBlob);
            setGeneratedVideoUrl(videoUrl);
        } else {
            throw new Error('Nem található videó a generálási válaszban.');
        }

    } catch (err: any) {
        setVideoGenerationError(err.message || 'Ismeretlen hiba történt a videó generálása közben.');
    } finally {
        setIsGeneratingVideo(false);
        clearInterval(messageInterval);
    }
  };

  const handleCalculateCost = async () => {
    if (isCostLoading) return;
    setIsCostLoading(true);
    setCostError(null);
    try {
        const cost = await calculateRecipeCost(recipe);
        onRecipeUpdate({ ...recipe, estimatedCost: cost });
        showNotification('Költségbecslés elkészült!', 'success');
    } catch (err: any) {
        const errorMsg = err.message || 'Nem sikerült a költségbecslés.';
        setCostError(errorMsg);
        showNotification(errorMsg, 'info');
    } finally {
        setIsCostLoading(false);
    }
  };

  const handleShare = async () => {
    const fullRecipeText = `
*${recipe.recipeName}*

${recipe.description}

*Hozzávalók:*
${recipe.ingredients.map(ing => `- ${ing}`).join('\n')}

*Elkészítés:*
${recipe.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}

Recept generálva Konyha Miki segítségével!
    `.trim();

    // Fallback 1: Web Share API (modern, főleg mobil)
    if (navigator.share) {
        try {
            await navigator.share({
                title: recipe.recipeName,
                text: fullRecipeText,
                url: window.location.href,
            });
            showNotification('Recept megosztva!', 'success');
            return;
        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
                 console.warn('Web Share API failed, falling back to clipboard.', error);
            }
        }
    }

    // Fallback 2: Modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(fullRecipeText);
            showNotification('Recept a vágólapra másolva!', 'success');
            return;
        } catch (error) {
            console.warn('Clipboard API failed, falling back to execCommand.', error);
        }
    }

    // Fallback 3: Régi (de megbízható) execCommand
    const textArea = document.createElement("textarea");
    textArea.value = fullRecipeText;
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showNotification('Recept a vágólapra másolva!', 'success');
        } else {
            throw new Error('document.execCommand("copy") returned false.');
        }
    } catch (err) {
        console.error('All sharing and copying methods failed.', err);
        showNotification('A megosztás és a vágólapra másolás sem sikerült.', 'info');
    } finally {
        document.body.removeChild(textArea);
    }
  };

  const isActivelySpeaking = voiceMode !== 'idle' || isSpeakingRef.current;

  return (
    <>
      <div id="recipe-to-print" className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden animate-fade-in">
        <div className="p-6 md:p-8">
          <h2 className="text-3xl font-bold text-primary-800 mb-2">{recipe.recipeName}</h2>
          <p className="text-gray-600 italic mb-6">{recipe.description}</p>
          
          <div className="my-6">
            {isImageLoading && (
              <div className="aspect-[4/3] w-full bg-gray-200 rounded-lg animate-pulse"></div>
            )}
            {imageError && !isImageLoading && <ErrorMessage message={imageError} />}
            {recipe.imageUrl && !isImageLoading && (
              <button 
                onClick={() => setIsImageModalOpen(true)} 
                className="w-full block rounded-lg overflow-hidden shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-300"
                aria-label="Ételfotó megtekintése nagyban"
              >
                <img src={recipe.imageUrl} alt={`Fotó a receptről: ${recipe.recipeName}`} className="w-full h-full object-cover" />
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-4 md:gap-8 mb-6 text-gray-700">
              <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <div>
                      <span className="font-semibold block text-sm">Előkészítés</span>
                      <span>{recipe.prepTime}</span>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7.014A8.003 8.003 0 0122 12c0 3-1 6-6 6-1.088 0-2.133-.11-3.14-.323z" /></svg>
                  <div>
                      <span className="font-semibold block text-sm">Főzési idő</span>
                      <span>{recipe.cookTime}</span>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <div>
                      <span className="font-semibold block text-sm">Adag</span>
                      <span>{recipe.servings}</span>
                  </div>
              </div>
              {recipe.estimatedCost && (
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8.433 7.418c.158-.103.346-.196.567-.267v1.698a2.5 2.5 0 00-1.162-.328zM11.567 9.182c.158.103.346.196.567-.267V7.849a2.5 2.5 0 00-1.162.328v1.005z" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.5 4.5 0 00-1.879 3.197A1 1 0 108.25 10.5h.025a2.5 2.5 0 014.975 0h.025a1 1 0 101.879-1.217A4.5 4.5 0 0011 5.092V5zM10 13a1 1 0 011 1v.01a1 1 0 11-2 0V14a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <span className="font-semibold block text-sm">Becsült költség</span>
                        <span>{recipe.estimatedCost}</span>
                    </div>
                </div>
              )}
          </div>
        </div>

        <NutritionalInfo recipe={recipe} />
        <DiabeticAdvice advice={recipe.diabeticAdvice} />

        <div className="p-6 md:p-8">
            {videoGenerationError && <div className="mb-4"><ErrorMessage message={videoGenerationError} /></div>}
            <div className="my-6 p-3 bg-gray-50 border rounded-lg flex flex-wrap justify-center items-center gap-3 no-print">
                <button onClick={() => setIsSaveModalOpen(true)} className="flex items-center gap-2 text-sm font-semibold py-2 px-4 bg-primary-100 text-primary-800 rounded-lg hover:bg-primary-200 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                    Mentés a kedvencekbe
                </button>
                <button onClick={handleShare} className="flex items-center gap-2 text-sm font-semibold py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                    Recept megosztása
                </button>
                {!recipe.estimatedCost && (
                    <button onClick={handleCalculateCost} disabled={isCostLoading} className="flex items-center gap-2 text-sm font-semibold py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:bg-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isCostLoading ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.158-.103.346-.196.567-.267v1.698a2.5 2.5 0 00-1.162-.328zM11.567 9.182c.158.103.346.196.567-.267V7.849a2.5 2.5 0 00-1.162.328v1.005z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.5 4.5 0 00-1.879 3.197A1 1 0 108.25 10.5h.025a2.5 2.5 0 014.975 0h.025a1 1 0 101.879-1.217A4.5 4.5 0 0011 5.092V5zM10 13a1 1 0 011 1v.01a1 1 0 11-2 0V14a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        {isCostLoading ? 'Számítás...' : 'Költségbecslés'}
                    </button>
                )}
                {!recipe.imageUrl && (
                    <button onClick={handleGenerateImage} disabled={isImageLoading} className="flex items-center gap-2 text-sm font-semibold py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:bg-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isImageLoading ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                        {isImageLoading ? 'Generálás...' : 'Ételkép generálása'}
                    </button>
                )}
                 <button onClick={handleGenerateVideo} disabled={isGeneratingVideo} className="flex items-center gap-2 text-sm font-semibold py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:bg-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                    {isGeneratingVideo ? 'Videó készül...' : 'Videó generálása'}
                </button>
                <button onClick={() => setIsTimerOpen(true)} className="flex items-center gap-2 text-sm font-semibold py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                    Konyhai időzítő
                </button>
                 <button onClick={handlePrint} className="flex items-center gap-2 text-sm font-semibold py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v-2a1 1 0 011-1h8a1 1 0 011 1v2h1a2 2 0 002-2v-3a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm-8 8H5a1 1 0 01-1-1v-1a1 1 0 011-1h.01L5 9h10l.01.01H15a1 1 0 011 1v1a1 1 0 01-1 1h-2v2a1 1 0 01-1-1H8a1 1 0 01-1-1v-2H5z" clipRule="evenodd" /></svg>
                    Recept nyomtatása
                </button>
            </div>
            {costError && <div className="mb-4"><ErrorMessage message={costError} /></div>}
            {isSupported ? (
                <div className="my-6 p-4 bg-primary-50 border border-primary-200 rounded-lg space-y-4 no-print">
                    <div className="flex items-center justify-center gap-2 text-primary-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${permissionState === 'denied' ? 'text-red-500' : (voiceControlActive && isActivelySpeaking ? 'text-red-500 animate-pulse' : 'text-primary-700')}`} viewBox="0 0 20 20" fill="currentColor">
                           {permissionState === 'denied' ? (
                                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.523L13.477 14.89zm-2.02-2.02l-7.07-7.07A6.024 6.024 0 004 10v.789l.375.375 2.121 2.121L8.28 15h.789a6.002 6.002 0 006.33-4.885l-1.99 1.99zM10 18a8 8 0 100-16 8 8 0 000 16z" clipRule="evenodd" />
                            ) : (
                                <>
                                    <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                                    <path fillRule="evenodd" d="M7 2a4 4 0 00-4 4v6a4 4 0 108 0V6a4 4 0 00-4-4zM5 6a2 2 0 012-2h2a2 2 0 110 4H7a2 2 0 01-2-2zm10 4a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM4 11a1 1 0 100 2h12a1 1 0 100-2H4z" clipRule="evenodd" />
                                </>
                            )}
                        </svg>
                        <h3 className="text-lg font-semibold">Hangvezérlés</h3>
                    </div>
                     <p className="text-center text-sm text-primary-700">
                       {permissionState === 'denied'
                          ? <span className="text-red-600 font-semibold">A mikrofon használata le van tiltva. Engedélyezze a böngésző beállításaiban.</span>
                          : voiceControlActive
                          ? isInterpreting
                            ? 'Parancs értelmezése...'
                            : isActivelySpeaking
                            ? 'Recept felolvasása...'
                            : 'Hallgatom a parancsot... (pl. "következő", "időzítő 5 percre")'
                          : 'A hangvezérlés szünetel.'}
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <button onClick={handleToggleVoiceControl} className={`font-semibold py-2 px-4 rounded-lg transition-colors text-sm ${voiceControlActive ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-primary-200 text-primary-800 hover:bg-primary-300'}`}>
                            {voiceControlActive ? 'Leállítás' : 'Aktiválás'}
                        </button>
                        <button onClick={handleReadIntro} disabled={isActivelySpeaking || permissionState === 'denied'} className="font-semibold py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm">Leírás</button>
                        <button onClick={handleReadIngredients} disabled={isActivelySpeaking || permissionState === 'denied'} className="font-semibold py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm">Hozzávalók</button>
                        <button onClick={handleStartCooking} disabled={isActivelySpeaking || permissionState === 'denied'} className="font-semibold py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm">Főzés</button>
                    </div>
                </div>
            ) : null }

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b-2 border-primary-200 pb-2">
                    <h3 className="text-2xl font-semibold text-primary-700">Hozzávalók</h3>
                    <button
                        onClick={() => onAddItemsToShoppingList(recipe.ingredients)}
                        className="flex items-center gap-1.5 text-sm bg-primary-100 text-primary-800 font-semibold px-3 py-1 rounded-full hover:bg-primary-200 transition-colors"
                        aria-label="Összes hozzávaló a bevásárlólistára"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H4.72l-.21-1.257A1 1 0 003 1z" /><path d="M16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>
                        Listára
                    </button>
                </div>
                <ul className="space-y-2 list-disc list-inside text-gray-700">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className={`py-1 px-2 rounded ${voiceMode === 'ingredients' && index === currentStepIndex ? 'bg-primary-100 font-semibold' : ''}`}>{ingredient}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold text-primary-700 border-b-2 border-primary-200 pb-2">Elkészítés</h3>
                <InstructionCarousel
                  instructions={recipe.instructions}
                  currentStep={currentStepIndex}
                  onStepChange={setCurrentStepIndex}
                  voiceModeActive={voiceMode === 'cooking'}
                />
              </div>
            </div>
          </div>
      </div>
       <div className="mt-6 no-print flex flex-col sm:flex-row gap-3">
         {!isFromFavorites && (
            <button
                onClick={onRefine}
                disabled={isLoading}
                className="flex-1 bg-white border border-primary-600 text-primary-600 font-bold py-3 px-4 rounded-lg shadow-sm hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 flex justify-center items-center disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-wait"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Javaslatok betöltése...
                    </>
                ) : (
                    'Finomítás és javaslatok'
                )}
            </button>
         )}
        <button
            onClick={onClose}
            className="flex-1 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
        >
            {isFromFavorites ? 'Vissza a kedvencekhez' : 'Új recept készítése'}
        </button>
      </div>

      {isTimerOpen && <KitchenTimer 
        onClose={() => {
            setIsTimerOpen(false);
            setTimerInitialValues(null);
        }} 
        initialValues={timerInitialValues} 
      />}
      <SaveToFavoritesModal 
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSave}
        existingCategories={Object.keys(favorites)}
      />
      {isGeneratingVideo && <VideoGenerationModal progressMessage={videoGenerationProgress} />}
      {generatedVideoUrl && <VideoPlayerModal videoUrl={generatedVideoUrl} recipeName={recipe.recipeName} onClose={() => setGeneratedVideoUrl(null)} />}
      {isImageModalOpen && recipe.imageUrl && <ImageDisplayModal imageUrl={recipe.imageUrl} recipeName={recipe.recipeName} onClose={() => setIsImageModalOpen(false)} />}
    </>
  );
};

export default RecipeDisplay;
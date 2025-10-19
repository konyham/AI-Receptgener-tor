import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Recipe, Favorites, OptionItem } from '../types';
import RecipeDetails from './RecipeDetails';
import SaveRecipeModal from './SaveToFavoritesModal';
import { useNotification } from '../contexts/NotificationContext';
import { generateRecipeImage } from '../services/geminiService';
import * as imageStore from '../services/imageStore';
import { konyhaMikiLogo as konyhaMikiLogoBase64 } from '../assets';
import { DIET_OPTIONS } from '../constants';
import ImageDisplayModal from './ImageDisplayModal';

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
            const cookingMethodLabels = recipe.cookingMethods.map(cmValue => allCookingMethods.find(opt => opt.value === cmValue)?.label).filter((label): label is string => !!label);
            if (cookingMethodLabels.length > 0 && !(cookingMethodLabels.length === 1 && cookingMethodLabels[0] === 'Hagyományos')) {
                drawTextWithShadow(`• ${cookingMethodLabels.join(', ')}`, padding, topLeftY, cornerFont, 'white', 'left');
                topLeftY += cornerLineHeight;
            }
            const mealTypeLabel = allMealTypes.find(mt => mt.value === recipe.mealType)?.label || 'Nincs megadva';
            drawTextWithShadow(`Étkezés: ${mealTypeLabel}`, padding, topLeftY, cornerFont, 'white', 'left');
            topLeftY += cornerLineHeight;
            const dietLabel = DIET_OPTIONS.find(d => d.value === recipe.diet)?.label || 'Nincs megadva';
            drawTextWithShadow(`Diéta: ${dietLabel}`, padding, topLeftY, cornerFont, 'white', 'left');

            let topRightY = padding + 32;
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
            logo.onerror = (e) => reject(new Error("A logókép nem töltődött be a vízjelhez."));
        };
        image.onerror = (e) => reject(new Error('A kép betöltése sikertelen a vízjelezéshez.'));
    });
};

interface RecipeComparisonViewProps {
  originalRecipe: Recipe;
  variations: Recipe[];
  onClose: () => void;
  onSave: (recipe: Recipe, category: string) => void;
  onSaveAll: (recipes: Recipe[], category: string) => void;
  favorites: Favorites;
  mealTypes: OptionItem[];
  cuisineOptions: OptionItem[];
  cookingMethodsList: OptionItem[];
}

const RecipeComparisonView: React.FC<RecipeComparisonViewProps> = ({
  originalRecipe,
  variations,
  onClose,
  onSave,
  onSaveAll,
  favorites,
  mealTypes,
  cuisineOptions,
  cookingMethodsList,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveMode, setSaveMode] = useState<'single' | 'all'>('single');
  const [allRecipes, setAllRecipes] = useState([originalRecipe, ...variations]);
  const activeRecipe = allRecipes[activeTab];

  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatingImageError, setGeneratingImageError] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [activeImageUrl, setActiveImageUrl] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const updateRecipeInState = (updatedRecipe: Recipe, index: number) => {
      setAllRecipes(prev => {
          const newRecipes = [...prev];
          newRecipes[index] = updatedRecipe;
          return newRecipes;
      });
  };

  const handleGenerateImage = useCallback(async (regenerate = false) => {
    if (!regenerate && activeRecipe.imageUrl) return;

    setIsGeneratingImage(true);
    setGeneratingImageError(null);
    setImageLoaded(false);

    try {
        const imageBytes = await generateRecipeImage(activeRecipe, []);
        const rawImageUrl = `data:image/jpeg;base64,${imageBytes}`;
        const watermarkedImageUrl = await addWatermark(rawImageUrl, activeRecipe, mealTypes, cookingMethodsList);
        
        const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await imageStore.saveImage(imageId, watermarkedImageUrl);

        const updatedRecipe = { ...activeRecipe, imageUrl: `indexeddb:${imageId}` };
        updateRecipeInState(updatedRecipe, activeTab);

    } catch (e: any) {
        setGeneratingImageError(e.message);
    } finally {
        setIsGeneratingImage(false);
    }
  }, [activeRecipe, activeTab, mealTypes, cookingMethodsList]);

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
        setGeneratingImageError(null);
        setImageLoaded(false);
        try {
            const imageDataUrl = e.target?.result as string;
            const watermarkedImageUrl = await addWatermark(imageDataUrl, activeRecipe, mealTypes, cookingMethodsList);
            const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            await imageStore.saveImage(imageId, watermarkedImageUrl);

            const updatedRecipe = { ...activeRecipe, imageUrl: `indexeddb:${imageId}` };
            updateRecipeInState(updatedRecipe, activeTab);
            showNotification('Kép sikeresen feltöltve!', 'success');
        } catch (err: any) {
            setGeneratingImageError(err.message);
        } finally {
            setIsGeneratingImage(false);
        }
    };
    reader.onerror = () => showNotification('Hiba történt a fájl olvasása közben.', 'info');
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleRemoveImage = useCallback(async () => {
    if (!activeRecipe.imageUrl) return;

    setIsGeneratingImage(true);
    setGeneratingImageError(null);
    setImageLoaded(false);

    try {
        if (activeRecipe.imageUrl.startsWith('indexeddb:')) {
            await imageStore.deleteImage(activeRecipe.imageUrl.substring(10));
        }
        const updatedRecipe = { ...activeRecipe, imageUrl: undefined };
        updateRecipeInState(updatedRecipe, activeTab);
        showNotification('Kép eltávolítva!', 'success');
    } catch (e: any) {
        setGeneratingImageError('Hiba történt a kép törlése közben.');
    } finally {
        setIsGeneratingImage(false);
    }
  }, [activeRecipe, activeTab]);

  useEffect(() => {
    if (activeRecipe.imageUrl && activeRecipe.imageUrl.startsWith('indexeddb:')) {
        setImageLoaded(false);
        const imageId = activeRecipe.imageUrl.substring(10);
        imageStore.getImage(imageId).then(imageData => {
            if (imageData) {
                setActiveImageUrl(imageData);
            } else {
                console.warn(`Image with id ${imageId} not found.`);
                updateRecipeInState({ ...activeRecipe, imageUrl: undefined }, activeTab);
            }
        });
    } else if (activeRecipe.imageUrl) {
        setActiveImageUrl(activeRecipe.imageUrl);
    } else {
        setActiveImageUrl('');
    }
  }, [activeRecipe.imageUrl, activeTab]);

  const handleSaveClick = (mode: 'single' | 'all') => {
    setSaveMode(mode);
    setIsSaveModalOpen(true);
  };

  const handleConfirmSave = (category: string) => {
    if (saveMode === 'single') {
      onSave(activeRecipe, category);
    } else {
      onSaveAll(allRecipes, category);
    }
    setIsSaveModalOpen(false);
  };

  return (
    <>
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h2 className="text-3xl font-bold text-primary-800">Recept Variációk</h2>
            <p className="text-lg text-gray-600 mt-1">Hasonlítsa össze a különböző változatokat.</p>
          </div>
          <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 flex-shrink-0">
            Vissza a recepthez
          </button>
        </div>

        <div className="flex flex-wrap border-b border-gray-200 -mb-px">
          {allRecipes.map((_, index) => (
            <li key={index} className="list-none">
              <button
                onClick={() => setActiveTab(index)}
                className={`py-3 px-4 font-semibold rounded-t-lg transition-colors text-sm sm:text-base text-left ${
                  activeTab === index
                    ? 'border-l border-t border-r border-gray-200 bg-white text-primary-600'
                    : 'text-gray-500 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                {index === 0 ? 'Eredeti Recept' : `${index}. Variáció`}
              </button>
            </li>
          ))}
        </div>

        <div className="bg-white rounded-b-lg border-l border-r border-b border-gray-200 p-4 sm:p-6">
          <h3 className="text-2xl font-bold text-primary-800 mb-4">{activeRecipe.recipeName}</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-2">
              {/* Image Generation UI */}
              {isGeneratingImage ? (
                  <div className="aspect-[4/3] rounded-lg bg-gray-100 flex flex-col items-center justify-center p-4 border animate-pulse-bg">
                      <svg className="animate-spin h-10 w-10 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <p className="mt-4 text-lg font-semibold text-gray-700">Ételkép feldolgozása...</p>
                      <p className="text-sm text-gray-500">Ez eltarthat egy darabig...</p>
                  </div>
              ) : generatingImageError ? (
                  <div className="aspect-[4/3] rounded-lg bg-red-50 flex flex-col items-center justify-center p-4 border-2 border-dashed border-red-300">
                      <p className="text-red-700 font-semibold text-center mb-4">{generatingImageError}</p>
                      <button onClick={() => handleGenerateImage(true)} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-red-700">Újrapróbálkozás</button>
                  </div>
              ) : activeImageUrl ? (
                  <div className="relative group">
                      <button onClick={() => setIsImageModalOpen(true)} className="w-full aspect-[4/3] rounded-lg overflow-hidden shadow-lg"><img src={activeImageUrl} alt={`Fotó: ${activeRecipe.recipeName}`} className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setImageLoaded(true)} /></button>
                      <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleGenerateImage(true)} className="flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 bg-white/80 backdrop-blur-sm text-gray-800 rounded-full hover:bg-white shadow-md">Újragenerálás</button>
                          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 bg-white/80 backdrop-blur-sm text-gray-800 rounded-full hover:bg-white shadow-md">Új kép</button>
                      </div>
                  </div>
              ) : (
                  <div className="aspect-[4/3] rounded-lg bg-gray-50 flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300">
                      <h4 className="text-lg font-semibold text-gray-700 mb-2">Ételfotó</h4>
                      <div className="flex flex-col sm:flex-row gap-4">
                          <button onClick={() => handleGenerateImage()} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700">Generálás AI-val</button>
                          <button onClick={() => fileInputRef.current?.click()} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-700">Saját kép</button>
                      </div>
                  </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png, image/jpeg, image/webp" className="hidden" aria-hidden="true" />
            </div>
            <div>
              <RecipeDetails
                  recipe={activeRecipe}
                  mealTypes={mealTypes}
                  cuisineOptions={cuisineOptions}
                  cookingMethodsList={cookingMethodsList}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
          <button
            onClick={() => handleSaveClick('single')}
            className="flex-1 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-primary-700"
          >
            {activeTab === 0 ? 'Eredeti recept mentése' : `A(z) ${activeTab}. variáció mentése`}
          </button>
          <button
            onClick={() => handleSaveClick('all')}
            className="flex-1 bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-green-700"
          >
            Minden recept mentése ({allRecipes.length} db)
          </button>
        </div>
      </div>
      {isSaveModalOpen && (
        <SaveRecipeModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onSave={handleConfirmSave}
          existingCategories={Object.keys(favorites)}
          suggestedCategory={activeRecipe.mealType}
        />
      )}
      {isImageModalOpen && <ImageDisplayModal imageUrl={activeImageUrl} recipeName={activeRecipe.recipeName} onClose={() => setIsImageModalOpen(false)} />}
    </>
  );
};

export default RecipeComparisonView;

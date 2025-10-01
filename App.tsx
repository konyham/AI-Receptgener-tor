import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  generateRecipe,
  getRecipeModificationSuggestions,
  interpretAppCommand
} from './services/geminiService';
import { 
    getFavorites, 
    saveFavorites, 
    addRecipeToFavorites, 
    removeRecipeFromFavorites, 
    removeCategory as removeFavoriteCategory,
    mergeFavorites,
    validateAndRecover as validateFavorites
} from './services/favoritesService';
import {
    getShoppingList,
    saveShoppingList,
    addItems as addShoppingListItems,
    updateItem as updateShoppingListItem,
    removeItem as removeShoppingListItem,
    clearAll as clearAllShoppingListItems,
    clearChecked as clearCheckedShoppingListItems,
    mergeShoppingLists,
    validateAndRecover as validateShoppingList
} from './services/shoppingListService';
import RecipeInputForm from './components/RecipeInputForm';
import RecipeDisplay from './components/RecipeDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import FavoritesView from './components/FavoritesView';
import ShoppingListView from './components/ShoppingListView';
import AppVoiceControl from './components/AppVoiceControl';

import {
  Recipe,
  DietOption,
  MealType,
  RecipeSuggestions,
  AppView,
  Favorites,
  ShoppingListItem,
  BackupData,
  AppCommand,
  SortOption,
  CookingMethod,
  CuisineOption,
  RecipePace,
} from './types';
import { useNotification } from './contexts/NotificationContext';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { konyhaMikiLogo } from './assets';

const App: React.FC = () => {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<RecipeSuggestions | null>(null);
  const [initialFormData, setInitialFormData] = useState<any>(null);
  const [shouldGenerateImage, setShouldGenerateImage] = useState(false);
  
  const [view, setView] = useState<AppView>('generator');
  const [favorites, setFavorites] = useState<Favorites>({});
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  
  // State for FavoritesView
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.DATE_DESC);
  
  // State for App-wide voice control
  const [isAppVcProcessing, setIsAppVcProcessing] = useState(false);
  const [isAppVcRateLimited, setIsAppVcRateLimited] = useState(false);
  const isAppVcProcessingRef = useRef(false);
  
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { showNotification } = useNotification();

  useEffect(() => {
    const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    try {
      const { favorites: loadedFavorites, recoveryNotification: favRecovery } = getFavorites();
      setFavorites(loadedFavorites);
      if (favRecovery) {
        showNotification(favRecovery, 'info');
      }
    } catch (err: any) {
      showNotification(err.message, 'info');
    }

    try {
        const { list: loadedList, recoveryNotification: listRecovery } = getShoppingList();
        setShoppingList(loadedList);
        if (listRecovery) {
            showNotification(listRecovery, 'info');
        }
    } catch (err: any) {
        showNotification(err.message, 'info');
    }
  }, [showNotification]);

  const handleGenerateRecipe = async (params: {
    ingredients: string,
    excludedIngredients: string,
    diet: DietOption,
    mealType: MealType,
    cuisine: CuisineOption,
    cookingMethods: CookingMethod[],
    specialRequest: string,
    withCost: boolean,
    withImage: boolean,
    numberOfServings: number,
    recipePace: RecipePace
  }) => {
    setIsLoading(true);
    setError(null);
    setRecipe(null);
    setSuggestions(null);
    setInitialFormData(params);
    setShouldGenerateImage(params.withImage);

    try {
      const newRecipe = await generateRecipe(
        params.ingredients,
        params.excludedIngredients,
        params.diet,
        params.mealType,
        params.cuisine,
        params.cookingMethods,
        params.specialRequest,
        params.withCost,
        params.numberOfServings,
        params.recipePace
      );
      setRecipe(newRecipe);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseRecipe = () => {
    setRecipe(null);
    setSuggestions(null);
    setInitialFormData(null);
    setError(null);
  };
  
  const handleRefineRecipe = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
        if (recipe) {
            const newSuggestions = await getRecipeModificationSuggestions(recipe.ingredients.join(', '), recipe.recipeName);
            setSuggestions(newSuggestions);
        }
    } catch (err: any) {
        showNotification((err as Error).message, 'info');
    } finally {
        setIsLoading(false);
        setRecipe(null);
    }
  };

  const handleFormPopulated = useCallback(() => {
    setInitialFormData(null);
  }, []);
  
  const handleRecipeUpdate = (updatedRecipe: Recipe) => {
    setRecipe(updatedRecipe);
  };

  // --- Favorites Handlers ---
  const handleSaveFavorite = (recipeToSave: Recipe, category: string) => {
    const updatedFavorites = addRecipeToFavorites(recipeToSave, category);
    setFavorites(updatedFavorites);
    showNotification(`Recept elmentve a(z) "${category}" kategóriába!`, 'success');
  };

  const handleDeleteFavorite = (recipeName: string, category: string) => {
    const updatedFavorites = removeRecipeFromFavorites(recipeName, category);
    setFavorites(updatedFavorites);
    showNotification('Recept törölve a kedvencekből.', 'success');
  };

  const handleDeleteCategory = (category: string) => {
    const updatedFavorites = removeFavoriteCategory(category);
    setFavorites(updatedFavorites);
    showNotification(`"${category}" kategória törölve.`, 'success');
  };
  
  const handleToggleCategory = (category: string) => {
      setExpandedCategories(prev => ({...prev, [category]: !prev[category]}));
  };
  
  // --- Shopping List Handlers ---
  const handleAddItemsToShoppingList = (items: string[]) => {
      const updatedList = addShoppingListItems(items);
      setShoppingList(updatedList);
      showNotification(`${items.length} tétel hozzáadva a bevásárlólistához!`, 'success');
      setView('shopping-list');
  };

  const handleUpdateShoppingListItem = (index: number, updatedItem: ShoppingListItem) => {
      const updatedList = updateShoppingListItem(index, updatedItem);
      setShoppingList(updatedList);
  };

  const handleRemoveShoppingListItem = (index: number) => {
      const updatedList = removeShoppingListItem(index);
      setShoppingList(updatedList);
  };

  const handleClearCheckedShoppingListItems = () => {
      const updatedList = clearCheckedShoppingListItems();
      setShoppingList(updatedList);
  };

  const handleClearAllShoppingListItems = () => {
      const updatedList = clearAllShoppingListItems();
      setShoppingList(updatedList);
  };

  // --- Data Import/Export ---
  const handleImportData = (data: BackupData) => {
    let newFavCount = 0;
    let newShopCount = 0;
    
    if (data.favorites) {
      const { favorites: validatedFavorites, recoveryNotification } = validateFavorites(data.favorites);
      const { mergedFavorites, newRecipesCount } = mergeFavorites(favorites, validatedFavorites);
      setFavorites(mergedFavorites);
      saveFavorites(mergedFavorites);
      newFavCount = newRecipesCount;
      if (recoveryNotification) {
        showNotification(recoveryNotification, 'info');
      }
    }

    if (data.shoppingList) {
      const { list: validatedList, recoveryNotification } = validateShoppingList(data.shoppingList);
      const { mergedList, newItemsCount } = mergeShoppingLists(shoppingList, validatedList);
      setShoppingList(mergedList);
      saveShoppingList(mergedList);
      newShopCount = newItemsCount;
       if (recoveryNotification) {
        showNotification(recoveryNotification, 'info');
      }
    }
    
    showNotification(`Importálás kész! ${newFavCount} új recept és ${newShopCount} új bevásárlólista tétel hozzáadva.`, 'success');
  };
  
  const handleViewFavoriteRecipe = (recipeToView: Recipe) => {
    setRecipe(recipeToView);
    setView('generator');
  };

  // --- App Voice Control ---
  const handleAppVoiceError = useCallback((error: string) => {
    if (error === 'not-allowed') {
        showNotification('A mikrofon használata le lett tiltva. A funkció használatához engedélyezze a böngészőben.', 'info');
    }
  }, [showNotification]);

  const handleAppVoiceResult = useCallback(async (transcript: string) => {
    if (isAppVcProcessingRef.current) return;
    
    isAppVcProcessingRef.current = true;
    setIsAppVcProcessing(true);
    
    try {
        const categories = Object.keys(favorites);
        const recipesByCategory: { [category: string]: string[] } = {};
        categories.forEach(cat => {
            recipesByCategory[cat] = favorites[cat].map(r => r.recipeName);
        });
        const shoppingListItems = shoppingList.map(item => item.text);

        const command: AppCommand = await interpretAppCommand(transcript, view, {
            categories,
            recipesByCategory,
            shoppingListItems,
        });

        // Command processing logic here
        switch (command.action) {
            case 'navigate':
                if (['generator', 'favorites', 'shopping-list'].includes(command.payload as string)) {
                    setView(command.payload as AppView);
                    showNotification(`Navigálás ide: ${command.payload}`, 'info');
                }
                break;
            case 'add_shopping_list_item':
                const items = (command.payload as string).split(',').map(s => s.trim()).filter(Boolean);
                if (items.length > 0) {
                    const updatedList = addShoppingListItems(items);
                    setShoppingList(updatedList);
                    showNotification(`${items.join(', ')} hozzáadva a listához.`, 'success');
                    setView('shopping-list');
                }
                break;
            // ... add more command handlers
            case 'view_favorite_recipe':
                const payload = command.payload as { recipeName: string; category: string };
                if (payload && favorites[payload.category]) {
                    const foundRecipe = favorites[payload.category].find(r => r.recipeName.toLowerCase() === payload.recipeName.toLowerCase());
                    if (foundRecipe) {
                        setRecipe(foundRecipe);
                        setView('generator');
                    }
                }
                break;
            case 'filter_favorites':
                const cat = command.payload as string;
                if (Object.keys(favorites).find(c => c.toLowerCase() === cat.toLowerCase())) {
                    setFilterCategory(cat);
                    setView('favorites');
                }
                break;
            case 'expand_category':
                const catToExp = command.payload as string;
                if (favorites[catToExp]) {
                    setExpandedCategories(prev => ({...prev, [catToExp]: true}));
                    setView('favorites');
                }
                break;
            // Add other cases here
            default:
                // Do nothing for unknown
                break;
        }

    } catch (err: any) {
      console.error("Error interpreting app command:", err);
      let errorMessage = "Hiba a hangparancs értelmezése közben.";
      if (err.message.toLowerCase().includes('quota')) {
          errorMessage = "Túl sok kérés. A hangvezérlés 15 másodpercre szünetel.";
          setIsAppVcRateLimited(true);
          setTimeout(() => setIsAppVcRateLimited(false), 15000);
      }
      showNotification(errorMessage, 'info');
    } finally {
      isAppVcProcessingRef.current = false;
      setIsAppVcProcessing(false);
    }
  }, [favorites, shoppingList, view, showNotification]);

  const {
    isListening: isAppVcListening,
    isSupported: isAppVcSupported,
    startListening: startAppVcListening,
    stopListening: stopAppVcListening,
    permissionState: appVcPermissionState,
  } = useSpeechRecognition({
    onResult: handleAppVoiceResult,
    continuous: false,
    onError: handleAppVoiceError,
  });

  const handleAppMicClick = () => {
    if (isAppVcListening) {
      stopAppVcListening();
    } else {
      startAppVcListening();
    }
  };
  
  const handleSaveLogo = () => {
    try {
        const encodedContent = konyhaMikiLogo.split(',')[1];
        if (!encodedContent) throw new Error('Érvénytelen logó adat URL');
        
        const decodedSvg = decodeURIComponent(encodedContent);
        const blob = new Blob([decodedSvg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'konyha_miki_logo.svg';
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showNotification('Logó sikeresen letöltve!', 'success');
    } catch (error) {
        console.error('Hiba a logó mentése közben:', error);
        showNotification('Hiba történt a logó mentése közben.', 'info');
    }
  };
  
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
            showNotification(`A teljes képernyős mód nem érhető el: ${err.message}`, 'info');
        });
    } else {
        document.exitFullscreen();
    }
  }, [showNotification]);


  const renderContent = () => {
    if (view === 'favorites') {
      return (
        <FavoritesView
          favorites={favorites}
          shoppingList={shoppingList}
          onViewRecipe={handleViewFavoriteRecipe}
          onDeleteRecipe={handleDeleteFavorite}
          onDeleteCategory={handleDeleteCategory}
          onImportData={handleImportData}
          expandedCategories={expandedCategories}
          onToggleCategory={handleToggleCategory}
          filterCategory={filterCategory}
          onSetFilterCategory={setFilterCategory}
          sortOption={sortOption}
          onSetSortOption={setSortOption}
        />
      );
    }

    if (view === 'shopping-list') {
      return (
        <ShoppingListView
          list={shoppingList}
          favorites={favorites}
          onAddItems={handleAddItemsToShoppingList}
          onUpdateItem={handleUpdateShoppingListItem}
          onRemoveItem={handleRemoveShoppingListItem}
          onClearChecked={handleClearCheckedShoppingListItems}
          onClearAll={handleClearAllShoppingListItems}
          onImportData={handleImportData}
        />
      );
    }

    // Default view is 'generator'
    if (recipe) {
      return (
        <RecipeDisplay
          recipe={recipe}
          onClose={handleCloseRecipe}
          onRefine={handleRefineRecipe}
          isFromFavorites={!!(recipe.dateAdded)}
          favorites={favorites}
          onSave={handleSaveFavorite}
          onAddItemsToShoppingList={handleAddItemsToShoppingList}
          isLoading={isLoading}
          onRecipeUpdate={handleRecipeUpdate}
          shouldGenerateImageInitially={shouldGenerateImage}
        />
      );
    }

    return (
      <>
        {isLoading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} />}
        {!isLoading && !error && (
          <RecipeInputForm
            onSubmit={handleGenerateRecipe}
            isLoading={isLoading}
            initialFormData={initialFormData}
            onFormPopulated={handleFormPopulated}
            suggestions={suggestions}
          />
        )}
      </>
    );
  };
  
  const NavButton: React.FC<{
    targetView: AppView;
    label: string;
    // FIX: Changed from JSX.Element to React.ReactElement to resolve namespace error.
    icon: React.ReactElement;
  }> = ({ targetView, label, icon }) => (
    <button
      onClick={() => { setView(targetView); setError(null); }}
      className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 py-2 px-4 rounded-lg font-semibold transition-colors ${
        view === targetView
          ? 'bg-primary-600 text-white shadow-md'
          : 'bg-white text-gray-700 hover:bg-primary-50'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="bg-white shadow-sm sticky top-0 z-10 p-4">
        <div className="container mx-auto max-w-4xl flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img src={konyhaMikiLogo} alt="Konyha Miki logó" className="h-12 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-primary-900">Konyha Miki</h1>
              <p className="text-sm text-gray-500">Az Ön személyes AI konyhafőnöke</p>
            </div>
          </div>
          <div>
            <button
                onClick={toggleFullscreen}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary-100 text-primary-700 transition-colors text-sm font-medium"
                title={isFullscreen ? 'Kilépés a teljes képernyőből' : 'Teljes képernyő'}
            >
                {isFullscreen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 4H4v4m12 12h4v-4M8 20H4v-4m12-12h4v4" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4m12 4V4h-4M4 16v4h4m12-4v4h-4" />
                    </svg>
                )}
                <span>
                  {isFullscreen ? 'Normál nézet' : 'Teljes képernyő'}
                </span>
            </button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto max-w-4xl p-4 sm:p-6">
        <nav className="mb-6 p-2 bg-white border rounded-xl shadow-sm flex flex-col sm:flex-row gap-2">
            <NavButton 
                targetView="generator" 
                label="Recept Generátor"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v1.999l4.873.001a1 1 0 01.999 1V16a1 1 0 01-1 1h-4.872l-.001 2.001a1 1 0 01-1.664.748l-6-6A1 1 0 012 12V5a1 1 0 011-1h4.872L7.873 2a1 1 0 01.748-1.664l2.678-.001zM12 10a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd" /></svg>}
            />
            <NavButton 
                targetView="favorites" 
                label="Kedvencek"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>}
            />
            <NavButton 
                targetView="shopping-list" 
                label="Bevásárlólista"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H4.72l-.21-1.257A1 1 0 003 1z" /><path d="M16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>}
            />
        </nav>
        
        <AppVoiceControl
          isSupported={isAppVcSupported}
          isListening={isAppVcListening}
          isProcessing={isAppVcProcessing}
          onClick={handleAppMicClick}
          permissionState={appVcPermissionState}
          isRateLimited={isAppVcRateLimited}
        />

        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-8">
            {renderContent()}
        </div>
      </main>
      <footer className="text-center py-6 text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Konyha Miki. Minden jog fenntartva.</p>
        <p>AI-alapú receptgenerátor a Google Gemini API segítségével.</p>
        <button
          onClick={handleSaveLogo}
          className="mt-4 text-sm text-primary-700 hover:text-primary-900 underline focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 rounded"
        >
          Logó mentése
        </button>
      </footer>
    </div>
  );
};

export default App;
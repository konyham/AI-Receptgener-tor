import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Recipe, DietOption, MealType, Favorites, CookingMethod, RecipeSuggestions, ShoppingListItem, AppView, CuisineOption, RecipePace, SortOption, BackupData } from './types';
import { generateRecipe, getRecipeModificationSuggestions, interpretAppCommand } from './services/geminiService';
import * as favoritesService from './services/favoritesService';
import * as shoppingListService from './services/shoppingListService';
import RecipeInputForm from './components/RecipeInputForm';
import RecipeDisplay from './components/RecipeDisplay';
import FavoritesView from './components/FavoritesView';
import ShoppingListView from './components/ShoppingListView';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import AppVoiceControl from './components/AppVoiceControl';
import { useNotification } from './contexts/NotificationContext';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { isLocalStorageAvailable } from './utils/storage';
import { SortOption as SortOptionEnum } from './types'; // Enum importálása

interface RecipeGenerationParams {
  ingredients: string;
  excludedIngredients: string;
  diet: DietOption;
  mealType: MealType;
  cuisine: CuisineOption;
  cookingMethods: CookingMethod[];
  specialRequest: string;
  withCost: boolean;
  withImage: boolean;
  numberOfServings: number;
  recipePace: RecipePace;
}

const App: React.FC = () => {
  const [page, setPage] = useState<AppView>('generator');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [lastGeneratedRecipe, setLastGeneratedRecipe] = useState<Recipe | null>(null);
  const [favorites, setFavorites] = useState<Favorites>(() => {
    try {
      return favoritesService.getFavorites().favorites;
    } catch (err) {
      console.error("Hiba a kedvencek betöltésekor az inicializálás során:", err);
      return {};
    }
  });
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>(() => {
    try {
        return shoppingListService.getShoppingList().list;
    } catch (err) {
        console.error("Hiba a bevásárlólista betöltésekor az inicializálás során:", err);
        return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [lastGenerationParams, setLastGenerationParams] = useState<RecipeGenerationParams | null>(null);
  const [initialFormData, setInitialFormData] = useState<Partial<RecipeGenerationParams> | null>(null);
  const [suggestions, setSuggestions] = useState<RecipeSuggestions | null>(null);
  const { showNotification } = useNotification();
  const [shouldGenerateImageForFavorite, setShouldGenerateImageForFavorite] = useState<boolean>(false);

  // State lifted from FavoritesView for voice control and sorting
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>(SortOptionEnum.DATE_DESC);
  
  // App-level voice control state
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isAppRateLimited, setIsAppRateLimited] = useState(false);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // This effect now only handles initial checks and notifications,
    // not data loading, which is handled by useState initializers.
    if (!isLocalStorageAvailable()) {
      setStorageError(
        "Az adatok mentése nem lehetséges, mert a böngésző helyi tárolója nem elérhető vagy le van tiltva. Kérjük, engedélyezze a 'sütiket' és a webhelyadatokat a böngésző beállításaiban a teljes funkcionalitás érdekében."
      );
      return;
    }
    // Check for recovery notifications from the initial load
    try {
      const { recoveryNotification } = favoritesService.getFavorites();
      if (recoveryNotification) {
          showNotification(recoveryNotification, 'info');
      }
    } catch (err: any) {
      showNotification(err.message, 'info');
    }
    try {
      const { recoveryNotification } = shoppingListService.getShoppingList();
       if (recoveryNotification) {
          showNotification(recoveryNotification, 'info');
      }
    } catch (err: any) {
      showNotification(err.message, 'info');
    }
  }, [showNotification]);

  // Handlers for Shopping List - Placed here as they are fundamental
  const handleShoppingListAddItems = (items: string[]) => {
    try {
      const updatedList = shoppingListService.addItems(items);
      setShoppingList(updatedList);
      showNotification(`${items.length} tétel hozzáadva a bevásárlólistához!`, 'success');
    } catch (err: any) {
        showNotification(err.message, 'info');
    }
  };

  const handleShoppingListUpdateItem = (index: number, updatedItem: ShoppingListItem) => {
    try {
      const updatedList = shoppingListService.updateItem(index, updatedItem);
      setShoppingList(updatedList);
    } catch (err: any) {
        showNotification(err.message, 'info');
    }
  };

  const handleShoppingListRemoveItem = (index: number) => {
    try {
      const updatedList = shoppingListService.removeItem(index);
      setShoppingList(updatedList);
    } catch (err: any) {
        showNotification(err.message, 'info');
    }
  };

  const handleShoppingListClearChecked = () => {
    try {
      const updatedList = shoppingListService.clearChecked();
      setShoppingList(updatedList);
      showNotification('Kipipált tételek törölve.', 'info');
    } catch (err: any) {
        showNotification(err.message, 'info');
    }
  };
  
  const handleShoppingListClearAll = () => {
    try {
      const updatedList = shoppingListService.clearAll();
      setShoppingList(updatedList);
      showNotification('Bevásárlólista törölve.', 'info');
    } catch (err: any) {
        showNotification(err.message, 'info');
    }
  };
  
  const handleImportData = (data: unknown) => {
    try {
      // Basic validation to check if the imported data has the expected structure.
      if (
        typeof data === 'object' &&
        data !== null &&
        'favorites' in data &&
        'shoppingList' in data &&
        typeof (data as BackupData).favorites === 'object' &&
        Array.isArray((data as BackupData).shoppingList)
      ) {
        const backupData = data as BackupData;
        
        // Validate and clean the imported data before merging.
        const { favorites: validImportedFavorites, recoveryNotification: favRecovery } = favoritesService.validateAndRecover(backupData.favorites);
        const { list: validImportedShoppingList, recoveryNotification: listRecovery } = shoppingListService.validateAndRecover(backupData.shoppingList);

        // Merge the validated imported data with the current state.
        const { mergedFavorites, newRecipesCount } = favoritesService.mergeFavorites(favorites, validImportedFavorites);
        const { mergedList, newItemsCount } = shoppingListService.mergeShoppingLists(shoppingList, validImportedShoppingList);

        // Update the state with the merged data.
        setFavorites(mergedFavorites);
        setShoppingList(mergedList);

        // Save the merged data to localStorage.
        favoritesService.saveFavorites(mergedFavorites);
        shoppingListService.saveShoppingList(mergedList);
        
        // Provide detailed feedback to the user.
        const messages: string[] = [];
        if (newRecipesCount > 0) messages.push(`${newRecipesCount} új recept`);
        if (newItemsCount > 0) messages.push(`${newItemsCount} új bevásárlólista-tétel`);
        
        let feedbackMessage: string;
        if (messages.length > 0) {
          feedbackMessage = `Betöltés befejezve. ${messages.join(' és ')} hozzáadva.`;
        } else {
          feedbackMessage = 'Betöltés befejezve. Nem kerültek új adatok hozzáadásra.';
        }

        if (favRecovery || listRecovery) {
           showNotification('Az adatok összefésülve, de néhány sérült bejegyzést ki kellett hagyni.', 'info');
        } else {
           showNotification(feedbackMessage, 'success');
        }
      } else {
        throw new Error('A fájl formátuma érvénytelen vagy sérült.');
      }
    } catch (err: any) {
       showNotification(err.message, 'info');
    }
  };
  
  // Voice control logic
  const handleAppVoiceResult = useCallback(async (transcript: string) => {
    if (isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setIsProcessingVoice(true);

    const context = {
        categories: Object.keys(favorites),
        // FIX: Explicitly typing the parameters of the 'reduce' callback to prevent 'recipes' from being inferred as 'unknown'.
        recipesByCategory: Object.entries(favorites).reduce((acc, [category, recipes]: [string, Recipe[]]) => {
            acc[category] = recipes.map(r => r.recipeName);
            return acc;
        }, {} as { [category: string]: string[] }),
        shoppingListItems: shoppingList.map(item => item.text),
    };
    
    try {
        const command = await interpretAppCommand(transcript, page, context);
        switch (command.action) {
            case 'navigate':
                setPage(command.payload as AppView);
                showNotification(`Navigálás: ${command.payload}`, 'info');
                break;
            // FIX: The type of `command.payload.split(',')` can be incorrectly inferred as `unknown`.
            // Explicitly typing the `items` variable as `string[]` ensures type safety and allows usage of array methods.
            case 'add_shopping_list_item':
                if (typeof command.payload === 'string') {
                    const items: string[] = command.payload.split(',');
                    const itemsToAdd = items.map(s => s.trim()).filter(Boolean);
                    if (itemsToAdd.length > 0) {
                        handleShoppingListAddItems(itemsToAdd);
                    }
                    showNotification(`Hozzáadva: ${command.payload}`, 'success');
                }
                break;
            case 'remove_shopping_list_item':
                const itemToRemove = shoppingList.findIndex(item => item.text.toLowerCase().includes((command.payload as string).toLowerCase()));
                if (itemToRemove > -1) {
                    showNotification(`Törölve: ${shoppingList[itemToRemove].text}`, 'info');
                    handleShoppingListRemoveItem(itemToRemove);
                }
                break;
             case 'check_shopping_list_item':
                const itemToCheck = shoppingList.findIndex(item => item.text.toLowerCase().includes((command.payload as string).toLowerCase()));
                if (itemToCheck > -1 && !shoppingList[itemToCheck].checked) {
                    handleShoppingListUpdateItem(itemToCheck, { ...shoppingList[itemToCheck], checked: true });
                    showNotification(`Kipipálva: ${shoppingList[itemToCheck].text}`, 'info');
                }
                break;
            case 'uncheck_shopping_list_item':
                const itemToUncheck = shoppingList.findIndex(item => item.text.toLowerCase().includes((command.payload as string).toLowerCase()));
                if (itemToUncheck > -1 && shoppingList[itemToUncheck].checked) {
                    handleShoppingListUpdateItem(itemToUncheck, { ...shoppingList[itemToUncheck], checked: false });
                }
                break;
            case 'clear_checked_shopping_list':
                handleShoppingListClearChecked();
                break;
            case 'clear_all_shopping_list':
                handleShoppingListClearAll();
                break;
            case 'view_favorite_recipe':
                const payloadView = command.payload as { recipeName: string; category: string };
                const recipeToView = favorites[payloadView.category]?.find(r => r.recipeName === payloadView.recipeName);
                if (recipeToView) {
                    viewFavoriteRecipe(recipeToView);
                    showNotification(`Megnyitva: ${payloadView.recipeName}`, 'info');
                }
                break;
            case 'delete_favorite_recipe':
                const payloadDelete = command.payload as { recipeName: string; category: string };
                handleDeleteRecipe(payloadDelete.recipeName, payloadDelete.category);
                break;
            case 'filter_favorites':
                setFilterCategory(command.payload as string);
                showNotification(`Szűrés: ${command.payload}`, 'info');
                break;
            case 'clear_favorites_filter':
                setFilterCategory('all');
                showNotification('Szűrés törölve', 'info');
                break;
            case 'expand_category':
                 setExpandedCategories(prev => ({ ...prev, [command.payload as string]: true }));
                 break;
            case 'collapse_category':
                 setExpandedCategories(prev => ({ ...prev, [command.payload as string]: false }));
                 break;
        }
    } catch (err: any) {
        console.error("Error interpreting app command:", err);
        let errorMessage = 'Hiba a parancs értelmezésekor.';
        const errorString = (typeof err.message === 'string') ? err.message : JSON.stringify(err);

        if (errorString.toLowerCase().includes('resource_exhausted') || errorString.includes('429') || errorString.toLowerCase().includes('quota')) {
            errorMessage = "Túl sok kérés. A hangvezérlés 15 másodpercre szünetel.";
            setIsAppRateLimited(true);
            setTimeout(() => {
              setIsAppRateLimited(false);
              showNotification("A hangvezérlés újra aktív.", 'success');
            }, 15000); // Re-enable after 15 seconds
        }
        showNotification(errorMessage, 'info');
    } finally {
        isProcessingRef.current = false;
        setIsProcessingVoice(false);
    }
  }, [page, favorites, shoppingList, showNotification]);

  const handleAppSpeechError = useCallback((error: string) => {
    if (error === 'not-allowed') {
        showNotification('A mikrofon használata le lett tiltva. A funkció használatához engedélyezze a böngészőben.', 'info');
    }
  }, [showNotification]);

  const {
    isListening: isAppListening,
    isSupported: isVoiceSupported,
    startListening: startAppListening,
    stopListening: stopAppListening,
    permissionState,
  } = useSpeechRecognition({ 
    onResult: handleAppVoiceResult, 
    continuous: false,
    onError: handleAppSpeechError,
  });

  const handleAppMicClick = () => {
    if (isAppListening) {
      stopAppListening();
    } else {
      startAppListening();
    }
  };

  const handleGenerateRecipe = async (params: RecipeGenerationParams) => {
    setIsLoading(true);
    setError(null);
    setRecipe(null);
    setSuggestions(null); // Clear suggestions on new generation
    setLastGenerationParams(params);
    try {
      const newRecipe = await generateRecipe(params.ingredients, params.excludedIngredients, params.diet, params.mealType, params.cuisine, params.cookingMethods, params.specialRequest, params.withCost, params.numberOfServings, params.recipePace);
      setRecipe(newRecipe);
      setLastGeneratedRecipe(newRecipe);
      setPage('generator');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Ismeretlen hiba történt.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefineRecipe = async () => {
    if (lastGenerationParams && recipe) {
      setIsLoading(true);
      setError(null);
      
      try {
        const newSuggestions = await getRecipeModificationSuggestions(lastGenerationParams.ingredients, recipe.recipeName);
        setSuggestions(newSuggestions);
      } catch (err: any) {
        showNotification(err.message || 'Nem sikerült javaslatokat betölteni.', 'info');
        setSuggestions(null);
      }
      
      setInitialFormData(lastGenerationParams);
      setRecipe(null);
      setIsLoading(false);
    }
  };
  
  const closeRecipeView = () => {
    setSuggestions(null); // Clear suggestions when starting a new recipe
    if (lastGenerationParams) {
        setInitialFormData(lastGenerationParams);
    } else {
        setInitialFormData(null);
    }
    setRecipe(null);
    setLastGeneratedRecipe(null);
    setError(null);
  };

  const closeFavoriteRecipeView = () => {
    setRecipe(null);
  };

  const showLastRecipe = () => {
    if (lastGeneratedRecipe) {
        setRecipe(lastGeneratedRecipe);
        setPage('generator');
    }
  };

  const viewFavoriteRecipe = (favRecipe: Recipe) => {
    if (!favRecipe.imageUrl) {
      if (window.confirm("Szeretne ételfotót generálni ehhez a recepthez? (Ez a művelet kvótát használ.)")) {
        setShouldGenerateImageForFavorite(true);
      } else {
        setShouldGenerateImageForFavorite(false);
      }
    } else {
      setShouldGenerateImageForFavorite(false);
    }
    setRecipe(favRecipe);
    setPage('favorites');
  };
  
  const handleSaveRecipe = (recipeToSave: Recipe, category: string) => {
    try {
      const updatedFavorites = favoritesService.addRecipeToFavorites(recipeToSave, category);
      setFavorites(updatedFavorites);
      showNotification(`Recept elmentve a(z) "${category}" kategóriába!`, 'success');
    } catch (err: any) {
        showNotification(err.message, 'info');
    }
  };

  const handleDeleteRecipe = (recipeName: string, category: string) => {
    try {
      const updatedFavorites = favoritesService.removeRecipeFromFavorites(recipeName, category);
      setFavorites(updatedFavorites);
      showNotification('Recept törölve a kedvencek közül.', 'info');
    } catch (err: any) {
        showNotification(err.message, 'info');
    }
  };

  const handleDeleteCategory = (category: string) => {
    try {
      const updatedFavorites = favoritesService.removeCategory(category);
      setFavorites(updatedFavorites);
      showNotification(`"${category}" kategória törölve.`, 'info');
    } catch (err: any) {
        showNotification(err.message, 'info');
    }
  };

  const showGenerator = () => {
    setRecipe(null);
    setSuggestions(null);
    setPage('generator');
  };
  
  const showFavorites = () => {
    setRecipe(null);
    setSuggestions(null);
    try {
      const { favorites, recoveryNotification } = favoritesService.getFavorites();
      setFavorites(favorites);
      if (recoveryNotification) {
          showNotification(recoveryNotification, 'info');
      }
    } catch (err: any) {
        showNotification(err.message, 'info');
        setFavorites({}); // Keep fallback for fatal errors
    }
    setPage('favorites');
  };
  
  const showShoppingList = () => {
    setRecipe(null);
    setSuggestions(null);
    setPage('shopping-list');
  };

  const handleRecipeUpdate = useCallback((updatedRecipe: Recipe) => {
    setRecipe(updatedRecipe);
    setLastGeneratedRecipe(updatedRecipe);
  }, []);

  const NavButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm md:text-base font-bold rounded-lg transition-colors duration-200 ${
        active
          ? 'bg-primary-600 text-white shadow-md'
          : 'bg-white text-primary-700 hover:bg-primary-100'
      }`}
    >
      {children}
    </button>
  );

  const renderContent = () => {
    if (isLoading && !recipe) {
      return <LoadingSpinner />;
    }
      
    if (recipe) {
      const isViewingFavorite = page === 'favorites';
      return (
        <RecipeDisplay
          recipe={recipe}
          onClose={isViewingFavorite ? closeFavoriteRecipeView : closeRecipeView}
          onRefine={handleRefineRecipe}
          isFromFavorites={isViewingFavorite}
          favorites={favorites}
          onSave={handleSaveRecipe}
          onAddItemsToShoppingList={handleShoppingListAddItems}
          isLoading={isLoading}
          onRecipeUpdate={handleRecipeUpdate}
          shouldGenerateImageInitially={page === 'favorites' ? shouldGenerateImageForFavorite : (lastGenerationParams?.withImage ?? false)}
        />
      );
    }
    
    if (page === 'generator') {
      return (
        <>
          <RecipeInputForm
            onSubmit={handleGenerateRecipe}
            isLoading={isLoading}
            initialFormData={initialFormData}
            onFormPopulated={() => setInitialFormData(null)}
            suggestions={suggestions}
          />
          {error && <div className="mt-4"><ErrorMessage message={error} /></div>}
        </>
      );
    }

    if (page === 'favorites') {
      return (
        <FavoritesView 
          favorites={favorites}
          onViewRecipe={viewFavoriteRecipe}
          onDeleteRecipe={handleDeleteRecipe}
          onDeleteCategory={handleDeleteCategory}
          expandedCategories={expandedCategories}
          onToggleCategory={(category) => setExpandedCategories(prev => ({...prev, [category]: !prev[category]}))}
          filterCategory={filterCategory}
          onSetFilterCategory={setFilterCategory}
          sortOption={sortOption}
          onSetSortOption={setSortOption}
          onImportData={handleImportData}
          shoppingList={shoppingList}
        />
      );
    }

    if (page === 'shopping-list') {
      return (
        <ShoppingListView
          list={shoppingList}
          onAddItems={handleShoppingListAddItems}
          onUpdateItem={handleShoppingListUpdateItem}
          onRemoveItem={handleShoppingListRemoveItem}
          onClearChecked={handleShoppingListClearChecked}
          onClearAll={handleShoppingListClearAll}
          onImportData={handleImportData}
          favorites={favorites}
        />
      );
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-primary-50 font-sans text-gray-800">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary-900">
            AI recept generátor - Konyha Miki módra
          </h1>
          <p className="mt-3 text-lg text-primary-700 max-w-2xl mx-auto">
            Készítsen finom recepteket, mentse el kedvenceit és használja a konyhai időzítőt!
          </p>
        </header>

        <div className="max-w-3xl mx-auto">
            {storageError && <div className="mb-4"><ErrorMessage message={storageError} /></div>}
            <div className="mb-6 p-2 bg-white rounded-xl shadow-sm border border-gray-200 flex justify-center items-center gap-2 flex-wrap">
                 <NavButton active={page === 'generator' && !recipe} onClick={showGenerator}>
                    Recept Generátor
                </NavButton>
                <NavButton active={page === 'favorites'} onClick={showFavorites}>
                    Kedvenceim
                </NavButton>
                <NavButton active={page === 'shopping-list'} onClick={showShoppingList}>
                    Bevásárlólista
                </NavButton>
                {lastGeneratedRecipe && !recipe && (
                    <NavButton active={false} onClick={showLastRecipe}>
                        Vissza a recepthez
                    </NavButton>
                )}
            </div>
            {(page === 'favorites' || page === 'shopping-list') && !recipe && (
                 <AppVoiceControl
                    isSupported={isVoiceSupported}
                    isListening={isAppListening}
                    isProcessing={isProcessingVoice}
                    onClick={handleAppMicClick}
                    permissionState={permissionState}
                    isRateLimited={isAppRateLimited}
                />
            )}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-200">
            {renderContent()}
          </div>
        </div>
        
        <footer className="text-center mt-12 text-sm text-gray-500">
          <p>Készítette a Gemini API.</p>
        </footer>
      </main>
    </div>
  );
};

export default App;

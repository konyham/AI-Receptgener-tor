import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Recipe, DietOption, MealType, Favorites, CookingMethod, RecipeSuggestions, ShoppingListItem, AppView } from './types';
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

interface RecipeGenerationParams {
  ingredients: string;
  diet: DietOption;
  mealType: MealType;
  cookingMethod: CookingMethod;
  specialRequest: string;
}

const App: React.FC = () => {
  const [page, setPage] = useState<AppView>('generator');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [favorites, setFavorites] = useState<Favorites>({});
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerationParams, setLastGenerationParams] = useState<RecipeGenerationParams | null>(null);
  const [initialFormData, setInitialFormData] = useState<Partial<RecipeGenerationParams> | null>(null);
  const [suggestions, setSuggestions] = useState<RecipeSuggestions | null>(null);
  const { showNotification } = useNotification();

  // State lifted from FavoritesView for voice control
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // App-level voice control state
  const [isAppVoiceControlActive, setIsAppVoiceControlActive] = useState(true);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    try {
      setFavorites(favoritesService.getFavorites());
    } catch (err: any) {
      showNotification(err.message, 'info');
      setFavorites({}); // Start with empty favorites on corruption
    }
    try {
      setShoppingList(shoppingListService.getShoppingList());
    } catch (err: any) {
      showNotification(err.message, 'info');
      setShoppingList([]); // Start with empty list on corruption
    }
  }, [showNotification]);
  
  // Voice control logic
  const handleAppVoiceResult = useCallback(async (transcript: string) => {
    if (isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setIsProcessingVoice(true);

    const context = {
        categories: Object.keys(favorites),
        recipesByCategory: Object.entries(favorites).reduce((acc, [category, recipes]) => {
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
            case 'add_shopping_list_item':
                handleShoppingListAddItem(command.payload as string);
                showNotification(`Hozzáadva: ${command.payload}`, 'success');
                break;
            case 'remove_shopping_list_item':
                const itemToRemove = shoppingList.findIndex(item => item.text.toLowerCase().includes((command.payload as string).toLowerCase()));
                if (itemToRemove > -1) {
                    handleShoppingListRemoveItem(itemToRemove);
                    showNotification(`Törölve: ${shoppingList[itemToRemove].text}`, 'info');
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

        if (errorString.includes('RESOURCE_EXHAUSTED') || errorString.includes('429')) {
            errorMessage = "Túl sok kérés. A hangvezérlés 15 másodpercre szünetel.";
            setIsAppVoiceControlActive(false);
            setTimeout(() => {
              setIsAppVoiceControlActive(true)
              showNotification("A hangvezérlés újra aktív.", 'success');
            }, 15000); // Re-enable after 15 seconds
        }
        showNotification(errorMessage, 'info');
    } finally {
        isProcessingRef.current = false;
        setIsProcessingVoice(false);
    }
  }, [page, favorites, shoppingList, showNotification]);

  const {
    isListening: isAppListening,
    isSupported: isVoiceSupported,
    startListening: startAppListening,
    stopListening: stopAppListening,
    permissionState,
  } = useSpeechRecognition({ onResult: handleAppVoiceResult, continuous: false });

  useEffect(() => {
    // This voice control is only active on the main list pages, not during recipe generation or display.
    const isAppPage = (page === 'favorites' || page === 'shopping-list') && !recipe;
    if (isAppVoiceControlActive && isAppPage && !isAppListening) {
      startAppListening();
    } else if ((!isAppVoiceControlActive || !isAppPage) && isAppListening) {
      stopAppListening();
    }
  }, [isAppVoiceControlActive, page, recipe, isAppListening, startAppListening, stopAppListening]);

  const handleGenerateRecipe = async (params: RecipeGenerationParams) => {
    setIsLoading(true);
    setError(null);
    setRecipe(null);
    setSuggestions(null); // Clear suggestions on new generation
    setLastGenerationParams(params);
    try {
      const newRecipe = await generateRecipe(params.ingredients, params.diet, params.mealType, params.cookingMethod, params.specialRequest);
      setRecipe(newRecipe);
      setPage('generator'); 
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
        setInitialFormData({
            ingredients: lastGenerationParams.ingredients,
            specialRequest: lastGenerationParams.specialRequest,
        });
    } else {
        setInitialFormData(null);
    }
    setRecipe(null);
    setError(null);
  };

  const viewFavoriteRecipe = (favRecipe: Recipe) => {
    setRecipe(favRecipe);
    setPage('favorites');
  };
  
  const handleSaveRecipe = (recipeToSave: Recipe, category: string) => {
    const updatedFavorites = favoritesService.addRecipeToFavorites(recipeToSave, category);
    setFavorites(updatedFavorites);
    showNotification(`Recept elmentve a(z) "${category}" kategóriába!`, 'success');
  };

  const handleDeleteRecipe = (recipeName: string, category: string) => {
    const updatedFavorites = favoritesService.removeRecipeFromFavorites(recipeName, category);
    setFavorites(updatedFavorites);
    showNotification('Recept törölve a kedvencek közül.', 'info');
  };

  const handleDeleteCategory = (category: string) => {
    const updatedFavorites = favoritesService.removeCategory(category);
    setFavorites(updatedFavorites);
     showNotification(`"${category}" kategória törölve.`, 'info');
  };

  // Handlers for Shopping List
  const handleShoppingListAddItems = (items: string[]) => {
    const updatedList = shoppingListService.addItems(items);
    setShoppingList(updatedList);
    showNotification(`${items.length} tétel hozzáadva a bevásárlólistához!`, 'success');
  };

  const handleShoppingListAddItem = (itemText: string) => {
    const updatedList = shoppingListService.addItems([itemText]);
    setShoppingList(updatedList);
  };
  
  const handleShoppingListUpdateItem = (index: number, updatedItem: ShoppingListItem) => {
      const updatedList = shoppingListService.updateItem(index, updatedItem);
      setShoppingList(updatedList);
  };

  const handleShoppingListRemoveItem = (index: number) => {
      const updatedList = shoppingListService.removeItem(index);
      setShoppingList(updatedList);
  };

  const handleShoppingListClearChecked = () => {
      const updatedList = shoppingListService.clearChecked();
      setShoppingList(updatedList);
      showNotification('Kipipált tételek törölve.', 'info');
  };
  
  const handleShoppingListClearAll = () => {
      const updatedList = shoppingListService.clearAll();
      setShoppingList(updatedList);
      showNotification('Bevásárlólista törölve.', 'info');
  };

  const showGenerator = () => {
    setRecipe(null);
    setSuggestions(null);
    setPage('generator');
  };
  
  const showFavorites = () => {
    setRecipe(null);
    setSuggestions(null);
    setFavorites(favoritesService.getFavorites());
    setPage('favorites');
  };
  
  const showShoppingList = () => {
    setRecipe(null);
    setSuggestions(null);
    setPage('shopping-list');
  };

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
      return (
        <RecipeDisplay
          recipe={recipe}
          onClose={closeRecipeView}
          onRefine={handleRefineRecipe}
          isFromFavorites={page === 'favorites'}
          favorites={favorites}
          onSave={handleSaveRecipe}
          onAddItemsToShoppingList={handleShoppingListAddItems}
          isLoading={isLoading}
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
        />
      );
    }

    if (page === 'shopping-list') {
      return (
        <ShoppingListView
          list={shoppingList}
          onAddItem={handleShoppingListAddItem}
          onUpdateItem={handleShoppingListUpdateItem}
          onRemoveItem={handleShoppingListRemoveItem}
          onClearChecked={handleShoppingListClearChecked}
          onClearAll={handleShoppingListClearAll}
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
            AI recept generátor - ahogy Konyha Miki gondolja
          </h1>
          <p className="mt-3 text-lg text-primary-700 max-w-2xl mx-auto">
            Készítsen finom recepteket, mentse el kedvenceit és használja a konyhai időzítőt!
          </p>
        </header>

        <div className="max-w-3xl mx-auto">
            <div className="mb-6 p-2 bg-white rounded-xl shadow-sm border border-gray-200 flex justify-center items-center gap-2">
                 <NavButton active={page === 'generator'} onClick={showGenerator}>
                    Recept Generátor
                </NavButton>
                <NavButton active={page === 'favorites'} onClick={showFavorites}>
                    Kedvenceim
                </NavButton>
                <NavButton active={page === 'shopping-list'} onClick={showShoppingList}>
                    Bevásárlólista
                </NavButton>
            </div>
            {(page === 'favorites' || page === 'shopping-list') && !recipe && (
                 <AppVoiceControl
                    isSupported={isVoiceSupported}
                    isActive={isAppVoiceControlActive}
                    isListening={isAppListening}
                    isProcessing={isProcessingVoice}
                    onToggle={() => setIsAppVoiceControlActive(prev => !prev)}
                    permissionState={permissionState}
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
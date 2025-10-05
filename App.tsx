import React, { useState, useEffect, useCallback } from 'react';
import RecipeInputForm from './components/RecipeInputForm';
import RecipeDisplay from './components/RecipeDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import FavoritesView from './components/FavoritesView';
import ShoppingListView from './components/ShoppingListView';
import PantryView from './components/PantryView';
import AppVoiceControl from './components/AppVoiceControl';
import { generateRecipe, getRecipeModificationSuggestions, interpretAppCommand } from './services/geminiService';
import * as favoritesService from './services/favoritesService';
import * as shoppingListService from './services/shoppingListService';
import * as pantryService from './services/pantryService';
import { useNotification } from './contexts/NotificationContext';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import {
  Recipe,
  DietOption,
  MealType,
  CookingMethod,
  Favorites,
  RecipeSuggestions,
  AppView,
  SortOption,
  BackupData,
  ShoppingListItem,
  PantryItem,
  CuisineOption,
  RecipePace,
  AppCommand,
} from './types';
import { konyhaMikiLogo } from './assets';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('generator');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Favorites>({});
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [initialFormData, setInitialFormData] = useState<Partial<Recipe> | null>(null);
  const [isFromFavorites, setIsFromFavorites] = useState(false);
  const [recipeSuggestions, setRecipeSuggestions] = useState<RecipeSuggestions | null>(null);
  const [shouldGenerateImage, setShouldGenerateImage] = useState(false);

  // Favorites View State
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.DATE_DESC);
  
  const { showNotification } = useNotification();
  const isProcessingVoiceCommandRef = React.useRef(false);

  const loadData = useCallback(() => {
    try {
      const { favorites: favs, recoveryNotification: favsRecovery } = favoritesService.getFavorites();
      setFavorites(favs);
      if (favsRecovery) showNotification(favsRecovery, 'info');
      
      const { list: shopList, recoveryNotification: shopListRecovery } = shoppingListService.getShoppingList();
      setShoppingList(shopList);
      if (shopListRecovery) showNotification(shopListRecovery, 'info');
      
      const { list: pantryList, recoveryNotification: pantryRecovery } = pantryService.getPantry();
      setPantry(pantryList);
      if (pantryRecovery) showNotification(pantryRecovery, 'info');

    } catch (e: any) {
      setError(`Hiba történt az adatok betöltése közben: ${e.message}`);
    }
  }, [showNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecipeSubmit = async (params: { ingredients: string, excludedIngredients: string, diet: DietOption, mealType: MealType, cuisine: CuisineOption, cookingMethods: CookingMethod[], specialRequest: string, withCost: boolean, withImage: boolean, numberOfServings: number, recipePace: RecipePace, mode: 'standard' | 'leftover', useSeasonalIngredients: boolean }) => {
    setIsLoading(true);
    setError(null);
    setRecipe(null);
    setRecipeSuggestions(null);

    try {
      const generatedRecipe = await generateRecipe(
        params.ingredients,
        params.excludedIngredients,
        params.diet,
        params.mealType,
        params.cuisine,
        params.cookingMethods,
        params.specialRequest,
        params.withCost,
        params.numberOfServings,
        params.recipePace,
        params.mode,
        params.useSeasonalIngredients
      );
      setRecipe(generatedRecipe);
      setShouldGenerateImage(params.withImage);
      setIsFromFavorites(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRecipeUpdate = (updatedRecipe: Recipe) => {
    setRecipe(updatedRecipe);
    // If viewing a favorite, update it in the state and storage as well
    if (isFromFavorites) {
        // Find the category of the original recipe
        let originalCategory: string | undefined;
        for (const cat in favorites) {
            if (favorites[cat].some(r => r.recipeName === updatedRecipe.recipeName)) {
                originalCategory = cat;
                break;
            }
        }
        if (originalCategory) {
            const updatedFavorites = favoritesService.addRecipeToFavorites(updatedRecipe, originalCategory);
            setFavorites(updatedFavorites);
        }
    }
  };

  const handleCloseRecipe = () => {
    setRecipe(null);
    setError(null);
    setRecipeSuggestions(null);
    setIsFromFavorites(false);
    setInitialFormData(null);
    setView('generator');
  };

  const handleRefineRecipe = async () => {
    if (recipe) {
      setIsLoading(true);
      try {
          const suggestions = await getRecipeModificationSuggestions(recipe.ingredients.join(', '), recipe.recipeName);
          setRecipeSuggestions(suggestions);
          showNotification('Sikeresen generáltunk javaslatokat!', 'success');
      } catch (err: any) {
          showNotification(err.message, 'info');
      } finally {
          setIsLoading(false);
      }
      
      setInitialFormData({
        ingredients: recipe.ingredients.join(', '),
        excludedIngredients: '',
        diet: recipe.diet,
        mealType: recipe.mealType,
        cuisine: recipe.cuisine,
        recipePace: recipe.recipePace,
        cookingMethods: recipe.cookingMethods,
        numberOfServings: parseInt(recipe.servings, 10) || 4,
        specialRequest: '',
      });
      setRecipe(null);
      setView('generator');
    }
  };

  const handleFormPopulated = () => {
    setInitialFormData(null);
  };
  
  // Favorites handlers
  const handleSaveToFavorites = (recipeToSave: Recipe, category: string) => {
    const updatedFavorites = favoritesService.addRecipeToFavorites(recipeToSave, category);
    setFavorites(updatedFavorites);
    showNotification(`'${recipeToSave.recipeName}' elmentve a(z) '${category}' kategóriába!`, 'success');
  };
  
  const handleViewFavorite = (recipeToView: Recipe) => {
    setRecipe(recipeToView);
    setIsFromFavorites(true);
    setView('generator');
  };

  const handleDeleteFavorite = (recipeName: string, category: string) => {
    setFavorites(favoritesService.removeRecipeFromFavorites(recipeName, category));
    showNotification(`'${recipeName}' törölve a kedvencek közül.`, 'success');
  };

  const handleDeleteCategory = (category: string) => {
    setFavorites(favoritesService.removeCategory(category));
    showNotification(`'${category}' kategória törölve.`, 'success');
  };

  // Shopping list handlers
  const handleAddItemsToShoppingList = (items: string[]) => {
    const currentList = shoppingListService.getShoppingList().list;
    const newItemsCount = items.filter(item => !currentList.some(li => li.text.toLowerCase() === item.toLowerCase())).length;
    setShoppingList(shoppingListService.addItems(items));
    if (newItemsCount > 0) {
        showNotification(`${newItemsCount} tétel hozzáadva a bevásárlólistához!`, 'success');
    } else {
        showNotification('Minden tétel már a listán volt.', 'info');
    }
    setView('shopping-list');
  };
  
  const handleUpdateShoppingListItem = (index: number, updatedItem: ShoppingListItem) => {
    setShoppingList(shoppingListService.updateItem(index, updatedItem));
  };
  
  const handleRemoveShoppingListItem = (index: number) => {
    setShoppingList(shoppingListService.removeItem(index));
  };

  const handleClearCheckedShoppingList = () => {
    setShoppingList(shoppingListService.clearChecked());
  };

  const handleClearAllShoppingList = () => {
    setShoppingList(shoppingListService.clearAll());
  };
  
  // Pantry handlers
  const handleAddItemsToPantry = (items: string[]) => {
      setPantry(pantryService.addItems(items));
      showNotification('Tételek hozzáadva a kamrához!', 'success');
  };
  
  const handleUpdatePantryItem = (index: number, updatedItem: PantryItem) => {
    setPantry(pantryService.updateItem(index, updatedItem));
  };
  
  const handleRemovePantryItem = (index: number) => {
    setPantry(pantryService.removeItem(index));
  };

  const handleClearPantry = () => {
    setPantry(pantryService.clearAll());
  };
  
  const handleMoveCheckedToPantry = () => {
    const checkedItems = shoppingList.filter(item => item.checked).map(item => item.text);
    if(checkedItems.length > 0) {
      handleAddItemsToPantry(checkedItems);
      handleClearCheckedShoppingList();
      showNotification(`${checkedItems.length} tétel áthelyezve a kamrába.`, 'success');
      setView('pantry');
    }
  };
  
  // Import/Export
  const handleImportData = (data: Partial<BackupData>) => {
    try {
      let message = 'Adatok importálva.';
      let newCount = 0;
      let tempFavorites = favorites;
      let tempShoppingList = shoppingList;
      let tempPantry = pantry;
      
      if(data.favorites) {
        const { favorites: validatedFavorites, recoveryNotification } = favoritesService.validateAndRecover(data.favorites);
        if (recoveryNotification) showNotification(recoveryNotification, 'info');
        const { mergedFavorites, newRecipesCount } = favoritesService.mergeFavorites(tempFavorites, validatedFavorites);
        tempFavorites = mergedFavorites;
        newCount += newRecipesCount;
      }
      if(data.shoppingList) {
        const { list: validatedList, recoveryNotification } = shoppingListService.validateAndRecover(data.shoppingList);
        if (recoveryNotification) showNotification(recoveryNotification, 'info');
        const { mergedList, newItemsCount } = shoppingListService.mergeShoppingLists(tempShoppingList, validatedList);
        tempShoppingList = mergedList;
        newCount += newItemsCount;
      }
      if(data.pantry) {
        const { list: validatedList, recoveryNotification } = pantryService.validateAndRecover(data.pantry);
        if (recoveryNotification) showNotification(recoveryNotification, 'info');
        const { mergedList, newItemsCount } = pantryService.mergePantries(tempPantry, validatedList);
        tempPantry = mergedList;
        newCount += newItemsCount;
      }
      
      setFavorites(tempFavorites);
      setShoppingList(tempShoppingList);
      setPantry(tempPantry);
      
      favoritesService.saveFavorites(tempFavorites);
      shoppingListService.saveShoppingList(tempShoppingList);
      pantryService.savePantry(tempPantry);
      
      if(newCount > 0) {
        message = `${newCount} új elem sikeresen importálva.`;
      }
      
      showNotification(message, 'success');
      
    } catch(e: any) {
        console.error("Import failed:", e);
        showNotification(`Hiba az importálás során: ${e.message}`, 'info');
    }
  };

  const handleAppVoiceResult = async (transcript: string) => {
    if (isProcessingVoiceCommandRef.current) return;
    isProcessingVoiceCommandRef.current = true;
    try {
        const command: AppCommand = await interpretAppCommand(transcript, view, {
            categories: Object.keys(favorites),
            recipesByCategory: {}, // This context is not fully implemented yet
            shoppingListItems: shoppingList.map(i => i.text),
            pantryItems: pantry.map(i => i.text),
        });

        switch(command.action) {
            case 'navigate':
                if (['generator', 'favorites', 'shopping-list', 'pantry'].includes(command.payload)) {
                    setView(command.payload as AppView);
                    showNotification(`Navigálás ide: ${command.payload}`, 'info');
                }
                break;
            case 'add_shopping_list_item':
                const items = (command.payload as string).split(',').map(s => s.trim()).filter(Boolean);
                handleAddItemsToShoppingList(items);
                break;
            // TODO: Add other app command handlers here...
            default:
                showNotification(`Ismeretlen parancs: "${transcript}"`, 'info');
        }
    } catch (e: any) {
        showNotification(e.message, 'info');
    } finally {
        isProcessingVoiceCommandRef.current = false;
    }
  };

  const { isListening, isSupported, startListening, stopListening, permissionState } = useSpeechRecognition({
      onResult: handleAppVoiceResult,
      continuous: false
  });

  const renderView = () => {
    if (recipe) {
      return (
        <RecipeDisplay
          recipe={recipe}
          onClose={handleCloseRecipe}
          onRefine={handleRefineRecipe}
          isFromFavorites={isFromFavorites}
          favorites={favorites}
          onSave={handleSaveToFavorites}
          onAddItemsToShoppingList={handleAddItemsToShoppingList}
          isLoading={isLoading}
          onRecipeUpdate={handleRecipeUpdate}
          shouldGenerateImageInitially={shouldGenerateImage}
        />
      );
    }

    switch (view) {
      case 'favorites':
        return (
          <FavoritesView
            favorites={favorites}
            shoppingList={shoppingList}
            pantry={pantry}
            onViewRecipe={handleViewFavorite}
            onDeleteRecipe={handleDeleteFavorite}
            onDeleteCategory={handleDeleteCategory}
            onImportData={handleImportData}
            expandedCategories={expandedCategories}
            onToggleCategory={(cat) => setExpandedCategories(prev => ({...prev, [cat]: !prev[cat]}))}
            filterCategory={filterCategory}
            onSetFilterCategory={setFilterCategory}
            sortOption={sortOption}
            onSetSortOption={setSortOption}
          />
        );
      case 'shopping-list':
        return (
          <ShoppingListView
            list={shoppingList}
            favorites={favorites}
            pantry={pantry}
            onAddItems={handleAddItemsToShoppingList}
            onUpdateItem={handleUpdateShoppingListItem}
            onRemoveItem={handleRemoveShoppingListItem}
            onClearChecked={handleClearCheckedShoppingList}
            onClearAll={handleClearAllShoppingList}
            onImportData={handleImportData}
          />
        );
      case 'pantry':
        return (
            <PantryView
              list={pantry}
              favorites={favorites}
              shoppingList={shoppingList}
              onAddItems={handleAddItemsToPantry}
              onUpdateItem={handleUpdatePantryItem}
              onRemoveItem={handleRemovePantryItem}
              onClearAll={handleClearPantry}
              onMoveCheckedToPantry={handleMoveCheckedToPantry}
              onImportData={handleImportData}
              shoppingListItems={shoppingList}
            />
        );
      case 'generator':
      default:
        return (
          <>
            <h1 className="text-3xl font-bold text-center text-primary-800">Konyha Miki, a mesterséges intelligencia konyhamester</h1>
            <p className="text-center text-gray-600 mb-6">Mondja el, miből főzne, és én segítek!</p>
            {isLoading && <LoadingSpinner />}
            {error && <ErrorMessage message={error} />}
            {!isLoading && !error && (
              <RecipeInputForm 
                onSubmit={handleRecipeSubmit}
                isLoading={isLoading}
                initialFormData={initialFormData}
                onFormPopulated={handleFormPopulated}
                suggestions={recipeSuggestions}
              />
            )}
          </>
        );
    }
  };

  const navItems: { id: AppView; label: string }[] = [
    { id: 'generator', label: 'Receptgenerátor' },
    { id: 'favorites', label: 'Kedvencek' },
    { id: 'shopping-list', label: 'Bevásárlólista' },
    { id: 'pantry', label: 'Kamra' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <img src={konyhaMikiLogo} alt="Konyha Miki Logó" className="h-12" />
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4 md:p-6">
          <nav className="mb-6">
              <ul className="flex flex-wrap border-b border-gray-200">
                  {navItems.map(item => (
                      <li key={item.id} className="-mb-px mr-1">
                          <button
                              onClick={() => setView(item.id)}
                              className={`inline-block py-3 px-4 font-semibold rounded-t-lg transition-colors text-sm sm:text-base ${
                                  view === item.id 
                                  ? 'border-l border-t border-r border-gray-200 bg-white text-primary-600'
                                  : 'text-gray-500 hover:text-primary-600 hover:bg-gray-100'
                              }`}
                          >
                              {item.label}
                          </button>
                      </li>
                  ))}
              </ul>
          </nav>
        
        <AppVoiceControl
            isSupported={isSupported}
            isListening={isListening}
            isProcessing={isProcessingVoiceCommandRef.current}
            onClick={() => isListening ? stopListening() : startListening()}
            permissionState={permissionState as any} // Cast because our enum is more specific
            isRateLimited={false} // This feature is not implemented for app-wide control yet
        />
        
        <div className="bg-white p-4 md:p-8 rounded-lg shadow-lg">
          {renderView()}
        </div>
      </main>
      
      <footer className="text-center py-6 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Konyha Miki. Minden jog fenntartva.</p>
      </footer>
    </div>
  );
};

export default App;

import React, { useState, useEffect } from 'react';
import type { Recipe, DietOption, MealType, Favorites, CookingMethod, RecipeSuggestions, ShoppingListItem } from './types';
import { generateRecipe, getRecipeModificationSuggestions } from './services/geminiService';
import * as favoritesService from './services/favoritesService';
import * as shoppingListService from './services/shoppingListService';
import RecipeInputForm from './components/RecipeInputForm';
import RecipeDisplay from './components/RecipeDisplay';
import FavoritesView from './components/FavoritesView';
import ShoppingListView from './components/ShoppingListView';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import { useNotification } from './contexts/NotificationContext';

interface RecipeGenerationParams {
  ingredients: string;
  diet: DietOption;
  mealType: MealType;
  cookingMethod: CookingMethod;
  specialRequest: string;
}

const App: React.FC = () => {
  const [page, setPage] = useState<'generator' | 'favorites' | 'shopping-list'>('generator');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [favorites, setFavorites] = useState<Favorites>({});
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerationParams, setLastGenerationParams] = useState<RecipeGenerationParams | null>(null);
  const [initialFormData, setInitialFormData] = useState<Partial<RecipeGenerationParams> | null>(null);
  const [suggestions, setSuggestions] = useState<RecipeSuggestions | null>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    setFavorites(favoritesService.getFavorites());
    setShoppingList(shoppingListService.getShoppingList());
  }, []);
  
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

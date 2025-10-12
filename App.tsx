import React, { useState, useEffect, useCallback, useRef } from 'react';
import RecipeInputForm from './components/RecipeInputForm';
import RecipeDisplay from './components/RecipeDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import FavoritesView from './components/FavoritesView';
import ShoppingListView from './components/ShoppingListView';
import PantryView from './components/PantryView';
import UsersView from './components/UsersView';
import AppVoiceControl from './components/AppVoiceControl';
// FIX: The imported module was missing a default export. This has been fixed in the component file.
import LocationPromptModal from './components/LocationPromptModal';
import LoadOnStartModal from './components/LoadOnStartModal';
import { generateRecipe, getRecipeModificationSuggestions, interpretAppCommand } from './services/geminiService';
import * as favoritesService from './services/favoritesService';
import * as shoppingListService from './services/shoppingListService';
import * as pantryService from './services/pantryService';
import * as userService from './services/userService';
import { useNotification } from './contexts/NotificationContext';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useTranslation } from './hooks/useTranslation';
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
  PantryLocation,
  StorageType,
  UserProfile,
  OptionItem,
  AlternativeRecipeSuggestion,
} from './types';
import {
    MEAL_TYPES,
    CUISINE_OPTIONS,
    COOKING_METHODS,
    COOKING_METHOD_CAPACITIES,
    MEAL_TYPES_STORAGE_KEY,
    CUISINE_OPTIONS_STORAGE_KEY,
    COOKING_METHODS_STORAGE_KEY,
    COOKING_METHOD_CAPACITIES_STORAGE_KEY,
    MEAL_TYPES_ORDER_KEY,
    COOKING_METHODS_ORDER_KEY,
    CUISINE_OPTIONS_ORDER_KEY,
} from './constants';
import { safeSetLocalStorage } from './utils/storage';
import { konyhaMikiLogo } from './assets';
import * as imageStore from './services/imageStore';
import DataManagementControls from './components/DataManagementControls';

const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
    try {
        const storedValue = localStorage.getItem(key);
        if (storedValue) {
            return JSON.parse(storedValue) as T;
        }
    } catch (error) {
        console.error(`Error loading from localStorage key "${key}":`, error);
        localStorage.removeItem(key); // Remove corrupted data
    }
    return defaultValue;
};


const App: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const [view, setView] = useState<AppView>('generator');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Favorites>({});
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [pantry, setPantry] = useState<Record<PantryLocation, PantryItem[]>>({ Tiszadada: [], Vásárosnamény: [] });
  const [users, setUsers] = useState<UserProfile[]>([]);
  // FIX: The state type for initial form data was incorrect (`Partial<Recipe>`), causing a mismatch with RecipeInputForm's props and type errors on assignment. The type now correctly reflects the form's data structure (`ingredients` as a string).
  const [initialFormData, setInitialFormData] = useState<Partial<{ ingredients: string, excludedIngredients: string, diet: DietOption, mealType: MealType, cuisine: CuisineOption, cookingMethods: CookingMethod[], specialRequest: string, withCost: boolean, withImage: boolean, numberOfServings: number, recipePace: RecipePace, mode: 'standard' | 'leftover', useSeasonalIngredients: boolean }> | null>(null);
  const [isFromFavorites, setIsFromFavorites] = useState(false);
  const [recipeSuggestions, setRecipeSuggestions] = useState<RecipeSuggestions | null>(null);
  const [shouldGenerateImage, setShouldGenerateImage] = useState(false);

  // Favorites View State
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.DATE_DESC);
  
  // Location prompt state
  const [isLocationPromptOpen, setIsLocationPromptOpen] = useState(false);
  const [locationCallback, setLocationCallback] = useState<(location: PantryLocation) => void>(() => () => {});
  const [isLoadOnStartModalOpen, setIsLoadOnStartModalOpen] = useState(false);

  // Customizable options state (lifted from RecipeInputForm)
  const [mealTypes, setMealTypes] = useState<OptionItem[]>(() => loadFromLocalStorage(MEAL_TYPES_STORAGE_KEY, MEAL_TYPES));
  const [cuisineOptions, setCuisineOptions] = useState<OptionItem[]>(() => loadFromLocalStorage(CUISINE_OPTIONS_STORAGE_KEY, CUISINE_OPTIONS));
  const [cookingMethodsList, setCookingMethodsList] = useState<OptionItem[]>(() => loadFromLocalStorage(COOKING_METHODS_STORAGE_KEY, COOKING_METHODS));
  const [cookingMethodCapacities, setCookingMethodCapacities] = useState<Record<string, number | null>>(() => loadFromLocalStorage(COOKING_METHOD_CAPACITIES_STORAGE_KEY, COOKING_METHOD_CAPACITIES));
  
  const [orderedMealTypes, setOrderedMealTypes] = useState<OptionItem[]>([]);
  const [orderedCookingMethods, setOrderedCookingMethods] = useState<OptionItem[]>([]);
  const [orderedCuisineOptions, setOrderedCuisineOptions] = useState<OptionItem[]>([]);


  const { showNotification } = useNotification();
  const isProcessingVoiceCommandRef = React.useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t('app.documentTitle');
  }, [language, t]);

  const loadData = useCallback(() => {
    try {
      const { favorites: favs, recoveryNotification: favsRecovery } = favoritesService.getFavorites();
      setFavorites(favs);
      if (favsRecovery) showNotification(favsRecovery, 'info');

      // Set all loaded categories to be expanded by default for better UX.
      const initialExpanded = Object.keys(favs).reduce((acc, cat) => {
        acc[cat] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setExpandedCategories(initialExpanded);
      
      const { list: shopList, recoveryNotification: shopListRecovery } = shoppingListService.getShoppingList();
      setShoppingList(shopList);
      if (shopListRecovery) showNotification(shopListRecovery, 'info');
      
      const { pantry: pantryData, recoveryNotification: pantryRecovery } = pantryService.getPantry();
      setPantry(pantryData);
      if (pantryRecovery) showNotification(pantryRecovery, 'info');

      const { users: usersData, recoveryNotification: usersRecovery } = userService.getUsers();
      setUsers(usersData);
      if (usersRecovery) showNotification(usersRecovery, 'info');

    } catch (e: any) {
      setError(`Hiba történt az adatok betöltése közben: ${e.message}`);
    }
  }, [showNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Effect to prompt loading data if storage is empty on startup.
  useEffect(() => {
    const favoritesData = localStorage.getItem('ai-recipe-generator-favorites');
    const shoppingListData = localStorage.getItem('ai-recipe-generator-shopping-list');
    const pantryData = localStorage.getItem('ai-recipe-generator-pantry');
    
    const hasFavorites = favoritesData && favoritesData !== '{}';
    const hasShoppingList = shoppingListData && shoppingListData !== '[]';
    const hasPantry = pantryData && pantryData !== '{"Tiszadada":[],"Vásárosnamény":[]}';
    
    if (!hasFavorites && !hasShoppingList && !hasPantry) {
        const timer = setTimeout(() => {
            setIsLoadOnStartModalOpen(true);
        }, 1000);
        return () => clearTimeout(timer);
    }
  }, []);

  // Effect to warn user before closing the tab if they have data.
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
        const favoritesData = localStorage.getItem('ai-recipe-generator-favorites');
        const shoppingListData = localStorage.getItem('ai-recipe-generator-shopping-list');
        const pantryData = localStorage.getItem('ai-recipe-generator-pantry');

        const hasFavorites = favoritesData && favoritesData !== '{}';
        const hasShoppingList = shoppingListData && shoppingListData !== '[]';
        const hasPantry = pantryData && pantryData !== '{"Tiszadada":[],"Vásárosnamény":[]}';

        if (hasFavorites || hasShoppingList || hasPantry) {
            const message = "Biztosan ki akar lépni? Az adatok a böngészőben mentve vannak, de a biztonság kedvéért érdemes lehet a 'Mentés Fájlba' funkcióval is elmenteni egy fájlba.";
            event.returnValue = message;
            return message;
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Effects to sync ordered lists (lifted from RecipeInputForm)
    useEffect(() => {
        const savedOrder = loadFromLocalStorage<string[] | null>(MEAL_TYPES_ORDER_KEY, null);
        const optionsMap = new Map(mealTypes.map(item => [item.value, item]));
        let finalOrderedList: OptionItem[];
        
        if (savedOrder) {
            const orderedList = savedOrder
                .map(value => optionsMap.get(value))
                .filter((item): item is OptionItem => !!item);
            
            const orderedValues = new Set(orderedList.map(item => item.value));
            const newItems = mealTypes.filter(item => !orderedValues.has(item.value));
            finalOrderedList = [...orderedList, ...newItems];
        } else {
            finalOrderedList = [...mealTypes];
        }
        setOrderedMealTypes(finalOrderedList);
    }, [mealTypes]);
    
    useEffect(() => {
        const savedOrder = loadFromLocalStorage<string[] | null>(COOKING_METHODS_ORDER_KEY, null);
        const optionsMap = new Map(cookingMethodsList.map(item => [item.value, item]));
        let finalOrderedList: OptionItem[];
        
        if (savedOrder) {
            const orderedList = savedOrder
                .map(value => optionsMap.get(value))
                .filter((item): item is OptionItem => !!item);
            
            const orderedValues = new Set(orderedList.map(item => item.value));
            const newItems = cookingMethodsList.filter(item => !orderedValues.has(item.value));
            finalOrderedList = [...orderedList, ...newItems];
        } else {
            finalOrderedList = [...cookingMethodsList];
        }
        setOrderedCookingMethods(finalOrderedList);
    }, [cookingMethodsList]);

    useEffect(() => {
        const savedOrder = loadFromLocalStorage<string[] | null>(CUISINE_OPTIONS_ORDER_KEY, null);
        const optionsMap = new Map(cuisineOptions.map(item => [item.value, item]));
        let finalOrderedList: OptionItem[];
        
        if (savedOrder) {
            const orderedList = savedOrder
                .map(value => optionsMap.get(value))
                .filter((item): item is OptionItem => !!item);
            
            const orderedValues = new Set(orderedList.map(item => item.value));
            const newItems = cuisineOptions.filter(item => !orderedValues.has(item.value));
            finalOrderedList = [...orderedList, ...newItems];
        } else {
            finalOrderedList = [...cuisineOptions];
        }
        setOrderedCuisineOptions(finalOrderedList);
    }, [cuisineOptions]);

  const handleRecipeSubmit = async (params: { ingredients: string, excludedIngredients: string, diet: DietOption, mealType: MealType, cuisine: CuisineOption, cookingMethods: CookingMethod[], specialRequest: string, withCost: boolean, withImage: boolean, numberOfServings: number, recipePace: RecipePace, mode: 'standard' | 'leftover', useSeasonalIngredients: boolean }) => {
    setIsLoading(true);
    setError(null);
    setRecipe(null);
    setRecipeSuggestions(null);
    setView('generator'); // Make sure we are on the generator view

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
        params.useSeasonalIngredients,
        mealTypes,
        cuisineOptions,
        cookingMethodsList,
        cookingMethodCapacities
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
  
  const handleRecipeUpdate = async (updatedRecipe: Recipe, originalRecipe?: Recipe) => {
    setRecipe(updatedRecipe);
    if (isFromFavorites && originalRecipe) {
        let originalCategory: string | undefined;
        for (const cat in favorites) {
            if (favorites[cat].some(r => r.recipeName === originalRecipe.recipeName)) {
                originalCategory = cat;
                break;
            }
        }
        if (originalCategory) {
            // If name has changed, we must remove the old entry first.
            if (originalRecipe.recipeName !== updatedRecipe.recipeName) {
                 await favoritesService.removeRecipeFromFavorites(originalRecipe.recipeName, originalCategory);
            }
            const finalFavorites = await favoritesService.addRecipeToFavorites(updatedRecipe, originalCategory);
            setFavorites(finalFavorites);
            showNotification('Recept sikeresen frissítve!', 'success');
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
        diet: DietOption.DIABETIC,
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

  const handleGenerateFromSuggestion = (suggestion: AlternativeRecipeSuggestion) => {
    if (!recipe) return;

    const baseParams = {
        diet: recipe.diet,
        mealType: recipe.mealType,
        cuisine: recipe.cuisine,
        numberOfServings: parseInt(recipe.servings, 10) || 4,
        recipePace: recipe.recipePace,
    };

    const suggestedParams = suggestion.newParameters;

    const finalParams = {
        // Defaults for a new generation
        excludedIngredients: '',
        withCost: false, // Don't run expensive ops by default
        withImage: true, // Show an image for the new idea
        mode: 'standard' as const,
        useSeasonalIngredients: true,
        
        // Carry-overs from original recipe
        ...baseParams,
        
        // Overrides from suggestion
        ingredients: suggestedParams.ingredients || recipe.ingredients.join(', '),
        cookingMethods: suggestedParams.cookingMethods || recipe.cookingMethods,
        specialRequest: suggestedParams.specialRequest || `Készíts egy változatot a(z) "${recipe.recipeName}" receptre, ami a következő leírásnak felel meg: ${suggestion.description}`,
    };

    handleRecipeSubmit(finalParams);
  };

  const handleFormPopulated = () => {
    setInitialFormData(null);
  };
  
  // Favorites handlers
  const handleSaveToFavorites = async (recipeToSave: Recipe, category: string) => {
    try {
      const updatedFavorites = await favoritesService.addRecipeToFavorites(recipeToSave, category);
      setFavorites(updatedFavorites);
      showNotification(`'${recipeToSave.recipeName}' elmentve a(z) '${category}' kategóriába.`, 'success');
    } catch (e: any) {
      console.error("Failed to save to favorites:", e);
      showNotification(e.message || 'Hiba történt a mentés közben.', 'info');
    }
  };
  
  const handleViewFavorite = (recipeToView: Recipe) => {
    setRecipe(recipeToView);
    setIsFromFavorites(true);
    setView('generator');
  };

  const handleDeleteFavorite = async (recipeName: string, category: string): Promise<void> => {
    try {
        const updatedFavorites = await favoritesService.removeRecipeFromFavorites(recipeName, category);
        setFavorites(updatedFavorites);
        showNotification(`'${recipeName}' törölve a mentettek közül.`, 'success');
    } catch (error: any) {
        console.error("Failed to delete favorite:", error);
        showNotification(`Hiba történt a törlés közben: ${error.message}`, 'info');
        // Re-throw to allow caller to handle UI state
        throw error;
    }
  };

  const handleDeleteCategory = async (category: string) => {
    const updatedFavorites = await favoritesService.removeCategory(category);
    setFavorites(updatedFavorites);
    // Also remove the category from the expanded state tracker to prevent stale state
    setExpandedCategories(prev => {
        const newState = { ...prev };
        delete newState[category];
        return newState;
    });
    showNotification(`'${category}' kategória törölve.`, 'success');
  };
  
  const handleMoveFavorite = (recipe: Recipe, fromCategory: string, toCategory: string) => {
    const result = favoritesService.moveRecipe(recipe, fromCategory, toCategory);
    if (result.success) {
        setFavorites(result.updatedFavorites);
        showNotification(`'${recipe.recipeName}' áthelyezve ide: '${toCategory}'`, 'success');
    } else {
        showNotification(result.message || 'Az áthelyezés nem sikerült.', 'info');
    }
  };

  const handleUpdateFavoriteStatus = async (recipeName: string, category: string, favoritedByIds: string[]) => {
    try {
      const updatedFavorites = await favoritesService.updateFavoriteStatus(recipeName, category, favoritedByIds);
      setFavorites(updatedFavorites);

      if (recipe && recipe.recipeName === recipeName) {
        const updatedRecipe = updatedFavorites[category]?.find(r => r.recipeName === recipeName);
        if (updatedRecipe) setRecipe(updatedRecipe);
      }
      showNotification('Kedvenc állapot frissítve!', 'success');
    } catch (e: any) {
      showNotification('Hiba a mentés közben.', 'info');
    }
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
  const handleAddItemsToPantry = (items: string[], location: PantryLocation, date: string | null, storageType: StorageType) => {
      setPantry(pantryService.addItems(items, location, date, storageType));
      showNotification(`Tételek hozzáadva a(z) ${location} kamrához!`, 'success');
  };
  
  const handleUpdatePantryItem = (originalItem: PantryItem, updatedItem: PantryItem, location: PantryLocation) => {
    const originalIndex = pantry[location]?.findIndex(item => 
        item.text === originalItem.text &&
        item.dateAdded === originalItem.dateAdded &&
        item.quantity === originalItem.quantity &&
        item.storageType === originalItem.storageType
    );

    if (originalIndex === -1 || typeof originalIndex === 'undefined') {
        console.error("Item to update not found in original pantry list.", originalItem);
        showNotification("Hiba: A szerkesztendő elem nem található.", "info");
        return;
    }
    
    setPantry(pantryService.updateItem(originalIndex, updatedItem, location));
  };
  
  const handleRemovePantryItem = (itemToDelete: PantryItem, location: PantryLocation) => {
    const originalIndex = pantry[location]?.findIndex(item => 
        item.text === itemToDelete.text &&
        item.dateAdded === itemToDelete.dateAdded &&
        item.quantity === itemToDelete.quantity &&
        item.storageType === itemToDelete.storageType
    );

    if (originalIndex === -1 || typeof originalIndex === 'undefined') {
        console.error("Item to delete not found in original pantry list.", itemToDelete);
        showNotification("Hiba: A törlendő elem nem található.", "info");
        return;
    }

    // First, remove the item from the pantry state
    setPantry(pantryService.removeItem(originalIndex, location));

    // Then, add the item to the shopping list
    const currentShoppingList = shoppingListService.getShoppingList().list;
    const isAlreadyOnList = currentShoppingList.some(li => li.text.toLowerCase() === itemToDelete.text.toLowerCase());
    
    setShoppingList(shoppingListService.addItems([itemToDelete.text]));
    
    if (!isAlreadyOnList) {
        showNotification(`'${itemToDelete.text}' áthelyezve a bevásárlólistára.`, 'success');
    } else {
        showNotification(`'${itemToDelete.text}' törölve a kamrából (már szerepelt a bevásárlólistán).`, 'info');
    }
  };

  const handleClearPantry = (location: PantryLocation) => {
    setPantry(pantryService.clearAll(location));
  };
  
  const handleMoveCheckedToPantryRequest = () => {
    const checkedItems = shoppingList.filter(item => item.checked).map(item => item.text);
    if (checkedItems.length > 0) {
        setLocationCallback(() => (location: PantryLocation) => {
            // When moving, use current date and default pantry storage type
            const today = new Date().toISOString().split('T')[0];
            handleAddItemsToPantry(checkedItems, location, today, StorageType.PANTRY);
            handleClearCheckedShoppingList();
            showNotification(`${checkedItems.length} tétel áthelyezve a(z) ${location} kamrába.`, 'success');
            setView('pantry');
        });
        setIsLocationPromptOpen(true);
    } else {
        showNotification('Nincsenek kipipált tételek a bevásárlólistán.', 'info');
    }
  };

  const storageTypeLabels: Record<StorageType, { label: string; icon: string }> = {
    [StorageType.FREEZER]: { label: "Fagyasztó", icon: "❄️" },
    [StorageType.REFRIGERATOR]: { label: "Hűtő", icon: "🧊" },
    [StorageType.PANTRY]: { label: "Kamra", icon: "🥫" },
  };

  const handleMoveShoppingListItemToPantryRequest = (index: number, itemText: string, storageType: StorageType) => {
    setLocationCallback(() => (location: PantryLocation) => {
        const today = new Date().toISOString().split('T')[0];
        // 1. Add item to pantry state and storage
        setPantry(pantryService.addItems([itemText], location, today, storageType));
        // 2. Remove item from shopping list state and storage
        setShoppingList(shoppingListService.removeItem(index));

        showNotification(`'${itemText}' áthelyezve a(z) ${location} kamrába (${storageTypeLabels[storageType].label}).`, 'success');
    });
    setIsLocationPromptOpen(true);
  };


  const handleGenerateFromPantryRequest = () => {
    setLocationCallback(() => (location: PantryLocation) => handleGenerateFromPantry(location));
    setIsLocationPromptOpen(true);
  };

  const handleGenerateFromPantry = (location: PantryLocation) => {
    const ingredientsFromPantry = [...pantry[location]] // Create a copy to sort
      .sort((a, b) => {
            if (a.dateAdded === null && b.dateAdded !== null) return -1; // a (unknown) comes first
            if (a.dateAdded !== null && b.dateAdded === null) return 1;  // b (unknown) comes first
            if (a.dateAdded === null && b.dateAdded === null) return 0; // order doesn't matter
            // both have dates, sort by oldest
            return new Date(a.dateAdded!).getTime() - new Date(b.dateAdded!).getTime();
      })
      .slice(0, 5) // take up to 5 oldest/unknown ingredients
      .map(item => item.text)
      .join(', ');

    if (!ingredientsFromPantry) {
        showNotification(`A kamra (${location}) üres!`, 'info');
        return;
    }
    
    // Clear the current recipe and suggestions to show the form
    setRecipe(null);
    setRecipeSuggestions(null);

    // Set initial form data for the RecipeInputForm
    setInitialFormData({
        ingredients: ingredientsFromPantry,
        excludedIngredients: '',
        diet: DietOption.DIABETIC,
        mealType: MealType.LUNCH,
        cuisine: CuisineOption.NONE,
        cookingMethods: [CookingMethod.TRADITIONAL],
        specialRequest: 'Készíts egy finom ételt a kamrában legrégebben tárolt alapanyagokból.',
        withCost: false,
        withImage: false,
        numberOfServings: 2,
        recipePace: RecipePace.NORMAL,
        mode: 'standard',
        useSeasonalIngredients: true,
    });

    setView('generator');
    showNotification(`A legrégebbi kamra alapanyagok betöltve. Módosítsa a feltételeket és generáljon receptet!`, 'success');
  };

  const handleGenerateFromSelectedPantryItemsRequest = (items: string[]) => {
    if (items.length === 0) {
        showNotification('Nincsenek kijelölt alapanyagok!', 'info');
        return;
    }
    
    const ingredientsString = items.join(', ');

    // Clear the current recipe to show the form
    setRecipe(null);
    setRecipeSuggestions(null);

    // Set initial form data
    setInitialFormData({
        ingredients: ingredientsString,
        excludedIngredients: '',
        diet: DietOption.DIABETIC,
        mealType: MealType.LUNCH,
        cuisine: CuisineOption.NONE,
        cookingMethods: [CookingMethod.TRADITIONAL],
        specialRequest: 'Készíts egy finom ételt a kamrából kiválasztott alapanyagokból.',
        withCost: false,
        withImage: false,
        numberOfServings: 2,
        recipePace: RecipePace.NORMAL,
        mode: 'standard', // Use standard mode
        useSeasonalIngredients: true,
    });

    setView('generator');
    showNotification(`Kijelölt alapanyagok betöltve. Finomítsa a keresést és generáljon receptet!`, 'success');
  };
  
  const handleMovePantryItems = (indices: number[], sourceLocation: PantryLocation, destinationLocation: PantryLocation) => {
      const updatedPantry = pantryService.moveItems(indices, sourceLocation, destinationLocation);
      setPantry(updatedPantry);
      showNotification(`${indices.length} tétel sikeresen áthelyezve ide: ${destinationLocation}.`, 'success');
  };

  // User handlers
    // FIX: Update handleSaveUser to correctly handle adding new users (without an ID) and updating existing ones.
    const handleSaveUser = (user: UserProfile | Omit<UserProfile, 'id'>) => {
        if (!('id' in user)) {
            // This is a new user
            const updatedUsers = userService.addUser(users, user);
            setUsers(updatedUsers);
            showNotification(`'${user.name}' hozzáadva.`, 'success');
        } else {
            // This is an update
            const updatedUsers = userService.updateUser(users, user as UserProfile);
            setUsers(updatedUsers);
            showNotification(`'${user.name}' adatok mentve.`, 'success');
        }
    };

    const handleDeleteUser = (userId: string) => {
        const userToDelete = users.find(u => u.id === userId);
        if (userToDelete && window.confirm(`Biztosan törli a következő felhasználót: ${userToDelete.name}?`)) {
            const updatedUsers = userService.deleteUser(users, userId);
            setUsers(updatedUsers);
            showNotification('Felhasználó törölve.', 'success');
        }
    };


  // Import/Export
  const handleImportData = async (data: Partial<BackupData>) => {
    try {
      let message = 'Adatok importálva.';
      let newCount = 0;
      let tempFavorites = { ...favorites };
      let tempShoppingList = [...shoppingList];
      let tempPantry = { ...pantry };
      let tempUsers = [...users];

      // 1. Import images into IndexedDB first
      if (data.images && typeof data.images === 'object') {
        const imageEntries = Object.entries(data.images);
        if (imageEntries.length > 0) {
          const imagePromises = imageEntries.map(([id, imageData]) =>
            imageStore.saveImage(id, imageData as string)
          );
          await Promise.all(imagePromises);
        }
      }

      // 2. Merge favorites
      if (data.favorites) {
        const { favorites: validatedFavorites, recoveryNotification } = favoritesService.validateAndRecover(data.favorites);
        if (recoveryNotification) showNotification(recoveryNotification, 'info');
        const { mergedFavorites, newRecipesCount } = favoritesService.mergeFavorites(tempFavorites, validatedFavorites);
        tempFavorites = mergedFavorites;
        newCount += newRecipesCount;
      }

      // 3. Merge other data structures
      if (data.shoppingList) {
        const { list: validatedList, recoveryNotification } = shoppingListService.validateAndRecover(data.shoppingList);
        if (recoveryNotification) showNotification(recoveryNotification, 'info');
        const { mergedList, newItemsCount } = shoppingListService.mergeShoppingLists(tempShoppingList, validatedList);
        tempShoppingList = mergedList;
        newCount += newItemsCount;
      }
      if (data.pantry) {
        const { pantry: validatedPantry, recoveryNotification } = pantryService.validateAndRecover(data.pantry);
        if (recoveryNotification) showNotification(recoveryNotification, 'info');
        const { mergedPantry, newItemsCount } = pantryService.mergePantries(tempPantry, validatedPantry);
        tempPantry = mergedPantry;
        newCount += newItemsCount;
      }
      if (data.users) {
        const { users: validatedUsers, recoveryNotification } = userService.validateAndRecover(data.users);
        if (recoveryNotification) showNotification(recoveryNotification, 'info');
        const { mergedUsers, newItemsCount: newUsersCount } = userService.mergeUsers(tempUsers, validatedUsers);
        tempUsers = mergedUsers;
        newCount += newUsersCount;
      }

      // 4. Process the final merged favorites to move any Data URLs (from old backups) to IndexedDB
      tempFavorites = await favoritesService.processFavoritesForStorage(tempFavorites);
      
      // 5. Update state and save everything to localStorage
      setFavorites(tempFavorites);
      setShoppingList(tempShoppingList);
      setPantry(tempPantry);
      setUsers(tempUsers);
      
      favoritesService.saveFavorites(tempFavorites);
      shoppingListService.saveShoppingList(tempShoppingList);
      pantryService.savePantry(tempPantry);
      userService.saveUsers(tempUsers);
      
      if(newCount > 0) {
        message = `${newCount} új elem sikeresen importálva.`;
      }
      
      // Handle custom options import with MERGE logic
      let optionsMessage = '';
      if (data.mealTypes && Array.isArray(data.mealTypes)) {
          const optionMap = new Map(mealTypes.map(opt => [opt.value, opt]));
          (data.mealTypes as OptionItem[]).forEach(opt => optionMap.set(opt.value, opt));
          const mergedOptions = Array.from(optionMap.values());

          setMealTypes(mergedOptions);
          safeSetLocalStorage(MEAL_TYPES_STORAGE_KEY, mergedOptions);
          if (data.mealTypesOrder) {
              const importedOrderSet = new Set(data.mealTypesOrder);
              // FIX: Explicitly type `opt` as `OptionItem` to resolve error when accessing `opt.value`.
              const newItems = mergedOptions.filter((opt: OptionItem) => !importedOrderSet.has(opt.value)).map((opt: OptionItem) => opt.value);
              const finalOrder = [...data.mealTypesOrder, ...newItems];
              safeSetLocalStorage(MEAL_TYPES_ORDER_KEY, finalOrder);
          }
          optionsMessage += ' Étkezés típusok,';
      }
      if (data.cuisineOptions && Array.isArray(data.cuisineOptions)) {
          const optionMap = new Map(cuisineOptions.map(opt => [opt.value, opt]));
          (data.cuisineOptions as OptionItem[]).forEach(opt => optionMap.set(opt.value, opt));
          const mergedOptions = Array.from(optionMap.values());

          setCuisineOptions(mergedOptions);
          safeSetLocalStorage(CUISINE_OPTIONS_STORAGE_KEY, mergedOptions);
          if (data.cuisineOptionsOrder) {
              const importedOrderSet = new Set(data.cuisineOptionsOrder);
              // FIX: Explicitly type `opt` as `OptionItem` to resolve error when accessing `opt.value`.
              const newItems = mergedOptions.filter((opt: OptionItem) => !importedOrderSet.has(opt.value)).map((opt: OptionItem) => opt.value);
              const finalOrder = [...data.cuisineOptionsOrder, ...newItems];
              safeSetLocalStorage(CUISINE_OPTIONS_ORDER_KEY, finalOrder);
          }
          optionsMessage += ' konyhák,';
      }
      if (data.cookingMethods && Array.isArray(data.cookingMethods)) {
          const optionMap = new Map(cookingMethodsList.map(opt => [opt.value, opt]));
          (data.cookingMethods as OptionItem[]).forEach(opt => optionMap.set(opt.value, opt));
          const mergedOptions = Array.from(optionMap.values());
          
          setCookingMethodsList(mergedOptions);
          safeSetLocalStorage(COOKING_METHODS_STORAGE_KEY, mergedOptions);

          if (data.cookingMethodCapacities) {
              const mergedCaps = { ...cookingMethodCapacities, ...data.cookingMethodCapacities };
              setCookingMethodCapacities(mergedCaps);
              safeSetLocalStorage(COOKING_METHOD_CAPACITIES_STORAGE_KEY, mergedCaps);
          }
          if (data.cookingMethodsOrder) {
              const importedOrderSet = new Set(data.cookingMethodsOrder);
              // FIX: Explicitly type `opt` as `OptionItem` to resolve error when accessing `opt.value`.
              const newItems = mergedOptions.filter((opt: OptionItem) => !importedOrderSet.has(opt.value)).map((opt: OptionItem) => opt.value);
              const finalOrder = [...data.cookingMethodsOrder, ...newItems];
              safeSetLocalStorage(COOKING_METHODS_ORDER_KEY, finalOrder);
          }
          optionsMessage += ' elkészítési módok';
      }

      if (optionsMessage) {
        showNotification(message + ` és a személyes beállítások (${optionsMessage.trim().replace(/,$/, '')}) frissítve.`, 'success');
      } else {
        showNotification(message, 'success');
      }
      
    } catch(e: any) {
        console.error("Import failed:", e);
        showNotification(`Hiba az importálás során: ${e.message}`, 'info');
    }
  };

  const handleExport = async () => {
    try {
      const imageIds = new Set<string>();
      for (const category in favorites) {
        for (const recipe of favorites[category]) {
          if (recipe.imageUrl && recipe.imageUrl.startsWith('indexeddb:')) {
            imageIds.add(recipe.imageUrl.substring(10));
          }
          if (recipe.instructions) {
            for (const instruction of recipe.instructions) {
              if (instruction.imageUrl && instruction.imageUrl.startsWith('indexeddb:')) {
                imageIds.add(instruction.imageUrl.substring(10));
              }
            }
          }
        }
      }

      const images: Record<string, string> = {};
      const imagePromises = Array.from(imageIds).map(async (id) => {
        const data = await imageStore.getImage(id);
        if (data) {
          images[id] = data;
        }
      });
      await Promise.all(imagePromises);

      const dataToSave: BackupData = {
        favorites,
        shoppingList,
        pantry,
        users,
        images,
        mealTypes,
        cuisineOptions,
        cookingMethods: cookingMethodsList,
        cookingMethodCapacities,
        mealTypesOrder: orderedMealTypes.map(item => item.value),
        cuisineOptionsOrder: orderedCuisineOptions.map(item => item.value),
        cookingMethodsOrder: orderedCookingMethods.map(item => item.value),
      };

      const jsonString = JSON.stringify(dataToSave, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const time = now.toTimeString().split(' ')[0].substring(0, 5).replace(':', '-');
      const suggestedName = `konyhamiki_mentes_${date}_${time}.json`;

      const isPickerSupported = 'showSaveFilePicker' in window;
      const isTopFrame = window.self === window.top;

      if (isPickerSupported && isTopFrame) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName,
            types: [{ description: 'JSON Fájl', accept: { 'application/json': ['.json'] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          showNotification('Adatok sikeresen mentve!', 'success');
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.error("Hiba a mentés során (File Picker):", err);
            showNotification('Hiba történt az adatok mentése közben.', 'info');
          }
        }
      } else {
        if (!isPickerSupported) {
          showNotification('A böngészője nem támogatja a "Mentés másként" funkciót, ezért a fájl közvetlenül letöltésre kerül.', 'info');
        } else if (!isTopFrame) {
          showNotification('A böngésző biztonsági korlátozásai miatt a fájl közvetlenül letöltésre kerül.', 'info');
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Hiba a mentés során:", error);
      showNotification('Hiba történt az adatok mentése közben.', 'info');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const data = JSON.parse(text);
          handleImportData(data);
        } else {
          throw new Error('A fájl tartalma nem olvasható szövegként.');
        }
      } catch (error) {
        console.error("Hiba a betöltés során:", error);
        showNotification('Hiba történt a fájl beolvasása vagy feldolgozása közben.', 'info');
      }
    };
    reader.onloadend = () => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const hasAnyData = Object.keys(favorites).length > 0 || shoppingList.length > 0 || Object.values(pantry).some((pantryList: PantryItem[]) => pantryList.length > 0) || users.length > 0;

  const handleAppVoiceResult = async (transcript: string) => {
    if (isProcessingVoiceCommandRef.current) return;
    isProcessingVoiceCommandRef.current = true;
    try {
        // FIX: Explicitly type the 'item' parameter in the map function to fix type error.
        const allPantryItems = Object.values(pantry).flat().map((item: PantryItem) => item.text);
        const command: AppCommand = await interpretAppCommand(transcript, view, {
            categories: Object.keys(favorites),
            recipesByCategory: {}, // This context is not fully implemented yet
            shoppingListItems: shoppingList.map(i => i.text),
            pantryItems: allPantryItems,
        });

        switch(command.action) {
            case 'navigate':
                if (['generator', 'favorites', 'shopping-list', 'pantry', 'users'].includes(command.payload)) {
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
    if (recipe && view === 'generator') {
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
          users={users}
          onUpdateFavoriteStatus={handleUpdateFavoriteStatus}
          shouldGenerateImageInitially={shouldGenerateImage}
          onGenerateFromSuggestion={handleGenerateFromSuggestion}
          mealTypes={orderedMealTypes}
          cuisineOptions={orderedCuisineOptions}
          cookingMethodsList={orderedCookingMethods}
        />
      );
    }
    switch (view) {
      case 'favorites':
        return (
          <FavoritesView
            favorites={favorites}
            users={users}
            onViewRecipe={handleViewFavorite}
            onDeleteRecipe={handleDeleteFavorite}
            onDeleteCategory={handleDeleteCategory}
            expandedCategories={expandedCategories}
            onToggleCategory={(cat) => setExpandedCategories(prev => ({...prev, [cat]: !prev[cat]}))}
            filterCategory={filterCategory}
            onSetFilterCategory={setFilterCategory}
            sortOption={sortOption}
            onSetSortOption={setSortOption}
            onMoveRecipe={handleMoveFavorite}
            onUpdateFavoriteStatus={handleUpdateFavoriteStatus}
            cuisineOptions={orderedCuisineOptions}
          />
        );
      case 'shopping-list':
        return (
          <ShoppingListView
            list={shoppingList}
            onAddItems={handleAddItemsToShoppingList}
            onUpdateItem={handleUpdateShoppingListItem}
            onRemoveItem={handleRemoveShoppingListItem}
            onClearChecked={handleClearCheckedShoppingList}
            onClearAll={handleClearAllShoppingList}
            onMoveItemToPantryRequest={handleMoveShoppingListItemToPantryRequest}
          />
        );
      case 'pantry':
        return (
            <PantryView
              pantry={pantry}
              onAddItems={handleAddItemsToPantry}
              onUpdateItem={handleUpdatePantryItem}
              onRemoveItem={handleRemovePantryItem}
              onClearAll={handleClearPantry}
              onMoveCheckedToPantryRequest={handleMoveCheckedToPantryRequest}
              onGenerateFromPantryRequest={handleGenerateFromPantryRequest}
              onGenerateFromSelectedPantryItemsRequest={handleGenerateFromSelectedPantryItemsRequest}
              shoppingListItems={shoppingList}
              onMoveItems={handleMovePantryItems}
            />
        );
        case 'users':
            return (
                <UsersView
                    users={users}
                    onSaveUser={handleSaveUser}
                    onDeleteUser={handleDeleteUser}
                />
            );
      case 'generator':
      default:
        return (
          <>
            <h1 className="text-3xl font-bold text-center text-primary-800">{t('app.title')}</h1>
            <p className="text-center text-gray-600 mb-6">{t('app.subtitle')}</p>
            {isLoading && <LoadingSpinner />}
            {error && <ErrorMessage message={error} />}
            {!isLoading && !error && (
              <RecipeInputForm 
                onSubmit={handleRecipeSubmit}
                isLoading={isLoading}
                initialFormData={initialFormData}
                onFormPopulated={handleFormPopulated}
                suggestions={recipeSuggestions}
                users={users}
                mealTypes={mealTypes}
                setMealTypes={setMealTypes}
                cuisineOptions={cuisineOptions}
                setCuisineOptions={setCuisineOptions}
                cookingMethodsList={cookingMethodsList}
                setCookingMethodsList={setCookingMethodsList}
                cookingMethodCapacities={cookingMethodCapacities}
                setCookingMethodCapacities={setCookingMethodCapacities}
                orderedMealTypes={orderedMealTypes}
                setOrderedMealTypes={setOrderedMealTypes}
                orderedCookingMethods={orderedCookingMethods}
                setOrderedCookingMethods={setOrderedCookingMethods}
                orderedCuisineOptions={orderedCuisineOptions}
                setOrderedCuisineOptions={setOrderedCuisineOptions}
              />
            )}
          </>
        );
    }
  };

  const navItems: { id: AppView; label: string }[] = [
    { id: 'generator', label: t('nav.generator') },
    { id: 'favorites', label: t('nav.favorites') },
    { id: 'pantry', label: t('nav.pantry') },
    { id: 'shopping-list', label: t('nav.shoppingList') },
    { id: 'users', label: t('nav.users') },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <img src={konyhaMikiLogo} alt="Konyha Miki Logó" className="h-12" />
          </div>
           <div className="flex items-center gap-4">
            <button onClick={() => setLanguage('hu')} className={`text-sm font-semibold ${language === 'hu' ? 'text-primary-700 underline' : 'text-gray-500 hover:text-primary-600'}`}>Magyar</button>
            <button onClick={() => setLanguage('en')} className={`text-sm font-semibold ${language === 'en' ? 'text-primary-700 underline' : 'text-gray-500 hover:text-primary-600'}`}>English</button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4 md:p-6">
          <DataManagementControls
            onExport={handleExport}
            onImportClick={handleImportClick}
            onFileChange={handleFileChange}
            fileInputRef={fileInputRef}
            hasAnyData={hasAnyData}
          />
          <nav className="mb-6">
              <ul className="flex flex-wrap border-b border-gray-200">
                  {navItems.map(item => (
                      <li key={item.id} className="-mb-px mr-1">
                          <button
                              onClick={() => {
                                setView(item.id);
                              }}
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
          <p>{t('app.footer', { year: new Date().getFullYear() })}</p>
      </footer>
      <LocationPromptModal
        isOpen={isLocationPromptOpen}
        onClose={() => setIsLocationPromptOpen(false)}
        onSelect={(location) => {
            locationCallback(location);
            setIsLocationPromptOpen(false);
        }}
      />
      <LoadOnStartModal
        isOpen={isLoadOnStartModalOpen}
        onClose={() => setIsLoadOnStartModalOpen(false)}
        onLoad={handleImportClick}
      />
    </div>
  );
};

export default App;

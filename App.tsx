
import React, { useState, useEffect, useCallback, useRef } from 'react';
import RecipeInputForm from './components/RecipeInputForm';
import RecipeDisplay from './components/RecipeDisplay';
import MenuDisplay from './components/MenuDisplay';
import DailyMenuDisplay from './components/DailyMenuDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import FavoritesView from './components/FavoritesView';
import ShoppingListView from './components/ShoppingListView';
import PantryView from './components/PantryView';
import UsersView from './components/UsersView';
import GlobalVoiceController from './components/GlobalVoiceController';
import LocationPromptModal from './components/LocationPromptModal';
import LoadOnStartModal from './components/LoadOnStartModal';
import OptionsEditPanel from './components/OptionsEditPanel';
import InfoModal from './components/InfoModal';
import ImportUrlModal from './components/ImportUrlModal';
import RecipeComparisonView from './components/RecipeComparisonView';
import GenerateVariationModal from './components/GenerateVariationModal';
import PhotoSlideshow from './components/PhotoSlideshow';
import VoiceFeedbackBubble from './components/VoiceFeedbackBubble';
import IngredientPhotoModal from './components/IngredientPhotoModal';
import { generateRecipe, getRecipeModificationSuggestions, interpretAppCommand, generateMenu, generateDailyMenu, generateAppGuide, parseRecipeFromUrl, parseRecipeFromFile, generateRecipeVariations, generateSingleRecipeVariation, interpretFormCommand, interpretUserCommand, identifyIngredientsFromImage } from './services/geminiService';
import * as favoritesService from './services/favoritesService';
import * as shoppingListService from './services/shoppingListService';
import * as pantryService from './services/pantryService';
import * as userService from './services/userService';
import { interpretLocalAppCommand, interpretLocalFormCommand, interpretLocalRecipeCommand } from './services/localCommandService';
import { useNotification } from './contexts/NotificationContext';
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
  MenuRecipe,
  DailyMenuRecipe,
  FormCommand,
  VoiceCommandResult,
  VoiceCommand,
  UserFeedback,
} from './types';
import {
    DIET_OPTIONS,
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
    FEEDBACK_HISTORY_STORAGE_KEY,
    APP_VERSION,
    ALL_LOCAL_COMMAND_EXAMPLES,
} from './constants';
import { safeSetLocalStorage } from './utils/storage';
import { konyhaMikiLogo } from './assets';
import * as imageStore from './services/imageStore';
import DataManagementControls from './components/DataManagementControls';
import { reorderList as reorderShoppingList } from './services/shoppingListService';

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

/**
 * Legstabilabb képfeldolgozás mobil eszközökhöz.
 * Kerüli az aszinkron dekódolást, ami bizonyos Android/iOS verziók alatt hibázik.
 */
const processAndResizeImageForGemini = async (file: File): Promise<{ data: string; mimeType: string }> => {
    const MAX_DIMENSION = 768; // Bőven elég az OCR-hez

    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_DIMENSION) {
                    height *= MAX_DIMENSION / width;
                    width = MAX_DIMENSION;
                }
            } else {
                if (height > MAX_DIMENSION) {
                    width *= MAX_DIMENSION / height;
                    height = MAX_DIMENSION;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { alpha: false });
            
            if (!ctx) {
                URL.revokeObjectURL(objectUrl);
                reject(new Error("Nem sikerült elindítani a grafikai processzort."));
                return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'medium';
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                URL.revokeObjectURL(objectUrl); // Itt már nincs rá szükség
                if (!blob) {
                    reject(new Error("Kép konvertálási hiba."));
                    return;
                }
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64data = reader.result as string;
                    const base64String = base64data.split(',')[1];
                    resolve({ data: base64String, mimeType: 'image/jpeg' });
                };
                reader.onerror = () => reject(new Error("Beolvasási hiba."));
                reader.readAsDataURL(blob);
            }, 'image/jpeg', 0.6);
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("A forráskép nem beolvasható. Lehet, hogy túl nagy a fájl a telefon memóriájához."));
        };

        img.src = objectUrl;
    });
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('generator');
  const [recipe, setRecipe] = useState<Recipe | MenuRecipe | DailyMenuRecipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Recept generálása...');
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Favorites>({});
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [pantry, setPantry] = useState<Record<PantryLocation, PantryItem[]>>({ Tiszadada: [], Vásárosnamény: [] });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [initialFormData, setInitialFormData] = useState<Partial<{ ingredients: string, excludedIngredients: string, diet: DietOption, mealType: MealType, cuisine: CuisineOption, cookingMethods: CookingMethod[], specialRequest: string, withCost: boolean, withImage: boolean, numberOfServings: number, recipePace: RecipePace, mode: 'standard' | 'leftover', useSeasonalIngredients: boolean }> | null>(null);
  const [isFromFavorites, setIsFromFavorites] = useState(false);
  const [shouldGenerateImage, setShouldGenerateImage] = useState(false);
  
  const [alternativeRecipes, setAlternativeRecipes] = useState<Recipe[] | null>(null);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.DATE_DESC);
  
  const [isLocationPromptOpen, setIsLocationPromptOpen] = useState(false);
  const [locationCallback, setLocationCallback] = useState<(location: PantryLocation) => void>(() => () => {});
  const [isLoadOnStartModalOpen, setIsLoadOnStartModalOpen] = useState(false);

  const [mealTypes, setMealTypes] = useState<OptionItem[]>(() => loadFromLocalStorage(MEAL_TYPES_STORAGE_KEY, MEAL_TYPES));
  const [cuisineOptions, setCuisineOptions] = useState<OptionItem[]>(() => loadFromLocalStorage(CUISINE_OPTIONS_STORAGE_KEY, CUISINE_OPTIONS));
  const [cookingMethodsList, setCookingMethodsList] = useState<OptionItem[]>(() => {
    const savedMethods = loadFromLocalStorage<OptionItem[]>(COOKING_METHODS_STORAGE_KEY, []);
    const defaultMethods = COOKING_METHODS;
    const mergedMap = new Map<string, OptionItem>();
    defaultMethods.forEach(item => mergedMap.set(item.value, item));
    savedMethods.forEach(item => mergedMap.set(item.value, item));
    return Array.from(mergedMap.values());
  });
  const [cookingMethodCapacities, setCookingMethodCapacities] = useState<Record<string, number | null>>(() => {
      const savedCapacities = loadFromLocalStorage<Record<string, number | null>>(COOKING_METHOD_CAPACITIES_STORAGE_KEY, COOKING_METHOD_CAPACITIES);
      return { ...COOKING_METHOD_CAPACITIES, ...savedCapacities };
  });
  const [feedbackHistory, setFeedbackHistory] = useState<UserFeedback[]>(() => loadFromLocalStorage(FEEDBACK_HISTORY_STORAGE_KEY, []));
  
  const [orderedMealTypes, setOrderedMealTypes] = useState<OptionItem[]>([]);
  const [orderedCookingMethods, setOrderedCookingMethods] = useState<OptionItem[]>([]);
  const [orderedCuisineOptions, setOrderedCuisineOptions] = useState<OptionItem[]>([]);

  const [isOptionsEditorOpen, setIsOptionsEditorOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [appGuideContent, setAppGuideContent] = useState('');
  const [isLoadingGuide, setIsLoadingGuide] = useState(false);
  const [isExamplesExpanded, setIsExamplesExpanded] = useState(false);

  const [isImportUrlModalOpen, setIsImportUrlModalOpen] = useState(false);
  const [isParsingUrl, setIsParsingUrl] = useState(false);
  const [parsingUrlError, setParsingUrlError] = useState<string | null>(null);

  const [isIngredientPhotoModalOpen, setIsIngredientPhotoModalOpen] = useState(false);

  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [formCommand, setFormCommand] = useState<FormCommand | null>(null);
  const [recipeCommand, setRecipeCommand] = useState<VoiceCommandResult | null>(null);
  const [forceSpeakTrigger, setForceSpeakTrigger] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [variationModalState, setVariationModalState] = useState<{ isOpen: boolean; recipe: Recipe | null }>({ isOpen: false, recipe: null });
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false);
  const [manualLocation, setManualLocation] = useState<string>('');

  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recipeFileInputRef = useRef<HTMLInputElement>(null);
  const recipeDisplayRef = useRef<HTMLDivElement>(null);
  
  const idleTimerRef = useRef<number | null>(null);
  const favoritesRef = useRef(favorites);
  const isSlideshowOpenRef = useRef(isSlideshowOpen);

  useEffect(() => {
      favoritesRef.current = favorites;
  }, [favorites]);

  useEffect(() => {
      isSlideshowOpenRef.current = isSlideshowOpen;
  }, [isSlideshowOpen]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const validViews: AppView[] = ['generator', 'favorites', 'shopping-list', 'pantry', 'users'];
      if (hash && validViews.includes(hash as AppView)) {
        setView(hash as AppView);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    window.location.hash = view;
  }, [view]);

  useEffect(() => {
    const startIdleTimer = () => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = window.setTimeout(() => {
            const hasFavorites = Object.keys(favoritesRef.current).length > 0;
            if (hasFavorites && !isSlideshowOpenRef.current) {
                setIsSlideshowOpen(true);
            }
        }, 300000);
    };
    const resetIdleTimer = () => startIdleTimer();
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetIdleTimer));
    startIdleTimer();
    return () => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        events.forEach(event => window.removeEventListener(event, resetIdleTimer));
    };
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (prefersDark) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);
  
  useEffect(() => {
      const savedLocation = localStorage.getItem('ai-recipe-generator-manual-location');
      if (savedLocation) setManualLocation(savedLocation);
  }, []);

  const handleUpdateLocation = (location: string) => {
      setManualLocation(location);
      localStorage.setItem('ai-recipe-generator-manual-location', location);
  };

  const toggleTheme = () => setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');

  const toggleFullscreen = async () => {
    const docEl = document.documentElement as any;
    const doc = document as any;
    if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
      try {
        if (docEl.requestFullscreen) await docEl.requestFullscreen();
        else if (docEl.mozRequestFullScreen) await docEl.mozRequestFullScreen();
        else if (docEl.webkitRequestFullscreen) await docEl.webkitRequestFullscreen();
        else if (docEl.msRequestFullscreen) await docEl.msRequestFullscreen();
      } catch (err: any) {
        showNotification('A teljes képernyős mód nem engedélyezett ezen az eszközön.', 'info');
      }
    } else {
      try {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
        else if (doc.msExitFullscreen) await doc.msExitFullscreen();
      } catch (err: any) {}
    }
  };

  useEffect(() => {
      const handleFullscreenChange = () => {
          const doc = document as any;
          setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement));
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.addEventListener('mozfullscreenchange', handleFullscreenChange);
      document.addEventListener('MSFullscreenChange', handleFullscreenChange);
      return () => {
          document.removeEventListener('fullscreenchange', handleFullscreenChange);
          document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
          document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
          document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      };
  }, []);

  const loadData = useCallback(() => {
    try {
      const { favorites: favs, recoveryNotification: favsRecovery } = favoritesService.getFavorites();
      setFavorites(favs);
      if (favsRecovery) showNotification(favsRecovery, 'info');
      const initialExpanded = Object.keys(favs).reduce((acc, cat) => { acc[cat] = true; return acc; }, {} as Record<string, boolean>);
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

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const favoritesData = localStorage.getItem('ai-recipe-generator-favorites');
    const shoppingListData = localStorage.getItem('ai-recipe-generator-shopping-list');
    const pantryData = localStorage.getItem('ai-recipe-generator-pantry');
    const hasFavorites = favoritesData && favoritesData !== '{}';
    const hasShoppingList = shoppingListData && shoppingListData !== '[]';
    const hasPantry = pantryData && pantryData !== '{"Tiszadada":[],"Vásárosnamény":[]}';
    if (!hasFavorites && !hasShoppingList && !hasPantry) {
        const timer = setTimeout(() => setIsLoadOnStartModalOpen(true), 1000);
        return () => clearTimeout(timer);
    }
  }, []);

    useEffect(() => {
        const savedOrder = loadFromLocalStorage<string[] | null>(MEAL_TYPES_ORDER_KEY, null);
        const optionsMap = new Map(mealTypes.map(item => [item.value, item]));
        let finalOrderedList: OptionItem[];
        if (savedOrder) {
            const orderedList = savedOrder.map(value => optionsMap.get(value)).filter((item): item is OptionItem => !!item);
            const orderedValues = new Set(orderedList.map(item => item.value));
            const newItems = mealTypes.filter(item => !orderedValues.has(item.value));
            finalOrderedList = [...orderedList, ...newItems];
        } else finalOrderedList = [...mealTypes];
        setOrderedMealTypes(finalOrderedList);
    }, [mealTypes]);
    
    useEffect(() => {
        const savedOrder = loadFromLocalStorage<string[] | null>(COOKING_METHODS_ORDER_KEY, null);
        const optionsMap = new Map(cookingMethodsList.map(item => [item.value, item]));
        let finalOrderedList: OptionItem[];
        if (savedOrder) {
            const orderedList = savedOrder.map(value => optionsMap.get(value)).filter((item): item is OptionItem => !!item);
            const orderedValues = new Set(orderedList.map(item => item.value));
            const newItems = cookingMethodsList.filter(item => !orderedValues.has(item.value));
            finalOrderedList = [...orderedList, ...newItems];
        } else finalOrderedList = [...cookingMethodsList];
        setOrderedCookingMethods(finalOrderedList);
    }, [cookingMethodsList]);

    useEffect(() => {
        const savedOrder = loadFromLocalStorage<string[] | null>(CUISINE_OPTIONS_ORDER_KEY, null);
        const optionsMap = new Map(cuisineOptions.map(item => [item.value, item]));
        let finalOrderedList: OptionItem[];
        if (savedOrder) {
            const orderedList = savedOrder.map(value => optionsMap.get(value)).filter((item): item is OptionItem => !!item);
            const orderedValues = new Set(orderedList.map(item => item.value));
            const newItems = cuisineOptions.filter(item => !orderedValues.has(item.value));
            finalOrderedList = [...orderedList, ...newItems];
        } else finalOrderedList = [...cuisineOptions];
        setOrderedCuisineOptions(finalOrderedList);
    }, [cuisineOptions]);

  const handleRecipeSubmit = async (params: { ingredients: string, excludedIngredients: string, diet: DietOption, mealType: MealType, cuisine: CuisineOption, cookingMethods: CookingMethod[], specialRequest: string, withCost: boolean, withImage: boolean, numberOfServings: number, recipePace: RecipePace, mode: 'standard' | 'leftover', useSeasonalIngredients: boolean }) => {
    setIsLoading(true);
    setError(null);
    setRecipe(null);
    setAlternativeRecipes(null);
    setView('generator');
    if (params.mealType === MealType.MENU) setLoadingMessage('Menü generálása...');
    else if (params.mealType === MealType.DAILY_MENU) setLoadingMessage('Napi menü generálása...');
    else setLoadingMessage('Recept generálása...');
    try {
       if (params.mealType === MealType.MENU) {
            const generatedMenu = await generateMenu(params.ingredients, params.excludedIngredients, params.diet, params.cuisine, params.cookingMethods, params.specialRequest, params.withCost, params.numberOfServings, params.recipePace, params.mode, params.useSeasonalIngredients, cuisineOptions, cookingMethodsList);
            setRecipe(generatedMenu);
      } else if (params.mealType === MealType.DAILY_MENU) {
            const generatedDailyMenu = await generateDailyMenu(params.ingredients, params.excludedIngredients, params.diet, params.cuisine, params.cookingMethods, params.specialRequest, params.withCost, params.numberOfServings, params.recipePace, params.mode, params.useSeasonalIngredients, cuisineOptions, cookingMethodsList);
            setRecipe(generatedDailyMenu);
      } else {
          const generatedRecipe = await generateRecipe(params.ingredients, params.excludedIngredients, params.diet, params.mealType, params.cuisine, params.cookingMethods, params.specialRequest, params.withCost, params.numberOfServings, params.recipePace, params.mode, mealTypes, cuisineOptions, cookingMethodsList, cookingMethodCapacities, feedbackHistory);
          setRecipe(generatedRecipe);
      }
      setShouldGenerateImage(params.withImage);
      setIsFromFavorites(false);
    } catch (err: any) { setError(err.message); } finally { setIsLoading(false); }
  };
  
  const handleRecipeUpdate = async (updatedRecipe: Recipe, originalRecipe?: Recipe) => {
    setRecipe(updatedRecipe);
    if (isFromFavorites && originalRecipe && currentCategory) {
        let currentFavs = favorites;
        if (originalRecipe.recipeName !== updatedRecipe.recipeName) currentFavs = await favoritesService.removeRecipeFromFavorites(currentFavs, originalRecipe.recipeName, currentCategory);
        const finalFavorites = await favoritesService.addRecipeToFavorites(currentFavs, updatedRecipe, currentCategory);
        setFavorites(finalFavorites);
        showNotification('Recept sikeresen frissítve!', 'success');
    }
  };

  const handleMenuUpdate = (updatedMenu: MenuRecipe) => setRecipe(updatedMenu);
  const handleDailyMenuUpdate = (updatedMenu: DailyMenuRecipe) => setRecipe(updatedMenu);
  const handleCloseRecipe = () => { setRecipe(null); setError(null); setAlternativeRecipes(null); setIsFromFavorites(false); setInitialFormData(null); setCurrentCategory(null); };
  const handleRecipeDisplayClose = () => { handleCloseRecipe(); if (isFromFavorites) setView('favorites'); else setView('generator'); };
  const handleFormPopulated = () => setInitialFormData(null);
  
  const handleGenerateVariations = async (originalRecipe: Recipe) => {
    setIsLoading(true);
    setLoadingMessage('Variációk generálása...');
    setError(null);
    try {
      const variations = await generateRecipeVariations(originalRecipe, cookingMethodsList, cuisineOptions, mealTypes, cookingMethodCapacities);
      setAlternativeRecipes(variations);
    } catch (err: any) { setError(err.message); } finally { setIsLoading(false); }
  };

  const handleOpenVariationModal = (recipeToVary: Recipe) => setVariationModalState({ isOpen: true, recipe: recipeToVary });

  const handleGenerateSingleVariation = async (originalRecipe: Recipe, variationParams: { specialRequest: string; diet: DietOption; cuisine: CuisineOption; cookingMethods: CookingMethod[]; userPreferences: { allergies: string; likes: string; dislikes: string; }; }) => {
    setVariationModalState({ isOpen: false, recipe: null });
    setIsLoading(true);
    setLoadingMessage('Új variáció generálása...');
    setError(null);
    try {
        const newVariation = await generateSingleRecipeVariation(originalRecipe, variationParams, cuisineOptions, cookingMethodsList);
        setAlternativeRecipes(prev => [...(prev || []), newVariation]);
    } catch (err: any) { setError(err.message); } finally { setIsLoading(false); }
  };

  const handleCloseComparisonView = () => setAlternativeRecipes(null);
  const handleSaveToFavorites = async (recipeToSave: Recipe, category: string) => {
    try {
      const updatedFavorites = await favoritesService.addRecipeToFavorites(favorites, recipeToSave, category);
      setFavorites(updatedFavorites);
      showNotification(`'${recipeToSave.recipeName}' elmentve a(z) '${category}' kategóriába.`, 'success');
    } catch (e: any) { showNotification(e.message || 'Hiba történt a mentés közben.', 'info'); }
  };

  const handleSaveAllRecipes = async (recipesToSave: Recipe[], category: string) => {
    try {
        let currentFavorites = favorites;
        for (const recipe of recipesToSave) currentFavorites = await favoritesService.addRecipeToFavorites(currentFavorites, recipe, category);
        setFavorites(currentFavorites);
        showNotification(`${recipesToSave.length} recept elmentve a(z) '${category}' kategóriába.`, 'success');
    } catch (e: any) { showNotification(e.message || 'Hiba történt a receptek mentése közben.', 'info'); }
  };

  const handleSaveMenu = async (menuName: string) => {
    if (!recipe || !('menuName' in recipe)) return;
    const menuToSave = recipe as MenuRecipe;
    const menuCategory = "Teljes Menü (Előétel, Leves, Főétel, Desszert)";
    try {
        let currentFavorites = favorites;
        const courses: { course: Recipe, courseName: any }[] = [{ course: menuToSave.appetizer, courseName: 'appetizer' }, { course: menuToSave.soup, courseName: 'soup' }, { course: menuToSave.mainCourse, courseName: 'mainCourse' }, { course: menuToSave.dessert, courseName: 'dessert' }];
        for (const { course, courseName } of courses) {
            if (!course || !course.recipeName) continue;
            const recipeWithMenuInfo: Recipe = { ...course, menuName: menuName.trim(), menuCourse: courseName };
            currentFavorites = await favoritesService.addRecipeToFavorites(currentFavorites, recipeWithMenuInfo, menuCategory);
        }
        setFavorites(currentFavorites);
        showNotification(`'${menuName.trim()}' menü sikeresen elmentve.`, 'success');
    } catch (e: any) { showNotification(e.message || 'Hiba történt a menü mentése közben.', 'info'); }
  };
  
  const handleSaveDailyMenu = async (menuName: string) => {
    if (!recipe || !('breakfast' in recipe)) return;
    const menuToSave = recipe as DailyMenuRecipe;
    const menuCategory = "Napi Menü";
    try {
        let currentFavorites = favorites;
        const courses: { course: Recipe, courseName: any }[] = [{ course: menuToSave.breakfast, courseName: 'breakfast' }, { course: menuToSave.lunch, courseName: 'lunch' }, { course: menuToSave.dinner, courseName: 'dinner' }];
        for (const { course, courseName } of courses) {
            if (!course || !course.recipeName) continue;
            const recipeWithMenuInfo: Recipe = { ...course, menuName: menuName.trim(), menuCourse: courseName };
            currentFavorites = await favoritesService.addRecipeToFavorites(currentFavorites, recipeWithMenuInfo, menuCategory);
        }
        setFavorites(currentFavorites);
        showNotification(`'${menuName.trim()}' napi menü sikeresen elmentve.`, 'success');
    } catch (e: any) { showNotification(e.message || 'Hiba történt a napi menü mentése közben.', 'info'); }
  };

  const handleViewFavorite = (recipeToView: Recipe, category: string) => { setRecipe(recipeToView); setCurrentCategory(category); setIsFromFavorites(true); setView('generator'); };

  const handleDeleteFavorite = async (recipeName: string, category: string): Promise<void> => {
    try {
        const updatedFavorites = await favoritesService.removeRecipeFromFavorites(favorites, recipeName, category);
        setFavorites(updatedFavorites);
        showNotification(`'${recipeName}' törölve a mentettek közül.`, 'success');
    } catch (error: any) { throw error; }
  };

  const handleDeleteMenu = async (menuName: string, category: string) => {
    try {
        const updatedFavorites = await favoritesService.removeMenuFromFavorites(favorites, menuName, category);
        setFavorites(updatedFavorites);
        showNotification(`'${menuName}' menü törölve a mentettek közül.`, 'success');
    } catch (error: any) {}
  };

  const handleDeleteCategory = async (category: string) => {
    const updatedFavorites = await favoritesService.removeCategory(favorites, category);
    setFavorites(updatedFavorites);
    setExpandedCategories(prev => { const newState = { ...prev }; delete newState[category]; return newState; });
    showNotification(`'${category}' kategória törölve.`, 'success');
  };
  
  const handleMoveFavorite = (recipe: Recipe, fromCategory: string, toCategory: string) => {
    const result = favoritesService.moveRecipe(favorites, recipe, fromCategory, toCategory);
    if (result.success) { setFavorites(result.updatedFavorites); showNotification(`'${recipe.recipeName}' áthelyezve ide: '${toCategory}'`, 'success'); }
    else showNotification(result.message || 'Az áthelyezés nem sikerült.', 'info');
  };

  const handleUpdateFavoriteStatus = async (recipeName: string, category: string, favoritedByIds: string[]) => {
    try {
      const updatedFavorites = await favoritesService.updateFavoriteStatus(favorites, recipeName, category, favoritedByIds);
      setFavorites(updatedFavorites);
      if (recipe && 'recipeName' in recipe && (recipe as Recipe).recipeName === recipeName) setRecipe({ ...(recipe as Recipe), favoritedBy: favoritedByIds });
      showNotification('Kedvenc állapot frissítve.', 'success');
    } catch (e: any) { showNotification('Hiba a kedvenc állapot frissítésekor.', 'info'); }
  };
  
  const handleUpdateRecipeCategories = async (recipeToUpdate: Recipe, newCategories: string[]) => {
    try {
      const updatedFavorites = await favoritesService.updateRecipeCategories(favorites, recipeToUpdate, newCategories);
      setFavorites(updatedFavorites);
      showNotification(`'${recipeToUpdate.recipeName}' kategóriái frissítve.`, 'success');
    } catch (e: any) { showNotification('Hiba a kategóriák frissítésekor.', 'info'); }
  };

  const handleAddItemsToShoppingList = (items: string[]) => {
    const updatedList = shoppingListService.addItems(items);
    setShoppingList(updatedList);
    showNotification(`${items.length} tétel hozzáadva a bevásárlólistához.`, 'success');
  };
  
  const handleMenuToShoppingList = (menu: MenuRecipe | DailyMenuRecipe) => {
    let allIngredients: string[] = [];
    if ('appetizer' in menu) allIngredients = [...menu.appetizer.ingredients, ...menu.soup.ingredients, ...menu.mainCourse.ingredients, ...menu.dessert.ingredients];
    else allIngredients = [...menu.breakfast.ingredients, ...menu.lunch.ingredients, ...menu.dinner.ingredients];
    handleAddItemsToShoppingList([...new Set(allIngredients)]);
  };

  const handleUpdateShoppingListItem = (index: number, updatedItem: ShoppingListItem) => { const updatedList = shoppingListService.updateItem(index, updatedItem); setShoppingList(updatedList); };
  const handleRemoveShoppingListItem = (index: number) => { const updatedList = shoppingListService.removeItem(index); setShoppingList(updatedList); };
  const handleClearCheckedShoppingList = () => { const updatedList = shoppingListService.clearChecked(); setShoppingList(updatedList); showNotification('Kipipált tételek törölve.', 'success'); };
  const handleClearAllShoppingList = () => { if (window.confirm('Biztosan törli a teljes bevásárlólistát?')) { const updatedList = shoppingListService.clearAll(); setShoppingList(updatedList); showNotification('Bevásárlólista törölve.', 'success'); } };
  const handleReorderShoppingList = (reorderedList: ShoppingListItem[]) => { const updatedList = reorderShoppingList(reorderedList); setShoppingList(updatedList); };

  const handlePantryAddItem = (items: string[], location: PantryLocation, date: string | null, storageType: StorageType) => { const updatedPantry = pantryService.addItems(items, location, date, storageType); setPantry(updatedPantry); showNotification(`${items.length} tétel hozzáadva a kamrához (${location}).`, 'success'); };
  const handleUpdatePantryItem = (originalItem: PantryItem, updatedItem: PantryItem, location: PantryLocation) => { const itemIndex = (pantry[location] || []).findIndex(item => item.text === originalItem.text && item.dateAdded === originalItem.dateAdded); if (itemIndex > -1) { const updatedPantry = pantryService.updateItem(itemIndex, updatedItem, location); setPantry(updatedPantry); } };
  const handleRemovePantryItem = (item: PantryItem, location: PantryLocation) => { const itemIndex = (pantry[location] || []).findIndex(i => i.text === item.text && i.dateAdded === item.dateAdded); if (itemIndex > -1) { const updatedPantry = pantryService.removeItem(itemIndex, location); setPantry(updatedPantry); } };
  const handleClearPantry = (location: PantryLocation) => { if (window.confirm(`Biztosan törli a(z) ${location} kamra teljes tartalmát?`)) { const updatedPantry = pantryService.clearAll(location); setPantry(updatedPantry); } };
  
  const handleMoveItemToPantryRequest = (shoppingListIndex: number, itemText: string, storageType: StorageType) => {
      setLocationCallback(() => (location: PantryLocation) => {
        handlePantryAddItem([itemText], location, new Date().toISOString().split('T')[0], storageType);
        handleRemoveShoppingListItem(shoppingListIndex);
        showNotification(`'${itemText}' áthelyezve a kamrába (${location}).`, 'success');
      });
      setIsLocationPromptOpen(true);
  };

  const handleMoveCheckedToPantryRequest = () => {
    const checkedItems = shoppingList.filter(item => item.checked);
    if (checkedItems.length === 0) return;
    setLocationCallback(() => (location: PantryLocation) => {
        const itemTexts = checkedItems.map(item => item.text);
        handlePantryAddItem(itemTexts, location, new Date().toISOString().split('T')[0], StorageType.PANTRY);
        handleClearCheckedShoppingList();
        showNotification(`${checkedItems.length} tétel áthelyezve a kamrába (${location}).`, 'success');
    });
    setIsLocationPromptOpen(true);
  };
  
  const handleGenerateFromPantryRequest = () => {
    setLocationCallback(() => (location: PantryLocation) => {
        const allItems = pantry[location] || [];
        if (allItems.length === 0) { showNotification(`A kamra (${location}) üres.`, 'info'); return; }
        const sortedItems = [...allItems].sort((a, b) => {
            if (a.dateAdded === null) return -1;
            if (b.dateAdded === null) return 1;
            return new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
        });
        setInitialFormData({ ingredients: sortedItems.map(item => item.text).join(', '), mode: 'standard' });
        setView('generator');
    });
    setIsLocationPromptOpen(true);
  };

  const handleGenerateFromSelectedPantryItems = (items: string[]) => { if (items.length > 0) { setInitialFormData({ ingredients: items.join(', '), mode: 'standard' }); setView('generator'); } };
  const handleMovePantryItems = (indices: number[], source: PantryLocation, destination: PantryLocation) => { const updatedPantry = pantryService.moveItems(indices, source, destination); setPantry(updatedPantry); showNotification(`${indices.length} tétel áthelyezve ide: ${destination}.`, 'success'); };
  const handleCopyPantryItems = (indices: number[], source: PantryLocation, destination: PantryLocation) => { const updatedPantry = pantryService.copyItems(indices, source, destination); setPantry(updatedPantry); showNotification(`${indices.length} tétel átmásolva ide: ${destination}.`, 'success'); };

  const handleSaveUser = (user: UserProfile | Omit<UserProfile, 'id'>) => {
    let updatedUsers: UserProfile[];
    if ('id' in user) { updatedUsers = userService.updateUser(users, user as UserProfile); showNotification('Felhasználó frissítve.', 'success'); }
    else { updatedUsers = userService.addUser(users, user); showNotification('Új felhasználó hozzáadva.', 'success'); }
    setUsers(updatedUsers);
  };

  const handleDeleteUser = (userId: string) => { if (window.confirm('Biztosan törli ezt a felhasználót?')) { const updatedUsers = userService.deleteUser(users, userId); setUsers(updatedUsers); showNotification('Felhasználó törölve.', 'success'); } };
  const handleFeedback = (recipeName: string, feedback: 'like' | 'dislike') => {
      const updatedHistory = [...feedbackHistory, { recipeName, feedback, timestamp: Date.now() } as UserFeedback];
      setFeedbackHistory(updatedHistory);
      safeSetLocalStorage(FEEDBACK_HISTORY_STORAGE_KEY, updatedHistory);
      showNotification(feedback === 'like' ? 'Visszajelzés rögzítve: Tetszett!' : 'Visszajelzés rögzítve: Nem tetszett.', 'success');
  };

  const hasAnyData = Object.keys(favorites).length > 0 || shoppingList.length > 0 || Object.values(pantry).some((list: PantryItem[]) => list.length > 0) || users.length > 0;
  
    const handleShoppingListCommand = (command: AppCommand) => {
        const { action, payload } = command;
        if (view !== 'shopping-list') { showNotification('Ehhez a parancshoz a bevásárlólista nézetben kell lennie.', 'info'); return; }
        switch (action) {
            case 'add_shopping_list_item': if (payload) handleAddItemsToShoppingList([payload]); break;
            case 'remove_shopping_list_item':
            case 'check_shopping_list_item':
            case 'uncheck_shopping_list_item':
                if (payload) {
                    const itemIndex = shoppingList.findIndex(i => i.text.toLowerCase() === String(payload).toLowerCase());
                    if (itemIndex > -1) {
                        if (action === 'remove_shopping_list_item') handleRemoveShoppingListItem(itemIndex);
                        else handleUpdateShoppingListItem(itemIndex, {...shoppingList[itemIndex], checked: action === 'check_shopping_list_item'});
                    }
                }
                break;
            case 'clear_checked_shopping_list': handleClearCheckedShoppingList(); break;
            case 'clear_all_shopping_list': handleClearAllShoppingList(); break;
        }
    };
    
    const handleFavoritesCommand = (command: AppCommand) => {
        const { action, payload } = command;
        if (view !== 'favorites') { showNotification('Ehhez a parancshoz a kedvencek nézetben kell lennie.', 'info'); return; }
        switch (action) {
            case 'view_favorite_recipe':
                if (payload) {
                    for (const category in favorites) {
                        const r = favorites[category].find(recipe => recipe.recipeName.toLowerCase() === String(payload).toLowerCase());
                        if (r) { handleViewFavorite(r, category); return; }
                    }
                }
                break;
            case 'filter_favorites': if (payload) setFilterCategory(payload); break;
            case 'clear_favorites_filter': setFilterCategory('all'); break;
        }
    };

  const navItems: { id: AppView, label: string, icon: React.ReactElement }[] = [
    { id: 'generator', label: 'Receptgenerátor', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.636-6.364l-.707-.707M12 21v-1m-6.364-1.636l.707-.707M6 17.001L6 17" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8s-3-5.5-4-5.5S8 8 8 8s-1.5 2.5-1.5 4.5C6.5 15.001 9 17 12 17s5.5-1.999 5.5-4.5C17.5 10.5 16 8 16 8z" /></svg> },
    { id: 'favorites', label: 'Mentettek', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg> },
    { id: 'shopping-list', label: 'Bevásárlólista', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
    { id: 'pantry', label: 'Kamra', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
    { id: 'users', label: 'Felhasználók', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
  ];

    const handleGlobalCommand = async (transcript: string) => {
        setVoiceFeedback(transcript); setIsProcessingVoice(true);
        try {
            const localAppCmd = interpretLocalAppCommand(transcript);
            if (localAppCmd) {
                if (localAppCmd.action === 'navigate' && localAppCmd.payload) { setView(localAppCmd.payload as AppView); return; }
                if (localAppCmd.action === 'scroll_down') { window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' }); return; }
                if (localAppCmd.action === 'scroll_up') { window.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' }); return; }
                if (localAppCmd.action === 'scroll_top') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
                if (localAppCmd.action === 'scroll_bottom') { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); return; }
            }
            switch (view) {
                case 'generator':
                    if (!recipe) {
                        const lfc = interpretLocalFormCommand(transcript);
                        if (lfc) setFormCommand(lfc);
                        else setFormCommand(await interpretFormCommand(transcript, mealTypes, cookingMethodsList, DIET_OPTIONS));
                    } else {
                        const lrc = interpretLocalRecipeCommand(transcript);
                        if (lrc) { if (lrc.command === VoiceCommand.REPEAT) setForceSpeakTrigger(Math.random()); setRecipeCommand(lrc); }
                        else { const r = await interpretUserCommand(transcript); if (r.command === VoiceCommand.REPEAT) setForceSpeakTrigger(Math.random()); setRecipeCommand(r); }
                    }
                    break;
                case 'shopping-list':
                case 'favorites':
                case 'pantry':
                case 'users':
                    if (!localAppCmd) {
                        const appCommand = await interpretAppCommand(transcript, view, { categories: Object.keys(favorites), shoppingListItems: shoppingList.map(i => i.text) });
                        if (appCommand.action === 'navigate' && appCommand.payload) { setView(appCommand.payload as AppView); return; }
                        if (view === 'shopping-list') handleShoppingListCommand(appCommand);
                        else if (view === 'favorites') handleFavoritesCommand(appCommand);
                    }
                    break;
            }
        } catch (e) {} finally { setIsProcessingVoice(false); setTimeout(() => setVoiceFeedback(null), 500); }
    };

  const handleExport = async () => {
    try {
        const images = await imageStore.getAllImages();
        const backupData: BackupData = { favorites, shoppingList, pantry, users, images, mealTypes, cuisineOptions, cookingMethods: cookingMethodsList, cookingMethodCapacities, mealTypesOrder: orderedMealTypes.map(o => o.value), cuisineOptionsOrder: orderedCuisineOptions.map(o => o.value), cookingMethodsOrder: orderedCookingMethods.map(o => o.value), manualLocation, feedbackHistory };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `konyhamiki_mentes_${new Date().toISOString().slice(0,16).replace(':','-')}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        showNotification('Adatok sikeresen elmentve!', 'success');
    } catch (e: any) { showNotification(`Hiba történt a mentés közben: ${e.message}`, 'info'); }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data: BackupData = JSON.parse(e.target?.result as string);
        const { favorites: impFavs } = favoritesService.validateAndRecover(data.favorites);
        const { mergedFavorites } = favoritesService.mergeFavorites(favorites, impFavs);
        const { list: impShop } = shoppingListService.validateAndRecover(data.shoppingList);
        const { mergedList } = shoppingListService.mergeShoppingLists(shoppingList, impShop);
        const { pantry: impPantry } = pantryService.validateAndRecover(data.pantry);
        const { mergedPantry } = pantryService.mergePantries(pantry, impPantry);
        const { users: impUsers } = userService.validateAndRecover(data.users);
        const { mergedUsers } = userService.mergeUsers(users, impUsers);
        if (data.images) for (const id in data.images) await imageStore.saveImage(id, data.images[id]);
        if (data.manualLocation) handleUpdateLocation(data.manualLocation);
        if (data.feedbackHistory) { setFeedbackHistory(data.feedbackHistory); safeSetLocalStorage(FEEDBACK_HISTORY_STORAGE_KEY, data.feedbackHistory); }
        setFavorites(mergedFavorites); setShoppingList(mergedList); setPantry(mergedPantry); setUsers(mergedUsers);
        showNotification(`Adatok sikeresen betöltve!`, 'success');
      } catch (err: any) { showNotification(`Hiba a betöltés közben: ${err.message}`, 'info'); }
    };
    reader.readAsText(file);
  };

  const handleOptionsSave = (newMealTypes: OptionItem[], newCuisineOptions: OptionItem[], newCookingMethods: OptionItem[], newCapacities: Record<string, number | null>, mealTypesOrder?: string[], cuisineOptionsOrder?: string[], cookingMethodsOrder?: string[], silent = false) => {
    setMealTypes(newMealTypes); setCuisineOptions(newCuisineOptions); setCookingMethodsList(newCookingMethods); setCookingMethodCapacities(newCapacities);
    safeSetLocalStorage(MEAL_TYPES_STORAGE_KEY, newMealTypes); safeSetLocalStorage(CUISINE_OPTIONS_STORAGE_KEY, newCuisineOptions); safeSetLocalStorage(COOKING_METHODS_STORAGE_KEY, newCookingMethods); safeSetLocalStorage(COOKING_METHOD_CAPACITIES_STORAGE_KEY, newCapacities);
    safeSetLocalStorage(MEAL_TYPES_ORDER_KEY, mealTypesOrder || newMealTypes.map(o => o.value)); safeSetLocalStorage(CUISINE_OPTIONS_ORDER_KEY, cuisineOptionsOrder || newCuisineOptions.map(o => o.value)); safeSetLocalStorage(COOKING_METHODS_ORDER_KEY, cookingMethodsOrder || newCookingMethods.map(o => o.value));
    setIsOptionsEditorOpen(false); if (!silent) showNotification('Opciók elmentve!', 'success');
  };

  const handleParseUrl = async (url: string) => {
    setIsParsingUrl(true); setParsingUrlError(null);
    try {
        const parsed = await parseRecipeFromUrl(url);
        setInitialFormData({ ingredients: parsed.ingredients?.join(', ') || '', specialRequest: `Készíts receptet a következő alapján: ${parsed.recipeName}. Leírás: ${parsed.description}`, mealType: MealType.LUNCH });
        setView('generator'); setIsImportUrlModalOpen(false); showNotification('Recept adatok sikeresen beolvasva!', 'success');
    } catch (e: any) { setParsingUrlError(e.message); } finally { setIsParsingUrl(false); }
  };
  
  const handleParseFile = async (file: File) => {
    setIsParsingUrl(true); setParsingUrlError(null);
    try {
        const fileData = await processAndResizeImageForGemini(file);
        const parsed = await parseRecipeFromFile({ inlineData: fileData });
        setInitialFormData({ ingredients: parsed.ingredients?.join(', ') || '', specialRequest: `Készíts receptet a következő alapján: ${parsed.recipeName}. Leírás: ${parsed.description}`, mealType: MealType.LUNCH });
        setView('generator'); showNotification('Recept adatok sikeresen beolvasva a fájlból!', 'success');
    } catch (e: any) { setError(e.message); } finally { setIsParsingUrl(false); }
  };

  /**
   * Alapanyagok felismerése fotóról.
   * Optimalizált memória-kezeléssel és hozzáfűzési logikával.
   */
  const handleProcessIngredientPhoto = async (file: File): Promise<string[]> => {
      const fileData = await processAndResizeImageForGemini(file);
      return await identifyIngredientsFromImage({ inlineData: fileData });
  };

  const forceRegenerateGuide = async (showNotificationOnSuccess = true) => {
        setIsLoadingGuide(true);
        try {
            const content = await generateAppGuide();
            setAppGuideContent(content);
            localStorage.setItem('app-guide-content', content);
            localStorage.setItem('app-guide-version', APP_VERSION);
            if (showNotificationOnSuccess) showNotification('Információs útmutató sikeresen újragenerálva!', 'success');
        } catch (e: any) { setAppGuideContent(`<p class="text-red-500">Hiba az útmutató betöltése közben: ${e.message}</p>`); } finally { setIsLoadingGuide(false); }
  };

    const handleShowAppGuide = async () => {
        const cachedContent = localStorage.getItem('app-guide-content');
        const cachedVersion = localStorage.getItem('app-guide-version');
        setIsInfoModalOpen(true);
        if (cachedContent && cachedVersion === APP_VERSION) setAppGuideContent(cachedContent);
        else await forceRegenerateGuide(false);
    };

  return (
    <div className="w-full p-4 sm:p-6 font-sans">
      <header className="flex justify-between items-center mb-4">
        <img src={konyhaMikiLogo} alt="Konyha Miki Logó" className="h-16" />
        <div className="flex items-center gap-2">
            <button onClick={() => setIsSlideshowOpen(true)} className="bg-white text-primary-700 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-600 font-semibold p-2 rounded-full border border-primary-300 shadow-sm hover:bg-primary-50 transition-colors" title="Fotóvetítés">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
            </button>
            <button onClick={toggleTheme} className="bg-white text-primary-700 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-600 font-semibold p-2 rounded-full border border-primary-300 shadow-sm transition-colors">
                {theme === 'dark' ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.464A1 1 0 106.465 13.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm.707-10.607a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" clipRule="evenodd" /></svg>}
            </button>
            <button onClick={toggleFullscreen} className="bg-white text-primary-700 font-semibold py-2 px-4 rounded-lg border border-primary-300 shadow-sm hover:bg-primary-50 transition-colors flex items-center gap-2 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-500">
                {isFullscreen ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 5a1 1 0 011-1h2a1 1 0 110 2H6v1a1 1 0 11-2 0V6a1 1 0 011-1zm10 0a1 1 0 011 1v1a1 1 0 11-2 0V6h-1a1 1 0 110-2h2zM5 14a1 1 0 011 1v1h1a1 1 0 110 2H6a1 1 0 01-1-1v-2zm10 0a1 1 0 011 1v2a1 1 0 01-1 1h-1a1 1 0 110-2h1v-1z" clipRule="evenodd" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h2a1 1 0 110 2H5v1a1 1 0 11-2 0V4zm14 0a1 1 0 00-1-1h-2a1 1 0 100 2h1v1a1 1 0 102 0V4zM4 17a1 1 0 01-1-1v-2a1 1 0 112 0v1h1a1 1 0 110 2H4zM16 17a1 1 0 001-1v-1a1 1 0 10-2 0v1h-1a1 1 0 100 2h2z" clipRule="evenodd" /></svg>}
                <span className="hidden sm:inline">{isFullscreen ? 'Ablak mód' : 'Teljes képernyő'}</span>
            </button>
            <button onClick={handleShowAppGuide} className="bg-white text-primary-700 font-semibold py-2 px-4 rounded-lg border border-primary-300 shadow-sm hover:bg-primary-50 transition-colors dark:bg-gray-700 dark:text-gray-200 dark:border-gray-500">Információ</button>
        </div>
      </header>
      <div className="flex justify-center items-center gap-4 mb-6">
        <GlobalVoiceController onCommand={handleGlobalCommand} isProcessing={isProcessingVoice} onTranscriptUpdate={setVoiceFeedback} onActivate={() => {}} />
      </div>
      <nav className="flex justify-center flex-wrap gap-2 mb-6 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {navItems.map(item => (
          <button key={item.id} onClick={() => setView(item.id)} className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition-colors text-sm sm:text-base ${view === item.id ? 'bg-primary-600 text-white shadow' : 'text-gray-600 hover:bg-primary-50 dark:text-gray-300 dark:hover:bg-gray-700'}`}>
            {item.icon}{item.label}
          </button>
        ))}
      </nav>
      <DataManagementControls onExport={handleExport} onImportClick={() => fileInputRef.current?.click()} onFileChange={handleImport} fileInputRef={fileInputRef} hasAnyData={hasAnyData} />
      <main className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg dark:bg-gray-800 w-full">
        {view === 'generator' && (
          <div className="space-y-6">
            {!recipe && !alternativeRecipes && (
              <>
                <RecipeInputForm onSubmit={handleRecipeSubmit} isLoading={isLoading} initialFormData={initialFormData} onFormPopulated={handleFormPopulated} users={users} mealTypes={mealTypes} cuisineOptions={cuisineOptions} cookingMethodsList={cookingMethodsList} cookingMethodCapacities={cookingMethodCapacities} orderedMealTypes={orderedMealTypes} orderedCookingMethods={orderedCookingMethods} orderedCuisineOptions={orderedCuisineOptions} onOpenOptionsEditor={() => setIsOptionsEditorOpen(true)} onOpenUrlImporter={() => setIsImportUrlModalOpen(true)} onOpenRecipeFileImporter={() => recipeFileInputRef.current?.click()} onOpenIngredientPhotoImporter={() => setIsIngredientPhotoModalOpen(true)} command={formCommand} onCommandProcessed={() => setFormCommand(null)} />
                <input type="file" ref={recipeFileInputRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleParseFile(file); }} accept="image/png, image/jpeg, image/webp, application/pdf" className="hidden" />
              </>
            )}
            {isLoading && <LoadingSpinner message={loadingMessage}/>}
            {error && !isLoading && <ErrorMessage message={error} />}
            {recipe && 'recipeName' in recipe && !alternativeRecipes && (
                <div ref={recipeDisplayRef}>
                    <RecipeDisplay recipe={recipe as Recipe} onClose={handleRecipeDisplayClose} isFromFavorites={isFromFavorites} favorites={favorites} onSave={handleSaveToFavorites} onAddItemsToShoppingList={handleAddItemsToShoppingList} isLoading={isLoading} onRecipeUpdate={handleRecipeUpdate} users={users} onUpdateFavoriteStatus={handleUpdateFavoriteStatus} shouldGenerateImageInitially={shouldGenerateImage} onGenerateVariations={handleGenerateVariations} onOpenVariationModal={handleOpenVariationModal} isGeneratingVariations={isLoading} mealTypes={mealTypes} cuisineOptions={cuisineOptions} cookingMethodsList={cookingMethodsList} category={currentCategory} command={recipeCommand} onCommandProcessed={() => setRecipeCommand(null)} forceSpeakTrigger={forceSpeakTrigger} onFeedback={handleFeedback} />
                </div>
            )}
            {recipe && 'menuName' in recipe && 'appetizer' in recipe && <div ref={recipeDisplayRef}><MenuDisplay menu={recipe as MenuRecipe} onClose={() => { handleCloseRecipe(); setView('generator'); }} onSave={handleSaveMenu} onAddItemsToShoppingList={handleMenuToShoppingList} shouldGenerateImages={shouldGenerateImage} onMenuUpdate={handleMenuUpdate} mealTypes={mealTypes} cookingMethodsList={cookingMethodsList} /></div>}
            {recipe && 'menuName' in recipe && 'breakfast' in recipe && <div ref={recipeDisplayRef}><DailyMenuDisplay dailyMenu={recipe as DailyMenuRecipe} onClose={() => { handleCloseRecipe(); setView('generator'); }} onSave={handleSaveDailyMenu} onAddItemsToShoppingList={handleMenuToShoppingList} onDailyMenuUpdate={handleDailyMenuUpdate} /></div>}
            {alternativeRecipes && recipe && 'recipeName' in recipe && <RecipeComparisonView originalRecipe={recipe as Recipe} variations={alternativeRecipes} onClose={handleCloseComparisonView} onSave={handleSaveToFavorites} onSaveAll={handleSaveAllRecipes} favorites={favorites} mealTypes={mealTypes} cuisineOptions={cuisineOptions} cookingMethodsList={cookingMethodsList} />}
          </div>
        )}
        {view === 'favorites' && <FavoritesView favorites={favorites} users={users} onViewRecipe={handleViewFavorite} onDeleteRecipe={handleDeleteFavorite} onDeleteCategory={handleDeleteCategory} onDeleteMenu={handleDeleteMenu} expandedCategories={expandedCategories} onToggleCategory={(cat) => setExpandedCategories(prev => ({...prev, [cat]: !prev[cat]}))} filterCategory={filterCategory} onSetFilterCategory={setFilterCategory} sortOption={sortOption} onSetSortOption={setSortOption} onMoveRecipe={handleMoveFavorite} onUpdateFavoriteStatus={handleUpdateFavoriteStatus} onUpdateRecipeCategories={handleUpdateRecipeCategories} cuisineOptions={cuisineOptions} />}
        {view === 'shopping-list' && <ShoppingListView list={shoppingList} onAddItems={handleAddItemsToShoppingList} onUpdateItem={handleUpdateShoppingListItem} onRemoveItem={handleRemoveShoppingListItem} onClearChecked={handleClearCheckedShoppingList} onClearAll={handleClearAllShoppingList} onMoveItemToPantryRequest={handleMoveItemToPantryRequest} onReorder={handleReorderShoppingList} />}
        {view === 'pantry' && <PantryView pantry={pantry} onAddItems={handlePantryAddItem} onUpdateItem={handleUpdatePantryItem} onRemoveItem={handleRemovePantryItem} onClearAll={handleClearPantry} onMoveCheckedToPantryRequest={handleMoveCheckedToPantryRequest} onGenerateFromPantryRequest={handleGenerateFromPantryRequest} shoppingListItems={shoppingList} onMoveItems={handleMovePantryItems} onCopyItems={handleCopyPantryItems} onGenerateFromSelectedPantryItemsRequest={handleGenerateFromSelectedPantryItems} onAddItemsToShoppingList={handleAddItemsToShoppingList} />}
        {view === 'users' && <UsersView users={users} onSaveUser={handleSaveUser} onDeleteUser={handleDeleteUser} />}
      </main>
      {voiceFeedback && <VoiceFeedbackBubble message={voiceFeedback} isProcessing={isProcessingVoice} />}
      {isLocationPromptOpen && <LocationPromptModal isOpen={isLocationPromptOpen} onClose={() => setIsLocationPromptOpen(false)} onSelect={(location) => { locationCallback(location); setIsLocationPromptOpen(false); }} />}
      <LoadOnStartModal isOpen={isLoadOnStartModalOpen} onClose={() => setIsLoadOnStartModalOpen(false)} onLoad={() => fileInputRef.current?.click()} />
      <OptionsEditPanel isOpen={isOptionsEditorOpen} onClose={() => setIsOptionsEditorOpen(false)} onSave={(newMealTypes, newCuisineOptions, newCookingMethods, newCapacities) => handleOptionsSave(newMealTypes, newCuisineOptions, newCookingMethods, newCapacities)} initialMealTypes={mealTypes} initialCuisineOptions={cuisineOptions} initialCookingMethods={cookingMethodsList} initialCapacities={cookingMethodCapacities} />
      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} content={appGuideContent} isLoading={isLoadingGuide} onRegenerate={forceRegenerateGuide} />
      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} content={appGuideContent} isLoading={isLoadingGuide} onRegenerate={forceRegenerateGuide} />
      <ImportUrlModal isOpen={isImportUrlModalOpen} onClose={() => setIsImportUrlModalOpen(false)} onParse={handleParseUrl} isParsing={isParsingUrl} error={parsingUrlError} />
      <IngredientPhotoModal isOpen={isIngredientPhotoModalOpen} onClose={() => setIsIngredientPhotoModalOpen(false)} onProcess={handleProcessIngredientPhoto} onAccept={(items) => setFormCommand({ action: 'add_ingredients', payload: items })} />
      {variationModalState.isOpen && variationModalState.recipe && <GenerateVariationModal isOpen={variationModalState.isOpen} onClose={() => setVariationModalState({ isOpen: false, recipe: null })} originalRecipe={variationModalState.recipe} onGenerate={handleGenerateSingleVariation} dietOptions={DIET_OPTIONS} cuisineOptions={orderedCuisineOptions} cookingMethodsList={orderedCookingMethods} users={users} />}
      {isSlideshowOpen && <PhotoSlideshow favorites={favorites} onClose={() => setIsSlideshowOpen(false)} manualLocation={manualLocation} onUpdateLocation={handleUpdateLocation} />}
      <footer className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400 space-y-4">
        <p>AI Receptgenerátor - Konyha Miki módra | Verzió: {APP_VERSION}</p>
        <p className="max-w-2xl mx-auto">Figyelem: Az AI által generált receptek tájékoztató jellegűek. Főzés előtt mindig ellenőrizze az összetevőket és az elkészítési lépéseket. Különös óvatossággal járjon el allergia, intolerancia, vagy speciális diéta esetén!</p>
        <div>
          <button onClick={() => setIsExamplesExpanded(!isExamplesExpanded)} className="text-primary-700 dark:text-primary-300 font-semibold hover:underline">Hangparancs példák</button>
          {isExamplesExpanded && <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg text-left max-w-md mx-auto"><ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">{ALL_LOCAL_COMMAND_EXAMPLES.map((ex, i) => <li key={i} className="text-gray-600 dark:text-gray-300">- "{ex}"</li>)}</ul></div>}
        </div>
      </footer>
    </div>
  );
};

export default App;

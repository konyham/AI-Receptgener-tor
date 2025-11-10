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
import { generateRecipe, getRecipeModificationSuggestions, interpretAppCommand, generateMenu, generateDailyMenu, generateAppGuide, parseRecipeFromUrl, parseRecipeFromFile, generateRecipeVariations, interpretFormCommand, interpretUserCommand } from './services/geminiService';
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
  // FIX: Added missing VoiceCommand import to resolve type errors.
  VoiceCommand,
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

// The entire worker script is inlined here as a string to avoid cross-origin issues.
const workerScriptContent = `
const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

self.onmessage = async (e) => {
  const { blob } = e.data; // Receives a pre-resized, pre-compressed JPEG blob
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const base64Data = arrayBufferToBase64(arrayBuffer);
    self.postMessage({ success: true, data: base64Data, mimeType: 'image/jpeg' });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};
`;

const processAndResizeImageForGemini = (file: File): Promise<{ data: string; mimeType: string }> => {
    return new Promise(async (resolve, reject) => {
        const MAX_DIMENSION = 1600;

        if (typeof window.createImageBitmap === 'undefined') {
            reject(new Error('A böngésződ nem támogatja a modern, memóriahatékony képfeldəolgozást. A funkció valószínűleg nem fog működni ezen az eszközön.'));
            return;
        }

        try {
            const imageBitmap = await window.createImageBitmap(file, {
                resizeWidth: MAX_DIMENSION,
                resizeHeight: MAX_DIMENSION,
                resizeQuality: 'high',
            });

            const canvas = document.createElement('canvas');
            canvas.width = imageBitmap.width;
            canvas.height = imageBitmap.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                imageBitmap.close();
                reject(new Error("Could not get canvas context."));
                return;
            }
            ctx.drawImage(imageBitmap, 0, 0);
            imageBitmap.close();

            const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.92));
            
            if (!blob) {
                reject(new Error("Canvas toBlob conversion failed."));
                return;
            }

            if (!window.Worker) {
                reject(new Error('A Web Worker-ek nem támogatottak ebben a böngészőben.'));
                return;
            }
            
            let worker: Worker | null = null;
            let workerUrl: string | null = null;
            try {
                const blobWorker = new Blob([workerScriptContent], { type: 'application/javascript' });
                workerUrl = URL.createObjectURL(blobWorker);
                worker = new Worker(workerUrl);

                worker.onmessage = (e) => {
                    if (e.data.success) {
                        resolve({ data: e.data.data, mimeType: e.data.mimeType });
                    } else {
                        reject(new Error(e.data.error || 'Ismeretlen hiba a workerben.'));
                    }
                    worker?.terminate();
                    if (workerUrl) URL.revokeObjectURL(workerUrl);
                };

                worker.onerror = (e) => {
                    reject(new Error(`Worker hiba: ${e.message}`));
                    worker?.terminate();
                    if (workerUrl) URL.revokeObjectURL(workerUrl);
                };
                
                worker.postMessage({ blob });

            } catch (err: any) {
                if (worker) worker.terminate();
                if (workerUrl) URL.revokeObjectURL(workerUrl);
                reject(new Error(`Hiba a worker inicializálása közben: ${err.message}`));
            }

        } catch (error: any) {
            console.error("Error processing image with createImageBitmap:", error);
            reject(new Error(`Hiba a kép feldolgozása közben: ${error.message}. Lehet, hogy a képfájl sérült, vagy túl nagy a készülék számára.`));
        }
    });
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });


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

    // Use a Map to merge, ensuring no duplicate values.
    const mergedMap = new Map<string, OptionItem>();

    // Add default methods first to establish a base order and include any new ones from updates.
    defaultMethods.forEach(item => mergedMap.set(item.value, item));
    
    // Add/overwrite with user's saved methods. This preserves user's custom labels and their custom items.
    savedMethods.forEach(item => mergedMap.set(item.value, item));

    return Array.from(mergedMap.values());
  });
  const [cookingMethodCapacities, setCookingMethodCapacities] = useState<Record<string, number | null>>(() => {
      const savedCapacities = loadFromLocalStorage<Record<string, number | null>>(COOKING_METHOD_CAPACITIES_STORAGE_KEY, COOKING_METHOD_CAPACITIES);
      // Merge defaults into saved. Saved values take precedence.
      const merged = { ...COOKING_METHOD_CAPACITIES, ...savedCapacities };
      return merged;
  });
  
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

  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [formCommand, setFormCommand] = useState<FormCommand | null>(null);
  const [recipeCommand, setRecipeCommand] = useState<VoiceCommandResult | null>(null);
  const [forceSpeakTrigger, setForceSpeakTrigger] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recipeFileInputRef = useRef<HTMLInputElement>(null);
  const recipeDisplayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.lang = 'hu';
    document.title = 'AI recept generátor - Konyha Miki módra';
  }, []);

  // Theme management effects
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

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const toggleFullscreen = async () => {
    const docEl = document.documentElement as any;
    const doc = document as any;

    if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
      try {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.mozRequestFullScreen) { // Firefox
          await docEl.mozRequestFullScreen();
        } else if (docEl.webkitRequestFullscreen) { // Chrome, Safari, Opera
          await docEl.webkitRequestFullscreen();
        } else if (docEl.msRequestFullscreen) { // IE/Edge
          await docEl.msRequestFullscreen();
        }
      } catch (err: any) {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        showNotification('A teljes képernyős mód nem engedélyezett ezen az eszközön.', 'info');
      }
    } else {
      try {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.mozCancelFullScreen) { // Firefox
          await doc.mozCancelFullScreen();
        } else if (doc.webkitExitFullscreen) { // Chrome, Safari, Opera
          await doc.webkitExitFullscreen();
        } else if (doc.msExitFullscreen) { // IE/Edge
          await doc.msExitFullscreen();
        }
      } catch (err: any) {
        console.error(`Error attempting to exit full-screen mode: ${err.message} (${err.name})`);
      }
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

    useEffect(() => {
        const enterFullscreenOnLoad = async () => {
            setTimeout(async () => {
                const docEl = document.documentElement as any;
                const doc = document as any;
                if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
                    try {
                        if (docEl.requestFullscreen) {
                            await docEl.requestFullscreen();
                        } else if (docEl.mozRequestFullScreen) {
                            await docEl.mozRequestFullScreen();
                        } else if (docEl.webkitRequestFullscreen) {
                            await docEl.webkitRequestFullscreen();
                        } else if (docEl.msRequestFullscreen) {
                            await docEl.msRequestFullscreen();
                        }
                    } catch (err) {
                        console.log("Could not automatically enter fullscreen on load. This is expected behavior in most browsers and requires user interaction.");
                    }
                }
            }, 500);
        };
        enterFullscreenOnLoad();
    }, []);

  const loadData = useCallback(() => {
    try {
      const { favorites: favs, recoveryNotification: favsRecovery } = favoritesService.getFavorites();
      setFavorites(favs);
      if (favsRecovery) showNotification(favsRecovery, 'info');

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

  useEffect(() => {
    if (recipe && !isLoading && !isFromFavorites && recipeDisplayRef.current) {
      setTimeout(() => {
        recipeDisplayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [recipe, isLoading, isFromFavorites]);

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
    setAlternativeRecipes(null);
    setView('generator');

    if (params.mealType === MealType.MENU) {
      setLoadingMessage('Menü generálása...');
    } else if (params.mealType === MealType.DAILY_MENU) {
      setLoadingMessage('Napi menü generálása...');
    } else {
      setLoadingMessage('Recept generálása...');
    }

    try {
       if (params.mealType === MealType.MENU) {
            const generatedMenu = await generateMenu(
                params.ingredients,
                params.excludedIngredients,
                params.diet,
                params.cuisine,
                params.cookingMethods,
                params.specialRequest,
                params.withCost,
                params.numberOfServings,
                params.recipePace,
                params.mode,
                params.useSeasonalIngredients,
                cuisineOptions,
                cookingMethodsList
            );
            setRecipe(generatedMenu);
      } else if (params.mealType === MealType.DAILY_MENU) {
            const generatedDailyMenu = await generateDailyMenu(
                params.ingredients,
                params.excludedIngredients,
                params.diet,
                params.cuisine,
                params.cookingMethods,
                params.specialRequest,
                params.withCost,
                params.numberOfServings,
                params.recipePace,
                params.mode,
                params.useSeasonalIngredients,
                cuisineOptions,
                cookingMethodsList
            );
            setRecipe(generatedDailyMenu);
      } else {
          // FIX: Removed extra `params.useSeasonalIngredients` argument to match function signature.
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
            mealTypes,
            cuisineOptions,
            cookingMethodsList,
            cookingMethodCapacities
          );
          setRecipe(generatedRecipe);
      }
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
    if (isFromFavorites && originalRecipe && currentCategory) {
        if (originalRecipe.recipeName !== updatedRecipe.recipeName) {
            await favoritesService.removeRecipeFromFavorites(originalRecipe.recipeName, currentCategory);
        }
        
        const finalFavorites = await favoritesService.addRecipeToFavorites(updatedRecipe, currentCategory);
        
        setFavorites(finalFavorites);
        showNotification('Recept sikeresen frissítve!', 'success');
    }
  };

  const handleMenuUpdate = (updatedMenu: MenuRecipe) => {
    setRecipe(updatedMenu);
  };
  
  const handleDailyMenuUpdate = (updatedMenu: DailyMenuRecipe) => {
    setRecipe(updatedMenu);
  };

  const handleCloseRecipe = () => {
    setRecipe(null);
    setError(null);
    setAlternativeRecipes(null);
    setIsFromFavorites(false);
    setInitialFormData(null);
    setCurrentCategory(null);
  };
  
  const handleRecipeDisplayClose = () => {
    handleCloseRecipe();
    if (isFromFavorites) {
        setView('favorites');
    } else {
        setView('generator');
    }
  };

  const handleFormPopulated = () => {
    setInitialFormData(null);
  };
  
  const handleGenerateVariations = async (originalRecipe: Recipe) => {
    setIsLoading(true);
    setLoadingMessage('Variációk generálása...');
    setError(null);
    try {
      const variations = await generateRecipeVariations(
        originalRecipe,
        cookingMethodsList,
        cuisineOptions,
        mealTypes,
        cookingMethodCapacities
      );
      setAlternativeRecipes(variations);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseComparisonView = () => {
    setAlternativeRecipes(null);
  };
  
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

  const handleSaveAllRecipes = async (recipesToSave: Recipe[], category: string) => {
    try {
        let currentFavorites = favorites;
        for (const recipe of recipesToSave) {
            currentFavorites = await favoritesService.addRecipeToFavorites(recipe, category);
        }
        setFavorites(currentFavorites);
        showNotification(`${recipesToSave.length} recept elmentve a(z) '${category}' kategóriába.`, 'success');
    } catch (e: any) {
        showNotification(e.message || 'Hiba történt a receptek mentése közben.', 'info');
    }
  };


  const handleSaveMenu = async (menuName: string) => {
    if (!recipe || !('menuName' in recipe)) {
        showNotification('Hiba: A mentendő menü nem található.', 'info');
        return;
    }

    const menuToSave = recipe as MenuRecipe;
    const menuCategory = "Teljes Menü (Előétel, Leves, Főétel, Desszert)";

    try {
        let currentFavorites = favorites;
        const courses: { course: Recipe, courseName: 'appetizer' | 'soup' | 'mainCourse' | 'dessert' }[] = [
            { course: menuToSave.appetizer, courseName: 'appetizer' },
            { course: menuToSave.soup, courseName: 'soup' },
            { course: menuToSave.mainCourse, courseName: 'mainCourse' },
            { course: menuToSave.dessert, courseName: 'dessert' },
        ];

        for (const { course, courseName } of courses) {
            if (!course || !course.recipeName) {
                console.warn(`Skipping empty course: ${courseName}`);
                continue;
            }
            const recipeWithMenuInfo: Recipe = {
                ...course,
                menuName: menuName.trim(),
                menuCourse: courseName,
            };
            currentFavorites = await favoritesService.addRecipeToFavorites(recipeWithMenuInfo, menuCategory);
        }
        setFavorites(currentFavorites);
        showNotification(`'${menuName.trim()}' menü sikeresen elmentve.`, 'success');
    } catch (e: any) {
        showNotification(e.message || 'Hiba történt a menü mentése közben.', 'info');
    }
  };
  
  const handleSaveDailyMenu = async (menuName: string) => {
    if (!recipe || !('breakfast' in recipe)) {
        showNotification('Hiba: A mentendő napi menü nem található.', 'info');
        return;
    }

    const menuToSave = recipe as DailyMenuRecipe;
    const menuCategory = "Napi Menü";

    try {
        let currentFavorites = favorites;
        const courses: { course: Recipe, courseName: 'breakfast' | 'lunch' | 'dinner' }[] = [
            { course: menuToSave.breakfast, courseName: 'breakfast' },
            { course: menuToSave.lunch, courseName: 'lunch' },
            { course: menuToSave.dinner, courseName: 'dinner' },
        ];

        for (const { course, courseName } of courses) {
            if (!course || !course.recipeName) {
                console.warn(`Skipping empty course in daily menu: ${courseName}`);
                continue;
            }
            const recipeWithMenuInfo: Recipe = {
                ...course,
                menuName: menuName.trim(),
                menuCourse: courseName,
            };
            currentFavorites = await favoritesService.addRecipeToFavorites(recipeWithMenuInfo, menuCategory);
        }
        setFavorites(currentFavorites);
        showNotification(`'${menuName.trim()}' napi menü sikeresen elmentve.`, 'success');
    } catch (e: any) {
        showNotification(e.message || 'Hiba történt a napi menü mentése közben.', 'info');
    }
  };

  const handleViewFavorite = (recipeToView: Recipe, category: string) => {
    setRecipe(recipeToView);
    setCurrentCategory(category);
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
        throw error;
    }
  };

  const handleDeleteMenu = async (menuName: string, category: string) => {
    try {
        const updatedFavorites = await favoritesService.removeMenuFromFavorites(menuName, category);
        setFavorites(updatedFavorites);
        showNotification(`'${menuName}' menü törölve a mentettek közül.`, 'success');
    } catch (error: any) {
        console.error("Failed to delete menu:", error);
        showNotification(`Hiba történt a menü törlése közben: ${error.message}`, 'info');
    }
  };

  const handleDeleteCategory = async (category: string) => {
    const updatedFavorites = await favoritesService.removeCategory(category);
    setFavorites(updatedFavorites);
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
      // Update the currently viewed recipe if it's the one that changed
      if (recipe && 'recipeName' in recipe && (recipe as Recipe).recipeName === recipeName) {
        setRecipe({ ...(recipe as Recipe), favoritedBy: favoritedByIds });
      }
      showNotification('Kedvenc állapot frissítve.', 'success');
    } catch (e: any) {
      showNotification('Hiba a kedvenc állapot frissítésekor.', 'info');
    }
  };
  
  const handleUpdateRecipeCategories = async (recipeToUpdate: Recipe, newCategories: string[]) => {
    try {
      const updatedFavorites = await favoritesService.updateRecipeCategories(recipeToUpdate, newCategories);
      setFavorites(updatedFavorites);
      showNotification(`'${recipeToUpdate.recipeName}' kategóriái frissítve.`, 'success');
    } catch (e: any) {
        showNotification('Hiba a kategóriák frissítésekor.', 'info');
    }
  };

  const handleAddItemsToShoppingList = (items: string[]) => {
    const updatedList = shoppingListService.addItems(items);
    setShoppingList(updatedList);
    showNotification(`${items.length} tétel hozzáadva a bevásárlólistához.`, 'success');
  };
  
  const handleMenuToShoppingList = (menu: MenuRecipe | DailyMenuRecipe) => {
    let allIngredients: string[] = [];
    if ('appetizer' in menu) {
        allIngredients = [
            ...menu.appetizer.ingredients,
            ...menu.soup.ingredients,
            ...menu.mainCourse.ingredients,
            ...menu.dessert.ingredients,
        ];
    } else {
        allIngredients = [
            ...menu.breakfast.ingredients,
            ...menu.lunch.ingredients,
            ...menu.dinner.ingredients,
        ];
    }
    const uniqueIngredients = [...new Set(allIngredients)];
    handleAddItemsToShoppingList(uniqueIngredients);
  };

  const handleUpdateShoppingListItem = (index: number, updatedItem: ShoppingListItem) => {
    const updatedList = shoppingListService.updateItem(index, updatedItem);
    setShoppingList(updatedList);
  };

  const handleRemoveShoppingListItem = (index: number) => {
    const updatedList = shoppingListService.removeItem(index);
    setShoppingList(updatedList);
  };
  
  const handleClearCheckedShoppingList = () => {
    const updatedList = shoppingListService.clearChecked();
    setShoppingList(updatedList);
    showNotification('Kipipált tételek törölve.', 'success');
  };

  const handleClearAllShoppingList = () => {
    if (window.confirm('Biztosan törli a teljes bevásárlólistát?')) {
      const updatedList = shoppingListService.clearAll();
      setShoppingList(updatedList);
      showNotification('Bevásárlólista törölve.', 'success');
    }
  };
  
  const handleReorderShoppingList = (reorderedList: ShoppingListItem[]) => {
    const updatedList = reorderShoppingList(reorderedList);
    setShoppingList(updatedList);
  };

  const handlePantryAddItem = (items: string[], location: PantryLocation, date: string | null, storageType: StorageType) => {
    const updatedPantry = pantryService.addItems(items, location, date, storageType);
    setPantry(updatedPantry);
    showNotification(`${items.length} tétel hozzáadva a kamrához (${location}).`, 'success');
  };
  
  const handleUpdatePantryItem = (originalItem: PantryItem, updatedItem: PantryItem, location: PantryLocation) => {
    const itemIndex = (pantry[location] || []).findIndex(item => item.text === originalItem.text && item.dateAdded === originalItem.dateAdded);
    if (itemIndex > -1) {
      const updatedPantry = pantryService.updateItem(itemIndex, updatedItem, location);
      setPantry(updatedPantry);
    }
  };
  
  const handleRemovePantryItem = (item: PantryItem, location: PantryLocation) => {
    const itemIndex = (pantry[location] || []).findIndex(i => i.text === item.text && i.dateAdded === item.dateAdded);
    if (itemIndex > -1) {
        const updatedPantry = pantryService.removeItem(itemIndex, location);
        setPantry(updatedPantry);
    }
  };
  
  const handleClearPantry = (location: PantryLocation) => {
    if (window.confirm(`Biztosan törli a(z) ${location} kamra teljes tartalmát?`)) {
        const updatedPantry = pantryService.clearAll(location);
        setPantry(updatedPantry);
    }
  };
  
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
        // Assume default storage type is PANTRY when moving from shopping list
        handlePantryAddItem(itemTexts, location, new Date().toISOString().split('T')[0], StorageType.PANTRY);
        handleClearCheckedShoppingList();
        showNotification(`${checkedItems.length} tétel áthelyezve a kamrába (${location}).`, 'success');
    });
    setIsLocationPromptOpen(true);
  };
  
  const handleGenerateFromPantryRequest = () => {
    setLocationCallback(() => (location: PantryLocation) => {
        const allItems = pantry[location] || [];
        if (allItems.length === 0) {
            showNotification(`A kamra (${location}) üres.`, 'info');
            return;
        }
        
        // Sort by date, oldest first, null dates treated as oldest
        const sortedItems = [...allItems].sort((a, b) => {
            if (a.dateAdded === null) return -1;
            if (b.dateAdded === null) return 1;
            return new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
        });

        const ingredientsString = sortedItems.map(item => item.text).join(', ');
        setInitialFormData({ ingredients: ingredientsString, mode: 'standard' });
        setView('generator');
    });
    setIsLocationPromptOpen(true);
  };

  const handleGenerateFromSelectedPantryItems = (items: string[]) => {
      if (items.length > 0) {
          setInitialFormData({ ingredients: items.join(', '), mode: 'standard' });
          setView('generator');
      }
  };
  
  const handleMovePantryItems = (indices: number[], source: PantryLocation, destination: PantryLocation) => {
    const updatedPantry = pantryService.moveItems(indices, source, destination);
    setPantry(updatedPantry);
    showNotification(`${indices.length} tétel áthelyezve ide: ${destination}.`, 'success');
  };

  const handleCopyPantryItems = (indices: number[], source: PantryLocation, destination: PantryLocation) => {
    const updatedPantry = pantryService.copyItems(indices, source, destination);
    setPantry(updatedPantry);
    showNotification(`${indices.length} tétel átmásolva ide: ${destination}.`, 'success');
  };

  const handleSaveUser = (user: UserProfile | Omit<UserProfile, 'id'>) => {
    let updatedUsers: UserProfile[];
    if ('id' in user) {
        updatedUsers = userService.updateUser(users, user);
        showNotification('Felhasználó frissítve.', 'success');
    } else {
        updatedUsers = userService.addUser(users, user);
        showNotification('Új felhasználó hozzáadva.', 'success');
    }
    setUsers(updatedUsers);
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Biztosan törli ezt a felhasználót?')) {
        const updatedUsers = userService.deleteUser(users, userId);
        setUsers(updatedUsers);
        showNotification('Felhasználó törölve.', 'success');
    }
  };

  // FIX: Added explicit type cast to resolve 'unknown' type error in .some() callback.
  const hasAnyData = Object.keys(favorites).length > 0 || shoppingList.length > 0 || Object.values(pantry).some((list: PantryItem[]) => list.length > 0) || users.length > 0;
  
    const handleShoppingListCommand = (command: AppCommand) => {
        const { action, payload } = command;
        if (view !== 'shopping-list') {
            showNotification('Ehhez a parancshoz a bevásárlólista nézetben kell lennie.', 'info');
            return;
        }

        switch (action) {
            case 'add_shopping_list_item':
                if (payload) {
                    handleAddItemsToShoppingList([payload]);
                    showNotification(`'${payload}' hozzáadva a listához.`, 'success');
                }
                break;
            case 'remove_shopping_list_item':
            case 'check_shopping_list_item':
            case 'uncheck_shopping_list_item':
                if (payload) {
                    const itemText = String(payload).toLowerCase();
                    const itemIndex = shoppingList.findIndex(i => i.text.toLowerCase() === itemText);
                    if (itemIndex > -1) {
                        if (action === 'remove_shopping_list_item') {
                            handleRemoveShoppingListItem(itemIndex);
                            showNotification(`'${payload}' törölve.`, 'success');
                        } else {
                            const item = shoppingList[itemIndex];
                            const shouldBeChecked = action === 'check_shopping_list_item';
                            if (item.checked !== shouldBeChecked) {
                               handleUpdateShoppingListItem(itemIndex, {...item, checked: shouldBeChecked});
                               showNotification(`'${payload}' állapota módosítva.`, 'success');
                            }
                        }
                    } else {
                        showNotification(`'${payload}' nem található a listán.`, 'info');
                    }
                }
                break;
            case 'clear_checked_shopping_list':
                handleClearCheckedShoppingList();
                break;
            case 'clear_all_shopping_list':
                handleClearAllShoppingList();
                break;
            default:
                 showNotification('Ismeretlen parancs a bevásárlólistához.', 'info');
        }
    };
    
    const handleFavoritesCommand = (command: AppCommand) => {
        const { action, payload } = command;
        if (view !== 'favorites') {
            showNotification('Ehhez a parancshoz a kedvencek nézetben kell lennie.', 'info');
            return;
        }

        switch (action) {
            case 'view_favorite_recipe':
                if (payload) {
                    let found = false;
                    const recipeName = String(payload).toLowerCase();
                    for (const category in favorites) {
                        const recipe = favorites[category].find(r => r.recipeName.toLowerCase() === recipeName);
                        if (recipe) {
                            handleViewFavorite(recipe, category);
                            found = true;
                            break;
                        }
                    }
                    if (!found) showNotification(`'${payload}' recept nem található.`, 'info');
                }
                break;
            case 'delete_favorite_recipe':
                 if (payload) {
                    let found = false;
                    const recipeName = String(payload).toLowerCase();
                    for (const category in favorites) {
                        const recipe = favorites[category].find(r => r.recipeName.toLowerCase() === recipeName);
                        if (recipe) {
                            handleDeleteFavorite(recipe.recipeName, category);
                            found = true;
                            break;
                        }
                    }
                    if (!found) showNotification(`'${payload}' recept nem található.`, 'info');
                }
                break;
            case 'filter_favorites':
                if (payload && (Object.keys(favorites).includes(payload) || payload === 'all')) {
                    setFilterCategory(payload);
                }
                break;
            case 'clear_favorites_filter':
                setFilterCategory('all');
                break;
            case 'expand_category':
            case 'collapse_category':
                 const category = payload;
                 if (category && favorites[category]) {
                    const isExpanded = expandedCategories[category] ?? false;
                    const shouldBeExpanded = action === 'expand_category';
                    if (isExpanded !== shouldBeExpanded) {
                        // FIX: Changed handleToggleCategory to the correct state setter logic.
                        setExpandedCategories(prev => ({...prev, [category]: shouldBeExpanded}));
                    }
                 }
                break;
            default:
                showNotification('Ismeretlen parancs a kedvencekhez.', 'info');
        }
    };

    const handleTranscriptUpdate = (transcript: string | null) => {
        // Always allow clearing the bubble.
        if (transcript === null) {
            setVoiceFeedback(null);
            return;
        }
        // Only show new transcripts if not currently processing a final command.
        if (!isProcessingVoice) {
            setVoiceFeedback(transcript);
        }
    };

    const handleGlobalCommand = async (transcript: string) => {
        setVoiceFeedback(transcript); // Ensure final transcript is set before processing
        setIsProcessingVoice(true);
        try {
            // 1. Try general local commands (nav, scroll, etc.) first
            const localAppCmd = interpretLocalAppCommand(transcript);
            if (localAppCmd) {
                if (localAppCmd.action === 'navigate' && localAppCmd.payload) {
                    setView(localAppCmd.payload as AppView);
                    showNotification(`Navigálás ide: ${localAppCmd.payload}`, 'info');
                    return; // Command handled
                }
                switch (localAppCmd.action) {
                    case 'scroll_down':
                        window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
                        return; // Command handled
                    case 'scroll_up':
                        window.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' });
                        return; // Command handled
                }
                 // Handle other local commands like clear list if in the right view
                if (view === 'shopping-list' && (localAppCmd.action === 'clear_checked_shopping_list' || localAppCmd.action === 'clear_all_shopping_list')) {
                    handleShoppingListCommand(localAppCmd);
                    return; // Command handled
                }
            }

            // 2. If no general local command, check for context-specific commands (local first, then Gemini)
            switch (view) {
                case 'generator':
                    if (recipe === null) { // On the form
                        const localFormCmd = interpretLocalFormCommand(transcript);
                        if (localFormCmd) {
                            setFormCommand(localFormCmd);
                        } else {
                            const result = await interpretFormCommand(transcript, mealTypes, cookingMethodsList, DIET_OPTIONS);
                            setFormCommand(result);
                        }
                    } else { // Viewing a recipe
                        const localRecipeCmd = interpretLocalRecipeCommand(transcript);
                        if (localRecipeCmd) {
                            if (localRecipeCmd.command === VoiceCommand.REPEAT) {
                                setForceSpeakTrigger(Math.random());
                            }
                            setRecipeCommand(localRecipeCmd);
                        } else {
                            const result = await interpretUserCommand(transcript);
                            if (result.command === VoiceCommand.REPEAT) {
                                setForceSpeakTrigger(Math.random());
                            }
                            setRecipeCommand(result);
                        }
                    }
                    break;
                
                // For other views, if no general local command was found, fallback to Gemini
                case 'shopping-list':
                case 'favorites':
                case 'pantry':
                case 'users':
                    if (!localAppCmd) {
                        const appContext = {
                            categories: Object.keys(favorites),
                            shoppingListItems: shoppingList.map(i => i.text),
                            pantryItems: Object.values(pantry).flat().map((i: PantryItem) => i.text),
                        };
                        const appCommand = await interpretAppCommand(transcript, view, appContext);

                        if (view === 'shopping-list') {
                            handleShoppingListCommand(appCommand);
                        } else if (view === 'favorites') {
                            handleFavoritesCommand(appCommand);
                        } else if (appCommand.action !== 'unknown') {
                            showNotification('Ez a parancs ezen a nézeten nem értelmezhető.', 'info');
                        } else {
                            showNotification('Sajnos nem értettem a parancsot.', 'info');
                        }
                    }
                    break;
                
                default:
                    // If we are here, no local command matched and we don't have a specific Gemini interpreter for this view.
                    if (!localAppCmd) {
                        showNotification('Sajnos nem értettem a parancsot.', 'info');
                    }
                    break;
            }
    
        } catch (e: unknown) {
            console.error('Error processing global command:', e);
            if (e instanceof Error) {
                showNotification(e.message, 'info');
            } else {
                showNotification('Ismeretlen hiba a parancs feldolgozása közben.', 'info');
            }
        } finally {
            setIsProcessingVoice(false);
            setTimeout(() => {
                setVoiceFeedback(null);
            }, 500); // Keep bubble for a moment after processing finishes
        }
    };

  const handleExport = async () => {
    try {
        const images = await imageStore.getAllImages();
        const appGuideContent = localStorage.getItem('app-guide-content') || undefined;
        const appGuideVersion = localStorage.getItem('app-guide-version') || undefined;

        const backupData: BackupData = {
            favorites: favorites,
            shoppingList: shoppingList,
            pantry: pantry,
            users: users,
            images: images,
            mealTypes: mealTypes,
            cuisineOptions: cuisineOptions,
            cookingMethods: cookingMethodsList,
            cookingMethodCapacities: cookingMethodCapacities,
            mealTypesOrder: orderedMealTypes.map(o => o.value),
            cuisineOptionsOrder: orderedCuisineOptions.map(o => o.value),
            cookingMethodsOrder: orderedCookingMethods.map(o => o.value),
            appGuideContent,
            appGuideVersion,
        };
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const fileName = `konyhamiki_mentes_${year}-${month}-${day}_${hours}-${minutes}.json`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Adatok sikeresen elmentve!', 'success');
    } catch (e: any) {
        if (e.name !== 'AbortError') {
            console.error('Export failed:', e);
            showNotification(`Hiba történt a mentés közben: ${e.message}`, 'info');
        }
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data: BackupData = JSON.parse(text);

        const { favorites: importedFavorites, recoveryNotification: favsRecovery } = favoritesService.validateAndRecover(data.favorites);
        const { mergedFavorites, newRecipesCount } = favoritesService.mergeFavorites(favorites, importedFavorites);
        if (favsRecovery) showNotification(favsRecovery, 'info');
        
        const { list: importedShoppingList, recoveryNotification: shopListRecovery } = shoppingListService.validateAndRecover(data.shoppingList);
        const { mergedList, newItemsCount: newShopItems } = shoppingListService.mergeShoppingLists(shoppingList, importedShoppingList);
        if (shopListRecovery) showNotification(shopListRecovery, 'info');

        const { pantry: importedPantry, recoveryNotification: pantryRecovery } = pantryService.validateAndRecover(data.pantry);
        const { mergedPantry, newItemsCount: newPantryItems } = pantryService.mergePantries(pantry, importedPantry);
        if (pantryRecovery) showNotification(pantryRecovery, 'info');

        const { users: importedUsers, recoveryNotification: usersRecovery } = userService.validateAndRecover(data.users);
        const { mergedUsers, newItemsCount: newUsers } = userService.mergeUsers(users, importedUsers);
        if (usersRecovery) showNotification(usersRecovery, 'info');
        
        if (data.images && typeof data.images === 'object') {
            for (const id in data.images) {
                await imageStore.saveImage(id, data.images[id]);
            }
        }
        
        if (data.appGuideContent && data.appGuideVersion) {
            localStorage.setItem('app-guide-content', data.appGuideContent);
            localStorage.setItem('app-guide-version', data.appGuideVersion);
        }

        setFavorites(mergedFavorites);
        shoppingListService.saveShoppingList(mergedList);
        setShoppingList(mergedList);
        pantryService.savePantry(mergedPantry);
        setPantry(mergedPantry);
        userService.saveUsers(mergedUsers);
        setUsers(mergedUsers);

        const mergeImportedOptions = (defaults: readonly OptionItem[], imported: OptionItem[] = []): OptionItem[] => {
            const mergedMap = new Map<string, OptionItem>();
            defaults.forEach(item => mergedMap.set(item.value, item));
            imported.forEach(item => mergedMap.set(item.value, item));
            return Array.from(mergedMap.values());
        };

        const mergedMealTypes = mergeImportedOptions(MEAL_TYPES, data.mealTypes);
        const mergedCuisineOptions = mergeImportedOptions(CUISINE_OPTIONS, data.cuisineOptions);
        const mergedCookingMethods = mergeImportedOptions(COOKING_METHODS, data.cookingMethods);
        const mergedCapacities = { ...COOKING_METHOD_CAPACITIES, ...(data.cookingMethodCapacities || {}) };
        
        handleOptionsSave(
            mergedMealTypes,
            mergedCuisineOptions,
            mergedCookingMethods,
            mergedCapacities,
            data.mealTypesOrder || mergedMealTypes.map(o => o.value),
            data.cuisineOptionsOrder || mergedCuisineOptions.map(o => o.value),
            data.cookingMethodsOrder || mergedCookingMethods.map(o => o.value),
            true
        );

        const totalNew = newRecipesCount + newShopItems + newPantryItems + newUsers;
        showNotification(`Adatok sikeresen betöltve! ${totalNew} új tétel hozzáadva.`, 'success');
        
      } catch (err: any) {
        console.error('Import failed:', err);
        showNotification(`Hiba a betöltés közben: ${err.message}`, 'info');
      }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  };

  const handleOptionsSave = (
    newMealTypes: OptionItem[],
    newCuisineOptions: OptionItem[],
    newCookingMethods: OptionItem[],
    newCapacities: Record<string, number | null>,
    mealTypesOrder?: string[],
    cuisineOptionsOrder?: string[],
    cookingMethodsOrder?: string[],
    silent = false,
  ) => {
    safeSetLocalStorage(MEAL_TYPES_STORAGE_KEY, newMealTypes);
    setMealTypes(newMealTypes);
    safeSetLocalStorage(CUISINE_OPTIONS_STORAGE_KEY, newCuisineOptions);
    setCuisineOptions(newCuisineOptions);
    safeSetLocalStorage(COOKING_METHODS_STORAGE_KEY, newCookingMethods);
    setCookingMethodsList(newCookingMethods);
    safeSetLocalStorage(COOKING_METHOD_CAPACITIES_STORAGE_KEY, newCapacities);
    setCookingMethodCapacities(newCapacities);
    
    safeSetLocalStorage(MEAL_TYPES_ORDER_KEY, mealTypesOrder || newMealTypes.map(o => o.value));
    safeSetLocalStorage(CUISINE_OPTIONS_ORDER_KEY, cuisineOptionsOrder || newCuisineOptions.map(o => o.value));
    safeSetLocalStorage(COOKING_METHODS_ORDER_KEY, cookingMethodsOrder || newCookingMethods.map(o => o.value));

    setIsOptionsEditorOpen(false);
    if (!silent) {
        showNotification('Opciók elmentve!', 'success');
    }
  };

  const handleParseUrl = async (url: string) => {
    setIsParsingUrl(true);
    setParsingUrlError(null);
    try {
        const parsedRecipe = await parseRecipeFromUrl(url);
        const formData = {
            ingredients: parsedRecipe.ingredients?.join(', ') || '',
            specialRequest: `Készíts receptet a következő alapján: ${parsedRecipe.recipeName}. Leírás: ${parsedRecipe.description}`,
            mealType: MealType.LUNCH, // Default
        };
        setInitialFormData(formData);
        setView('generator');
        setIsImportUrlModalOpen(false);
        showNotification('Recept adatok sikeresen beolvasva!', 'success');
    } catch (e: any) {
        setParsingUrlError(e.message);
    } finally {
        setIsParsingUrl(false);
    }
  };
  
  const handleParseFile = async (file: File) => {
    setIsParsingUrl(true); // Re-use parsing state
    setParsingUrlError(null);
    try {
        const fileData = await processAndResizeImageForGemini(file);
        const parsedRecipe = await parseRecipeFromFile({ inlineData: fileData });
        const formData = {
            ingredients: parsedRecipe.ingredients?.join(', ') || '',
            specialRequest: `Készíts receptet a következő alapján: ${parsedRecipe.recipeName}. Leírás: ${parsedRecipe.description}`,
            mealType: MealType.LUNCH, // Default
        };
        setInitialFormData(formData);
        setView('generator');
        showNotification('Recept adatok sikeresen beolvasva a fájlból!', 'success');
    } catch (e: any) {
        setError(e.message); // Show error on main screen
    } finally {
        setIsParsingUrl(false);
    }
  };

    const forceRegenerateGuide = async (showNotificationOnSuccess = true) => {
        const GUIDE_CONTENT_KEY = 'app-guide-content';
        const GUIDE_VERSION_KEY = 'app-guide-version';
    
        setIsLoadingGuide(true);
        try {
            const content = await generateAppGuide();
            setAppGuideContent(content);
            localStorage.setItem(GUIDE_CONTENT_KEY, content);
            localStorage.setItem(GUIDE_VERSION_KEY, APP_VERSION);
            if (showNotificationOnSuccess) {
                showNotification('Információs útmutató sikeresen újragenerálva!', 'success');
            }
        } catch (e: any) {
            setAppGuideContent(`<p class="text-red-500">Hiba az útmutató betöltése közben: ${e.message}</p>`);
        } finally {
            setIsLoadingGuide(false);
        }
    };

    const handleShowAppGuide = async () => {
        const GUIDE_CONTENT_KEY = 'app-guide-content';
        const GUIDE_VERSION_KEY = 'app-guide-version';

        const cachedContent = localStorage.getItem(GUIDE_CONTENT_KEY);
        const cachedVersion = localStorage.getItem(GUIDE_VERSION_KEY);
        
        setIsInfoModalOpen(true);

        if (cachedContent && cachedVersion === APP_VERSION) {
            setAppGuideContent(cachedContent);
            return;
        }
        
        await forceRegenerateGuide(false);
    };

  // FIX: Changed icon type from JSX.Element to React.ReactElement to resolve missing JSX namespace error.
  const navItems: { id: AppView, label: string, icon: React.ReactElement }[] = [
    { id: 'generator', label: 'Generátor', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.636-6.364l-.707-.707M12 21v-1m-6.364-1.636l.707-.707M6 17.001L6 17" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8s-3-5.5-4-5.5S8 8 8 8s-1.5 2.5-1.5 4.5C6.5 15.001 9 17 12 17s5.5-1.999 5.5-4.5C17.5 10.5 16 8 16 8z" /></svg> },
    { id: 'favorites', label: 'Mentettek', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg> },
    { id: 'shopping-list', label: 'Bevásárlólista', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
    { id: 'pantry', label: 'Kamra', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
    { id: 'users', label: 'Felhasználók', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
  ];

  const handleWakeLockActivate = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        await (navigator as any).wakeLock.request('screen');
        showNotification('Képernyőzár feloldva a hangvezérlés idejére.', 'info');
      }
    } catch (err: any) {
      console.error(`Wake Lock failed: ${err.name}, ${err.message}`);
    }
  }, [showNotification]);


  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 font-sans">
      <header className="flex justify-between items-center mb-4">
        <img src={konyhaMikiLogo} alt="Konyha Miki Logó" className="h-16" />
        <div className="flex items-center gap-2">
            <button
                onClick={toggleTheme}
                className="bg-white text-primary-700 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-600 font-semibold p-2 rounded-full border border-primary-300 shadow-sm hover:bg-primary-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                aria-label={theme === 'dark' ? 'Világos mód' : 'Sötét mód'}
            >
                {theme === 'dark' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.464A1 1 0 106.465 13.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm.707-10.607a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" clipRule="evenodd" />
                    </svg>
                )}
            </button>
            <button
                onClick={toggleFullscreen}
                className="bg-white text-primary-700 font-semibold py-2 px-4 rounded-lg border border-primary-300 shadow-sm hover:bg-primary-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex items-center gap-2 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-600"
                aria-label={isFullscreen ? 'Kilépés a teljes képernyős módból' : 'Váltás teljes képernyős módra'}
            >
                {isFullscreen ? (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 5a1 1 0 011-1h2a1 1 0 110 2H6v1a1 1 0 11-2 0V6a1 1 0 011-1zm10 0a1 1 0 011 1v1a1 1 0 11-2 0V6h-1a1 1 0 110-2h2zM5 14a1 1 0 011 1v1h1a1 1 0 110 2H6a1 1 0 01-1-1v-2zm10 0a1 1 0 011 1v2a1 1 0 01-1 1h-1a1 1 0 110-2h1v-1z" clipRule="evenodd" />
                        </svg>
                        <span className="hidden sm:inline">Ablak mód</span>
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h2a1 1 0 110 2H5v1a1 1 0 11-2 0V4zm14 0a1 1 0 00-1-1h-2a1 1 0 100 2h1v1a1 1 0 102 0V4zM4 17a1 1 0 01-1-1v-2a1 1 0 112 0v1h1a1 1 0 110 2H4zM16 17a1 1 0 001-1v-1a1 1 0 10-2 0v1h-1a1 1 0 100 2h2z" clipRule="evenodd" />
                        </svg>
                        <span className="hidden sm:inline">Teljes képernyő</span>
                    </>
                )}
            </button>
            <button
            onClick={handleShowAppGuide}
            className="bg-white text-primary-700 font-semibold py-2 px-4 rounded-lg border border-primary-300 shadow-sm hover:bg-primary-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-600"
            >
            Információ
            </button>
        </div>
      </header>
      
      <div className="flex justify-center items-center gap-4 mb-6">
        <GlobalVoiceController onCommand={handleGlobalCommand} isProcessing={isProcessingVoice} onTranscriptUpdate={handleTranscriptUpdate} onActivate={handleWakeLockActivate} />
      </div>

      <nav className="flex justify-center flex-wrap gap-2 mb-6 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition-colors text-sm sm:text-base ${view === item.id ? 'bg-primary-600 text-white shadow' : 'text-gray-600 hover:bg-primary-50 dark:text-gray-300 dark:hover:bg-gray-700'}`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      
      <DataManagementControls
        onExport={handleExport}
        onImportClick={() => fileInputRef.current?.click()}
        onFileChange={handleImport}
        fileInputRef={fileInputRef}
        hasAnyData={hasAnyData}
      />
      
      <main className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg dark:bg-gray-800">
        {view === 'generator' && (
          <div className="space-y-6">
            {!recipe && !alternativeRecipes && (
              <>
                <RecipeInputForm
                    onSubmit={handleRecipeSubmit}
                    isLoading={isLoading}
                    initialFormData={initialFormData}
                    onFormPopulated={handleFormPopulated}
                    users={users}
                    mealTypes={mealTypes}
                    cuisineOptions={cuisineOptions}
                    cookingMethodsList={cookingMethodsList}
                    cookingMethodCapacities={cookingMethodCapacities}
                    orderedMealTypes={orderedMealTypes}
                    orderedCuisineOptions={orderedCuisineOptions}
                    orderedCookingMethods={orderedCookingMethods}
                    onOpenOptionsEditor={() => setIsOptionsEditorOpen(true)}
                    onOpenUrlImporter={() => setIsImportUrlModalOpen(true)}
                    onOpenRecipeFileImporter={() => recipeFileInputRef.current?.click()}
                    command={formCommand}
                    onCommandProcessed={() => setFormCommand(null)}
                />
                <input type="file" ref={recipeFileInputRef} onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleParseFile(file);
                }} accept="image/png, image/jpeg, image/webp, application/pdf" className="hidden" />
              </>
            )}
            {isLoading && <LoadingSpinner message={loadingMessage}/>}
            {error && !isLoading && <ErrorMessage message={error} />}
            {recipe && 'recipeName' in recipe && (
                <div ref={recipeDisplayRef}>
                    <RecipeDisplay
                        recipe={recipe as Recipe}
                        onClose={handleRecipeDisplayClose}
                        isFromFavorites={isFromFavorites}
                        favorites={favorites}
                        onSave={handleSaveToFavorites}
                        onAddItemsToShoppingList={handleAddItemsToShoppingList}
                        isLoading={isLoading}
                        onRecipeUpdate={handleRecipeUpdate}
                        users={users}
                        onUpdateFavoriteStatus={handleUpdateFavoriteStatus}
                        shouldGenerateImageInitially={shouldGenerateImage}
                        onGenerateVariations={handleGenerateVariations}
                        isGeneratingVariations={isLoading}
                        mealTypes={mealTypes}
                        cuisineOptions={cuisineOptions}
                        cookingMethodsList={cookingMethodsList}
                        category={currentCategory}
                        command={recipeCommand}
                        onCommandProcessed={() => setRecipeCommand(null)}
                        forceSpeakTrigger={forceSpeakTrigger}
                    />
                </div>
            )}
            {recipe && 'menuName' in recipe && 'appetizer' in recipe && (
                <div ref={recipeDisplayRef}>
                    <MenuDisplay
                        menu={recipe as MenuRecipe}
                        onClose={() => { handleCloseRecipe(); setView('generator'); }}
                        onSave={handleSaveMenu}
                        onAddItemsToShoppingList={handleMenuToShoppingList}
                        shouldGenerateImages={shouldGenerateImage}
                        onMenuUpdate={handleMenuUpdate}
                        mealTypes={mealTypes}
                        cookingMethodsList={cookingMethodsList}
                    />
                </div>
            )}
            {recipe && 'menuName' in recipe && 'breakfast' in recipe && (
                <div ref={recipeDisplayRef}>
                    <DailyMenuDisplay
                        dailyMenu={recipe as DailyMenuRecipe}
                        onClose={() => { handleCloseRecipe(); setView('generator'); }}
                        onSave={handleSaveDailyMenu}
                        onAddItemsToShoppingList={handleMenuToShoppingList}
                        onDailyMenuUpdate={handleDailyMenuUpdate}
                    />
                </div>
            )}
            {alternativeRecipes && recipe && 'recipeName' in recipe && (
                <RecipeComparisonView
                    originalRecipe={recipe as Recipe}
                    variations={alternativeRecipes}
                    onClose={handleCloseComparisonView}
                    onSave={handleSaveToFavorites}
                    onSaveAll={handleSaveAllRecipes}
                    favorites={favorites}
                    mealTypes={mealTypes}
                    cuisineOptions={cuisineOptions}
                    cookingMethodsList={cookingMethodsList}
                />
            )}
          </div>
        )}
        
        {view === 'favorites' && (
          <FavoritesView
            favorites={favorites}
            users={users}
            onViewRecipe={handleViewFavorite}
            onDeleteRecipe={handleDeleteFavorite}
            onDeleteCategory={handleDeleteCategory}
            onDeleteMenu={handleDeleteMenu}
            expandedCategories={expandedCategories}
            onToggleCategory={(cat) => setExpandedCategories(prev => ({...prev, [cat]: !prev[cat]}))}
            filterCategory={filterCategory}
            onSetFilterCategory={setFilterCategory}
            sortOption={sortOption}
            onSetSortOption={setSortOption}
            onMoveRecipe={handleMoveFavorite}
            onUpdateFavoriteStatus={handleUpdateFavoriteStatus}
            onUpdateRecipeCategories={handleUpdateRecipeCategories}
            cuisineOptions={cuisineOptions}
          />
        )}

        {view === 'shopping-list' && (
          <ShoppingListView
            list={shoppingList}
            onAddItems={handleAddItemsToShoppingList}
            onUpdateItem={handleUpdateShoppingListItem}
            onRemoveItem={handleRemoveShoppingListItem}
            onClearChecked={handleClearCheckedShoppingList}
            onClearAll={handleClearAllShoppingList}
            onMoveItemToPantryRequest={handleMoveItemToPantryRequest}
            onReorder={handleReorderShoppingList}
          />
        )}
        
        {view === 'pantry' && (
          <PantryView
            pantry={pantry}
            onAddItems={handlePantryAddItem}
            onUpdateItem={handleUpdatePantryItem}
            onRemoveItem={handleRemovePantryItem}
            onClearAll={handleClearPantry}
            onMoveCheckedToPantryRequest={handleMoveCheckedToPantryRequest}
            onGenerateFromPantryRequest={handleGenerateFromPantryRequest}
            shoppingListItems={shoppingList}
            onMoveItems={handleMovePantryItems}
            onCopyItems={handleCopyPantryItems}
            onGenerateFromSelectedPantryItemsRequest={handleGenerateFromSelectedPantryItems}
            onAddItemsToShoppingList={handleAddItemsToShoppingList}
          />
        )}

        {view === 'users' && (
            <UsersView
                users={users}
                onSaveUser={handleSaveUser}
                onDeleteUser={handleDeleteUser}
            />
        )}
      </main>

      {isLocationPromptOpen && (
        <LocationPromptModal
            isOpen={isLocationPromptOpen}
            onClose={() => setIsLocationPromptOpen(false)}
            onSelect={(location) => {
                locationCallback(location);
                setIsLocationPromptOpen(false);
            }}
        />
      )}

      <LoadOnStartModal
        isOpen={isLoadOnStartModalOpen}
        onClose={() => setIsLoadOnStartModalOpen(false)}
        onLoad={() => fileInputRef.current?.click()}
      />

      <OptionsEditPanel
        isOpen={isOptionsEditorOpen}
        onClose={() => setIsOptionsEditorOpen(false)}
        onSave={(newMealTypes, newCuisineOptions, newCookingMethods, newCapacities) => {
          handleOptionsSave(
              newMealTypes,
              newCuisineOptions,
              newCookingMethods,
              newCapacities,
              newMealTypes.map(o => o.value),
              newCuisineOptions.map(o => o.value),
              newCookingMethods.map(o => o.value)
          );
        }}
        initialMealTypes={mealTypes}
        initialCuisineOptions={cuisineOptions}
        initialCookingMethods={cookingMethodsList}
        initialCapacities={cookingMethodCapacities}
      />
      <InfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        content={appGuideContent}
        isLoading={isLoadingGuide}
        onRegenerate={forceRegenerateGuide}
      />
      <ImportUrlModal
        isOpen={isImportUrlModalOpen}
        onClose={() => setIsImportUrlModalOpen(false)}
        onParse={handleParseUrl}
        isParsing={isParsingUrl}
        error={parsingUrlError}
      />
      
      {/* Voice feedback bubble will be managed inside GlobalVoiceController for better state management */}

      <footer className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400 space-y-4">
        <p>
          AI Receptgenerátor - Konyha Miki módra | Verzió: {APP_VERSION}
        </p>
        <p className="max-w-2xl mx-auto">
          Figyelem: Az AI által generált receptek tájékoztató jellegűek. Főzés előtt mindig ellenőrizze az összetevőket és az elkészítési lépéseket. Különös óvatossággal járjon el allergia, intolerancia, vagy speciális diéta esetén! Maradékok felhasználásakor mindig tartsa be az élelmiszerbiztonsági előírásokat!
        </p>
        <div>
          <button
              onClick={() => setIsExamplesExpanded(!isExamplesExpanded)}
              className="text-primary-700 dark:text-primary-300 font-semibold hover:underline"
              aria-expanded={isExamplesExpanded}
          >
              Hangparancs példák (API hívás nélkül)
          </button>
          {isExamplesExpanded && (
              <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg text-left max-w-md mx-auto animate-fade-in">
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                      {ALL_LOCAL_COMMAND_EXAMPLES.map((ex, i) => (
                          <li key={i} className="text-gray-600 dark:text-gray-300">
                              - "{ex}"
                          </li>
                      ))}
                  </ul>
              </div>
          )}
        </div>
      </footer>
    </div>
  );
};

// FIX: Add default export for App component.
export default App;
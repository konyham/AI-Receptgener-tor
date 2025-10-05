import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DietOption, MealType, FormCommand, SelectionResult, CookingMethod, RecipeSuggestions, CuisineOption, RecipePace, UserProfile, OptionItem } from '../types';
import { DIET_OPTIONS, MEAL_TYPES as defaultMealTypes, COOKING_METHODS as defaultCookingMethods, CUISINE_OPTIONS as defaultCuisineOptions, RECIPE_PACE_OPTIONS, MEAL_TYPES_STORAGE_KEY, CUISINE_OPTIONS_STORAGE_KEY, COOKING_METHODS_STORAGE_KEY, COOKING_METHOD_CAPACITIES_STORAGE_KEY, COOKING_METHODS_ORDER_KEY, CUISINE_OPTIONS_ORDER_KEY } from '../constants';
import { interpretFormCommand, suggestMealType } from '../services/geminiService';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useNotification } from '../contexts/NotificationContext';
import { safeSetLocalStorage } from '../utils/storage';

interface RecipeInputFormProps {
  onSubmit: (params: { ingredients: string, excludedIngredients: string, diet: DietOption, mealType: MealType, cuisine: CuisineOption, cookingMethods: CookingMethod[], specialRequest: string, withCost: boolean, withImage: boolean, numberOfServings: number, recipePace: RecipePace, mode: 'standard' | 'leftover', useSeasonalIngredients: boolean }) => void;
  isLoading: boolean;
  initialFormData?: Partial<{ ingredients: string, excludedIngredients: string, diet: DietOption, mealType: MealType, cuisine: CuisineOption, cookingMethods: CookingMethod[], specialRequest: string, withCost: boolean, withImage: boolean, numberOfServings: number, recipePace: RecipePace, mode: 'standard' | 'leftover', useSeasonalIngredients: boolean }> | null;
  onFormPopulated?: () => void;
  suggestions?: RecipeSuggestions | null;
  users: UserProfile[];
  mealTypes: OptionItem[];
  setMealTypes: React.Dispatch<React.SetStateAction<OptionItem[]>>;
  cuisineOptions: OptionItem[];
  setCuisineOptions: React.Dispatch<React.SetStateAction<OptionItem[]>>;
  cookingMethodsList: OptionItem[];
  setCookingMethodsList: React.Dispatch<React.SetStateAction<OptionItem[]>>;
  cookingMethodCapacities: Record<string, number | null>;
  setCookingMethodCapacities: React.Dispatch<React.SetStateAction<Record<string, number | null>>>;
  orderedCookingMethods: OptionItem[];
  setOrderedCookingMethods: React.Dispatch<React.SetStateAction<OptionItem[]>>;
  orderedCuisineOptions: OptionItem[];
  setOrderedCuisineOptions: React.Dispatch<React.SetStateAction<OptionItem[]>>;
}

const INGREDIENTS_STORAGE_KEY = 'ai-recipe-generator-saved-ingredients';

type OptionType = 'mealType' | 'cuisine' | 'cookingMethod';

interface EditOptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (label: string, capacity: number | null) => void;
    itemToEdit: (OptionItem & { capacity?: number | null }) | null;
    itemType: OptionType;
}

const EditOptionModal: React.FC<EditOptionModalProps> = ({ isOpen, onClose, onSave, itemToEdit, itemType }) => {
    const [label, setLabel] = useState('');
    const [capacity, setCapacity] = useState<string>('');
    const modalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setLabel(itemToEdit?.label || '');
            setCapacity(itemToEdit?.capacity ? String(itemToEdit.capacity) : '');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, itemToEdit]);

    if (!isOpen) return null;

    const handleSave = () => {
        const finalCapacity = itemType === 'cookingMethod' && capacity ? parseInt(capacity, 10) : null;
        if (label.trim()) {
            onSave(label.trim(), isNaN(finalCapacity!) ? null : finalCapacity);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true" onClick={onClose}>
            <div ref={modalRef} className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-800 mb-4">{itemToEdit ? 'Szerkesztés' : 'Új hozzáadása'}</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="option-label" className="block text-sm font-medium text-gray-700">Megnevezés</label>
                        <input ref={inputRef} id="option-label" type="text" value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                    </div>
                    {itemType === 'cookingMethod' && (
                        <div>
                            <label htmlFor="option-capacity" className="block text-sm font-medium text-gray-700">Kapacitás (személy, nem kötelező)</label>
                            <input id="option-capacity" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Pl. 8" className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                    )}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Mégse</button>
                    <button onClick={handleSave} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700">Mentés</button>
                </div>
            </div>
        </div>
    );
};

const RecipeInputForm: React.FC<RecipeInputFormProps> = ({ 
    onSubmit, 
    isLoading, 
    initialFormData, 
    onFormPopulated, 
    suggestions, 
    users,
    mealTypes,
    setMealTypes,
    cuisineOptions,
    setCuisineOptions,
    cookingMethodsList,
    setCookingMethodsList,
    cookingMethodCapacities,
    setCookingMethodCapacities,
    orderedCookingMethods,
    setOrderedCookingMethods,
    orderedCuisineOptions,
    setOrderedCuisineOptions,
}) => {
  const [mode, setMode] = useState<'standard' | 'leftover'>('standard');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [excludedIngredients, setExcludedIngredients] = useState('');
  const [currentIngredient, setCurrentIngredient] = useState('');
  const [diet, setDiet] = useState<DietOption>(DietOption.DIABETIC);
  const [mealType, setMealType] = useState<MealType>(MealType.LUNCH);
  const [cuisine, setCuisine] = useState<CuisineOption>(CuisineOption.NONE);
  const [recipePace, setRecipePace] = useState<RecipePace>(RecipePace.NORMAL);
  const [cookingMethods, setCookingMethods] = useState<CookingMethod[]>([CookingMethod.TRADITIONAL]);
  const [specialRequest, setSpecialRequest] = useState('');
  const [numberOfServings, setNumberOfServings] = useState<number>(4);
  const [withCost, setWithCost] = useState(false);
  const [withImage, setWithImage] = useState(false);
  const [useSeasonalIngredients, setUseSeasonalIngredients] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);
  const [hasSavedIngredients, setHasSavedIngredients] = useState(false);
  const [isAdviceExpanded, setIsAdviceExpanded] = useState(false);
  
  const [isMealTypesEditing, setIsMealTypesEditing] = useState(false);
  const [isCuisineEditing, setIsCuisineEditing] = useState(false);
  const [isCookingMethodsEditing, setIsCookingMethodsEditing] = useState(false);
  const [modalState, setModalState] = useState<{ isOpen: boolean; itemToEdit: (OptionItem & { capacity?: number | null }) | null; itemType: OptionType | null }>({ isOpen: false, itemToEdit: null, itemType: null });

  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const cuisineDragItemIndex = useRef<number | null>(null);
  const cuisineDragOverItemIndex = useRef<number | null>(null);
  const [isCuisineDragging, setIsCuisineDragging] = useState(false);

  const isProcessingRef = useRef(false);
  const { showNotification } = useNotification();
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const suggestionTimeoutRef = useRef<number | null>(null);
  const isSuggestingMealTypeRef = useRef(false);

  useEffect(() => {
    // Clear any existing timer
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    const ingredientsString = ingredients.join(', ');
    // Only proceed if there's text and no suggestion is currently in flight.
    if ((!ingredientsString && !specialRequest) || isSuggestingMealTypeRef.current) {
      return;
    }
    
    suggestionTimeoutRef.current = window.setTimeout(async () => {
      isSuggestingMealTypeRef.current = true; // Set flag
      try {
        const suggested = await suggestMealType(ingredientsString, specialRequest, mealTypes);
        if (suggested && suggested !== mealType) { // Check against current mealType
          setMealType(suggested as MealType);
          const mealTypeLabel = mealTypes.find(m => m.value === suggested)?.label;
          if (mealTypeLabel) {
            showNotification(`Javaslat: Az étkezés típusa beállítva erre: '${mealTypeLabel}'`, 'info');
          }
        }
      } catch (e) {
        console.error("Meal type suggestion failed:", e);
      } finally {
        isSuggestingMealTypeRef.current = false; // Reset flag
      }
    }, 1500); // 1.5 second debounce

    return () => { // cleanup
        if (suggestionTimeoutRef.current) {
            clearTimeout(suggestionTimeoutRef.current);
        }
    };
}, [ingredients, specialRequest, mealType, showNotification, mealTypes]);

  useEffect(() => {
    if (initialFormData && onFormPopulated) {
        if (initialFormData.ingredients !== undefined) {
            setIngredients(initialFormData.ingredients.split(',').map(s => s.trim()).filter(Boolean));
        }
        if (initialFormData.excludedIngredients !== undefined) {
            setExcludedIngredients(initialFormData.excludedIngredients);
        }
        if (initialFormData.specialRequest !== undefined) {
            setSpecialRequest(initialFormData.specialRequest);
        }
        if (initialFormData.diet !== undefined) {
            setDiet(initialFormData.diet);
        } else {
            setDiet(DietOption.DIABETIC); // Reset to default
        }
        if (initialFormData.mealType !== undefined) {
            setMealType(initialFormData.mealType);
        } else {
            setMealType(MealType.LUNCH); // Reset to default
        }
        if (initialFormData.cuisine !== undefined) {
            setCuisine(initialFormData.cuisine);
        } else {
            setCuisine(CuisineOption.NONE); // Reset to default
        }
        if (initialFormData.recipePace !== undefined) {
            setRecipePace(initialFormData.recipePace);
        } else {
            setRecipePace(RecipePace.NORMAL);
        }
        if (initialFormData.cookingMethods !== undefined && initialFormData.cookingMethods.length > 0) {
            setCookingMethods(initialFormData.cookingMethods);
        } else {
            setCookingMethods([CookingMethod.TRADITIONAL]); // Reset to default
        }
        if (initialFormData.numberOfServings !== undefined) {
            setNumberOfServings(initialFormData.numberOfServings);
        }
        if (initialFormData.withCost !== undefined) {
            setWithCost(initialFormData.withCost);
        }
        if (initialFormData.withImage !== undefined) {
            setWithImage(initialFormData.withImage);
        }
        if (initialFormData.useSeasonalIngredients !== undefined) {
            setUseSeasonalIngredients(initialFormData.useSeasonalIngredients);
        }
        if (initialFormData.mode !== undefined) {
            setMode(initialFormData.mode);
        }
        onFormPopulated();
    }
  }, [initialFormData, onFormPopulated]);

  useEffect(() => {
    if (suggestions && suggestionsRef.current) {
        suggestionsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [suggestions]);

  useEffect(() => {
    const saved = localStorage.getItem(INGREDIENTS_STORAGE_KEY);
    setHasSavedIngredients(!!saved);
    // Auto-load ingredients if they exist
    if (saved) {
      try {
        const loadedIngredients = JSON.parse(saved);
        if (Array.isArray(loadedIngredients) && loadedIngredients.every(i => typeof i === 'string')) {
          setIngredients(loadedIngredients);
        }
      } catch (e) {
        console.error("Failed to auto-load ingredients from localStorage:", e);
      }
    }
  }, []); // Run only on mount
  
  const addSuggestedIngredient = (ingredient: string) => {
      if (ingredient && !ingredients.includes(ingredient)) {
          setIngredients(prev => [...prev, ingredient]);
          showNotification(`'${ingredient}' hozzáadva a hozzávalókhoz!`, 'success');
      }
  };

  const handleSaveIngredients = useCallback(() => {
    if (ingredients.length > 0) {
      try {
        safeSetLocalStorage(INGREDIENTS_STORAGE_KEY, ingredients);
        setHasSavedIngredients(true);
        showNotification('Hozzávalók elmentve!', 'success');
      } catch (err: any) {
        showNotification(err.message, 'info');
      }
    }
  }, [ingredients, showNotification]);

  const handleLoadIngredients = useCallback(() => {
    const saved = localStorage.getItem(INGREDIENTS_STORAGE_KEY);
    if (saved) {
      try {
        const loadedIngredients = JSON.parse(saved);
        if (Array.isArray(loadedIngredients) && loadedIngredients.every(i => typeof i === 'string')) {
          setIngredients(loadedIngredients);
          showNotification('Hozzávalók betöltve!', 'success');
        } else {
            throw new Error('Invalid data format in localStorage.');
        }
      } catch (e) {
        console.error("Failed to parse saved ingredients from localStorage:", e);
        showNotification('A mentett hozzávalók listája sérült, ezért nem sikerült betölteni.', 'info');
        // Do NOT remove the corrupted item, allowing for manual recovery by the user.
      }
    } else {
      showNotification('Nincsenek mentett hozzávalók.', 'info');
    }
  }, [showNotification]);

  const handleSpeechError = useCallback((error: string) => {
    if (error === 'not-allowed') {
        showNotification('A mikrofon használata le lett tiltva. A funkció használatához engedélyezze a böngészőben.', 'info');
    }
  }, [showNotification]);

  const handleVoiceResult = useCallback(async (transcript: string) => {
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
        const lowerTranscript = transcript.toLowerCase().trim();
        const generateKeywords = [
            "jöhet a recept",
            "recept generálása",
            "készítsük el",
            "mutasd a receptet",
            "csinálj egy receptet",
            "generálj egy receptet"
        ];
        
        let command: FormCommand;

        if (generateKeywords.some(keyword => lowerTranscript.includes(keyword))) {
            command = { action: 'generate_recipe', payload: null };
        } else {
            command = await interpretFormCommand(transcript, mealTypes, cookingMethodsList, DIET_OPTIONS);
        }
        
        switch(command.action) {
            case 'add_ingredients':
                const payload = command.payload as string[];
                if (payload && payload.length > 0) {
                    const newIngredients = payload.flatMap(item => 
                        item.split(/,\s*|\s+és\s+/).map(s => s.trim()).filter(Boolean)
                    );
                    if (newIngredients.length > 0) {
                      setIngredients(prev => [...new Set([...prev, ...newIngredients])]);
                      showNotification(`Hozzávalók hozzáadva: ${newIngredients.join(', ')}`, 'success');
                    }
                }
                break;
            case 'set_diet':
                const dietPayload = command.payload as SelectionResult;
                if (dietPayload?.key) {
                    setDiet(dietPayload.key as DietOption);
                    showNotification(`Diéta beállítva: ${dietPayload.label}`, 'info');
                }
                break;
            case 'set_meal_type':
                const mealPayload = command.payload as SelectionResult;
                if (mealPayload?.key) {
                    setMealType(mealPayload.key as MealType);
                    showNotification(`Étkezés típusa: ${mealPayload.label}`, 'info');
                }
                break;
            case 'set_cooking_method':
                const cookingPayload = command.payload as SelectionResult;
                if (cookingPayload?.key) {
                    const methodToToggle = cookingPayload.key as CookingMethod;
                    setCookingMethods(prev => {
                        const isPresent = prev.includes(methodToToggle);
                        let newState: CookingMethod[];
                        if (isPresent) {
                            newState = prev.filter(m => m !== methodToToggle);
                        } else {
                            newState = [...prev, methodToToggle];
                        }

                        if (methodToToggle === CookingMethod.TRADITIONAL && !isPresent) {
                            return [CookingMethod.TRADITIONAL];
                        }
                        if (methodToToggle !== CookingMethod.TRADITIONAL && !isPresent) {
                            newState = newState.filter(m => m !== CookingMethod.TRADITIONAL);
                        }
                        
                        if (newState.length === 0) {
                            return [CookingMethod.TRADITIONAL];
                        }
                        
                        return newState;
                    });
                    showNotification(`Elkészítés módja módosítva: ${cookingPayload.label}`, 'info');
                }
                break;
            case 'generate_recipe':
                showNotification('Parancs: Recept generálása...', 'info');
                triggerSubmitRef.current();
                break;
            default:
                console.log("Unknown command or could not interpret:", transcript);
                break;
        }
    } catch (error: any) {
        console.error("Error interpreting form command:", error);
        let errorMessage = "Hiba a hangparancs értelmezése közben.";
        const errorString = (typeof error.message === 'string') ? error.message : JSON.stringify(error);
        
        if (errorString.toLowerCase().includes('resource_exhausted') || errorString.includes('429') || errorString.toLowerCase().includes('quota')) {
            errorMessage = "Túl sok kérés. A hangvezérlés 15 másodpercre szünetel.";
            setIsRateLimited(true);
            setTimeout(() => {
                setIsRateLimited(false);
                showNotification("A hangvezérlés újra aktív.", 'success');
            }, 15000); // Re-enable after 15 seconds
        }
        showNotification(errorMessage, 'info');
    } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
    }
  }, [showNotification, mealTypes, cookingMethodsList]);

  const {
    isListening,
    isSupported,
    startListening,
    stopListening,
    permissionState,
  } = useSpeechRecognition({
    onResult: handleVoiceResult,
    continuous: false,
    onError: handleSpeechError,
  });

  const removeIngredient = (indexToRemove: number) => {
      setIngredients(ingredients.filter((_, index) => index !== indexToRemove));
  }

  const handleAddIngredient = () => {
      const newIngredients = currentIngredient
          .split(',')
          .map(ing => ing.trim())
          .filter(ing => ing !== '');

      if (newIngredients.length > 0) {
          setIngredients(prev => [...new Set([...prev, ...newIngredients])]);
          setCurrentIngredient('');
      }
  };

  const handleIngredientInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          handleAddIngredient();
      }
  };
  
  const triggerSubmit = () => {
    if (isLoading) return;

    // --- User preference aggregation ---
    const selectedUsers = users.filter(u => selectedUserIds.includes(u.id));
    const combinedAllergies = new Set<string>();
    const combinedLikes = new Set<string>();
    const combinedDislikes = new Set<string>();

    selectedUsers.forEach(user => {
        user.allergies.split(',').forEach(item => item.trim() && combinedAllergies.add(item.trim()));
        user.likes.split(',').forEach(item => item.trim() && combinedLikes.add(item.trim()));
        user.dislikes.split(',').forEach(item => item.trim() && combinedDislikes.add(item.trim()));
    });

    const finalExcludedIngredients = [
        ...excludedIngredients.split(',').map(s => s.trim()).filter(Boolean),
        ...Array.from(combinedAllergies)
    ].join(', ');

    let userPreferencesRequest = '';
    if (combinedLikes.size > 0) {
        userPreferencesRequest += ` A recept feleljen meg a felhasználók ízlésének, akik kedvelik: ${Array.from(combinedLikes).join(', ')}.`;
    }
    if (combinedDislikes.size > 0) {
        userPreferencesRequest += ` Lehetőség szerint kerülje a következő alapanyagokat: ${Array.from(combinedDislikes).join(', ')}.`;
    }
    const finalSpecialRequest = [specialRequest.trim(), userPreferencesRequest.trim()].filter(Boolean).join(' ');
    
    const orderedSelectedMethods = orderedCookingMethods
        .map(m => m.value)
        .filter(value => cookingMethods.includes(value as CookingMethod));

    onSubmit({
        ingredients: ingredients.join(', '),
        excludedIngredients: finalExcludedIngredients,
        diet,
        mealType,
        cuisine: cuisine as CuisineOption,
        recipePace,
        cookingMethods: orderedSelectedMethods as CookingMethod[],
        specialRequest: finalSpecialRequest,
        withCost,
        withImage,
        numberOfServings,
        mode,
        useSeasonalIngredients,
    });
  };
  const triggerSubmitRef = useRef(triggerSubmit);
  triggerSubmitRef.current = triggerSubmit;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSubmit();
  };
  
  const handleMicClick = () => {
    if (!isSupported || permissionState === 'denied' || isRateLimited) return;
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleCookingMethodChange = (method: string) => {
    setCookingMethods(prev => {
        const isPresent = prev.includes(method as CookingMethod);
        let newState: CookingMethod[];
        if (isPresent) {
            newState = prev.filter(m => m !== method);
        } else {
            newState = [...prev, method as CookingMethod];
        }

        // Exclusive logic for 'Traditional'
        if (method === CookingMethod.TRADITIONAL && !isPresent) {
            // If 'Traditional' is checked, uncheck all others.
            return [CookingMethod.TRADITIONAL];
        }
        if (method !== CookingMethod.TRADITIONAL && !isPresent) {
            // If a machine is checked, uncheck 'Traditional'.
            newState = newState.filter(m => m !== CookingMethod.TRADITIONAL);
        }

        // Fallback: If nothing is selected, select 'Traditional'.
        if (newState.length === 0) {
            return [CookingMethod.TRADITIONAL];
        }
        
        return newState;
    });
  };

  const handleUserSelectionChange = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
    
    // --- Option Editing Handlers ---
  const handleOpenModal = (itemType: OptionType, itemToEdit: OptionItem | null) => {
    let itemWithCapacity: (OptionItem & { capacity?: number | null }) | null = null;
    if (itemToEdit) {
        if (itemType === 'cookingMethod') {
            itemWithCapacity = {
                ...itemToEdit,
                capacity: cookingMethodCapacities[itemToEdit.value]
            };
        } else {
            itemWithCapacity = itemToEdit;
        }
    }
    setModalState({ isOpen: true, itemType, itemToEdit: itemWithCapacity });
  };
    
  const handleSaveOption = (label: string, capacity: number | null) => {
        const { itemType, itemToEdit } = modalState;
        if (!itemType) return;

        const generateValue = (label: string) => `custom_${label.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;

        const updateStateAndStorage = (
            key: string, 
            setter: React.Dispatch<React.SetStateAction<OptionItem[]>>,
            capacitiesKey?: string,
            capacitiesSetter?: React.Dispatch<React.SetStateAction<Record<string, number | null>>>
        ) => {
            setter(prev => {
                let newList;
                let newValue = '';
                if (itemToEdit) { // Editing existing
                    newValue = itemToEdit.value;
                    newList = prev.map(item => item.value === itemToEdit.value ? { ...item, label } : item);
                } else { // Adding new
                    newValue = generateValue(label);
                    newList = [...prev, { value: newValue, label }];
                }
                
                if (capacitiesKey && capacitiesSetter) {
                    capacitiesSetter(prevCaps => {
                        const newCaps = { ...prevCaps, [newValue]: capacity };
                        safeSetLocalStorage(capacitiesKey, newCaps);
                        return newCaps;
                    });
                }

                safeSetLocalStorage(key, newList);
                return newList;
            });
        };

        switch (itemType) {
            case 'mealType':
                updateStateAndStorage(MEAL_TYPES_STORAGE_KEY, setMealTypes);
                break;
            case 'cuisine':
                updateStateAndStorage(CUISINE_OPTIONS_STORAGE_KEY, setCuisineOptions);
                break;
            case 'cookingMethod':
                updateStateAndStorage(COOKING_METHODS_STORAGE_KEY, setCookingMethodsList, COOKING_METHOD_CAPACITIES_STORAGE_KEY, setCookingMethodCapacities);
                break;
        }
        setModalState({ isOpen: false, itemToEdit: null, itemType: null });
  };

  const handleDeleteOption = (itemType: OptionType, valueToDelete: string) => {
    if (!window.confirm("Biztosan törli ezt az elemet? Ez a művelet nem vonható vissza.")) return;
    
    const updateStateAndStorage = (
        key: string, 
        setter: React.Dispatch<React.SetStateAction<OptionItem[]>>,
        capacitiesKey?: string,
        capacitiesSetter?: React.Dispatch<React.SetStateAction<Record<string, number | null>>>
    ) => {
        setter(prev => {
            const newList = prev.filter(item => item.value !== valueToDelete);
            safeSetLocalStorage(key, newList);
            return newList;
        });

        if (capacitiesKey && capacitiesSetter) {
            capacitiesSetter(prevCaps => {
                const newCaps = { ...prevCaps };
                delete newCaps[valueToDelete];
                safeSetLocalStorage(capacitiesKey, newCaps);
                return newCaps;
            });
        }
    };
    
    switch (itemType) {
        case 'mealType':
            updateStateAndStorage(MEAL_TYPES_STORAGE_KEY, setMealTypes);
            if (mealType === valueToDelete) setMealType(mealTypes.find(mt => mt.value !== valueToDelete)?.value as MealType || MealType.LUNCH);
            break;
        case 'cuisine':
            updateStateAndStorage(CUISINE_OPTIONS_STORAGE_KEY, setCuisineOptions);
            if (cuisine === valueToDelete) setCuisine(CuisineOption.NONE);
            break;
        case 'cookingMethod':
            updateStateAndStorage(COOKING_METHODS_STORAGE_KEY, setCookingMethodsList, COOKING_METHOD_CAPACITIES_STORAGE_KEY, setCookingMethodCapacities);
            setCookingMethods(prev => prev.filter(cm => cm !== valueToDelete));
            break;
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLLabelElement>, index: number) => {
    dragItemIndex.current = index;
    setTimeout(() => {
        setIsDragging(true);
    }, 0);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>, index: number) => {
    e.preventDefault();
    dragOverItemIndex.current = index;
  };

  const handleDragEnd = () => {
    if (dragItemIndex.current !== null && dragOverItemIndex.current !== null && dragItemIndex.current !== dragOverItemIndex.current) {
        const newMethods = [...orderedCookingMethods];
        const draggedItemContent = newMethods.splice(dragItemIndex.current, 1)[0];
        newMethods.splice(dragOverItemIndex.current, 0, draggedItemContent);
        setOrderedCookingMethods(newMethods);
        // Save only on explicit user action
        try {
          const orderToSave = newMethods.map(item => item.value);
          safeSetLocalStorage(COOKING_METHODS_ORDER_KEY, orderToSave);
        } catch (err: any) {
          showNotification(err.message, 'info');
        }
    }
    
    dragItemIndex.current = null;
    dragOverItemIndex.current = null;
    setIsDragging(false);
  };

  const handleCuisineDragStart = (e: React.DragEvent<HTMLLabelElement>, index: number) => {
    cuisineDragItemIndex.current = index;
    setTimeout(() => {
        setIsCuisineDragging(true);
    }, 0);
  };

  const handleCuisineDragEnter = (e: React.DragEvent<HTMLLabelElement>, index: number) => {
    e.preventDefault();
    cuisineDragOverItemIndex.current = index;
  };

  const handleCuisineDragEnd = () => {
    if (cuisineDragItemIndex.current !== null && cuisineDragOverItemIndex.current !== null && cuisineDragItemIndex.current !== cuisineDragOverItemIndex.current) {
        const newCuisines = [...orderedCuisineOptions];
        const draggedItemContent = newCuisines.splice(cuisineDragItemIndex.current, 1)[0];
        newCuisines.splice(cuisineDragOverItemIndex.current, 0, draggedItemContent);
        setOrderedCuisineOptions(newCuisines);
        // Save only on explicit user action
        try {
          const orderToSave = newCuisines.map(item => item.value);
          safeSetLocalStorage(CUISINE_OPTIONS_ORDER_KEY, orderToSave);
        } catch (err: any) {
          showNotification(err.message, 'info');
        }
    }
    
    cuisineDragItemIndex.current = null;
    cuisineDragOverItemIndex.current = null;
    setIsCuisineDragging(false);
  };

  const selectedDietInfo = DIET_OPTIONS.find(d => d.value === diet);
  
  const machineMethods = cookingMethods.filter(cm => cm !== CookingMethod.TRADITIONAL);
  const capacityInfo = machineMethods
    .map(cm => ({
        method: cookingMethodsList.find(m => m.value === cm),
        capacity: cookingMethodCapacities[cm]
    }))
    .filter((item): item is { method: { value: CookingMethod; label: string; }; capacity: number; } => 
        item.method != null && item.capacity != null
    );

  const {
    profileExclusions,
    profileLikes,
    profileDislikes
  } = useMemo(() => {
    const selectedUsers = users.filter(u => selectedUserIds.includes(u.id));
    const combinedAllergies = new Set<string>();
    const combinedLikes = new Set<string>();
    const combinedDislikes = new Set<string>();

    selectedUsers.forEach(user => {
        user.allergies.split(',').forEach(item => item.trim() && combinedAllergies.add(item.trim()));
        user.likes.split(',').forEach(item => item.trim() && combinedLikes.add(item.trim()));
        user.dislikes.split(',').forEach(item => item.trim() && combinedDislikes.add(item.trim()));
    });
    
    return {
        profileExclusions: Array.from(combinedAllergies),
        profileLikes: Array.from(combinedLikes),
        profileDislikes: Array.from(combinedDislikes)
    };
  }, [selectedUserIds, users]);


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
       <EditOptionModal 
            isOpen={modalState.isOpen}
            onClose={() => setModalState({ isOpen: false, itemToEdit: null, itemType: null })}
            onSave={handleSaveOption}
            itemToEdit={modalState.itemToEdit}
            itemType={modalState.itemType!}
        />
       {suggestions && (
        <div ref={suggestionsRef} className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg animate-fade-in space-y-4 max-h-60 overflow-y-auto">
          <h3 className="text-lg font-bold text-yellow-800">Javaslatok a recept finomításához</h3>
          {suggestions.suggestedIngredients.length > 0 && (
            <div>
              <h4 className="font-semibold text-yellow-700 mb-2">Próbáld ki ezekkel is:</h4>
              <div className="flex flex-wrap gap-2">
                {suggestions.suggestedIngredients.map((ing, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => addSuggestedIngredient(ing)}
                    className="flex items-center gap-1.5 text-sm bg-yellow-200 text-yellow-900 font-medium px-3 py-1 rounded-full hover:bg-yellow-300 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                    {ing}
                  </button>
                ))}
              </div>
            </div>
          )}
          {suggestions.modificationIdeas.length > 0 && (
            <div>
              <h4 className="font-semibold text-yellow-700 mb-2">Változtatási ötletek:</h4>
              <ul className="list-disc list-inside space-y-1 text-yellow-800">
                {suggestions.modificationIdeas.map((idea, index) => (
                  <li key={index}>{idea}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex mb-4 border border-gray-200 rounded-lg p-1 bg-gray-100">
        <button
            type="button"
            onClick={() => setMode('standard')}
            className={`flex-1 py-2 px-4 rounded-md font-semibold transition-colors text-sm sm:text-base ${mode === 'standard' ? 'bg-primary-600 text-white shadow' : 'text-gray-600 hover:bg-primary-50'}`}
        >
            Új Recept Alapanyagokból
        </button>
        <button
            type="button"
            onClick={() => setMode('leftover')}
            className={`flex-1 py-2 px-4 rounded-md font-semibold transition-colors text-sm sm:text-base ${mode === 'leftover' ? 'bg-primary-600 text-white shadow' : 'text-gray-600 hover:bg-primary-50'}`}
        >
            Recept Maradékokból
        </button>
      </div>

       {isSupported && (
         <button
            type="button"
            onClick={handleMicClick}
            disabled={permissionState === 'denied' || isLoading || isRateLimited}
            className={`w-full text-center p-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                permissionState === 'denied' 
                ? 'bg-red-50 border-red-200 cursor-not-allowed' 
                : isRateLimited
                ? 'bg-yellow-50 border-yellow-300 cursor-not-allowed'
                : 'bg-primary-100 border-primary-200 hover:bg-primary-200'
            }`}
            aria-label={isListening ? "Hangvezérlés leállítása" : "Hangvezérlés indítása"}
        >
            <div className="flex justify-center items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${permissionState === 'denied' ? 'text-red-500' : (isListening && !isProcessing ? 'text-red-500 animate-pulse' : 'text-primary-700')}`} viewBox="0 0 20 20" fill="currentColor">
                    {permissionState === 'denied' ? (
                        <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.523L13.477 14.89zm-2.02-2.02l-7.07-7.07A6.024 6.024 0 004 10v.789l.375.375 2.121 2.121L8.28 15h.789a6.002 6.002 0 006.33-4.885l-1.99 1.99zM10 18a8 8 0 100-16 8 8 0 000 16z" clipRule="evenodd" />
                    ) : (
                        <>
                            <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                            <path fillRule="evenodd" d="M7 2a4 4 0 00-4 4v6a4 4 0 108 0V6a4 4 0 00-4-4zM5 6a2 2 0 012-2h2a2 2 0 110 4H7a2 2 0 01-2-2zm10 4a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM4 11a1 1 0 100 2h12a1 1 0 100-2H4z" clipRule="evenodd" />
                        </>
                    )}
                </svg>
                 {permissionState === 'denied' ? (
                    <p className="font-semibold text-red-800">Mikrofon letiltva</p>
                ) : (
                    <p className="font-semibold text-primary-800">
                        {isRateLimited ? 'Pihenés... (15s)' : (isProcessing ? 'Értelmezés...' : (isListening ? 'Hallgatom...' : 'Hangvezérlés'))}
                    </p>
                )}
            </div>
             {permissionState === 'denied' ? (
                <p className="text-sm mt-1 text-red-700">A hangvezérléshez engedélyezze a mikrofon használatát a böngésző címsorában.</p>
            ) : (
                <p className="text-sm mt-1 text-primary-600">
                    {isRateLimited ? 'Túl sok kérés történt, a funkció átmenetileg szünetel.' : 'Kattintson és mondja be a hozzávalókat, diétát, vagy hogy "jöhet a recept".'}
                </p>
            )}
        </button>
      )}
      <div>
        <label htmlFor="ingredient-input" className="block text-lg font-semibold text-gray-700 mb-2">
          {mode === 'standard' ? 'Milyen alapanyagok vannak otthon?' : 'Milyen maradékok vannak? (nyers és főtt egyaránt)'}
        </label>
        <div className="flex items-center gap-2 mb-3">
            <input
                id="ingredient-input"
                type="text"
                value={currentIngredient}
                onChange={(e) => setCurrentIngredient(e.target.value)}
                onKeyDown={handleIngredientInputKeyDown}
                placeholder={mode === 'standard' ? "Pl. csirkemell, rizs, hagyma..." : "Pl. sült csirke, főtt rizs, tejszín..."}
                className="flex-grow p-3 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition duration-150 ease-in-out"
            />
            <button
                type="button"
                onClick={handleAddIngredient}
                className="bg-primary-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition"
                aria-label="Hozzávaló hozzáadása"
            >
                Hozzáadás
            </button>
        </div>

        <div className="p-3 border border-gray-300 rounded-lg bg-gray-50 min-h-[80px]">
            {ingredients.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                    {ingredients.map((ingredient, index) => (
                        <li key={index} className="flex items-center gap-2 bg-primary-200 text-primary-800 text-sm font-medium px-3 py-1 rounded-full">
                            <span>{ingredient}</span>
                            <button type="button" onClick={() => removeIngredient(index)} className="text-primary-600 hover:text-primary-900 focus:outline-none" aria-label={`'${ingredient}' eltávolítása`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-500">{mode === 'standard' ? 'Adja meg a hozzávalókat, vagy hagyja üresen egy meglepetés recepthez.' : 'Sorolja fel a felhasználni kívánt maradékokat.'}</p>
            )}
        </div>
        <div className="flex gap-2 mt-3">
          <button
              type="button"
              onClick={handleSaveIngredients}
              disabled={ingredients.length === 0}
              className="flex-1 text-sm bg-white border border-primary-300 text-primary-700 font-semibold py-2 px-4 rounded-lg hover:bg-primary-50 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-200"
              aria-label="Jelenlegi hozzávalók listájának mentése"
          >
              Lista mentése
          </button>
          <button
              type="button"
              onClick={handleLoadIngredients}
              disabled={!hasSavedIngredients}
              className="flex-1 text-sm bg-white border border-primary-300 text-primary-700 font-semibold py-2 px-4 rounded-lg hover:bg-primary-50 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-200"
              aria-label="Mentett hozzávalók listájának betöltése"
          >
              Lista betöltése
          </button>
        </div>
      </div>

       <div>
        <label className="block text-lg font-semibold text-gray-700 mb-2">
            Kinek készül a recept? (nem kötelező)
        </label>
        {users.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {users.map(user => (
                    <label key={user.id} className="flex items-center p-3 border rounded-lg bg-white cursor-pointer hover:bg-gray-50 has-[:checked]:bg-primary-50 has-[:checked]:border-primary-400 transition-colors">
                        <input
                            type="checkbox"
                            id={`user-${user.id}`}
                            checked={selectedUserIds.includes(user.id)}
                            onChange={() => handleUserSelectionChange(user.id)}
                            className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-3 text-gray-700 font-medium">{user.name}</span>
                    </label>
                ))}
            </div>
        ) : (
            <p className="text-gray-500 text-sm p-3 bg-gray-50 rounded-lg">Nincsenek felhasználók. A "Felhasználók" menüpont alatt adhat hozzá profilokat.</p>
        )}
      </div>

      <div>
        <label htmlFor="excluded-ingredients" className="block text-lg font-semibold text-gray-700 mb-2">
          Mi ne legyen benne? (nem kötelező)
        </label>
        <textarea
          id="excluded-ingredients"
          value={excludedIngredients}
          onChange={(e) => setExcludedIngredients(e.target.value)}
          placeholder="Pl. gomba, laktóz, mogyoró..."
          rows={2}
          className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition duration-150 ease-in-out"
        ></textarea>
        <p className="text-sm text-gray-500 mt-1">Vesszővel elválasztva sorolja fel a kerülendő alapanyagokat.</p>
        {profileExclusions.length > 0 && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 animate-fade-in">
                <span className="font-semibold">Felhasználói tiltások (automatikusan hozzáadva):</span> {profileExclusions.join(', ')}
            </div>
        )}
      </div>

      <div>
        <label htmlFor="special-request" className="block text-lg font-semibold text-gray-700 mb-2">
          Különleges kérés (nem kötelező)
        </label>
        <textarea
          id="special-request"
          value={specialRequest}
          onChange={(e) => setSpecialRequest(e.target.value)}
          placeholder="Pl. legyen gyorsan elkészíthető, extra fűszeres, gyerekbarát..."
          rows={2}
          className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition duration-150 ease-in-out"
        ></textarea>
        {(profileLikes.length > 0 || profileDislikes.length > 0) && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 animate-fade-in space-y-1">
                <p className="font-semibold">Felhasználói preferenciák (automatikusan figyelembe véve):</p>
                {profileLikes.length > 0 && (
                    <div className="flex items-start">
                        <span className="text-green-600 font-bold mr-2">+</span>
                        <span>Kedveli: {profileLikes.join(', ')}.</span>
                    </div>
                )}
                {profileDislikes.length > 0 && (
                    <div className="flex items-start">
                        <span className="text-yellow-600 font-bold mr-2">−</span>
                        <span>Kerülendő: {profileDislikes.join(', ')}.</span>
                    </div>
                )}
            </div>
        )}
      </div>

       <div>
        <label className="block text-lg font-semibold text-gray-700 mb-2">
          Recept jellege
        </label>
        <div className="space-y-2">
          {RECIPE_PACE_OPTIONS.map((option) => (
            <label
              key={option.value}
              htmlFor={`recipe-pace-${option.value}`}
              className="flex items-start p-3 border rounded-lg bg-white cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:bg-primary-50 has-[:checked]:border-primary-400 focus-within:ring-2 focus-within:ring-primary-500"
            >
              <input
                type="radio"
                id={`recipe-pace-${option.value}`}
                name="recipe-pace"
                value={option.value}
                checked={recipePace === option.value}
                onChange={() => setRecipePace(option.value)}
                className="h-5 w-5 mt-0.5 border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
              <div className="ml-3">
                <span className="text-gray-800 font-medium block">{option.label}</span>
                <span className="text-sm text-gray-500">{option.description}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label htmlFor="withCost" className="flex items-center p-3 border border-gray-300 rounded-lg bg-white cursor-pointer hover:bg-gray-50 transition-colors">
            <input
                type="checkbox"
                id="withCost"
                checked={withCost}
                onChange={(e) => setWithCost(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-3 text-gray-700 font-medium">Költségbecslés kérése</span>
        </label>
        <label htmlFor="withImage" className="flex items-center p-3 border border-gray-300 rounded-lg bg-white cursor-pointer hover:bg-gray-50 transition-colors">
            <input
                type="checkbox"
                id="withImage"
                checked={withImage}
                onChange={(e) => setWithImage(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-3 text-gray-700 font-medium">Ételfotó generálása</span>
        </label>
        <label htmlFor="useSeasonalIngredients" className="flex items-center p-3 border border-gray-300 rounded-lg bg-white cursor-pointer hover:bg-gray-50 transition-colors">
            <input
                type="checkbox"
                id="useSeasonalIngredients"
                checked={useSeasonalIngredients}
                onChange={(e) => setUseSeasonalIngredients(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-3 text-gray-700 font-medium">Idényjellegű alapanyagok</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="diet" className="block text-lg font-semibold text-gray-700 mb-2">
            Diéta típusa
          </label>
          <select
            id="diet"
            value={diet}
            onChange={(e) => setDiet(e.target.value as DietOption)}
            className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition duration-150 ease-in-out"
          >
            {DIET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {selectedDietInfo && selectedDietInfo.description && (
            <div className="mt-2 flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 animate-fade-in">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 mt-0.5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>
                    {selectedDietInfo.description}
                </span>
            </div>
          )}
        </div>
        <div>
            <div className="flex justify-between items-center mb-2">
                <label className="block text-lg font-semibold text-gray-700">Étkezés</label>
                <button type="button" onClick={() => setIsMealTypesEditing(!isMealTypesEditing)} className="text-sm font-semibold text-primary-600 hover:text-primary-800">{isMealTypesEditing ? 'Kész' : 'Szerkesztés'}</button>
            </div>
            <div className="space-y-2">
                {mealTypes.map(option => (
                    <div key={option.value} className="flex items-center">
                        <label htmlFor={`meal-type-${option.value}`} className="flex-grow flex items-center p-3 border rounded-lg bg-white cursor-pointer hover:bg-gray-50 has-[:checked]:bg-primary-50 has-[:checked]:border-primary-400">
                            <input type="radio" id={`meal-type-${option.value}`} name="meal-type" value={option.value} checked={mealType === option.value} onChange={(e) => setMealType(e.target.value as MealType)} className="h-5 w-5 border-gray-300 text-primary-600 focus:ring-primary-500" />
                            <span className="ml-3 text-gray-700 font-medium">{option.label}</span>
                        </label>
                        {isMealTypesEditing && (
                            <div className="flex items-center ml-2">
                                <button type="button" onClick={() => handleOpenModal('mealType', option)} className="p-2 text-gray-500 hover:text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                <button type="button" onClick={() => handleDeleteOption('mealType', option.value)} className="p-2 text-gray-500 hover:text-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {isMealTypesEditing && <button type="button" onClick={() => handleOpenModal('mealType', null)} className="mt-2 text-sm font-semibold text-primary-600 hover:text-primary-800 w-full text-left p-2 rounded hover:bg-primary-50">+ Új hozzáadása</button>}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
            <label className="block text-lg font-semibold text-gray-700">Nemzetközi konyha (nem kötelező)</label>
            <button type="button" onClick={() => setIsCuisineEditing(!isCuisineEditing)} className="text-sm font-semibold text-primary-600 hover:text-primary-800">{isCuisineEditing ? 'Kész' : 'Szerkesztés'}</button>
        </div>
        <div className="space-y-2">
            {orderedCuisineOptions.map((option, index) => (
                <div key={option.value} className="flex items-center">
                    <label 
                        htmlFor={`cuisine-option-${option.value}`} 
                        className={`flex-grow flex items-center p-3 border rounded-lg bg-white ${isCuisineEditing ? '' : 'cursor-grab'} hover:bg-gray-50 transition-all duration-200 has-[:checked]:bg-primary-50 has-[:checked]:border-primary-400 focus-within:ring-2 focus-within:ring-primary-500 ${isCuisineDragging && cuisineDragItemIndex.current === index ? 'opacity-40 scale-105 shadow-xl' : 'opacity-100'}`}
                        draggable={!isCuisineEditing}
                        onDragStart={(e) => handleCuisineDragStart(e, index)}
                        onDragEnter={(e) => handleCuisineDragEnter(e, index)}
                        onDragEnd={handleCuisineDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        {!isCuisineEditing && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                        <input type="radio" id={`cuisine-option-${option.value}`} name="cuisine-option" value={option.value} checked={cuisine === option.value} onChange={() => setCuisine(option.value as CuisineOption)} className="h-5 w-5 rounded-full border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer" />
                        <span className="ml-3 text-gray-700 font-medium flex-grow">{option.label}</span>
                    </label>
                    {isCuisineEditing && (
                        <div className="flex items-center ml-2">
                            <button type="button" onClick={() => handleOpenModal('cuisine', option)} className="p-2 text-gray-500 hover:text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                            {option.value !== CuisineOption.NONE && <button type="button" onClick={() => handleDeleteOption('cuisine', option.value)} className="p-2 text-gray-500 hover:text-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>}
                        </div>
                    )}
                </div>
            ))}
        </div>
        {isCuisineEditing && <button type="button" onClick={() => handleOpenModal('cuisine', null)} className="mt-2 text-sm font-semibold text-primary-600 hover:text-primary-800 w-full text-left p-2 rounded hover:bg-primary-50">+ Új hozzáadása</button>}
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
            <label className="block text-lg font-semibold text-gray-700">Elkészítés módja</label>
            <button type="button" onClick={() => setIsCookingMethodsEditing(!isCookingMethodsEditing)} className="text-sm font-semibold text-primary-600 hover:text-primary-800">{isCookingMethodsEditing ? 'Kész' : 'Szerkesztés'}</button>
        </div>
        <div className="space-y-2">
            {orderedCookingMethods.map((option, index) => (
                <div key={option.value} className="flex items-center">
                    <label 
                        htmlFor={`cooking-method-${option.value}`} 
                        className={`flex-grow flex items-center p-3 border rounded-lg bg-white ${isCookingMethodsEditing ? '' : 'cursor-grab'} hover:bg-gray-50 transition-all duration-200 has-[:checked]:bg-primary-50 has-[:checked]:border-primary-400 focus-within:ring-2 focus-within:ring-primary-500 ${isDragging && dragItemIndex.current === index ? 'opacity-40 scale-105 shadow-xl' : 'opacity-100'}`}
                        draggable={!isCookingMethodsEditing}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        {!isCookingMethodsEditing && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                        <input type="checkbox" id={`cooking-method-${option.value}`} value={option.value} checked={cookingMethods.includes(option.value as CookingMethod)} onChange={() => handleCookingMethodChange(option.value)} className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer" />
                        <span className="ml-3 text-gray-700 font-medium flex-grow">{option.label}</span>
                    </label>
                    {isCookingMethodsEditing && (
                        <div className="flex items-center ml-2">
                            <button type="button" onClick={() => handleOpenModal('cookingMethod', option)} className="p-2 text-gray-500 hover:text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                            {option.value !== CookingMethod.TRADITIONAL && <button type="button" onClick={() => handleDeleteOption('cookingMethod', option.value)} className="p-2 text-gray-500 hover:text-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>}
                        </div>
                    )}
                </div>
            ))}
        </div>
        {isCookingMethodsEditing && <button type="button" onClick={() => handleOpenModal('cookingMethod', null)} className="mt-2 text-sm font-semibold text-primary-600 hover:text-primary-800 w-full text-left p-2 rounded hover:bg-primary-50">+ Új hozzáadása</button>}
         <p className="text-sm text-gray-500 mt-2">A kiválasztott elkészítési módok sorrendje befolyásolhatja a receptet.</p>
      </div>

       <div>
        <label htmlFor="numberOfServings" className="block text-lg font-semibold text-gray-700 mb-2">
            Hány személyre készüljön?
        </label>
        <input
            id="numberOfServings"
            type="number"
            value={numberOfServings}
            onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setNumberOfServings(val > 0 ? val : 1);
            }}
            min="1"
            className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition duration-150 ease-in-out"
            aria-label="Személyek száma"
        />
        {capacityInfo.length > 0 && (
          <div className="mt-2 space-y-2">
            {capacityInfo.map(({ method, capacity }) => (
                <div key={method.value} className={`flex items-start gap-2 p-2 rounded-lg text-sm transition-colors animate-fade-in ${numberOfServings > capacity ? 'bg-yellow-100 border border-yellow-300 text-yellow-900' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 flex-shrink-0 mt-0.5 ${numberOfServings > capacity ? 'text-yellow-600' : 'text-blue-500'}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>
                        Tájékoztató: A(z) <strong>{method.label}</strong> legfeljebb <strong>{capacity} személyre</strong> javasolt.
                        {numberOfServings > capacity && (
                          <>
                            {' '}A megadott <strong>{numberOfServings} fős</strong> adagot várhatóan <strong>{Math.ceil(numberOfServings / capacity)} részletben</strong> tudja majd elkészíteni.
                          </>
                        )}
                    </span>
                </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <button
            type="button"
            onClick={() => setIsAdviceExpanded(!isAdviceExpanded)}
            className="w-full flex justify-between items-center text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500"
            aria-expanded={isAdviceExpanded}
            aria-controls="advice-content"
        >
            <span className="font-semibold text-gray-700">Maradékfelhasználás: Általános és biztonsági tanácsok</span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 transform transition-transform ${isAdviceExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
        </button>
        {isAdviceExpanded && (
            <div id="advice-content" className="mt-2 p-4 bg-gray-50 border rounded-lg text-gray-700 space-y-4 text-sm animate-fade-in">
                <div>
                    <h4 className="font-bold text-gray-800">Élelmiszerbiztonság az első!</h4>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Minden maradékot alaposan, gőzölgőre (legalább 75°C-ra) melegítsen újra fogyasztás előtt.</li>
                        <li>Soha ne fagyasszon újra egyszer már felolvasztott ételt, különösen húst.</li>
                        <li>A 2 óránál tovább szobahőmérsékleten hagyott ételeket inkább ne használja fel.</li>
                        <li>Ha kétségei vannak egy maradék frissességével kapcsolatban, inkább dobja ki.</li>
                        <li>Különítse el a nyers és főtt alapanyagokat a keresztszennyeződés elkerülése érdekében.</li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold text-gray-800">Tárolási tippek</h4>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>A maradékokat a főzés után a lehető leghamarabb (maximum 2 órán belül) tegye hűtőbe.</li>
                        <li>Használjon légmentesen záródó edényeket a frissesség megőrzése és a szagok terjedésének megakadályozása érdekében.</li>
                        <li>A legtöbb maradék 3-4 napig biztonságosan tárolható a hűtőben.</li>
                        <li>Címkézze fel a lefagyasztott ételeket dátummal és tartalommal.</li>
                    </ul>
                </div>
            </div>
        )}
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center items-center gap-2 bg-primary-600 text-white font-bold py-4 px-4 rounded-lg shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Recept generálása...' : (ingredients.length === 0 && mode === 'standard' ? 'Jöhet a meglepetés recept!' : 'Jöhet a recept!')}
        </button>
      </div>
    </form>
  );
};

export default RecipeInputForm;

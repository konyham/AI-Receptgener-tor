import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DietOption, MealType, FormCommand, SelectionResult, CookingMethod, RecipeSuggestions } from '../types';
import { DIET_OPTIONS, MEAL_TYPES, COOKING_METHODS } from '../constants';
import { interpretFormCommand } from '../services/geminiService';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useNotification } from '../contexts/NotificationContext';
import { safeSetLocalStorage } from '../utils/storage';

interface RecipeInputFormProps {
  onSubmit: (params: { ingredients: string, diet: DietOption, mealType: MealType, cookingMethod: CookingMethod, specialRequest: string, withCost: boolean, withImage: boolean, numberOfServings: number }) => void;
  isLoading: boolean;
  initialFormData?: Partial<{ ingredients: string, diet: DietOption, mealType: MealType, cookingMethod: CookingMethod, specialRequest: string, withCost: boolean, withImage: boolean, numberOfServings: number }> | null;
  onFormPopulated?: () => void;
  suggestions?: RecipeSuggestions | null;
}

const INGREDIENTS_STORAGE_KEY = 'ai-recipe-generator-saved-ingredients';

const RecipeInputForm: React.FC<RecipeInputFormProps> = ({ onSubmit, isLoading, initialFormData, onFormPopulated, suggestions }) => {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentIngredient, setCurrentIngredient] = useState('');
  const [diet, setDiet] = useState<DietOption>(DietOption.DIABETIC);
  const [mealType, setMealType] = useState<MealType>(MealType.LUNCH);
  const [cookingMethod, setCookingMethod] = useState<CookingMethod>(CookingMethod.TRADITIONAL);
  const [specialRequest, setSpecialRequest] = useState('');
  const [numberOfServings, setNumberOfServings] = useState<number>(4);
  const [withCost, setWithCost] = useState(false);
  const [withImage, setWithImage] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [voiceControlActive, setVoiceControlActive] = useState(true);
  const [hasSavedIngredients, setHasSavedIngredients] = useState(false);
  
  const isProcessingRef = useRef(false);
  const { showNotification } = useNotification();
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialFormData && onFormPopulated) {
        if (initialFormData.ingredients !== undefined) {
            setIngredients(initialFormData.ingredients.split(',').map(s => s.trim()).filter(Boolean));
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
        if (initialFormData.cookingMethod !== undefined) {
            setCookingMethod(initialFormData.cookingMethod);
        } else {
            setCookingMethod(CookingMethod.TRADITIONAL); // Reset to default
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
            command = await interpretFormCommand(transcript);
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
                    setCookingMethod(cookingPayload.key as CookingMethod);
                    showNotification(`Elkészítés módja: ${cookingPayload.label}`, 'info');
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
        
        if (errorString.includes('RESOURCE_EXHAUSTED') || errorString.includes('429')) {
            errorMessage = "Túl sok kérés. A hangvezérlés 15 másodpercre szünetel.";
            setVoiceControlActive(false); // Automatically pause voice control
            setTimeout(() => {
                setVoiceControlActive(true);
                showNotification("A hangvezérlés újra aktív.", 'success');
            }, 15000); // Re-enable after 15 seconds
        }
        showNotification(errorMessage, 'info');
    } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
    }
  }, [showNotification]);

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

  useEffect(() => {
    if (voiceControlActive && !isLoading && permissionState !== 'denied') {
      if (!isListening) {
        startListening();
      }
    } else if (isListening) {
      stopListening();
    }
  }, [voiceControlActive, isLoading, isListening, startListening, stopListening, permissionState]);

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
    if (!isLoading) {
      onSubmit({
        ingredients: ingredients.join(', '),
        diet,
        mealType,
        cookingMethod,
        specialRequest,
        withCost,
        withImage,
        numberOfServings,
      });
    }
  };
  const triggerSubmitRef = useRef(triggerSubmit);
  triggerSubmitRef.current = triggerSubmit;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSubmit();
  };
  
  const handleToggleListening = () => {
      if (isSupported && permissionState !== 'denied') {
          setVoiceControlActive(prev => !prev);
      }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
       {isSupported && (
         <button
            type="button"
            onClick={handleToggleListening}
            disabled={permissionState === 'denied'}
            className={`w-full text-center p-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                permissionState === 'denied' 
                ? 'bg-red-50 border-red-200 cursor-not-allowed' 
                : 'bg-primary-100 border-primary-200 hover:bg-primary-200'
            }`}
            aria-label={voiceControlActive ? "Hangvezérlés szüneteltetése" : "Hangvezérlés folytatása"}
        >
            <div className="flex justify-center items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${permissionState === 'denied' ? 'text-red-500' : (voiceControlActive && isListening && !isProcessing ? 'text-red-500 animate-pulse' : 'text-primary-700')}`} viewBox="0 0 20 20" fill="currentColor">
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
                        {voiceControlActive ? (isProcessing ? 'Értelmezés...' : (isListening ? 'Hallgatom...' : 'Indítás...')) : 'Hangvezérlés szünetel'}
                    </p>
                )}
            </div>
             {permissionState === 'denied' ? (
                <p className="text-sm mt-1 text-red-700">A hangvezérléshez engedélyezze a mikrofon használatát a böngésző címsorában.</p>
            ) : (
                <p className="text-sm mt-1 text-primary-600">
                    {voiceControlActive ? 'Mondja be a hozzávalókat, diétát, vagy hogy "jöhet a recept".' : 'Kattintson ide a hangvezérlés folytatásához.'}
                </p>
            )}
        </button>
      )}
      <div>
        <label htmlFor="ingredient-input" className="block text-lg font-semibold text-gray-700 mb-2">
          Milyen alapanyagok vannak otthon?
        </label>
        <div className="flex items-center gap-2 mb-3">
            <input
                id="ingredient-input"
                type="text"
                value={currentIngredient}
                onChange={(e) => setCurrentIngredient(e.target.value)}
                onKeyDown={handleIngredientInputKeyDown}
                placeholder="Pl. csirkemell, rizs, hagyma..."
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
                <p className="text-gray-500">Adja meg a hozzávalókat, vagy hagyja üresen egy meglepetés recepthez.</p>
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label htmlFor="diet" className="block text-lg font-semibold text-gray-700 mb-2">
            Diéta típusa
          </label>
          <div className="flex items-center gap-2">
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
          </div>
        </div>
        <div>
          <label htmlFor="mealType" className="block text-lg font-semibold text-gray-700 mb-2">
            Étkezés
          </label>
           <div className="flex items-center gap-2">
              <select
                id="mealType"
                value={mealType}
                onChange={(e) => setMealType(e.target.value as MealType)}
                className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition duration-150 ease-in-out"
              >
                {MEAL_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
           </div>
        </div>
        <div>
          <label htmlFor="cookingMethod" className="block text-lg font-semibold text-gray-700 mb-2">
            Elkészítés módja
          </label>
           <div className="flex items-center gap-2">
              <select
                id="cookingMethod"
                value={cookingMethod}
                onChange={(e) => setCookingMethod(e.target.value as CookingMethod)}
                className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition duration-150 ease-in-out"
              >
                {COOKING_METHODS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
           </div>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center items-center gap-2 bg-primary-600 text-white font-bold py-4 px-4 rounded-lg shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Recept generálása...' : (ingredients.length === 0 ? 'Jöhet a meglepetés recept!' : 'Jöhet a recept!')}
        </button>
      </div>
    </form>
  );
};

export default RecipeInputForm;

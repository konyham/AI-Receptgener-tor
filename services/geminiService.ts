// FIX: This file was created to implement the missing Gemini API service logic.
// FIX: The `GenerateVideosMetadata` type is not exported from `@google/genai`. It has been removed.
import { GoogleGenAI, Type } from '@google/genai';
import { DIET_OPTIONS } from '../constants';
import {
  DietOption,
  FormAction,
  FormCommand,
  MealType,
  Recipe,
  RecipeSuggestions,
  SelectionResult,
  VoiceCommand,
  CookingMethod,
  VoiceCommandResult,
  AppView,
  AppCommand,
  AppCommandAction,
  CuisineOption,
  RecipePace,
  OptionItem,
  CategorizedIngredient,
  AlternativeRecipeSuggestion,
} from '../types';

// FIX: Initialize the GoogleGenAI client with API key from environment variables as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const recipeSchema = {
  type: Type.OBJECT,
  properties: {
    recipeName: { type: Type.STRING, description: 'A recept neve.' },
    description: {
      type: Type.STRING,
      description: 'A recept rövid, étvágygerjesztő leírása.',
    },
    prepTime: {
      type: Type.STRING,
      description: 'Az előkészítési idő, pl. "15 perc".',
    },
    cookTime: {
      type: Type.STRING,
      description: 'A főzési/sütési idő, pl. "30 perc".',
    },
    servings: {
      type: Type.STRING,
      description: 'Hány személyre szól a recept, pl. "4 személy". A válasznak pontosan meg kell egyeznie a promptban kért személlyel.',
    },
    ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'A hozzávalók listája, pontos mennyiségekkel.',
    },
    instructions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: 'Az elkészítési lépés leírása.' },
        },
        required: ['text'],
      },
      description: 'Az elkészítési lépések listája, részletesen.',
    },
    calories: { type: Type.STRING, description: 'A recept kalóriatartalma 100 grammra vetítve, pl. "150 kcal".' },
    carbohydrates: { type: Type.STRING, description: 'A recept szénhidráttartalma 100 grammra vetítve, pl. "10 g".' },
    protein: { type: Type.STRING, description: 'A recept fehérjéjartalma 100 grammra vetítve, pl. "20 g".' },
    fat: { type: Type.STRING, description: 'A recept zsírtartalma 100 grammra vetítve, pl. "8 g".' },
    glycemicIndex: { type: Type.STRING, description: 'A recept becsült glikémiás indexe (pl. "Alacsony", "Közepes", "Magas").' },
    diabeticAdvice: { type: Type.STRING, description: 'Rövid, hasznos tanács cukorbetegek számára a recepthez kapcsolódóan.' },
    estimatedCost: { type: Type.STRING, description: 'A recept teljes becsült költsége forintban (Ft), pl. "kb. 1500 Ft".' },
  },
  required: [
    'recipeName',
    'description',
    'prepTime',
    'cookTime',
    'servings',
    'ingredients',
    'instructions',
  ],
};

export const generateRecipe = async (
  ingredients: string,
  excludedIngredients: string,
  diet: DietOption,
  mealType: MealType,
  cuisine: CuisineOption,
  cookingMethods: CookingMethod[],
  specialRequest: string,
  withCost: boolean,
  numberOfServings: number,
  recipePace: RecipePace,
  mode: 'standard' | 'leftover',
  useSeasonalIngredients: boolean,
  customMealTypes: OptionItem[],
  customCuisineOptions: OptionItem[],
  customCookingMethods: OptionItem[],
  customCookingMethodCapacities: Record<string, number | null>,
  t: (key: string, options?: Record<string, any>) => string
): Promise<Recipe> => {
  const dietLabel = DIET_OPTIONS.find((d) => d.value === diet)?.label || '';
  const mealTypeLabel =
    customMealTypes.find((m) => m.value === mealType)?.label || mealType;
  const cuisineLabel = customCuisineOptions.find((c) => c.value === cuisine)?.label || cuisine;
  const cookingMethodLabels = cookingMethods
    .map(cm => customCookingMethods.find(c => c.value === cm)?.label || cm)
    .filter((l): l is string => !!l);

  let prompt: string;
  const specialRequestLower = specialRequest.toLowerCase().trim();
  const componentRequestKeywords = ['készítsünk', 'receptje', 'hogyan kell', 'készítése', 'make', 'recipe for'];

  // Check if the special request is about making a component (like sausage, pasta, etc.)
  if (componentRequestKeywords.some(keyword => specialRequestLower.includes(keyword))) {
      prompt = t('prompts.generateRecipe.componentRequest', {
        specialRequest: specialRequest,
        ingredients: ingredients
      });
  } else {
    // Main recipe generation logic
    if (mode === 'leftover') {
        if (!ingredients.trim()) {
            throw new Error('A maradékokból való főzéshez kérjük, adja meg a rendelkezésre álló maradékokat.');
        }
        prompt = t('prompts.generateRecipe.leftoverBase', {
          mealType: mealTypeLabel,
          ingredients: ingredients,
          servings: numberOfServings
        });
        if (useSeasonalIngredients) {
            prompt += t('prompts.generateRecipe.seasonalLeftover');
        }
        prompt += t('prompts.generateRecipe.leftoverSafety');

    } else { // Standard mode
        prompt = t('prompts.generateRecipe.standardBase', {
          mealType: mealTypeLabel,
          servings: numberOfServings
        });

        if (ingredients.trim()) {
            prompt += t('prompts.generateRecipe.standardWithIngredients', { ingredients });
        } else {
            prompt += t('prompts.generateRecipe.standardSurprise');
        }
        if (useSeasonalIngredients) {
            prompt += t('prompts.generateRecipe.seasonal');
        }
    }

    const machineMethods = cookingMethods.filter(cm => cm !== CookingMethod.TRADITIONAL);
    if (machineMethods.length > 0) {
        const capacities = machineMethods
            .map(cm => ({ name: customCookingMethods.find(c => c.value === cm)?.label || cm, capacity: customCookingMethodCapacities[cm] }))
            .filter(c => c.capacity !== null && c.capacity !== undefined);

        if (capacities.length > 0) {
            const minCapacityDevice = capacities.reduce((min, current) => (current.capacity! < min.capacity! ? current : min), capacities[0]);
            if (numberOfServings > minCapacityDevice.capacity!) {
                prompt += t('prompts.generateRecipe.capacityWarning', {
                  deviceName: minCapacityDevice.name,
                  capacity: minCapacityDevice.capacity,
                  servings: numberOfServings
                });
            }
        }
    }
    
    if (excludedIngredients.trim()) {
      prompt += t('prompts.generateRecipe.exclusions', { excludedIngredients });
    }
    
    prompt += t('prompts.generateRecipe.cookingMethods', { methods: cookingMethodLabels.join(' and ') });
    
    if (diet !== DietOption.NONE && dietLabel) {
      prompt += t('prompts.generateRecipe.diet', { diet: dietLabel });
    }
    if (cuisine !== CuisineOption.NONE && cuisineLabel) {
        prompt += t('prompts.generateRecipe.cuisine', { cuisine: cuisineLabel });
    }
    if (specialRequest.trim()) {
      prompt += t('prompts.generateRecipe.specialRequest', { specialRequest: specialRequest.trim() });
    }

    if (recipePace === RecipePace.QUICK) {
      prompt += t('prompts.generateRecipe.paceQuick');
    } else if (recipePace === RecipePace.SIMPLE) {
      prompt += t('prompts.generateRecipe.paceSimple');
    }

    if (diet === DietOption.DIABETIC) {
      prompt += t('prompts.generateRecipe.diabeticInfo');
    }

    if (withCost) {
      prompt += t('prompts.generateRecipe.withCost');
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: recipeSchema,
      },
    });
    
    // FIX: Access the .text property for the JSON string as per Gemini API guidelines.
    const json = JSON.parse(response.text);

    return {
        ...json,
        diet,
        mealType,
        cuisine,
        cookingMethods,
        recipePace,
    } as Recipe;

  } catch (e: any) {
    console.error('Error generating recipe:', e);
    if (e.message.includes('JSON')) {
        throw new Error('Az AI válasza hibás formátumú volt. Próbálja újra egy kicsit más feltételekkel!');
    } else if (e.message.toLowerCase().includes('quota')) {
        throw new Error('Elérte a napi ingyenes korlátot. Kérjük, próbálja újra később.');
    }
    throw new Error(`Hiba történt a recept generálása közben: ${e.message}`);
  }
};

export const categorizeIngredients = async (ingredients: string[]): Promise<CategorizedIngredient[]> => {
    if (ingredients.length === 0) {
        return [];
    }

    const prompt = `A felhasználó a következő alapanyagokat szeretné kategorizálni a kamrájában vagy a bevásárlólistáján. Kérlek, sorold be mindegyiket a következő kategóriák egyikébe: Zöldség, Gyümölcs, Hús és Hal, Tejtermék és Tojás, Pékáru, Szárazáru (pl. liszt, tészta, rizs), Konzervek és Befőttek, Fűszerek és Olajok, Italok, Fagyasztott termékek, Édességek és Snackek, Egyéb.
    
    Alapanyagok listája:
    ${ingredients.join(', ')}
    
    A válaszod egy JSON objektum legyen, ami egy "categorizedIngredients" kulcsot tartalmaz. Ennek értéke egy tömb, ahol minden elem egy objektum "ingredient" (az eredeti alapanyag neve) és "category" (a te általad adott kategória) kulcsokkal. Ne hagyj ki egyetlen alapanyagot se.`;
    
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            categorizedIngredients: {
                type: Type.ARRAY,
                description: "Az alapanyagok listája, kategóriákba sorolva.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        ingredient: {
                            type: Type.STRING,
                            description: "Az eredeti alapanyag neve, ahogy a felhasználó megadta."
                        },
                        category: {
                            type: Type.STRING,
                            description: "A javasolt kategória a megadott listából."
                        },
                    },
                    required: ['ingredient', 'category'],
                },
            },
        },
        required: ['categorizedIngredients'],
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
            },
        });
        
        // FIX: Access the .text property for the JSON string as per Gemini API guidelines.
        const json = JSON.parse(response.text);
        
        // Ensure the response matches the expected structure
        if (json.categorizedIngredients && Array.isArray(json.categorizedIngredients)) {
            return json.categorizedIngredients;
        } else {
            console.error("AI response for categorization is malformed:", json);
            throw new Error("Az AI válasza nem a várt formátumban érkezett.");
        }

    } catch (e: any) {
        console.error('Error categorizing ingredients:', e);
        throw new Error(`Hiba történt az alapanyagok kategorizálása közben: ${e.message}`);
    }
};

// FIX: Implemented missing gemini service functions
export const getRecipeModificationSuggestions = async (ingredients: string, recipeName: string): Promise<RecipeSuggestions> => {
  const prompt = `A "${recipeName}" recepthez, amelynek hozzávalói: ${ingredients}, adj néhány javaslatot. Milyen hozzávalókat lehetne még hozzáadni? Milyen módosítási ötletek vannak, hogy még finomabb vagy különlegesebb legyen?`;
  
  const schema = {
    type: Type.OBJECT,
    properties: {
      suggestedIngredients: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Javasolt extra hozzávalók listája.'
      },
      modificationIdeas: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Ötletek a recept módosítására.'
      }
    },
    required: ['suggestedIngredients', 'modificationIdeas']
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });
    // FIX: Access the .text property for the JSON string as per Gemini API guidelines.
    return JSON.parse(response.text) as RecipeSuggestions;
  } catch (e: any) {
    console.error('Error getting recipe modification suggestions:', e);
    throw new Error('Hiba történt a javaslatok generálása közben.');
  }
};

export const interpretAppCommand = async (transcript: string, view: AppView, context: any): Promise<AppCommand> => {
  const prompt = `Értelmezd a következő parancsot egy receptalkalmazás kontextusában: "${transcript}".
  A jelenlegi nézet: "${view}".
  Elérhető kategóriák a kedvencekben: ${context.categories.join(', ')}.
  Bevásárlólista elemei: ${context.shoppingListItems.join(', ')}.
  Kamra elemei: ${context.pantryItems.join(', ')}.

  A lehetséges műveletek (action): 'navigate', 'add_shopping_list_item', 'remove_shopping_list_item', 'check_shopping_list_item', 'uncheck_shopping_list_item', 'clear_checked_shopping_list', 'clear_all_shopping_list', 'add_pantry_item', 'remove_pantry_item', 'view_favorite_recipe', 'delete_favorite_recipe', 'filter_favorites', 'clear_favorites_filter', 'expand_category', 'collapse_category', 'unknown'.
  A lehetséges navigációs célpontok (payload for 'navigate'): 'generator', 'favorites', 'shopping-list', 'pantry', 'users'.
  A válaszod egy JSON objektum legyen "action" és "payload" kulcsokkal. A payload a parancs tárgya (pl. a hozzáadandó tétel neve).`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING },
      payload: { type: Type.STRING }
    },
    required: ['action']
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });
    // FIX: Access the .text property for the JSON string as per Gemini API guidelines.
    return JSON.parse(response.text) as AppCommand;
  } catch (e: any) {
    console.error('Error interpreting app command:', e);
    throw new Error('Hiba történt a parancs értelmezése közben.');
  }
};

export const interpretFormCommand = async (transcript: string, mealTypes: OptionItem[], cookingMethods: OptionItem[], dietOptions: any[]): Promise<FormCommand> => {
  const prompt = `Értelmezd a következő hangparancsot egy receptgenerátor űrlaphoz: "${transcript}".
  Lehetséges műveletek (action): 'add_ingredients', 'set_diet', 'set_meal_type', 'set_cooking_method', 'generate_recipe', 'unknown'.
  Válaszolj egy JSON objektummal, amiben van egy "action" és egy "payload" kulcs.
  - 'add_ingredients' esetén a payload egy string tömb a hozzávalókkal.
  - 'set_diet', 'set_meal_type', 'set_cooking_method' esetén a payload egy objektum {key: "...", label: "..."} formában.
  - 'generate_recipe' esetén a payload null.
  
  Elérhető étkezés típusok: ${mealTypes.map(o => `"${o.label}" (${o.value})`).join(', ')}.
  Elérhető elkészítési módok: ${cookingMethods.map(o => `"${o.label}" (${o.value})`).join(', ')}.
  Elérhető diéták: ${dietOptions.map(o => `"${o.label}" (${o.value})`).join(', ')}.
  `;

  // The previous schema was invalid due to using Type.ANY and a dynamic payload structure.
  // We will remove the schema and parse the JSON from the model's text response,
  // as the prompt already instructs it to return JSON.
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    // FIX: Access the .text property for the JSON string as per Gemini API guidelines.
    let jsonText = response.text.trim();
    // Handle potential markdown code block fences
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.substring(7, jsonText.length - 3).trim();
    } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.substring(3, jsonText.length - 3).trim();
    }

    return JSON.parse(jsonText) as FormCommand;
  } catch (e: any) {
    console.error('Error interpreting form command:', e);
    throw new Error('Hiba történt a hangparancs értelmezése közben.');
  }
};

export const suggestMealType = async (ingredientsString: string, specialRequest: string, mealTypes: OptionItem[]): Promise<string> => {
    const prompt = `A következő hozzávalók alapján: "${ingredientsString}" és a speciális kérés alapján: "${specialRequest}", melyik étkezés típus a legmegfelelőbb a listából: ${mealTypes.map(m => `"${m.label}" (${m.value})`).join(', ')}? Csak a kulcsot (value) add vissza, pl. "lunch". Ha nem egyértelmű, ne válaszolj semmit.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        // FIX: Access the .text property for the JSON string as per Gemini API guidelines.
        return response.text.trim();
    } catch (e: any) {
        console.error('Error suggesting meal type:', e);
        return '';
    }
};

export const interpretUserCommand = async (transcript: string): Promise<VoiceCommandResult> => {
  const prompt = `Értelmezd a következő hangparancsot egy recept felolvasása közben: "${transcript}".
  Lehetséges parancsok (command): 'NEXT', 'STOP', 'READ_INTRO', 'READ_INGREDIENTS', 'START_COOKING', 'START_TIMER', 'UNKNOWN'.
  Ha a parancs 'START_TIMER', és a felhasználó megad időtartamot (pl. "indíts egy 5 perces időzítőt"), akkor a payload objektumban add vissza az órákat, perceket, másodperceket.
  A válaszod egy JSON objektum legyen { "command": "...", "payload": { "hours": ..., "minutes": ..., "seconds": ... } } formában.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      command: { type: Type.STRING },
      payload: {
        type: Type.OBJECT,
        properties: {
          hours: { type: Type.NUMBER },
          minutes: { type: Type.NUMBER },
          seconds: { type: Type.NUMBER }
        }
      }
    },
    required: ['command']
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });
    // FIX: Access the .text property for the JSON string as per Gemini API guidelines.
    return JSON.parse(response.text) as VoiceCommandResult;
  } catch (e: any) {
    console.error('Error interpreting user command:', e);
    throw new Error('Hiba történt a hangparancs értelmezése közben.');
  }
};

export const generateRecipeImage = async (recipe: Recipe, cookingMethodLabels: string[]): Promise<string> => {
  const prompt = `SUBJECT: A professional, ultra-realistic, and highly appetizing food photograph of a finished dish.
STYLE: Modern food magazine style, bright lighting, clean and simple background, shallow depth of field, close-up shot.
DISH NAME: "${recipe.recipeName}"
DISH DESCRIPTION: ${recipe.description}
KEY INGREDIENTS: ${recipe.ingredients.slice(0, 5).join(', ')}.
PRESENTATION: The food must be beautifully arranged on a plate or in a bowl, ready to be eaten.

ABSOLUTE MANDATORY RULES:
1.  **NO TEXT. NO LETTERS. NO WATERMARKS. NO LOGOS.** The final image must be completely clean and contain zero text of any kind. This is the most important rule.
2.  **THE IMAGE MUST BE OF FOOD ONLY.**
3.  **DO NOT generate any buildings, houses, landscapes, people, or non-food objects.**
4.  The final image must be extremely appetizing and look delicious.
`;
  
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '4:3',
      },
    });
    return response.generatedImages[0].image.imageBytes;
  } catch (e: any) {
    console.error('Error generating recipe image:', e);
    throw new Error('Hiba történt az ételfotó generálása közben.');
  }
};

export const calculateRecipeCost = async (recipe: Recipe): Promise<string> => {
  const prompt = `Becsüld meg magyar forintban (Ft), mennyibe kerül elkészíteni ezt a receptet a következő hozzávalókból: ${recipe.ingredients.join(', ')}. A válasz csak a becsült összeget tartalmazza, pl. "kb. 2500 Ft".`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    // FIX: Access the .text property for the JSON string as per Gemini API guidelines.
    return response.text.trim();
  } catch (e: any) {
    console.error('Error calculating recipe cost:', e);
    throw new Error('Hiba történt a költségbecslés közben.');
  }
};

export const simplifyRecipe = async (recipe: Recipe): Promise<Recipe> => {
  const prompt = `Egyszerűsítsd le ezt a receptet egy kezdő szakács számára. Csökkentsd a lépések és a hozzávalók számát, ha lehetséges, de tartsd meg az étel lényegét. Eredeti recept: ${JSON.stringify(recipe)}. A válaszod egy teljes, egyszerűsített recept legyen, ugyanabban a JSON formátumban, mint az eredeti.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: recipeSchema,
      },
    });
    // FIX: Access the .text property for the JSON string as per Gemini API guidelines.
    const simplified = JSON.parse(response.text);
    return {
      ...recipe, // Keep original meta-data
      ...simplified, // Overwrite with simplified data
    };
  } catch (e: any) {
    console.error('Error simplifying recipe:', e);
    throw new Error('Hiba történt a recept egyszerűsítése közben.');
  }
};

export const generateAlternativeRecipeSuggestions = async (
  currentRecipe: Recipe,
  availableCookingMethods: OptionItem[]
): Promise<{ suggestions: AlternativeRecipeSuggestion[] }> => {
  const cookingMethodLabels = currentRecipe.cookingMethods
    .map(cm => availableCookingMethods.find(c => c.value === cm)?.label || cm)
    .join(', ');
    
  const availableMethodsString = availableCookingMethods.map(m => `"${m.label}" (${m.value})`).join(', ');

  const prompt = `A felhasználó a következő receptet nézi:
- Név: ${currentRecipe.recipeName}
- Leírás: ${currentRecipe.description}
- Hozzávalók: ${currentRecipe.ingredients.join(', ')}
- Elkészítési mód: ${cookingMethodLabels}

Javasolj 3 további receptet, amelyek hasonlóak ehhez, de a következőkben térnek el:
1. Használj más fő alapanyagot (pl. csirke helyett pulyka, sertés helyett marha, stb.).
2. VAGY javasolj egy másik, logikusan illeszkedő elkészítési módot.
3. A javaslatok legyenek fantáziadúsak és vonzóak.
4. A 'newParameters' objektumban csak azokat a kulcsokat add meg, amik az eredeti recepthez képest változnak. Például, ha csak a hozzávalók változnak, a 'newParameters' csak egy 'ingredients' kulcsot tartalmazzon. Ha a főzési mód is, akkor mindkettőt.

A válaszod egy JSON objektum legyen, ami egy "suggestions" kulcsot tartalmaz. Ennek értéke egy 3 elemű tömb legyen. Minden elem egy objektum a következő kulcsokkal:
- "recipeName": Az új recept javasolt neve.
- "description": Rövid, étvágygerjesztő leírás az új receptről.
- "newParameters": Egy objektum, ami a módosított paramétereket tartalmazza a recept generálásához. Lehetséges kulcsok: "ingredients" (string), "cookingMethods" (egy string tömb a következők közül: ${availableMethodsString}), "specialRequest" (string).`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      suggestions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            recipeName: { type: Type.STRING, description: "Az új recept javasolt neve." },
            description: { type: Type.STRING, description: "Rövid, étvágygerjesztő leírás az új receptről." },
            newParameters: {
              type: Type.OBJECT,
              properties: {
                ingredients: { type: Type.STRING, description: "Az új fő hozzávalók, vesszővel elválasztva." },
                cookingMethods: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Az új elkészítési mód(ok) kulcsa(i)." },
                specialRequest: { type: Type.STRING, description: "Különleges kérés, ami segít a generálásban." }
              }
            }
          },
          required: ['recipeName', 'description', 'newParameters']
        }
      }
    },
    required: ['suggestions']
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });
    // FIX: Access the .text property for the JSON string as per Gemini API guidelines.
    const json = JSON.parse(response.text);
    return json as { suggestions: AlternativeRecipeSuggestion[] };
  } catch (e: any) {
    console.error('Error generating alternative recipe suggestions:', e);
    throw new Error('Hiba történt a receptjavaslatok generálása közben.');
  }
};

export const generateInstructionImage = async (recipeName: string, instructionText: string, cookingMethodLabels: string[]): Promise<string> => {
  const prompt = `SUBJECT: A top-down (flat lay), photorealistic image illustrating a single step in a cooking process.
STYLE: Clean, bright, minimalist. Focus on the ingredients and tools. No human hands.
RECIPE: "${recipeName}"
INSTRUCTION TO VISUALIZE: "${instructionText}"
RELEVANT COOKING METHOD: ${cookingMethodLabels.join(', ')}

ABSOLUTE MANDATORY RULES:
1.  **NO TEXT. NO LETTERS. NO WATERMARKS. NO LOGOS.** The final image must be completely clean and contain zero text of any kind. This is the most important rule.
2.  **The image must ONLY show the cooking step in progress.** Show ingredients being prepared, mixed in a bowl, or cooking in a pan/pot.
3.  **DO NOT show a finished, plated dish.** This is about the process, not the result.
4.  **DO NOT include people, hands, or buildings.**
`;
  
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '4:3',
      },
    });
    return response.generatedImages[0].image.imageBytes;
  } catch (e: any) {
    console.error('Error generating instruction image:', e);
    throw new Error('Hiba történt az illusztráció generálása közben.');
  }
};
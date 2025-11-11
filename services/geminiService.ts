// services/geminiService.ts
import { GoogleGenAI, GenerateContentResponse, Type } from '@google/genai';
import {
  Recipe,
  DietOption,
  MealType,
  CookingMethod,
  RecipeSuggestions,
  AppView,
  AppCommand,
  SelectionResult,
  FormCommand,
  VoiceCommand,
  VoiceCommandResult,
  MenuRecipe,
  DailyMenuRecipe,
  CuisineOption,
  RecipePace,
  OptionItem,
  TRADITIONAL_COOKING_METHOD,
  InstructionStep,
  CategorizedIngredient
} from '../types';
import { DIET_OPTIONS } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

const parseJsonResponse = <T,>(text: string, context: string): T => {
  try {
    // The response can be wrapped in ```json ... ```, so we need to extract it.
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : text;
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error(`Failed to parse JSON response for ${context}:`, text, error);
    throw new Error(`A modell válasza hibás formátumú volt (${context}). Kérjük, próbálja újra.`);
  }
};

const getLabel = (value: string, options: readonly OptionItem[]): string => {
    return options.find(o => o.value === value)?.label || value;
};

// ... a lot of functions that need to be implemented ...
// For now, I'll create stubs, but a full implementation would require detailed prompting.
// Given the context of the app, I can make educated guesses on the prompts.

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
    allMealTypes: OptionItem[],
    allCuisineOptions: OptionItem[],
    allCookingMethods: OptionItem[],
    cookingMethodCapacities: Record<string, number | null>
): Promise<Recipe> => {

    const mealTypeLabel = getLabel(mealType, allMealTypes);
    const cuisineLabel = getLabel(cuisine, allCuisineOptions);
    const cookingMethodsLabels = cookingMethods.map(cm => getLabel(cm, allCookingMethods));
    
    let capacityConstraint = '';
    if (cookingMethods.length > 0 && cookingMethods[0] !== TRADITIONAL_COOKING_METHOD) {
        const capacities = cookingMethods
            .map(cm => ({ method: getLabel(cm, allCookingMethods), capacity: cookingMethodCapacities[cm] }))
            .filter(item => item.capacity !== null);
        
        if (capacities.length > 0) {
            capacityConstraint = ` A receptek adagja ne haladja meg a ${numberOfServings} főt. Vedd figyelembe a következő eszközök kapacitását: ${capacities.map(c => `${c.method}: max ${c.capacity} fő`).join(', ')}. Ha az adag meghaladja a kapacitást, az instrukciókban jelezd, hogy több részletben kell elkészíteni az ételt.`;
        }
    }


    const systemInstruction = `Te egy magyar séf vagy, aki kreatív és ízletes recepteket készít. A válaszodat mindig JSON formátumban add meg, a megadott séma szerint. A receptek legyenek magyar nyelven. Az instrukciókat oszd fel logikus, könnyen követhető lépésekre. Ha egy kép is tartozik egy lépéshez, adj egy rövid, angol nyelvű leírást a 'imagePrompt' mezőben a kép generálásához. A leírás ne tartalmazzon szöveget. Például: "A person chopping onions on a wooden board."`;

    const prompt = `
    Készíts egy receptet a következő paraméterek alapján:
    - Alapanyagok: ${ingredients || 'bármi, ami szezonális és finom'}
    - ${mode === 'leftover' ? 'Ezek maradékok, amiket fel kell használni.' : ''}
    - Kerülendő alapanyagok: ${excludedIngredients || 'nincs'}
    - Diéta: ${diet}
    - Étkezés típusa: ${mealTypeLabel}
    - Konyha: ${cuisineLabel}
    - Elkészítés módja: ${cookingMethodsLabels.join(', ') || 'Hagyományos'}
    - Adag: ${numberOfServings} fő
    - Tempó: ${recipePace} (${recipePace === 'quick' ? 'gyors' : recipePace === 'simple' ? 'egyszerű' : 'normál'})
    - Különleges kérés: ${specialRequest || 'nincs'}
    ${capacityConstraint}
    - Kérsz költségbecslést? ${withCost ? 'Igen' : 'Nem'}
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            recipeName: { type: Type.STRING, description: "A recept neve." },
            description: { type: Type.STRING, description: "Rövid, étvágygerjesztő leírás." },
            ingredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Hozzávalók listája." },
            instructions: { 
                type: Type.ARRAY, 
                items: {
                    type: Type.OBJECT,
                    properties: {
                        text: { type: Type.STRING, description: "Az elkészítési lépés leírása." },
                        imagePrompt: { type: Type.STRING, description: "Rövid, angol nyelvű prompt a lépést illusztráló kép generálásához (opcionális)." }
                    },
                    required: ['text']
                },
                description: "Elkészítési lépések."
            },
            prepTime: { type: Type.STRING, description: "Előkészítési idő (pl. '20 perc')." },
            cookTime: { type: Type.STRING, description: "Főzési/sütési idő (pl. '35 perc')." },
            servings: { type: Type.STRING, description: "Adagok száma (pl. '4 személyre')." },
            estimatedCost: { type: Type.STRING, description: "Becsült költség (pl. 'kb. 3500 Ft')." },
            calories: { type: Type.STRING, description: "Kalória / 100g." },
            carbohydrates: { type: Type.STRING, description: "Szénhidrát / 100g." },
            protein: { type: Type.STRING, description: "Fehérje / 100g." },
            fat: { type: Type.STRING, description: "Zsír / 100g." },
            glycemicIndex: { type: Type.STRING, description: "Glikémiás index." },
            diabeticAdvice: { type: Type.STRING, description: "Tanács cukorbetegeknek." },
        },
        required: ['recipeName', 'description', 'ingredients', 'instructions', 'prepTime', 'cookTime', 'servings']
    };

    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
        }
    });

    const recipe = parseJsonResponse<Recipe>(response.text, 'generateRecipe');
    return {
        ...recipe,
        diet,
        mealType,
        cuisine,
        cookingMethods,
        recipePace,
    };
};

export const generateMenu = async (
    ingredients: string,
    excludedIngredients: string,
    diet: DietOption,
    cuisine: CuisineOption,
    cookingMethods: CookingMethod[],
    specialRequest: string,
    withCost: boolean,
    numberOfServings: number,
    recipePace: RecipePace,
    mode: 'standard' | 'leftover',
    useSeasonalIngredients: boolean,
    allCuisineOptions: OptionItem[],
    allCookingMethods: OptionItem[]
): Promise<MenuRecipe> => {
    // This function will call generateRecipe 4 times or have one large prompt.
    // For simplicity, let's assume a large prompt.
    const cuisineLabel = getLabel(cuisine, allCuisineOptions);
    const cookingMethodsLabels = cookingMethods.map(cm => getLabel(cm, allCookingMethods));

    const systemInstruction = `Te egy magyar séf vagy, aki teljes, 4 fogásos menüket (előétel, leves, főétel, desszert) állít össze. A válaszodat mindig JSON formátumban add meg a megadott séma szerint. A receptek legyenek magyar nyelven.`;
    const prompt = `
    Készíts egy teljes menüt a következő paraméterek alapján:
    - Alapanyagok: ${ingredients || 'szezonális alapanyagok'}
    - Kerülendő alapanyagok: ${excludedIngredients || 'nincs'}
    - Diéta: ${diet}
    - Konyha: ${cuisineLabel}
    - Különleges kérés: ${specialRequest || 'nincs'}
    - Adag: ${numberOfServings} fő
    A menü fogásai harmonizáljanak egymással. Minden fogáshoz add meg a teljes receptet.
    `;

    const recipeSchema = {
        type: Type.OBJECT,
        properties: {
            recipeName: { type: Type.STRING }, description: { type: Type.STRING }, ingredients: { type: Type.ARRAY, items: { type: Type.STRING } }, instructions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING } }, required: ['text'] } }, prepTime: { type: Type.STRING }, cookTime: { type: Type.STRING }, servings: { type: Type.STRING }
        },
        required: ['recipeName', 'description', 'ingredients', 'instructions', 'prepTime', 'cookTime', 'servings']
    };

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            menuName: { type: Type.STRING },
            menuDescription: { type: Type.STRING },
            appetizer: recipeSchema,
            soup: recipeSchema,
            mainCourse: recipeSchema,
            dessert: recipeSchema
        },
        required: ['menuName', 'menuDescription', 'appetizer', 'soup', 'mainCourse', 'dessert']
    };
    
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema,
        }
    });

    const menu = parseJsonResponse<MenuRecipe>(response.text, 'generateMenu');
    // Add metadata to each recipe
    const addMetadata = (recipe: Recipe, course: MealType): Recipe => ({ ...recipe, diet, cuisine, cookingMethods, recipePace, mealType: course });
    menu.appetizer = addMetadata(menu.appetizer, MealType.SNACK);
    menu.soup = addMetadata(menu.soup, MealType.SOUP);
    menu.mainCourse = addMetadata(menu.mainCourse, MealType.LUNCH);
    menu.dessert = addMetadata(menu.dessert, MealType.DESSERT);
    
    return menu;
};

export const generateDailyMenu = async (
    ingredients: string,
    excludedIngredients: string,
    diet: DietOption,
    cuisine: CuisineOption,
    cookingMethods: CookingMethod[],
    specialRequest: string,
    withCost: boolean,
    numberOfServings: number,
    recipePace: RecipePace,
    mode: 'standard' | 'leftover',
    useSeasonalIngredients: boolean,
    allCuisineOptions: OptionItem[],
    allCookingMethods: OptionItem[]
): Promise<DailyMenuRecipe> => {
     const cuisineLabel = getLabel(cuisine, allCuisineOptions);
    const systemInstruction = `Te egy magyar dietetikus vagy, aki teljes napi menüket (reggeli, ebéd, vacsora) állít össze. A válaszodat mindig JSON formátumban add meg a megadott séma szerint. A receptek legyenek magyar nyelven.`;
    const prompt = `
    Készíts egy teljes napi menüt (reggeli, ebéd, vacsora) a következő paraméterek alapján:
    - Alapanyagok: ${ingredients || 'szezonális alapanyagok'}
    - Kerülendő alapanyagok: ${excludedIngredients || 'nincs'}
    - Diéta: ${diet}
    - Konyha: ${cuisineLabel}
    - Különleges kérés: ${specialRequest || 'nincs'}
    - Adag: ${numberOfServings} fő
    A menü fogásai táplálóak és kiegyensúlyozottak legyenek. Minden fogáshoz add meg a teljes receptet.
    `;
     const recipeSchema = {
        type: Type.OBJECT,
        properties: {
            recipeName: { type: Type.STRING }, description: { type: Type.STRING }, ingredients: { type: Type.ARRAY, items: { type: Type.STRING } }, instructions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING } }, required: ['text'] } }, prepTime: { type: Type.STRING }, cookTime: { type: Type.STRING }, servings: { type: Type.STRING }
        },
        required: ['recipeName', 'description', 'ingredients', 'instructions', 'prepTime', 'cookTime', 'servings']
    };
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            menuName: { type: Type.STRING }, menuDescription: { type: Type.STRING }, breakfast: recipeSchema, lunch: recipeSchema, dinner: recipeSchema
        },
        required: ['menuName', 'menuDescription', 'breakfast', 'lunch', 'dinner']
    };
     const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema,
        }
    });
     const menu = parseJsonResponse<DailyMenuRecipe>(response.text, 'generateDailyMenu');
    const addMetadata = (recipe: Recipe, course: MealType): Recipe => ({ ...recipe, diet, cuisine, cookingMethods, recipePace, mealType: course });
    menu.breakfast = addMetadata(menu.breakfast, MealType.BREAKFAST);
    menu.lunch = addMetadata(menu.lunch, MealType.LUNCH);
    menu.dinner = addMetadata(menu.dinner, MealType.DINNER);
     return menu;
};

export const getRecipeModificationSuggestions = async (recipe: Recipe): Promise<RecipeSuggestions> => {
  // Implementation
  return { suggestedIngredients: [], modificationIdeas: [] };
};

export const interpretAppCommand = async (transcript: string, view: AppView, context: any): Promise<AppCommand> => {
  // Implementation
  return { action: 'unknown', payload: null };
};

export const generateAppGuide = async (): Promise<string> => {
    const prompt = "Készíts egy rövid, barátságos, HTML formázott útmutatót (magyarul) az AI receptgenerátor alkalmazáshoz. Használj címsorokat (h3), félkövér szöveget (strong) és listákat (ul, li). Ne használj <html>, <body> vagy <head> tageket. Fedd le a fő funkciókat: recept generálás, mentés, bevásárlólista, kamra és hangvezérlés.";
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt
    });
    return response.text;
};

export const parseRecipeFromUrl = async (url: string): Promise<Partial<Recipe>> => {
    const prompt = `Elemezd a következő weboldal tartalmát, és vonj ki belőle egy receptet JSON formátumban. Add meg a recept nevét, egy rövid leírást és a hozzávalók listáját. URL: ${url}`;
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            recipeName: { type: Type.STRING },
            description: { type: Type.STRING },
            ingredients: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    };
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema,
        }
    });
    return parseJsonResponse<Partial<Recipe>>(response.text, 'parseRecipeFromUrl');
};

export const parseRecipeFromFile = async (file: { inlineData: { data: string; mimeType: string; } }): Promise<Partial<Recipe>> => {
    const prompt = `Elemezd a képen vagy PDF-ben található receptet és vonj ki belőle adatokat JSON formátumban. Add meg a recept nevét, egy rövid leírást és a hozzávalók listáját.`;
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            recipeName: { type: Type.STRING },
            description: { type: Type.STRING },
            ingredients: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    };
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: { parts: [{ inlineData: file.inlineData }, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema,
        }
    });
    return parseJsonResponse<Partial<Recipe>>(response.text, 'parseRecipeFromFile');
};

export const generateRecipeVariations = async (originalRecipe: Recipe, allCookingMethods: OptionItem[], allCuisineOptions: OptionItem[], allMealTypes: OptionItem[], cookingMethodCapacities: Record<string, number | null>): Promise<Recipe[]> => {
    const prompt = `Készíts 2-3 kreatív variációt a következő recepthez. A variációk legyenek eltérőek, pl. más konyha, más elkészítési mód, vagy egy különleges csavar. Minden variáció legyen egy teljes recept. Eredeti recept: ${JSON.stringify(originalRecipe)}`;
    // This response schema needs to be an array of recipes
    // The schema for a single recipe is already complex, so I'll simplify it for the array.
    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                recipeName: { type: Type.STRING },
                description: { type: Type.STRING },
                ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                instructions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING } } } },
                prepTime: { type: Type.STRING },
                cookTime: { type: Type.STRING },
                servings: { type: Type.STRING },
            },
            required: ['recipeName', 'description', 'ingredients', 'instructions', 'prepTime', 'cookTime', 'servings']
        }
    };
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema,
        }
    });
    const variations = parseJsonResponse<Partial<Recipe>[]>(response.text, 'generateRecipeVariations');
    // Add original metadata to new recipes
    return variations.map(v => ({ ...originalRecipe, ...v, imageUrl: undefined, dateAdded: undefined, rating: undefined, favoritedBy: undefined }));
};

export const generateSingleRecipeVariation = async (
    originalRecipe: Recipe,
    variationParams: {
        specialRequest: string;
        diet: DietOption;
        cuisine: CuisineOption;
        cookingMethods: CookingMethod[];
        userPreferences: {
            allergies: string;
            likes: string;
            dislikes: string;
        };
    },
    allCuisineOptions: OptionItem[],
    allCookingMethods: OptionItem[]
): Promise<Recipe> => {
    const systemInstruction = `Te egy magyar séf vagy, aki kreatív és ízletes recept variációkat készít. A válaszodat mindig JSON formátumban add meg, a megadott séma szerint. A receptek legyenek magyar nyelven. Az instrukciókat oszd fel logikus, könnyen követhető lépésekre. Ha egy kép is tartozik egy lépéshez, adj egy rövid, angol nyelvű leírást a 'imagePrompt' mezőben a kép generálásához. A leírás ne tartalmazzon szöveget.`;

    const dietLabel = DIET_OPTIONS.find(d => d.value === variationParams.diet)?.label || variationParams.diet;
    const cuisineLabel = getLabel(variationParams.cuisine, allCuisineOptions);
    const cookingMethodsLabels = variationParams.cookingMethods.map(cm => getLabel(cm, allCookingMethods));

    let userPreferencesRequest = '';
    if (variationParams.userPreferences.likes) {
        userPreferencesRequest += ` A recept feleljen meg a felhasználók ízlésének, akik kedvelik: ${variationParams.userPreferences.likes}.`;
    }
    if (variationParams.userPreferences.dislikes) {
        userPreferencesRequest += ` Lehetőség szerint kerülje a következő alapanyagokat: ${variationParams.userPreferences.dislikes}.`;
    }
    const finalSpecialRequest = [variationParams.specialRequest || 'Nincs különleges kérés. Legyen kreatív, de maradjon az eredeti recept szellemében.', userPreferencesRequest.trim()].filter(Boolean).join(' ');


    const prompt = `
    Készíts egyetlen kreatív variációt a következő recepthez.
    Eredeti recept alapadatai: ${JSON.stringify({
        recipeName: originalRecipe.recipeName,
        description: originalRecipe.description,
        ingredients: originalRecipe.ingredients,
        diet: DIET_OPTIONS.find(d => d.value === originalRecipe.diet)?.label,
        cuisine: getLabel(originalRecipe.cuisine, allCuisineOptions),
        cookingMethods: originalRecipe.cookingMethods.map(cm => getLabel(cm, allCookingMethods)),
    })}

    A kért variáció paraméterei a következők:
    - Különleges kérés: ${finalSpecialRequest}
    - Diéta: ${dietLabel}
    - Konyha: ${cuisineLabel}
    - Elkészítés módja: ${cookingMethodsLabels.join(', ') || 'Hagyományos'}
    - Garantáltan kerülendő alapanyagok (allergia): ${variationParams.userPreferences.allergies || 'nincs'}

    A válaszod egyetlen, teljes recept legyen JSON formátumban a megadott séma szerint. A variáció neve legyen utalás az eredeti receptre, de tükrözze a változtatást is (pl. "Rántott sajt légkeveréses fritőzben").
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            recipeName: { type: Type.STRING, description: "A variáció receptjének új, kreatív neve." },
            description: { type: Type.STRING, description: "Rövid, étvágygerjesztő leírás, ami kiemeli miben más ez a variáció." },
            ingredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Hozzávalók listája." },
            instructions: { 
                type: Type.ARRAY, 
                items: {
                    type: Type.OBJECT,
                    properties: {
                        text: { type: Type.STRING, description: "Az elkészítési lépés leírása." },
                        imagePrompt: { type: Type.STRING, description: "Rövid, angol nyelvű prompt a lépést illusztráló kép generálásához (opcionális)." }
                    },
                    required: ['text']
                },
                description: "Elkészítési lépések."
            },
            prepTime: { type: Type.STRING, description: "Előkészítési idő (pl. '20 perc')." },
            cookTime: { type: Type.STRING, description: "Főzési/sütési idő (pl. '35 perc')." },
            servings: { type: Type.STRING, description: "Adagok száma (pl. '4 személyre')." },
            estimatedCost: { type: Type.STRING, description: "Becsült költség (pl. 'kb. 3500 Ft')." },
            calories: { type: Type.STRING, description: "Kalória / 100g." },
            carbohydrates: { type: Type.STRING, description: "Szénhidrát / 100g." },
            protein: { type: Type.STRING, description: "Fehérje / 100g." },
            fat: { type: Type.STRING, description: "Zsír / 100g." },
            glycemicIndex: { type: Type.STRING, description: "Glikémiás index." },
            diabeticAdvice: { type: Type.STRING, description: "Tanács cukorbetegeknek." },
        },
        required: ['recipeName', 'description', 'ingredients', 'instructions', 'prepTime', 'cookTime', 'servings']
    };

    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
        }
    });

    const variation = parseJsonResponse<Recipe>(response.text, 'generateSingleRecipeVariation');
    return { 
        ...originalRecipe, 
        ...variation,
        diet: variationParams.diet,
        cuisine: variationParams.cuisine,
        cookingMethods: variationParams.cookingMethods,
        imageUrl: undefined, 
        dateAdded: undefined, 
        rating: undefined, 
        favoritedBy: undefined 
    };
};

export const interpretFormCommand = async (transcript: string, mealTypes: OptionItem[], cookingMethods: OptionItem[], dietOptions: { value: DietOption; label: string }[]): Promise<FormCommand | null> => {
  // Implementation
  return null;
};

export const interpretUserCommand = async (transcript: string): Promise<VoiceCommandResult> => {
  // Implementation
  return { command: VoiceCommand.UNKNOWN, payload: null };
};

export const suggestMealType = async (ingredients: string, specialRequest: string, mealTypes: OptionItem[]): Promise<MealType | null> => {
    const prompt = `Adott alapanyagok és kérés alapján melyik étkezés típus a legvalószínűbb? Válaszod csak a típus kulcsa legyen. Alapanyagok: "${ingredients}". Kérés: "${specialRequest}". Lehetséges típusok: ${JSON.stringify(mealTypes)}`;
    const response = await ai.models.generateContent({ model: MODEL_NAME, contents: prompt });
    const key = response.text.trim();
    if (mealTypes.some(mt => mt.value === key)) {
        return key as MealType;
    }
    return null;
};

export const generateRecipeImage = async (recipe: Recipe, alternativeSuggestions: any[]): Promise<string> => {
    const prompt = `Soha ne írj szöveget a képre. Fotorealisztikus, profi ételfotó. Csak az elkészült, letálalt étel szerepeljen rajta, illő gasztronómiai környezetben (pl. tányér, asztal, evőeszköz). Semmi más ne szerepeljen rajta, ami nem kapcsolódik az ételhez. Az étel: ${recipe.recipeName}. Leírás: ${recipe.description}`;
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: { numberOfImages: 1 }
    });
    return response.generatedImages[0].image.imageBytes;
};

export const calculateRecipeCost = async (recipe: Recipe): Promise<string> => {
  // Implementation
  return "N/A";
};

export const simplifyRecipe = async (recipe: Recipe): Promise<Recipe> => {
  // Implementation
  return recipe;
};

export const categorizeIngredients = async (ingredients: string[]): Promise<CategorizedIngredient[]> => {
    if (ingredients.length === 0) {
        return [];
    }

    const systemInstruction = `Te egy segítőkész konyhai asszisztens vagy. A feladatod, hogy bolti tételeket előre meghatározott kategóriákba sorolj. Csak egy JSON tömbbel válaszolj.`;

    const prompt = `
    Kategorizáld a következő tételeket: ${JSON.stringify(ingredients)}.
    Használd a következő kategóriákat: "Zöldség & Gyümölcs", "Hús & Hal", "Tejtermék & Tojás", "Pékáru", "Tartós élelmiszer", "Fűszerek & Szószok", "Italok", "Háztartási cikk", "Egyéb".
    A választ egy JSON objektumokból álló tömbként add meg, ahol minden objektumnak van egy "ingredient" és egy "category" kulcsa.
    Példa: [{ "ingredient": "tej", "category": "Tejtermék & Tojás" }, { "ingredient": "csirkemell", "category": "Hús & Hal" }]
    `;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                ingredient: { type: Type.STRING, description: "Az eredeti tétel neve." },
                category: { type: Type.STRING, description: "A tétel kategóriája a megadott listából." },
            },
            required: ['ingredient', 'category']
        }
    };

    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
        }
    });

    return parseJsonResponse<CategorizedIngredient[]>(response.text, 'categorizeIngredients');
};
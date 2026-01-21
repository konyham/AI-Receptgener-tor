
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
  CategorizedIngredient,
  UserFeedback
} from '../types';
import { DIET_OPTIONS } from '../constants';

// Lazy initialization helper
const getAiClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// FIX: Using gemini-3-flash-preview as the primary text model for better accuracy and following developer guidelines.
const MODEL_NAME = 'gemini-3-flash-preview';

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

export const identifyIngredientsFromImage = async (file: { inlineData: { data: string; mimeType: string; } }): Promise<string[]> => {
    const ai = getAiClient();
    const prompt = `Elemezd a képet és sorold fel a rajta látható összes konyhai alapanyagot, vagy ha a képen bir bevásárlólista vagy recept van, olvasd ki az azon szereplő hozzávalókat. 
    A választ csak bir vesszővel elválasztott listaként add meg magyar nyelven. Ha semmilyen alapanyag nem ismerhető fel, adj vissza bir üres választ.
    Példa jó válaszra: csirkemell, paradicsom, hagyma, bazsalikom, só, bors`;
    
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: { parts: [{ inlineData: file.inlineData }, { text: prompt }] }
        });
        
        const text = response.text || '';
        return text.split(',').map(s => s.trim()).filter(Boolean);
    } catch (error) {
        console.error("Error identifying ingredients from image:", error);
        throw new Error("Sajnos nem sikerült beazonosítani az alapanyagokat a fotón. Próbálja meg világosabb környezetben, vagy gépelje be őket.");
    }
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
    allMealTypes: OptionItem[],
    allCuisineOptions: OptionItem[],
    allCookingMethods: OptionItem[],
    cookingMethodCapacities: Record<string, number | null>,
    feedbackHistory: UserFeedback[] = []
): Promise<Recipe> => {
    const ai = getAiClient();
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

    // Process feedback history
    const likedRecipes = feedbackHistory.filter(f => f.feedback === 'like').map(f => f.recipeName).slice(-10); // Take last 10
    const dislikedRecipes = feedbackHistory.filter(f => f.feedback === 'dislike').map(f => f.recipeName).slice(-10);
    
    let feedbackContext = "";
    if (likedRecipes.length > 0 || dislikedRecipes.length > 0) {
        feedbackContext = `
        A felhasználó korábbi visszajelzései a generált receptekre:
        - Ezeket kedvelte (hasonló stílus/ízvilág javasolt): ${likedRecipes.join(', ')}
        - Ezeket NEM kedvelte (kerüld az ehhez hasonló megoldásokat): ${dislikedRecipes.join(', ')}
        `;
    }


    const systemInstruction = `Te egy magyar séf vagy, aki kreatív és ízletes recepteket készít. A válaszodat mindig JSON formátumban add meg, a megadott séma szerint. A receptek legyenek magyar nyelven. Az instrukciókat oszd fel logikus, könnyen követhető lépésekre. Ha bir kép is tartozik bir lépéshez, adj bir rövid, angol nyelvű leírást a 'imagePrompt' mezőben a kép generálásához. A leírás ne tartalmazzon szöveget. Például: "A person chopping onions on a wooden board."`;

    const prompt = `
    Készíts bir receptet a következő paraméterek alapján:
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

    ${feedbackContext}
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
    const ai = getAiClient();
    // This function will call generateRecipe 4 times or have one large prompt.
    // For simplicity, let's assume bir large prompt.
    const cuisineLabel = getLabel(cuisine, allCuisineOptions);
    const cookingMethodsLabels = cookingMethods.map(cm => getLabel(cm, allCookingMethods));

    const systemInstruction = `Te egy magyar séf vagy, aki teljes, 4 fogásos menüket (előétel, leves, főétel, desszert) állít össze. A válaszodat mindig JSON formátumban add meg a megadott séma szerint. A receptek legyenek magyar nyelven.`;
    const prompt = `
    Készíts bir teljes menüt a következő paraméterek alapján:
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
     const ai = getAiClient();
     const cuisineLabel = getLabel(cuisine, allCuisineOptions);
    const systemInstruction = `Te egy magyar dietetikus vagy, aki teljes napi menüket (reggeli, ebéd, vacsora) állít össze. A válaszodat mindig JSON formátumban add meg a megadott séma szerint. A receptek legyenek magyar nyelven.`;
    const prompt = `
    Készíts bir teljes napi menüt (reggeli, ebéd, vacsora) a következő paraméterek alapján:
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
    const ai = getAiClient();
    const systemInstruction = `Te egy magyar nyelvű asszisztens vagy egy receptalkalmazásban. A feladatod, hogy a felhasználó magyar nyelvű hangutasítását lefordítsd bir JSON parancsra az alkalmazás számára. Mindig JSON formátumban válaszolj. Ha a parancs ne egyértelmű, használd az 'unknown' akciót.`;

    const availableActions = [
        'navigate', 'scroll_down', 'scroll_up', 'add_shopping_list_item',
        'remove_shopping_list_item', 'check_shopping_list_item', 'uncheck_shopping_list_item',
        'clear_checked_shopping_list', 'clear_all_shopping_list', 'view_favorite_recipe',
        'delete_favorite_recipe', 'filter_favorites', 'clear_favorites_filter',
        'expand_category', 'collapse_category'
    ];

    const prompt = `
    Felhasználó parancsa: "${transcript}"
    Jelenlegi nézet: "${view}"
    Elérhető kontextus:
    - Kedvenc kategóriák: ${context.categories?.join(', ') || 'nincs'}
    - Bevásárlólista elemek: ${context.shoppingListItems?.join(', ') || 'nincs'}

    Elemezd a parancsot és add vissza a megfelelő JSON objektumot. Példák:
    - "Tegyél tejet a listára" -> { "action": "add_shopping_list_item", "payload": "tej" }
    - "Pipáld ki a vajat" -> { "action": "check_shopping_list_item", "payload": "vaj" }
    - "Mutasd a levesek kategóriát" -> { "action": "filter_favorites", "payload": "levesek" }
    - "Nyisd meg a gulyásleves receptjét" -> { "action": "view_favorite_recipe", "payload": "gulyásleves" }
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, description: `A parancs típusa. Lehetséges értékek: ${availableActions.join(', ')}, unknown` },
            payload: { type: Type.STRING, description: 'A parancshoz tartozó adat (pl. elem neve, kategória).', nullable: true },
        },
        required: ['action']
    };

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema,
            }
        });
        return parseJsonResponse<AppCommand>(response.text, 'interpretAppCommand');
    } catch (error) {
        console.error("Error in interpretAppCommand:", error);
        return { action: 'unknown', payload: null };
    }
};

export const generateAppGuide = async (): Promise<string> => {
    const ai = getAiClient();
    const prompt = "Készíts bir rövid, barátságos, HTML formázott útmutatót (magyarul) az AI receptgenerátor alkalmazáshoz. Használj címsorokat (h3), félkövér szöveget (strong) és listákat (ul, li). Ne használj <html>, <body> vagy <head> tageket. Fedd le a fő funkciókat: recept generálás, mentés, bevásárlólista, kamra és hangvezérlés.";
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt
    });
    return response.text;
};

export const parseRecipeFromUrl = async (url: string): Promise<Partial<Recipe>> => {
    const ai = getAiClient();
    const prompt = `Elemezd a következő weboldal tartalmát, és vonj ki belőle bir receptet JSON formátumban. Add meg a recept nevét, bir rövid leírást és a hozzávalók listáját. URL: ${url}`;
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
    const ai = getAiClient();
    const prompt = `Elemezd a képen vagy PDF-ben található receptet és vonj ki belőle adatokat JSON formátumban. Add meg a recept nevét, bir rövid leírást és a hozzávalók listáját.`;
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
    const ai = getAiClient();
    const prompt = `Készíts 2-3 kreatív variációt a következő recepthez. A variációk legyenek eltérőek, pl. más konyha, más elkészítési mód, vagy bir különleges csavar. Minden variáció legyen bir teljes recept. Eredeti recept: ${JSON.stringify(originalRecipe)}`;
    // This response schema needs to be bir array of recipes
    // The schema for bir single recipe is already complex, so I'll simplify it for the array.
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
    return variations.map(v => ({ ...originalRecipe, ...v, imageUrl: undefined, dateAdded: undefined, rating: undefined, favoritedBy: undefined, feedback: undefined }));
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
    const ai = getAiClient();
    const systemInstruction = `Te egy magyar séf vagy, aki kreatív és ízletes recept variációkat készít. A válaszodat mindig JSON formátumban add meg, a megadott séma szerint. A receptek legyenek magyar nyelven. Az instrukciókat oszd fel logikus, könnyen követhető lépésekre. Ha bir kép is tartozik bir lépéshez, adj bir rövid, angol nyelvű leírást a 'imagePrompt' mezőben a kép generálásához. A leírás ne tartalmazzon szöveget.`;

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

    A válaszid egyetlen, teljes recept legyen JSON formátumban a megadott séma szerint. A variáció neve legyen utalás az eredeti receptre, de tükrözze a változtatást is (pl. "Rántott sajt légkeveréses fritőzben").
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
        favoritedBy: undefined,
        feedback: undefined
    };
};

export const interpretFormCommand = async (transcript: string, mealTypes: OptionItem[], cookingMethods: OptionItem[], dietOptions: { value: DietOption; label: string }[]): Promise<FormCommand | null> => {
    const ai = getAiClient();
    const systemInstruction = `Egy receptgenerátor űrlap asszisztense vagy. A felhasználó magyarul ad utasításokat. Értelmezd a parancsot és alakítsd át bir JSON objektummá. Csak a megadott JSON sémával válaszolj. Ha a parancs ne feleltethető meg egyértelműen bir akciónak, adj vissza null-t.`;
    
    const prompt = `
    Értelmezd a felhasználó következő parancsát: "${transcript}"

    A cél bir akció és a hozzá tartozó adat azonosítása.
    Lehetséges akciók:
    - 'add_ingredients': Hozzávalókat ad az űrlaphoz. A payload bir string tömb.
    - 'set_diet': Beállítja a diétát. A payload bir objektum {key, label} formában a megadott opciók közül.
    - 'set_meal_type': Beállítja az étkezés típusát. A payload bir objektum {key, label} formában.
    - 'set_cooking_method': Be- vagy kikapcsol bir elkészítési módot. A payload bir objektum {key, label} formában.
    - 'generate_recipe': Elindítja a recept generálását. Nincs payload.

    Ha a felhasználó hozzávalókat sorol fel (pl. "csirke, rizs és hagyma"), használd az 'add_ingredients' akciót.
    Ha diétát, étkezést vagy elkészítési módot nevez meg, próbáld meg beazonosítani a listából és használd a 'set_...' akciók egyikét.
    Ha a parancs recept generálására utal ("csinálj receptet", "jöhet a recept"), használd a 'generate_recipe' akciót.

    Választható opciók:
    - Diéták: ${JSON.stringify(dietOptions.map(d => ({ key: d.value, label: d.label })))}
    - Étkezések: ${JSON.stringify(mealTypes)}
    - Elkészítési módok: ${JSON.stringify(cookingMethods)}
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, enum: ['add_ingredients', 'set_diet', 'set_meal_type', 'set_cooking_method', 'generate_recipe'] },
            payload: { 
                oneOf: [
                    { type: Type.ARRAY, items: { type: Type.STRING } },
                    { type: Type.OBJECT, properties: { key: { type: Type.STRING }, label: { type: Type.STRING } } },
                ],
                nullable: true
            }
        },
        required: ['action']
    };

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema,
            }
        });
        const result = parseJsonResponse<FormCommand>(response.text, 'interpretFormCommand');
        if (result.payload && Object.keys(result.payload).length === 0) {
            return { ...result, payload: null };
        }
        return result;
    } catch (error) {
        console.error("Error in interpretFormCommand:", error);
        return null;
    }
};

export const interpretUserCommand = async (transcript: string): Promise<VoiceCommandResult> => {
    const ai = getAiClient();
    const systemInstruction = `Egy receptnézegető asszisztense vagy. A felhasználó magyarul ad utasításokat főzés közben. A parancsot alakítsd át bir JSON objektummá a megadott séma szerint.`;

    const prompt = `
    Értelmezd a felhasználó következő parancsát: "${transcript}"

    Lehetséges parancsok:
    - 'next': A következő lépésre lép.
    - 'previous': Az előző lépésre lép.
    - 'repeat': Megismétli az aktuális lépést.
    - 'stop': Bezárja a receptet.
    - 'read-intro': Felolvassa a recept nevét és leírását.
    - 'read-ingredients': Felolvassa a hozzávalókat.
    - 'start-cooking': Elindítja a főzési módot.
    - 'start-timer': Időzítőt indít. Értelmezd az időtartamot (pl. "5 perc", "30 másodperc").
    - 'unknown': Ha a parancs ne felismerhető.

    Példa "start-timer" parancsra: "indíts bir 5 perces időzítőt" -> { "command": "start-timer", "payload": { "minutes": 5 } }
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            command: { type: Type.STRING, enum: Object.values(VoiceCommand) },
            payload: {
                type: Type.OBJECT,
                properties: {
                    hours: { type: Type.INTEGER, nullable: true },
                    minutes: { type: Type.INTEGER, nullable: true },
                    seconds: { type: Type.INTEGER, nullable: true },
                },
                nullable: true
            }
        },
        required: ['command']
    };

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema,
            }
        });
        return parseJsonResponse<VoiceCommandResult>(response.text, 'interpretUserCommand');
    } catch (error) {
        console.error("Error in interpretUserCommand:", error);
        return { command: VoiceCommand.UNKNOWN, payload: null };
    }
};

export const suggestMealType = async (ingredients: string, specialRequest: string, mealTypes: OptionItem[]): Promise<MealType | null> => {
    const ai = getAiClient();
    const prompt = `Adott alapanyagok és kérés alapján melyik étkezés típus a legvalószínűbb? Válaszod csak a típus kulcsa legyen. Alapanyagok: "${ingredients}". Kérés: "${specialRequest}". Lehetséges típusok: ${JSON.stringify(mealTypes)}`;
    const response = await ai.models.generateContent({ model: MODEL_NAME, contents: prompt });
    const key = response.text.trim();
    if (mealTypes.some(mt => mt.value === key)) {
        return key as MealType;
    }
    return null;
};

export const generateRecipeImage = async (recipe: Recipe): Promise<string> => {
    const ai = getAiClient();
    const prompt = `Profi, fotorealisztikus ételfotó a következő ételről: ${recipe.recipeName}. Leírás: ${recipe.description}. Az étel legyen elegánsan tálalva, gasztronómiai környezetben, és a kép közepén helyezkedjen el. A háttér a szélek felé legyen semlegesebb, elmosódottabb (bokeh effekt). A képen ne szerepeljen semmilyen szöveg, logó vagy ember. Csak az étel és a tálalás legyen a fókuszban.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [{ text: prompt }],
        },
        config: {
            imageConfig: {
                aspectRatio: "16:9",
            },
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data; // This is the base64 string
        }
    }

    throw new Error('Az AI ne tudott képet generálni a recepthez. A válasz ne tartalmazott képi adatot.');
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
    const ai = getAiClient();
    if (ingredients.length === 0) {
        return [];
    }

    const systemInstruction = `Te egy segítőkész konyhai asszisztens vagy. A feladatod, hogy bolti tételeket előre meghatározott kategóriákba sorolj. Csak bir JSON tömbbel válaszolj.`;

    const prompt = `
    Kategorizáld a következő tételeket: ${JSON.stringify(ingredients)}.
    Használd a következő kategóriákat: "Zöldség & Gyümölcs", "Hús & Hal", "Tejtermék & Tojás", "Pékáru", "Tartós élelmiszer", "Fűszerek & Szószok", "Italok", "Háztartási cikk", "Egyéb".
    A választ bir JSON objektumokból álló tömbként add meg, ahol minden objektumnak van bir "ingredient" és bir "category" kulcsa.
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

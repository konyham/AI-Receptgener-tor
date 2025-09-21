// FIX: This file was created to implement the missing Gemini API service logic.
// FIX: The `GenerateVideosMetadata` type is not exported from `@google/genai`. It has been removed.
import { GoogleGenAI, Type, Operation, GenerateVideosResponse } from '@google/genai';
import { DIET_OPTIONS, MEAL_TYPES, COOKING_METHODS } from '../constants';
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
      description: 'Hány adagra szól a recept, pl. "4 adag".',
    },
    ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'A hozzávalók listája, pontos mennyiségekkel.',
    },
    instructions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Az elkészítési lépések listája, részletesen.',
    },
    calories: { type: Type.STRING, description: 'A recept kalóriatartalma 100 grammra vetítve, pl. "150 kcal".' },
    carbohydrates: { type: Type.STRING, description: 'A recept szénhidráttartalma 100 grammra vetítve, pl. "10 g".' },
    protein: { type: Type.STRING, description: 'A recept fehérjetartalma 100 grammra vetítve, pl. "20 g".' },
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
  diet: DietOption,
  mealType: MealType,
  cookingMethod: CookingMethod,
  specialRequest: string
): Promise<Recipe> => {
  const dietLabel = DIET_OPTIONS.find((d) => d.value === diet)?.label || '';
  const mealTypeLabel =
    MEAL_TYPES.find((m) => m.value === mealType)?.label || '';
  const cookingMethodLabel =
    COOKING_METHODS.find((c) => c.value === cookingMethod)?.label || 'hagyományos';

  let prompt = '';
  if (ingredients.trim()) {
    prompt = `Generálj egy ${mealTypeLabel} receptet a következő alapanyagokból: ${ingredients}.`;
  } else {
    prompt = `Generálj egy meglepetés ${mealTypeLabel} receptet. Válassz 3 véletlenszerű, gyakori háztartási alapanyagot, és készíts belőlük egy receptet. A recept leírásában említsd meg, hogy melyik 3 alapanyagot választottad. Fontos: bár a hozzávalók meglepetések, a receptnek minden más megadott feltételnek (diéta, elkészítési mód, különleges kérés) szigorúan meg kell felelnie.`;
  }
  
  prompt += ` A recept elkészítési módja legyen: ${cookingMethodLabel}.`;
  if (diet !== DietOption.NONE && dietLabel) {
    prompt += ` A recept feleljen meg a következő diétás előírásnak: ${dietLabel}.`;
  }
  if (specialRequest.trim()) {
    prompt += ` A receptnek a következő különleges kérésnek is meg kell felelnie: ${specialRequest.trim()}.`;
  }

  if (diet === DietOption.DIABETIC) {
    prompt += ` Mivel a recept cukorbeteg diétához készül, adj meg egy becsült tápértékadatokat is 100 grammra vetítve: kalória, szénhidrát, fehérje, zsír. Továbbá, becsüld meg a recept glikémiás indexét (Alacsony, Közepes, vagy Magas). Ezenkívül adj egy rövid, hasznos tanácsot cukorbetegek számára ehhez a recepthez kapcsolódóan (pl. mire figyeljenek a köret kiválasztásánál, vagy hogyan módosíthatják az ételt).`;
  }

  prompt += ` Végezz egy becsült költségszámítást is a recepthez magyar forintban (Ft). A számításhoz használd a következő átlagos magyarországi bolti árakat referenciaként (az árakat arányosítsd a receptben szereplő mennyiségekkel): csirkemell: 2500 Ft/kg, sertéskaraj: 2800 Ft/kg, rizs: 800 Ft/kg, krumpli: 400 Ft/kg, liszt: 300 Ft/kg, cukor: 500 Ft/kg, tojás: 80 Ft/db, tej: 450 Ft/liter, hagyma: 400 Ft/kg, fokhagyma: 200 Ft/fej, étolaj: 900 Ft/liter, vaj/margarin: 4000 Ft/kg, paradicsom: 1000 Ft/kg, paprika: 1200 Ft/kg, sajt (trappista): 3500 Ft/kg. Ha egy hozzávaló nincs a listán, használj egy reális piaci becslést. A végeredményt egyetlen stringként add meg, pl. 'kb. 2100 Ft'.`;

  prompt += ` Adj egy rövid, étvágygerjesztő leírást, az előkészítési és főzési időt, az adagok számát, a hozzávalók listáját pontos mennyiségekkel, és az elkészítési lépéseket. Fontos: Minden hozzávalónál add meg a mennyiséget grammban vagy darabban, ÉS egy alternatív, mérleg nélküli mértékegységben is (pl. bögre, evőkanál, teáskanál, dl, ml), ahol ez értelmezhető. Például: "250g liszt (kb. 2 bögre)". A válasz JSON formátumban legyen.`;

  try {
    // FIX: Use ai.models.generateContent with appropriate model and configuration.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: recipeSchema,
      },
    });

    // FIX: Extract text and parse it as JSON.
    const jsonText = response.text.trim();
    if (!jsonText) {
      throw new Error('Az API üres választ adott.');
    }
    const recipeData: Recipe = JSON.parse(jsonText);
    return recipeData;
  } catch (error: any) {
    console.error('Error generating recipe:', error);
    const errorMessage = (error?.message || '').toLowerCase();

    if (errorMessage.includes('quota') || errorMessage.includes('resource_exhausted') || errorMessage.includes('429')) {
      throw new Error('Elérte a napi kvótáját a receptgeneráláshoz. A ingyenes kvóta általában 24 óránként frissül. Kérjük, próbálja újra később, vagy ellenőrizze a fiókbeállításait.');
    }

    if (error instanceof SyntaxError) {
        throw new Error('Hiba történt a recept adatainak feldolgozása közben. Az AI által adott válasz hibás formátumú volt.');
    }
    
    throw new Error(
      'Nem sikerült receptet generálni. Kérjük, próbálja újra később.'
    );
  }
};

const formCommandSchema = {
  type: Type.OBJECT,
  properties: {
    action: {
      type: Type.STRING,
      enum: [
        'add_ingredients',
        'set_diet',
        'set_meal_type',
        'set_cooking_method',
        'generate_recipe',
        'unknown',
      ],
      description: 'A felhasználói parancs akciója.',
    },
    payload: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Az 'add_ingredients' akcióhoz tartozó hozzávalók listája.",
    },
    selectionPayload: {
      type: Type.OBJECT,
      properties: {
        key: {
          type: Type.STRING,
          description: "A kiválasztott opció kulcsa (pl. 'vegetarian').",
        },
        label: {
          type: Type.STRING,
          description: "A kiválasztott opció címkéje (pl. 'Vegetáriánus').",
        },
      },
      description:
        "A 'set_diet' vagy 'set_meal_type' akcióhoz tartozó kiválasztott elem.",
    },
  },
};

export const interpretFormCommand = async (
  transcript: string
): Promise<FormCommand> => {
  const dietOptionsString = DIET_OPTIONS.map(
    (o) => `'${o.label}' (${o.value})`
  ).join(', ');
  const mealTypeOptionsString = MEAL_TYPES.map(
    (o) => `'${o.label}' (${o.value})`
  ).join(', ');
  const cookingMethodOptionsString = COOKING_METHODS.map(
    (o) => `'${o.label}' (${o.value})`
  ).join(', ');

  const prompt = `Értelmezd a következő magyar nyelvű parancsot egy receptgeneráló űrlap kontextusában.
    A parancs: "${transcript}"

    A te feladatod, hogy a felhasználó által kimondott szöveget elemezd, és egy JSON objektummá alakítsd a megadott séma szerint.

    FŐ SZABÁLY: Ha a felhasználó hozzávalókat sorol fel, MINDEN EGYES hozzávalót egy különálló elemként kell betenned a 'payload' tömbbe. Ne vonj össze több hozzávalót egyetlen stringbe!

    Akciók:
    - 'add_ingredients': Akkor használd, ha a felhasználó egy vagy több hozzávalót sorol fel.
        - A 'payload' egy JSON tömb kell, hogy legyen, ami a hozzávalók listáját tartalmazza.
        - Például, ha a parancs "csirke, rizs és borsó", a helyes payload: \`["csirke", "rizs", "borsó"]\`.
        - HELYTELEN: \`["csirke"]\`
        - HELYTELEN: \`["csirke, rizs, borsó"]\`
    - 'set_diet': Diéta beállításakor. Lehetséges diéták: ${dietOptionsString}.
    - 'set_meal_type': Étkezés típusának beállításakor. Lehetséges típusok: ${mealTypeOptionsString}.
    - 'set_cooking_method': Az elkészítés módjának beállításakor (pl. "okoskuktában", "hagyományosan"). Lehetséges módok: ${cookingMethodOptionsString}.
    - 'generate_recipe': Recept generálásának kérésekor (pl. "jöhet a recept").
    - 'unknown': Ha a parancs nem illeszkedik a fentiekbe.

    További példák az 'add_ingredients' helyes használatára:
    - Parancs: "csirkemell, krumpli, hagyma" -> payload: ["csirkemell", "krumpli", "hagyma"]
    - Parancs: "kérek valamit amiben van paradicsom és paprika" -> payload: ["paradicsom", "paprika"]
    - Parancs: "sertéskaraj, mustár, méz és fokhagyma" -> payload: ["sertéskaraj", "mustár", "méz", "fokhagyma"]
    - Parancs: "liszt, cukor, tojás" -> payload: ["liszt", "cukor", "tojás"]

    A válaszod egy JSON objektum legyen a megadott séma szerint. Ha egy akcióhoz nem tartozik payload, hagyd ki vagy adj meg null értéket.
    `;

  try {
    // FIX: Use ai.models.generateContent for command interpretation.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: formCommandSchema,
      },
    });

    // FIX: Extract text, parse JSON, and construct the FormCommand object.
    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);

    let payload: string[] | SelectionResult | null = null;
    if (result.action === 'add_ingredients' && result.payload) {
      payload = result.payload;
    } else if (
      (result.action === 'set_diet' || result.action === 'set_meal_type' || result.action === 'set_cooking_method') &&
      result.selectionPayload
    ) {
      payload = result.selectionPayload;
    }

    return {
      action: (result.action as FormAction) || 'unknown',
      payload: payload,
    };
  } catch (error) {
    console.error('Error interpreting form command:', error);
    // Re-throw the error so the UI layer can handle it, e.g., by showing a notification.
    throw error;
  }
};

const commandSchema = {
    type: Type.OBJECT,
    properties: {
        command: {
            type: Type.STRING,
            enum: ['NEXT', 'STOP', 'READ_INTRO', 'READ_INGREDIENTS', 'START_COOKING', 'START_TIMER', 'UNKNOWN']
        },
        payload: {
            type: Type.OBJECT,
            properties: {
                hours: { type: Type.INTEGER, description: 'Az időzítőhöz tartozó órák száma.' },
                minutes: { type: Type.INTEGER, description: 'Az időzítőhöz tartozó percek száma.' },
                seconds: { type: Type.INTEGER, description: 'Az időzítőhöz tartozó másodpercek száma.' },
            },
            description: "A 'START_TIMER' parancshoz tartozó időtartam."
        }
    },
    required: ['command']
};

export const interpretUserCommand = async (
  transcript: string
): Promise<VoiceCommandResult> => {
  // A mapping of keywords to commands to improve accuracy and reduce LLM reliance for simple commands.
  const directCommands: { [key: string]: VoiceCommand } = {
    'következő': VoiceCommand.NEXT,
    'tovább': VoiceCommand.NEXT,
    'stop': VoiceCommand.STOP,
    'állj': VoiceCommand.STOP,
    'elég': VoiceCommand.STOP,
    'bemutatkozás': VoiceCommand.READ_INTRO,
    'recept bemutatása': VoiceCommand.READ_INTRO,
    'leírás': VoiceCommand.READ_INTRO,
    'hozzávalók': VoiceCommand.READ_INGREDIENTS,
    'összetevők': VoiceCommand.READ_INGREDIENTS,
    'főzés': VoiceCommand.START_COOKING,
    'főzés indítása': VoiceCommand.START_COOKING,
    'kezdjük': VoiceCommand.START_COOKING,
    'elkészítés': VoiceCommand.START_COOKING,
  };

  // Check for direct command matches first.
  const lowerTranscript = transcript.toLowerCase().trim();
  for (const key in directCommands) {
    if (lowerTranscript.includes(key)) {
      return { command: directCommands[key] };
    }
  }

  // If no direct match, use the LLM for more nuanced interpretation.
  const prompt = `Értelmezd a következő magyar nyelvű parancsot egy recept felolvasása közben.
    A parancs: "${transcript}"

    Azonosítsd a parancsot a következő lehetőségek közül:
    - 'NEXT': Ha a felhasználó a következő lépésre/hozzávalóra kíváncsi (pl. "következő", "tovább", "mi a következő?").
    - 'STOP': Ha a felhasználó le akarja állítani a felolvasást (pl. "állj", "stop", "elég lesz").
    - 'READ_INTRO': Ha a felhasználó a recept bemutatását kéri (pl. "olvasd fel a bemutatót", "miről szól a recept?").
    - 'READ_INGREDIENTS': Ha a felhasználó a hozzávalók listáját kéri (pl. "mik a hozzávalók?", "összetevők").
    - 'START_COOKING': Ha a felhasználó az elkészítési lépések felolvasását kéri (pl. "kezdjük a főzést", "jöhet az elkészítés").
    - 'START_TIMER': Ha a felhasználó időzítőt szeretne indítani. Bontsd le a kért időt órára, percre és másodpercre a payload-ban. Példák: "indíts egy 10 perces időzítőt" -> { command: 'START_TIMER', payload: { minutes: 10 } }, "időzítő másfél órára" -> { command: 'START_TIMER', payload: { hours: 1, minutes: 30 } }.
    - 'UNKNOWN': Ha a parancs nem illeszkedik a fentiekbe.

    A válaszod egy JSON objektum legyen, ami tartalmaz egy 'command' kulcsot a megfelelő értékkel, és szükség esetén a 'payload' kulcsot.
    `;

  try {
    // FIX: Use ai.models.generateContent for simple command classification.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: commandSchema,
        // For low-latency command interpretation, disable thinking.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    // FIX: Extract text, parse JSON, and return the identified command.
    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);

    return {
        command: (result.command as VoiceCommand) || VoiceCommand.UNKNOWN,
        payload: result.payload || undefined,
    };
  } catch (error) {
    console.error('Error interpreting user command:', error);
    // Re-throw the error so the UI layer can handle it.
    throw error;
  }
};

const appCommandSchema = {
    type: Type.OBJECT,
    properties: {
        action: {
            type: Type.STRING,
            enum: [
                'navigate', 'add_shopping_list_item', 'remove_shopping_list_item',
                'check_shopping_list_item', 'uncheck_shopping_list_item',
                'clear_checked_shopping_list', 'clear_all_shopping_list',
                'view_favorite_recipe', 'delete_favorite_recipe', 'filter_favorites',
                'clear_favorites_filter', 'expand_category', 'collapse_category', 'unknown'
            ]
        },
        payload: {
            type: Type.STRING,
            description: "Az akcióhoz tartozó adat, pl. oldal neve, tétel neve, kategória neve, recept neve."
        }
    },
    required: ['action']
};


export const interpretAppCommand = async (
  transcript: string,
  currentPage: AppView,
  context: {
    categories?: string[];
    recipesByCategory?: { [category: string]: string[] };
    shoppingListItems?: string[];
  }
): Promise<AppCommand> => {
  let prompt = `Értelmezd a következő magyar nyelvű hangparancsot egy recept alkalmazásban.
    A felhasználó által kimondott szöveg: "${transcript}"
    A felhasználó jelenleg a(z) "${currentPage}" oldalon van.

    I. Navigációs parancsok (bármelyik oldalon működnek):
    - Akció: 'navigate', payload: 'generator' | 'favorites' | 'shopping-list'
    - Kulcsszavak: "menj a ...-hoz", "mutasd a ...-t", "vissza a generátorhoz"
    - Példa: "mutasd a kedvenceimet" -> { "action": "navigate", "payload": "favorites" }

    II. Kontextus-specifikus parancsok:
    `;

  if (currentPage === 'shopping-list') {
    prompt += `
    A felhasználó a BEVÁSÁRLÓLISTA oldalon van.
    - Lehetséges tételek: ${JSON.stringify(context.shoppingListItems || [])}
    - Parancsok:
        - 'add_shopping_list_item': Tétel hozzáadása. Payload: a tétel neve (string). Kulcsszavak: "adj hozzá ...-t".
        - 'remove_shopping_list_item': Tétel törlése. Payload: a tétel neve. A legközelebbi egyezést keresd a listából. Kulcsszavak: "töröld a ...-t".
        - 'check_shopping_list_item': Tétel kipipálása. Payload: a tétel neve. Kulcsszavak: "pipáld ki a ...-t".
        - 'uncheck_shopping_list_item': Pipálás visszavonása. Payload: a tétel neve. Kulcsszavak: "vedd ki a pipát a ...-ból".
        - 'clear_checked_shopping_list': Kipipáltak törlése. Nincs payload. Kulcsszavak: "töröld a kipipáltakat".
        - 'clear_all_shopping_list': Teljes lista törlése. Nincs payload. Kulcsszavak: "töröld az egész listát".
    - Példa: "adj hozzá két liter tejet" -> { "action": "add_shopping_list_item", "payload": "két liter tej" }
    - Példa: "töröld a kenyeret" -> { "action": "remove_shopping_list_item", "payload": "kenyér" }
    `;
  }

  if (currentPage === 'favorites') {
    prompt += `
    A felhasználó a KEDVENCEK oldalon van.
    - Lehetséges kategóriák: ${JSON.stringify(context.categories || [])}
    - Lehetséges receptek (kategóriánként): ${JSON.stringify(context.recipesByCategory || {})}
    - Parancsok:
        - 'view_favorite_recipe': Recept megtekintése. Payload: a recept neve. A legközelebbi egyezést keresd a receptek közül. Kulcsszavak: "nyisd meg a ...-t", "mutasd a ...-t".
        - 'delete_favorite_recipe': Recept törlése. Payload: a recept neve. Kulcsszavak: "töröld a ... receptet".
        - 'filter_favorites': Szűrés kategóriára. Payload: a kategória neve. A legközelebbi egyezést keresd a kategóriák közül. Kulcsszavak: "szűrj a ...-ra", "mutasd csak a ...-t".
        - 'clear_favorites_filter': Szűrés törlése. Nincs payload. Kulcsszavak: "töröld a szűrést", "mutasd az összeset".
        - 'expand_category': Kategória lenyitása. Payload: a kategória neve. Kulcsszavak: "nyisd le a ...-t".
        - 'collapse_category': Kategória becsukása. Payload: a kategória neve. Kulcsszavak: "csukd be a ...-t".
    - Példa: "nyisd meg a csokitortát" -> { "action": "view_favorite_recipe", "payload": "csokitorta" }
    - Példa: "szűrj a desszertekre" -> { "action": "filter_favorites", "payload": "desszertek" }
    `;
  }

  prompt += `
    III. Általános szabályok:
    - Ha a parancs nem egyértelmű vagy nem illeszkedik a sémába, használj 'unknown' akciót.
    - A payload mindig string legyen.
    - A válaszod egyetlen JSON objektum legyen a megadott séma alapján.
    `;
    
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: appCommandSchema,
            thinkingConfig: { thinkingBudget: 0 },
        },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);

    // Find the full recipe details (name and category) for view/delete actions
    if (result.action === 'view_favorite_recipe' || result.action === 'delete_favorite_recipe') {
        const recipeNameToFind = (result.payload as string).toLowerCase();
        if (context.recipesByCategory) {
            for (const category in context.recipesByCategory) {
                const recipeName = context.recipesByCategory[category].find(r => r.toLowerCase().includes(recipeNameToFind));
                if (recipeName) {
                    return {
                        action: result.action as AppCommandAction,
                        payload: { recipeName, category }
                    };
                }
            }
        }
    }
    
    return {
        action: (result.action as AppCommandAction) || 'unknown',
        payload: result.payload || undefined,
    };
  } catch (error) {
    console.error('Error interpreting app command:', error);
    throw error;
  }
};


// FIX: The `Operation` generic type takes only one argument.
export const generateRecipeVideo = async (recipe: Recipe): Promise<Operation<GenerateVideosResponse>> => {
  const keyIngredients = recipe.ingredients.slice(0, 5).join(', ');
  const keyInstructions = recipe.instructions.slice(0, 3).map(inst => inst.substring(0, 100)).join('. ');

  const prompt = `Készíts egy rövid, dinamikus főzővideót a(z) "${recipe.recipeName}" elkészítéséről. 
  A videó stílusa legyen étvágygerjesztő, mint egy profi food blogger videója.
  - Kezdődjön a friss hozzávalók (például: ${keyIngredients}) közeli képével.
  - Mutassa be a főzési folyamat kulcsfontosságú lépéseit, például a hozzávalók összekeverését, a sütést vagy főzést. Fókuszáljon a leglátványosabb részekre, mint például: ${keyInstructions}.
  - A videó csúcspontja a gyönyörűen tálalt, kész étel legyen.
  - Használjon közeli felvételeket és lassított mozgást a drámai hatás érdekében.`;

  try {
    const operation = await ai.models.generateVideos({
      model: 'veo-2.0-generate-001',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
      },
    });
    return operation;
  } catch (error: any) {
    console.error('Error starting video generation:', error);
    let errorMessage = '';
    if (error && typeof error.message === 'string') {
        errorMessage = error.message.toLowerCase();
    }
    
    if (errorMessage.includes('quota') || errorMessage.includes('resource_exhausted')) {
      throw new Error('Elérte a videógenerálási kvótáját. Lehetséges, hogy a ingyenes keret kimerült. Kérjük, ellenőrizze a fiókbeállításait, vagy próbálja újra később.');
    }
    
    throw new Error('Nem sikerült elindítani a videó generálását.');
  }
};

// FIX: The `Operation` generic type takes only one argument.
export const getVideosOperationStatus = async (operation: Operation<GenerateVideosResponse>): Promise<Operation<GenerateVideosResponse>> => {
    try {
        const updatedOperation = await ai.operations.getVideosOperation({ operation: operation });
        return updatedOperation;
    } catch (error) {
        console.error('Error polling video generation status:', error);
        throw new Error('Hiba történt a videó állapotának lekérdezése közben.');
    }
};

/**
 * Intelligensen megtisztítja a hozzávaló stringjét, hogy csak az alapanyag nevét adja vissza.
 * Eltávolítja a mennyiségeket, mértékegységeket, zárójeles részeket és gyakori jelzőket.
 * @param ingredient A nyers hozzávaló string (pl. "250g liszt (BL55)").
 * @returns A tiszta alapanyag neve (pl. "liszt").
 */
const cleanIngredientForImagePrompt = (ingredient: string): string => {
  let cleaned = ingredient.toLowerCase().replace(/\(.*\)/g, '').trim();
  
  const patternsToRemove = [
    // Matches numbers (e.g., 2, 1.5, 1/2, 1-2) and common units
    /^\d+[\/\d\s.-]*\s*(g|dkg|kg|db|csomag|evőkanál|ek|teáskanál|tk|dl|ml|bögre|csipet|gerezd|fej|csokor|szál|levél)?\s*/,
    // Matches word-based quantities
    /^(egy|két|három|négy|öt|pár|fél)\s+/,
    // Matches common phrases
    /^(ízlés szerint|egy csipet|egy kevés)\s+/,
    // Matches common adjectives/descriptors, will be applied repeatedly
    /^(nagy|kicsi|közepes|friss|őrölt|apróra vágott|szeletelt|finomra vágott|durvára vágott|felkockázott|reszelt|forró|hideg)\s+/
  ];

  let lastCleaned = '';
  // Loop until the string stops changing to remove chained descriptors
  while (lastCleaned !== cleaned) {
    lastCleaned = cleaned;
    patternsToRemove.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '').trim();
    });
  }
  
  return cleaned;
};


export const generateRecipeImage = async (recipe: Recipe): Promise<string> => {
  const allCleanIngredients = recipe.ingredients
    .map(cleanIngredientForImagePrompt)
    .filter(Boolean)
    .join(', ');

  const prompt = `GENERÁLÁSI UTASÍTÁS ÉTELFOTÓHOZ.

TÉMA: Professzionális, rendkívül valósághű és étvágygerjesztő ételfotó a következő ételről: "${recipe.recipeName}". A leírás segít a vizuális megjelenítésben: "${recipe.description}".

SZIGORÚ TARTALMI SZABÁLYOK:
1.  ENGEDÉLYEZETT HOZZÁVALÓK: A fotón KIZÁRÓLAG az alábbi listában szereplő alapanyagokból készült étel, vagy maguk az alapanyagok szerepelhetnek. A teljes lista: ${allCleanIngredients}.
2.  TILTOTT ELEMEK: Szigorúan tilos BÁRMILYEN MÁS összetevőt hozzáadni a képhez, ami nincs a fenti listában. A cél a recepthez való 100%-os vizuális hűség. Különösen Tilos a képen megjeleníteni (hacsak nem szerepelnek a fenti listában): paradicsom, uborka, paprika, salátalevél, citromkarika, narancskarika, retek, olajbogyó, vagy bármilyen más, a recepthez nem tartozó díszítőelem.
3.  FÓKUSZ: A főétel legyen a középpontban. Ne adj hozzá felesleges köreteket, ha azok nem részei a receptnek.

VIZUÁLIS STÍLUS:
- Tálalás: Elegáns és modern.
- Háttér: Világos, letisztult, minimálisan texturált (pl. márvány, fa, vagy egyszínű felület).
- Fényképezés: Éles, részletgazdag, mintha egy profi ételfotós készítette volna egy gasztromagazinba.
- Szöveg: A képen TILOS bármilyen szöveg, felirat vagy betű.`;

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

    if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return base64ImageBytes;
    } else {
        throw new Error('Az API nem adott vissza képet.');
    }
  } catch (error: any) {
    console.error('Error generating recipe image:', error);
    const errorMessage = (error?.message || '').toLowerCase();
    if (errorMessage.includes('quota') || errorMessage.includes('resource_exhausted') || errorMessage.includes('429')) {
      throw new Error('Elérte a napi kvótáját az ételfotó generálásához. Kérjük, próbálja újra később.');
    }
    throw new Error('Nem sikerült ételfotót generálni. Kérjük, próbálja újra később.');
  }
};


const suggestionSchema = {
  type: Type.OBJECT,
  properties: {
    suggestedIngredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3-5 javasolt hozzávaló, ami jól kiegészítené a receptet.",
    },
    modificationIdeas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "2-3 kreatív ötlet a recept módosítására vagy izgalmasabbá tételére.",
    },
  },
  required: ['suggestedIngredients', 'modificationIdeas'],
};

export const getRecipeModificationSuggestions = async (
  ingredients: string,
  recipeName: string
): Promise<RecipeSuggestions> => {
  const prompt = `Adott egy(e) "${recipeName}" nevű recept, amely a következő alapanyagokból készült: ${ingredients}.
  Kérlek, adj javaslatokat a recept továbbfejlesztéséhez.
  1.  Javasolj 3-5 további, gyakori háztartási alapanyagot, ami jól illene ehhez a recepthez.
  2.  Adj 2-3 kreatív ötletet, hogyan lehetne a receptet módosítani, feldobni vagy egy másik változatát elkészíteni (pl. "próbáld ki füstölt paprikával a mélyebb ízért", vagy "csirke helyett használj pulykamellet").

  A válaszodat a megadott JSON séma szerint add meg.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: suggestionSchema,
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 256 },
      },
    });
    const jsonText = response.text.trim();
    if (!jsonText) {
      throw new Error('Az API üres választ adott a javaslatkérésre.');
    }
    const suggestions: RecipeSuggestions = JSON.parse(jsonText);
    return suggestions;
  } catch (error: any) {
    console.error('Error generating recipe suggestions:', error);
    const errorMessage = (error?.message || '').toLowerCase();
    if (errorMessage.includes('quota') || errorMessage.includes('resource_exhausted') || errorMessage.includes('429')) {
      throw new Error('Elérte a napi kvótáját a javaslatok generálásához. Kérjük, próbálja újra később.');
    }
    if (error instanceof SyntaxError) {
        throw new Error('Hiba történt a javaslatok feldolgozása közben. Az AI által adott válasz hibás formátumú volt.');
    }
    throw new Error('Nem sikerült javaslatokat generálni. Kérjük, próbálja újra később.');
  }
};
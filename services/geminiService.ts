// FIX: This file was created to implement the missing Gemini API service logic.
// FIX: Import GenerateVideosResponse and GenerateVideosMetadata to correctly type the Operation generic.
import { GoogleGenAI, Type, Operation, GenerateVideosResponse, GenerateVideosMetadata } from '@google/genai';
import { DIET_OPTIONS, MEAL_TYPES, COOKING_METHODS } from '../constants';
import {
  DietOption,
  FormAction,
  FormCommand,
  MealType,
  Recipe,
  SelectionResult,
  VoiceCommand,
  CookingMethod,
  VoiceCommandResult,
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
    prompt = `Generálj egy meglepetés ${mealTypeLabel} receptet. Válassz 3 véletlenszerű, gyakori háztartási alapanyagot, és készíts belőlük egy receptet. A recept leírásában említsd meg, hogy melyik 3 alapanyagot választottad.`;
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

  prompt += ` Adj egy rövid, étvágygerjesztő leírást, az előkészítési és főzési időt, az adagok számát, a hozzávalók listáját pontos mennyiségekkel, és az elkészítési lépéseket. A válasz JSON formátumban legyen.`;

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
  } catch (error) {
    console.error('Error generating recipe:', error);
    if (error instanceof SyntaxError) {
        throw new Error('Hiba történt a recept adatainak feldolgozása közben. Próbálkozzon újra.');
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
    return { action: 'unknown', payload: null };
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
    return { command: VoiceCommand.UNKNOWN };
  }
};


// FIX: Correctly type the Operation generic with GenerateVideosResponse and GenerateVideosMetadata.
export const generateRecipeVideo = async (recipe: Recipe): Promise<Operation<GenerateVideosResponse, GenerateVideosMetadata>> => {
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
  } catch (error) {
    console.error('Error starting video generation:', error);
    throw new Error('Nem sikerült elindítani a videó generálását.');
  }
};

// FIX: Correctly type the Operation generic with GenerateVideosResponse and GenerateVideosMetadata for both the parameter and return value.
export const getVideosOperationStatus = async (operation: Operation<GenerateVideosResponse, GenerateVideosMetadata>): Promise<Operation<GenerateVideosResponse, GenerateVideosMetadata>> => {
    try {
        const updatedOperation = await ai.operations.getVideosOperation({ operation: operation });
        return updatedOperation;
    } catch (error) {
        console.error('Error polling video generation status:', error);
        throw new Error('Hiba történt a videó állapotának lekérdezése közben.');
    }
};
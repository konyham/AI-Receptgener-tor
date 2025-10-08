

// FIX: This file was created to implement the missing Gemini API service logic.
// FIX: The `GenerateVideosMetadata` type is not exported from `@google/genai`. It has been removed.
import { GoogleGenAI, Type } from '@google/genai';
import { DIET_OPTIONS, MEAL_TYPES as defaultMealTypes, COOKING_METHODS as defaultCookingMethods, CUISINE_OPTIONS as defaultCuisineOptions, COOKING_METHOD_CAPACITIES as defaultCookingMethodCapacities } from '../constants';
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
  useSeasonalIngredients: boolean
): Promise<Recipe> => {
  const dietLabel = DIET_OPTIONS.find((d) => d.value === diet)?.label || '';
  const mealTypeLabel =
    defaultMealTypes.find((m) => m.value === mealType)?.label || mealType;
  const cuisineLabel = defaultCuisineOptions.find((c) => c.value === cuisine)?.label || cuisine;
  const cookingMethodLabels = cookingMethods
    .map(cm => defaultCookingMethods.find(c => c.value === cm)?.label || cm)
    .filter((l): l is string => !!l);

  let prompt: string;
  const specialRequestLower = specialRequest.toLowerCase().trim();
  const componentRequestKeywords = ['készítsünk', 'receptje', 'hogyan kell', 'készítése'];

  // Check if the special request is about making a component (like sausage, pasta, etc.)
  if (componentRequestKeywords.some(keyword => specialRequestLower.includes(keyword))) {
      prompt = `A felhasználó egy specifikus alapanyag elkészítésére kért receptet. A kérése: "${specialRequest}".
      Generálj egy részletes, kezdőbarát receptet PONTOSAN erre a kérésre. A recept fókuszában az alapanyag elkészítése álljon.
      - A recept neve tükrözze a kérést (pl. "Házi Füstölt Kolbász").
      - A leírás magyarázza el, miről szól a recept.
      - Add meg a hozzávalókat pontos mennyiségekkel.
      - Az elkészítési lépések legyenek részletesek, és egy objektumokból álló tömbként add meg őket, ahol minden objektum egy 'text' kulcsot tartalmaz a lépés leírásával.
      - Az adag ("servings") mezőben add meg, hogy kb. mennyi végtermék (pl. "kb. 1 kg kolbász" vagy "4 adag tészta") készül a receptből.
      - Ne vedd figyelembe az eredeti hozzávalókat (${ingredients}) vagy az étkezés típusát, mert a kérés felülírja azokat.
      - A válasz JSON formátumban legyen.`;
  } else {
    // Main recipe generation logic
    if (mode === 'leftover') {
        if (!ingredients.trim()) {
            throw new Error('A maradékokból való főzéshez kérjük, adja meg a rendelkezésre álló maradékokat.');
        }
        prompt = `Generálj egy ${mealTypeLabel} receptet a következő maradékok kreatív és biztonságos felhasználásával: **${ingredients}**. A cél egy teljesen új, ízletes étel létrehozása, nem csak a maradékok egyszerű felmelegítése. A recept pontosan ${numberOfServings} személyre szóljon.`;
        if (useSeasonalIngredients) {
            prompt += ` Egészítsd ki a receptet friss, helyi, idényjellegű (szezonális) hozzávalókkal, hogy az étel még ízletesebb és teljesebb legyen.`;
        }
        prompt += ` FONTOS: Az instrukciókban kiemelten kezeld az élelmiszerbiztonságot. Ha főtt húst vagy más kényes alapanyagot tartalmaz a lista, az instrukcióknak tartalmazniuk kell az alapos, gőzölgőre hevítésre vonatkozó utasítást (legalább 75°C belső hőmérséklet). Különböző maradékok (pl. nyers zöldség és főtt hús) kombinálásakor írd le a helyes sorrendet a keresztszennyeződés elkerülése érdekében. A recept legyen logikus és a megadott maradékokhoz illeszkedő.`;

    } else { // Standard mode
        prompt = `Generálj egy ${mealTypeLabel} receptet, ami pontosan ${numberOfServings} személyre szól.`;
        if (ingredients.trim()) {
            prompt += ` A recept a következő alapanyagokból készüljön: ${ingredients}.`;
        } else {
            prompt += ` Válassz 3 véletlenszerű, gyakori háztartási alapanyagot, és készíts belőlük egy receptet. A recept leírásában említsd meg, hogy melyik 3 alapanyagot választottad. Fontos: bár a hozzávalók meglepetések, a receptnek minden más megadott feltételnek (diéta, elkészítési mód, személyek száma, különleges kérés) szigorúan meg kell felelnie.`;
        }
        if (useSeasonalIngredients) {
            prompt += ` Különös figyelmet fordíts arra, hogy a recept lehetőség szerint friss, helyi és idényjellegű (szezonális) alapanyagokat használjon. Ha a felhasználó adott meg alapanyagokat, egészítsd ki azokat szezonális összetevőkkel, ha pedig nem, akkor a receptet szezonális alapanyagokra építsd.`;
        }
    }

    const machineMethods = cookingMethods.filter(cm => cm !== CookingMethod.TRADITIONAL);
    if (machineMethods.length > 0) {
        const capacities = machineMethods
            .map(cm => ({ name: defaultCookingMethods.find(c => c.value === cm)?.label || cm, capacity: (defaultCookingMethodCapacities as any)[cm] }))
            .filter(c => c.capacity !== null && c.capacity !== undefined);

        if (capacities.length > 0) {
            const minCapacityDevice = capacities.reduce((min, current) => (current.capacity! < min.capacity! ? current : min), capacities[0]);
            if (numberOfServings > minCapacityDevice.capacity!) {
                prompt += ` A kiválasztott elkészítési módok közül ('${minCapacityDevice.name}') maximum kapacitása kb. ${minCapacityDevice.capacity} fő. Ha a ${numberOfServings} fős adag meghaladja ezt, az instrukciókban adj egyértelmű útmutatást a több részletben való főzésre, vagy javasolj alternatívát.`;
            }
        }
    }
    
    if (excludedIngredients.trim()) {
      prompt += ` FONTOS KIKÖTÉS: A recept SOHA NE TARTALMAZZA a következőket, még nyomokban sem: ${excludedIngredients}. Vedd figyelembe az esetleges allergiákat vagy intoleranciákat (pl. ha a felhasználó a laktózt írja, akkor ne használj tejet, vajat, sajtot stb.). Ez a kizárás egy elsődleges utasítás, amit szigorúan be kell tartani, még akkor is, ha ellentmondani látszik a többi kérésnek. Konfliktus esetén (pl. kolbászkészítés kérése sertéshús kizárásával) a feladatod a kreatív megoldás: keress egy megfelelő, nem kizárt alternatívát (pl. marhakolbász, csirkekolbász). A recept semmilyen körülmények között nem tartalmazhatja a kizárt összetevőket.`;
    }
    
    prompt += ` A recept elkészítési módja legyen: ${cookingMethodLabels.join(' és ')}. Ha több gép is meg van adva, a recept logikusan használja őket (pl. az alap elkészítése az egyikben, a befejezés a másikban).`;
    if (diet !== DietOption.NONE && dietLabel) {
      prompt += ` A recept feleljen meg a következő diétás előírásnak: ${dietLabel}.`;
    }
    if (cuisine !== CuisineOption.NONE && cuisineLabel) {
        prompt += ` A recept stílusa legyen: ${cuisineLabel}.`;
    }
    if (specialRequest.trim()) {
      prompt += ` A receptnek a következő különleges kérésnek is meg kell felelnie: ${specialRequest.trim()}.`;
    }

    if (recipePace === RecipePace.QUICK) {
      prompt += ` Különös hangsúlyt fektess arra, hogy a recept a lehető leggyorsabban elkészíthető legyen (alacsony előkészítési és főzési idő).`;
    } else if (recipePace === RecipePace.SIMPLE) {
      prompt += ` A recept a lehető legkevesebb hozzávalóból álljon, és az elkészítése legyen rendkívül egyszerű.`;
    }

    if (diet === DietOption.DIABETIC) {
      prompt += ` Mivel a recept cukorbeteg diétához készül, adj meg egy becsült tápértékadatokat is 100 grammra vetítve: kalória, szénhidrát, fehérje, zsír. Továbbá, becsüld meg a recept glikémiás indexét (Alacsony, Közepes, vagy Magas). Ezenkívül adj egy rövid, hasznos tanácsot cukorbetegek számára ehhez a recepthez kapcsolódóan (pl. mire figyeljenek a köret kiválasztásánál, vagy hogyan módosíthatják az ételt).`;
    }

    if (withCost) {
      prompt += ` Végezz egy becsült költségszámítást is a recepthez magyar forintban (Ft). A számításhoz használd a következő átlagos magyarországi bolti árakat referenciaként (az árakat arányosítsd a receptben szereplő mennyiségekkel): csirkemell: 2500 Ft/kg, sertéskaraj: 2800 Ft/kg, rizs: 800 Ft/kg, krumpli: 400 Ft/kg, liszt: 300 Ft/kg, cukor: 500 Ft/kg, tojás: 80 Ft/db, tej: 450 Ft/liter, hagyma: 400 Ft/kg, fokhagyma: 200 Ft/fej, étolaj: 900 Ft/liter, vaj/margarin: 4000 Ft/kg, paradicsom: 1000 Ft/kg, paprika: 1200 Ft/kg, sajt (trappista): 3500 Ft/kg. Ha egy hozzávaló nincs a listán, használj egy reális piaci becslést. A végeredményt egyetlen stringként add meg, pl. 'kb. 2100 Ft'.`;
    }

    prompt += ` Adj egy rövid, étvágygerjesztő leírást, az előkészítési és főzési időt, az adagok számát (formátum: "${numberOfServings} személy"), a hozzávalók listáját pontos mennyiségekkel, és az elkészítési lépéseket egy objektumokból álló tömbként add meg, ahol minden objektum egy 'text' kulcsot tartalmaz a lépés leírásával. Fontos: Minden hozzávalónál add meg a mennyiséget grammban vagy darabban, ÉS egy alternatív, mérleg nélküli mértékegységben is (pl. bögre, evőkanál, teáskanál, dl, ml), ahol ez értelmezhető. Például: "250g liszt (kb. 2 bögre)". A válasz JSON formátumban legyen.`;
  }
  

  // Hiba javítása: Dinamikusan módosítjuk a sémát, hogy a modell ne adjon költségbecslést, ha nem kérték.
  // Létrehozunk egy mély másolatot a sémából, hogy ne módosítsuk az eredeti objektumot.
  const dynamicRecipeSchema = JSON.parse(JSON.stringify(recipeSchema));
  if (!withCost) {
    // Ha nincs szükség költségbecslésre, töröljük az 'estimatedCost' tulajdonságot a sémából.
    // Ez megakadályozza, hogy a modell "segítőkészen" kitöltse ezt a mezőt, ha nem kértük.
    delete dynamicRecipeSchema.properties.estimatedCost;
  }

  try {
    // FIX: Use ai.models.generateContent with appropriate model and configuration.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: dynamicRecipeSchema, // A dinamikusan módosított sémát használjuk.
      },
    });

    // FIX: Extract text and parse it as JSON.
    const jsonText = response.text.trim();
    if (!jsonText) {
      throw new Error('Az API üres választ adott.');
    }
    const recipeData: Recipe = JSON.parse(jsonText);
    recipeData.cookingMethods = cookingMethods;
    // FIX: Assign diet and mealType to the recipe data to ensure it's available for other components like RecipeDisplay.
    recipeData.diet = diet;
    recipeData.mealType = mealType;
    return recipeData;
  } catch (error: any) {
    console.error('Error generating recipe:', error);
    const errorString = JSON.stringify(error).toLowerCase();

    if (errorString.includes('quota') || errorString.includes('resource_exhausted') || errorString.includes('429')) {
      throw new Error('Elérte a napi kvótáját a receptgeneráláshoz. A ingyenes kvóta általában 24 óránként frissül. Kérjük, próbálja újra később, vagy ellenőrizze a fiókbeállításait.');
    }

    if (error instanceof SyntaxError) {
        throw new Error('Hiba történt a recept adatainak feldágozása közben. Az AI által adott válasz hibás formátumú volt.');
    }
    
    throw new Error(
      'Nem sikerült receptet generálni. Kérjük, próbálja újra később.'
    );
  }
};

export const simplifyRecipe = async (originalRecipe: Recipe): Promise<Recipe> => {
  const prompt = `Adott a következő recept: '${originalRecipe.recipeName}'. A jelenlegi hozzávalók: ${originalRecipe.ingredients.join(', ')}. A jelenlegi elkészítési lépések: "${originalRecipe.instructions.map(i => i.text).join(' ')}".

  A feladatod, hogy készíts egy egyszerűsített változatot ebből a receptből, ami kezdő szakácsok számára is könnyen követhető.
  A célok a következők:
  1.  **Hozzávalók csökkentése:** Ahol lehetséges, használj kevesebb hozzávalót. Hagyd el a nem létfontosságú elemeket, vagy helyettesíts több összetevőt egyetlen, könnyen beszerezhetővel. Az alapízek maradjanak meg.
  2.  **Lépések egyszerűsítése:** Fogalmazd újra az elkészítési lépéseket rövidebben és egyértelműbben. Vond össze a lépéseket, ahol logikus.
  3.  **Idő csökkentése:** Törekedj a rövidebb előkészítési és főzési időre.

  Az új, egyszerűsített recept neve legyen "${originalRecipe.recipeName} (Egyszerűsített változat)".
  Az adagok száma maradjon ugyanaz: ${originalRecipe.servings}.
  Az elkészítési lépéseket egy objektumokból álló tömbként add meg, ahol minden objektum egy 'text' kulcsot tartalmaz a lépés leírásával.
  A válaszod egy JSON objektum legyen a megadott séma szerint. A leírásban említsd meg, hogy ez egy egyszerűsített verzió.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: recipeSchema,
      },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
      throw new Error('Az API üres választ adott az egyszerűsítésre.');
    }
    
    const simplifiedRecipeData: Recipe = JSON.parse(jsonText);
    
    // Preserve important metadata from the original recipe
    simplifiedRecipeData.cookingMethods = originalRecipe.cookingMethods;
    simplifiedRecipeData.diet = originalRecipe.diet;
    simplifiedRecipeData.mealType = originalRecipe.mealType;
    
    return simplifiedRecipeData;
  } catch (error: any) {
    console.error('Error simplifying recipe:', error);
    const errorString = JSON.stringify(error).toLowerCase();

    if (errorString.includes('quota') || errorString.includes('resource_exhausted') || errorString.includes('429')) {
      throw new Error('Elérte a napi kvótáját a recept egyszerűsítéséhez. Kérjük, próbálja újra később.');
    }
    if (error instanceof SyntaxError) {
        throw new Error('Hiba történt az egyszerűsített recept adatainak feldágozása közben. Az AI által adott válasz hibás formátumú volt.');
    }
    throw new Error('Nem sikerült egyszerűsíteni a receptet. Kérjük, próbálja újra később.');
  }
};


// FIX: Added missing function to generate recipe modification suggestions.
export const getRecipeModificationSuggestions = async (
  ingredients: string,
  recipeName: string
): Promise<RecipeSuggestions> => {
  const prompt = `Adott egy recept "${recipeName}" névvel, ami a következő alapanyagokat használja: ${ingredients}.
  Adj javaslatokat a recept továbbfejlesztéséhez.
  1. Javasolj 3-5 további hozzávalót, amivel izgalmasabbá tehető.
  2. Adj 2-3 ötletet a recept módosítására (pl. más fűszerezés, más köret, egy extra lépés).
  A válaszod egy JSON objektum legyen a következő séma szerint:
  {
    "suggestedIngredients": ["javasolt hozzávaló 1", "javasolt hozzávaló 2"],
    "modificationIdeas": ["módosítási ötlet 1", "módosítási ötlet 2"]
  }`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      suggestedIngredients: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Javasolt további hozzávalók listája.',
      },
      modificationIdeas: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Ötletek a recept módosítására.',
      },
    },
    required: ['suggestedIngredients', 'modificationIdeas'],
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

    const jsonText = response.text.trim();
    if (!jsonText) {
        throw new Error('Az API üres választ adott a javaslatkérésre.');
    }
    return JSON.parse(jsonText);
  } catch (error: any) {
    console.error('Error generating recipe suggestions:', error);
    const errorString = JSON.stringify(error).toLowerCase();
    if (errorString.includes('quota') || errorString.includes('resource_exhausted') || errorString.includes('429')) {
      throw new Error('Elérte a napi kvótáját. Kérjük, próbálja újra később.');
    }
    throw new Error('Nem sikerült javaslatokat generálni. Próbálja újra később.');
  }
};

// Generates a simple, visual, English description of a dish for the image model.
const generateVisualPrompt = async (recipeName: string): Promise<string> => {
    try {
        const prompt = `Adj egy rövid, de étvágygerjesztő és vizuálisan részletes leírást a következő ételről, amit egy ételfotó-generátor is megértene: "${recipeName}". A leírás ANGOLUL legyen. Fókuszálj a textúrákra, a színekre és a tálalásra. Csak a leírást add vissza. Például: "Magyaros babgulyás" -> "A rich, hearty Hungarian goulash soup with tender beef and beans, in a rustic bowl, garnished with fresh parsley". Vagy "Rakott krumpli" -> "Golden-brown layered potato casserole with slices of sausage and egg, bubbling cheese on top, served in a ceramic dish".`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 0 }, // Faster response for simple task
            }
        });
        const description = response.text.trim();
        if (description) {
            return description;
        }
        // Fallback if the description is empty
        return `A dish called ${recipeName}`;
    } catch (error) {
        console.error("Error generating visual prompt, falling back:", error);
        // Fallback on API error
        return `A dish called ${recipeName}`;
    }
}

// FIX: Added missing function to generate a recipe image.
export const generateRecipeImage = async (recipe: Recipe): Promise<string> => {
    const visualDescription = await generateVisualPrompt(recipe.recipeName);
    
    const prompt = `Ultra-realistic, professional food photography of: ${visualDescription}. Shot with a DSLR camera, 8K resolution, sharp focus, high detail. The lighting should be bright and natural, creating soft shadows. The composition should be clean and aesthetically pleasing, possibly with a shallow depth of field to emphasize the main dish. Include fresh garnishes and a hint of steam if appropriate. The background should be a rustic wooden table or a clean, modern surface that complements the food.`;

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
            return response.generatedImages[0].image.imageBytes;
        } else {
            throw new Error('Az API nem adott vissza képet.');
        }
    } catch (error: any) {
        console.error('Error generating recipe image:', error);
        const errorString = JSON.stringify(error).toLowerCase();
        if (errorString.includes('quota') || errorString.includes('resource_exhausted') || errorString.includes('429')) {
            throw new Error('Elérte a képgenerálási kvótáját erre az időszakra. Kérjük, próbálja újra később, vagy generáljon képet a következő recepthez.');
        }
        throw new Error('Hiba történt az ételfotó generálása közben.');
    }
};

// Generates a simple, visual, English description for an instruction step.
const generateVisualPromptForStep = async (recipeName: string, instructionText: string): Promise<string> => {
    try {
        const prompt = `Adj egy rövid, vizuálisan leíró, akciódús mondatot a következő főzési lépésről, amit egy képalkotó AI megértene. A recept neve: "${recipeName}". A lépés: "${instructionText}". A leírás ANGOLUL legyen. Csak magát a leíró mondatot add vissza. Például: "Hagymát kockára vágjuk" -> "Close-up of hands dicing a white onion on a wooden cutting board with a sharp knife". Vagy "A csirkét aranybarnára sütjük" -> "Sizzling chicken pieces frying to a perfect golden-brown in a hot pan".`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 0 },
            }
        });
        const description = response.text.trim();
        return description || `A cooking step: ${instructionText}`;
    } catch (error) {
        console.error("Error generating visual prompt for step, falling back:", error);
        return `A cooking step for recipe ${recipeName}: ${instructionText}`;
    }
}

export const generateInstructionImage = async (recipeName: string, instructionText: string): Promise<string> => {
    const visualDescription = await generateVisualPromptForStep(recipeName, instructionText);
    
    const prompt = `Action shot, realistic photo from a cooking tutorial, showing this step: ${visualDescription}. The shot should be a close-up or a top-down view, focusing on the hands and the ingredients. Clean, modern kitchen environment with natural lighting. High detail and sharp focus to clearly illustrate the process.`;

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
            return response.generatedImages[0].image.imageBytes;
        } else {
            throw new Error('Az API nem adott vissza képet a lépéshez.');
        }
    } catch (error: any) {
        console.error('Error generating instruction image:', error);
        const errorString = JSON.stringify(error).toLowerCase();
        if (errorString.includes('quota') || errorString.includes('resource_exhausted') || errorString.includes('429')) {
            throw new Error('Elérte a képgenerálási kvótáját. Kérjük, próbálja újra később.');
        }
        throw new Error('Hiba történt a lépés fotójának generálása közben.');
    }
};

// FIX: Added missing function to calculate recipe cost on demand.
export const calculateRecipeCost = async (recipe: Recipe): Promise<string> => {
  const ingredientsList = recipe.ingredients.join(', ');
  const prompt = `Végezz egy becsült költségszámítást a következő hozzávalókból álló recepthez magyar forintban (Ft): ${ingredientsList}.
    A számításhoz használd a következő átlagos magyarországi bolti árakat referenciaként (az árakat arányosítsd a receptben szereplő mennyiségekkel): csirkemell: 2500 Ft/kg, sertéskaraj: 2800 Ft/kg, rizs: 800 Ft/kg, krumpli: 400 Ft/kg, liszt: 300 Ft/kg, cukor: 500 Ft/kg, tojás: 80 Ft/db, tej: 450 Ft/liter, hagyma: 400 Ft/kg, fokhagyma: 200 Ft/fej, étolaj: 900 Ft/liter, vaj/margarin: 4000 Ft/kg, paradicsom: 1000 Ft/kg, paprika: 1200 Ft/kg, sajt (trappista): 3500 Ft/kg. Ha egy hozzávaló nincs a listán, használj egy reális piaci becslést. A végeredményt egyetlen stringként add meg a 'cost' mezőben egy JSON objektumon belül, pl. '{"cost": "kb. 2100 Ft"}'.`;
    
  const schema = {
    type: Type.OBJECT,
    properties: {
        cost: { type: Type.STRING, description: 'A recept teljes becsült költsége forintban (Ft).' }
    },
    required: ['cost'],
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

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return result.cost;
  } catch (error: any) {
    console.error('Error calculating recipe cost:', error);
    const errorString = JSON.stringify(error).toLowerCase();
    if (errorString.includes('quota') || errorString.includes('resource_exhausted') || errorString.includes('429')) {
      throw new Error('Elérte a napi kvótáját. Kérjük, próbálja újra később.');
    }
    throw new Error('Hiba történt a költségbecslés közben.');
  }
};

export const suggestMealType = async (
  ingredients: string,
  specialRequest: string,
  mealTypes: { value: string; label: string }[]
): Promise<MealType | null> => {
  if (!ingredients.trim() && !specialRequest.trim()) {
    return null;
  }

  const mealTypeOptionsString = mealTypes.map(
    (o) => `'${o.label}' (${o.value})`
  ).join(', ');

  const prompt = `
    Elemezd a következő hozzávalókat és különleges kérést, majd javasolj egy étkezés típust.
    Hozzávalók: "${ingredients}"
    Különleges kérés: "${specialRequest}"

    A válaszod egy JSON objektum legyen, ami egy 'mealType' kulcsot tartalmaz.
    A kulcs értéke legyen az alábbiak közül a legmegfelelőbb: ${mealTypeOptionsString}.
    Például, ha a hozzávalók "tojás, szalonna", a javaslat legyen 'breakfast'. Ha "csokidarabkák, liszt, cukor", a javaslat 'dessert'.
    Ha nem lehet egyértelműen meghatározni, a 'mealType' értéke legyen null.
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      mealType: {
        oneOf: [
            { type: Type.STRING }, // Let AI return the value string
            { type: Type.NULL }
        ],
        description: "A javasolt étkezés típusa vagy null.",
      }
    },
    required: ['mealType'],
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        // Disable thinking for this simple classification task to make it faster.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return result.mealType as MealType | null;
  } catch (error) {
    console.error('Error suggesting meal type:', error);
    // Don't throw an error to the user, just fail silently for this non-critical feature.
    return null;
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
  transcript: string,
  mealTypeOptions: { value: string; label: string }[],
  cookingMethodOptions: { value: string; label: string }[],
  dietOptions: { value: DietOption; label: string; description: string }[]
): Promise<FormCommand> => {
  const dietOptionsString = dietOptions.map(
    (o) => `'${o.label}' (${o.value})`
  ).join(', ');
  const mealTypeOptionsString = mealTypeOptions.map(
    (o) => `'${o.label}' (${o.value})`
  ).join(', ');
  const cookingMethodOptionsString = cookingMethodOptions.map(
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

    // FIX: Completed the return statement to include the payload and handle unknown actions.
    return {
      action: (result.action as FormAction) || 'unknown',
      payload,
    };
  } catch (error: any) {
    console.error('Error interpreting form command:', error);
    const errorString = JSON.stringify(error).toLowerCase();
    if (errorString.includes('quota') || errorString.includes('resource_exhausted') || errorString.includes('429')) {
      throw new Error('Elérte a hangvezérlési kvótáját. Kérjük, próbálja újra később.');
    }
    if (error instanceof SyntaxError) {
        throw new Error('Hiba történt a parancs értelmezése közben. Az AI által adott válasz hibás formátumú volt.');
    }
    throw new Error('Nem sikerült a hangparancsot értelmezni.');
  }
};

// FIX: Added missing function to interpret app-wide commands.
export const interpretAppCommand = async (
  transcript: string,
  currentView: AppView,
  context: {
    categories: string[];
    recipesByCategory: { [category: string]: string[] };
    shoppingListItems: string[];
    pantryItems: string[];
  }
): Promise<AppCommand> => {
  const prompt = `
    Értelmezd a következő magyar nyelvű parancsot egy receptalkalmazás kontextusában.
    A parancs: "${transcript}"
    Jelenlegi nézet: "${currentView}"

    Elérhető kontextus:
    - Kedvenc kategóriák: ${context.categories.join(', ') || 'nincs'}
    - Kedvenc receptek (kategóriánként): ${JSON.stringify(context.recipesByCategory)}
    - Bevásárlólista elemei: ${context.shoppingListItems.join(', ') || 'üres'}
    - Kamra elemei: ${context.pantryItems.join(', ') || 'üres'}

    A feladatod, hogy a parancsot egy JSON objektummá alakítsd a megadott séma szerint.
    A 'payload' mezőt csak akkor add meg, ha releváns az akcióhoz.

    Akciók és példák:
    - 'navigate': Navigáció a megadott nézetre ('generator', 'favorites', 'shopping-list', 'pantry').
      - "menj a kamrához" -> { "action": "navigate", "payload": "pantry" }
    - 'add_shopping_list_item': Tétel(ek) hozzáadása a bevásárlólistához. A payload egy string, vesszővel elválasztva, ha több tétel van.
      - "adj hozzá tejet és kenyeret a listához" -> { "action": "add_shopping_list_item", "payload": "tej,kenyér" }
    - 'remove_shopping_list_item': Tétel eltávolítása a listáról.
    - 'check_shopping_list_item': Tétel kipipálása.
    - 'uncheck_shopping_list_item': Tétel pipájának eltávolítása.
    - 'clear_checked_shopping_list': Kipipált tételek törlése.
    - 'clear_all_shopping_list': Teljes lista törlése.
    - 'add_pantry_item': Tétel(ek) hozzáadása a kamrához. A payload egy string, vesszővel elválasztva, ha több tétel van.
      - "tegyél csirkemellet a kamrába" -> { "action": "add_pantry_item", "payload": "csirkemell" }
      - "van otthon hagyma és krumpli" -> { "action": "add_pantry_item", "payload": "hagyma,krumpli" }
    - 'remove_pantry_item': Tétel eltávolítása a kamrából.
    - 'view_favorite_recipe': Kedvenc recept megtekintése.
    - 'delete_favorite_recipe': Kedvenc recept törlése.
    - 'filter_favorites': Kedvencek szűrése kategóriára.
    - 'clear_favorites_filter': Szűrés törlése.
    - 'expand_category': Kategória lenyitása.
    - 'collapse_category': Kategória becsukása.
    - 'unknown': Ha a parancs nem értelmezhető.
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING },
      payload: {
        oneOf: [
          { type: Type.STRING },
          {
            type: Type.OBJECT,
            properties: {
              recipeName: { type: Type.STRING },
              category: { type: Type.STRING },
            },
          },
        ],
      },
    },
    required: ['action'],
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

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return {
        action: result.action as AppCommandAction,
        payload: result.payload,
    };
  } catch (error: any) {
    console.error('Error interpreting app command:', error);
    const errorString = JSON.stringify(error).toLowerCase();
    if (errorString.includes('quota') || errorString.includes('resource_exhausted') || errorString.includes('429')) {
      throw new Error('Elérte a hangvezérlési kvótáját. Kérjük, próbálja újra később.');
    }
    throw new Error('Nem sikerült az alkalmazás parancsot értelmezni.');
  }
};

// FIX: Added missing function to interpret commands within the recipe display view.
export const interpretUserCommand = async (transcript: string): Promise<VoiceCommandResult> => {
    const prompt = `
        Értelmezd a következő magyar nyelvű parancsot egy recept olvasása közben.
        A parancs: "${transcript}"

        A feladatod, hogy a parancsot egy JSON objektummá alakítsd a megadott séma szerint.
        A parancsok a következők lehetnek:
        - 'NEXT': A következő lépés vagy hozzávaló kérése. Kulcsszavak: "következő", "tovább", "mi a következő".
        - 'STOP': A felolvasás leállítása. Kulcsszavak: "állj", "stop", "elég".
        - 'READ_INTRO': A recept leírásának felolvasása. Kulcsszavak: "olvasd a leírást", "miről szól a recept".
        - 'READ_INGREDIENTS': A hozzávalók listájának felolvasása az elejétől. Kulcsszavak: "hozzávalók", "mik kellenek hozzá".
        - 'START_COOKING': Az elkészítési lépések felolvasása az elejétől. Kulcsszavak: "főzés", "kezdjük el", "start cooking".
        - 'START_TIMER': Időzítő indítása. A parancsból ki kell nyerned az óra, perc, másodperc értékeket, ha meg vannak adva.
            - "indíts egy 5 perces időzítőt" -> { "command": "START_TIMER", "payload": { "minutes": 5 } }
            - "időzítő 1 óra 30 percre" -> { "command": "START_TIMER", "payload": { "hours": 1, "minutes": 30 } }
            - Ha a parancs csak az időzítő elindítására utal időtartam nélkül (pl. "indítsd az időzítőt", "igen", "indítsd el", "start"), akkor is 'START_TIMER' commandot adj vissza, de a 'payload' mező legyen null vagy hiányozzon.
        - 'UNKNOWN': Ha a parancs nem illik a fentiekbe.

        A válaszod egy JSON objektum legyen a megadott séma szerint.
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            command: { type: Type.STRING, enum: Object.values(VoiceCommand) },
            payload: {
                type: Type.OBJECT,
                properties: {
                    hours: { type: Type.INTEGER },
                    minutes: { type: Type.INTEGER },
                    seconds: { type: Type.INTEGER },
                },
            },
        },
        required: ['command'],
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
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return result as VoiceCommandResult;
    } catch (error: any) {
        console.error('Error interpreting user command:', error);
        const errorString = JSON.stringify(error).toLowerCase();
        if (errorString.includes('quota') || errorString.includes('resource_exhausted') || errorString.includes('429')) {
      throw new Error('Elérte a hangvezérlési kvótáját. Kérjük, próbálja újra később.');
    }
        throw new Error('Nem sikerült a felhasználói parancsot értelmezni.');
    }
};
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
  MenuRecipe,
  DailyMenuRecipe,
  TRADITIONAL_COOKING_METHOD,
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

const partialRecipeSchema = {
    type: Type.OBJECT,
    properties: {
      recipeName: { type: Type.STRING, description: 'A recept neve.' },
      description: { type: Type.STRING, description: 'A recept rövid, étvágygerjesztő leírása.' },
      prepTime: { type: Type.STRING, description: 'Az előkészítési idő, pl. "15 perc".' },
      cookTime: { type: Type.STRING, description: 'A főzési/sütési idő, pl. "30 perc".' },
      servings: { type: Type.STRING, description: 'Hány személyre szól a recept, pl. "4 személy".' },
      ingredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A hozzávalók listája, pontos mennyiségekkel.' },
      instructions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: { text: { type: Type.STRING, description: 'Az elkészítési lépés leírása.' } },
          required: ['text'],
        },
        description: 'Az elkészítési lépések listája, részletesen.',
      },
    },
    // No 'required' field to allow for missing data from the source URL.
};

const menuSchema = {
  type: Type.OBJECT,
  properties: {
    menuName: { type: Type.STRING, description: 'A teljes menü fantázianeve, pl. "Vasárnapi Családi Ebéd".' },
    menuDescription: { type: Type.STRING, description: 'A menü rövid, étvágygerjesztő leírása, bemutatva, hogy az ételek hogyan harmonizálnak.' },
    appetizer: recipeSchema,
    soup: recipeSchema,
    mainCourse: recipeSchema,
    dessert: recipeSchema,
  },
  required: ['menuName', 'menuDescription', 'appetizer', 'soup', 'mainCourse', 'dessert'],
};

const dailyMenuSchema = {
  type: Type.OBJECT,
  properties: {
    menuName: { type: Type.STRING, description: 'A napi menü fantázianeve, pl. "Könnyed Hétfői Menü".' },
    menuDescription: { type: Type.STRING, description: 'A napi menü rövid, étvágygerjesztő leírása, bemutatva, hogy a reggeli, ebéd és vacsora hogyan alkot egy egészséges, kiegyensúlyozott napot.' },
    breakfast: recipeSchema,
    lunch: recipeSchema,
    dinner: recipeSchema,
  },
  required: ['menuName', 'menuDescription', 'breakfast', 'lunch', 'dinner'],
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
  customCookingMethodCapacities: Record<string, number | null>
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
      prompt = `A felhasználó egy specifikus alapanyag elkészítésére kért receptet. A kérése: "${specialRequest}". Generálj egy részletes, kezdőbarát receptet PONTOSAN erre a kérésre. A recept fókuszában az alapanyag elkészítése álljon. - A recept neve tükrözze a kérést (pl. "Házi Füstölt Kolbász"). - A leírás magyarázza el, miről szól a recept. - Add meg a hozzávalókat pontos mennyiségekkel. - Az elkészítési lépések legyenek részletesek, és egy objektumokból álló tömbként add meg őket, ahol minden objektum egy 'text' kulcsot tartalmaz a lépés leírásával. - Az adag ("servings") mezőben add meg, hogy kb. mennyi végtermék (pl. "kb. 1 kg kolbász" vagy "4 adag tészta") készül a receptből. - Ne vedd figyelembe az eredeti hozzávalókat (${ingredients}) vagy az étkezés típusát, mert a kérés felülírja azokat. - A válasz JSON formátumban legyen.`;
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

    const machineMethods = cookingMethods.filter(cm => cm !== TRADITIONAL_COOKING_METHOD);
    if (machineMethods.length > 0) {
        const capacities = machineMethods
            .map(cm => ({ name: customCookingMethods.find(c => c.value === cm)?.label || cm, capacity: customCookingMethodCapacities[cm] }))
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
    
    if (cookingMethodLabels.length > 0) {
        prompt += ` A recept elkészítési módja legyen: ${cookingMethodLabels.join(' és ')}. Ha több gép is meg van adva, a recept logikusan használja őket (pl. az alap elkészítése az egyikben, a befejezés a másikban). FONTOS: Az elkészítési lépéseknek, beleértve a gépekhez (pl. Thermomixer) tartozó specifikus utasításokat is (hőfok, sebesség, idő), KIZÁRÓLAG magyar nyelven kell lenniük. Ne használj angol kifejezéseket, mint például "Cook", "Set time", "Speed", "Reverse". A teljes válasz legyen magyar.`;
    } else {
        prompt += ` A recept elkészítési módja hagyományos legyen (tűzhelyen vagy sütőben elkészíthető). Ne javasolj speciális konyhai gépet.`;
    }
    
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
      prompt += ` Mivel a recept cukorbeteg diétához készül, adj meg egy becsült tápértékadatokat is 100 grammra vetítve: kalória, szénhidrát, fehérje, zsír. Továbbá, add meg a recept becsült glikémiás indexét (Alacsony, Közepes, vagy Magas). Végül, adj egy rövid, hasznos tanácsot cukorbetegeknek a recepthez kapcsolódóan.`;
    }

    if (withCost) {
      prompt += ` Adj egy becsült teljes költséget a recepthez forintban (Ft).`;
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
    
    // FIX: Incorrectly accessing `response.json`. The correct property is `response.text` as per Gemini API guidelines.
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
    if (e.message.toLowerCase().includes('quota')) {
        throw new Error('Elérte a napi ingyenes korlátot. Kérjük, próbálja újra később.');
    } else if (e.message.includes('JSON')) {
        throw new Error('Az AI válasza hibás formátumú volt. Próbálja újra egy kicsit más feltételekkel!');
    }
    throw new Error(`Hiba történt a recept generálása közben: ${e.message}`);
  }
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
  customCuisineOptions: OptionItem[],
  customCookingMethods: OptionItem[]
): Promise<MenuRecipe> => {
  const dietLabel = DIET_OPTIONS.find((d) => d.value === diet)?.label || '';
  const cuisineLabel = customCuisineOptions.find((c) => c.value === cuisine)?.label || cuisine;
  const cookingMethodLabels = cookingMethods
    .map(cm => customCookingMethods.find(c => c.value === cm)?.label || cm)
    .filter(Boolean);

  let prompt = `Generálj egy teljes, 4 fogásos menüt, ami pontosan ${numberOfServings} személyre szól. A menüsor részei: előétel, leves, főétel, és desszert. Az ételek harmonizáljanak egymással stílusban és ízvilágban. Adj a teljes menünek egy fantázianevet és egy rövid leírást.`;

  if (ingredients.trim()) {
    prompt += ` A menü legalább részben épüljön a következő alapanyagokra: ${ingredients}.`;
  }
  
  if (useSeasonalIngredients) {
    prompt += ` Különös figyelmet fordíts arra, hogy a receptek lehetőség szerint friss, helyi és idényjellegű (szezonális) alapanyagokat használjanak.`;
  }

  if (excludedIngredients.trim()) {
    prompt += ` FONTOS KIKÖTÉS: Egyik recept SE TARTALMAZZA a következőket: ${excludedIngredients}.`;
  }
  
  if (cookingMethodLabels.length > 0) {
    prompt += ` Az elkészítési mód legyen: ${cookingMethodLabels.join(' és ')}. FONTOS: Az elkészítési lépéseknek, beleértve a gépekhez (pl. Thermomixer) tartozó specifikus utasításokat is (hőfok, sebesség, idő), KIZÁRÓLAG magyar nyelven kell lenniük. Ne használj angol kifejezéseket, mint például "Cook", "Set time", "Speed", "Reverse". A teljes válasz legyen magyar.`;
  }
  
  if (diet !== DietOption.NONE && dietLabel) {
    prompt += ` A teljes menü feleljen meg a következő diétás előírásnak: ${dietLabel}.`;
  }
  
  if (cuisine !== CuisineOption.NONE && cuisineLabel) {
    prompt += ` A menü stílusa legyen: ${cuisineLabel}.`;
  }
  
  if (specialRequest.trim()) {
    prompt += ` A menünek a következő különleges kérésnek is meg kell felelnie: ${specialRequest.trim()}.`;
  }

  if (recipePace === RecipePace.QUICK) {
    prompt += ` Az egész menü a lehető leggyorsabban elkészíthető legyen.`;
  } else if (recipePace === RecipePace.SIMPLE) {
    prompt += ` A menü minden fogása a lehető legkevesebb hozzávalóból álljon, és az elkészítése legyen rendkívül egyszerű.`;
  }

  if (diet === DietOption.DIABETIC) {
    prompt += ` Mivel a menü cukorbeteg diétához készül, minden fogásnál add meg a becsült tápértékadatokat (kalória, szénhidrát, fehérje, zsír), a glikémiás indexet, és egy rövid tanácsot cukorbetegeknek.`;
  }

  if (withCost) {
    prompt += ` Minden fogásnál adj egy becsült teljes költséget forintban (Ft).`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: menuSchema,
      },
    });
    
    // FIX: Incorrectly accessing `response.json`. The correct property is `response.text` as per Gemini API guidelines.
    const json = JSON.parse(response.text);
    const menu = json as MenuRecipe;
    
    // Add shared metadata to each recipe in the menu
    const metadata = { diet, cuisine, cookingMethods, recipePace };
    menu.appetizer = { ...menu.appetizer, ...metadata, mealType: MealType.ELEVENSES }; // Approximate meal type
    menu.soup = { ...menu.soup, ...metadata, mealType: MealType.SOUP };
    menu.mainCourse = { ...menu.mainCourse, ...metadata, mealType: MealType.LUNCH };
    menu.dessert = { ...menu.dessert, ...metadata, mealType: MealType.DESSERT };

    return menu;

  } catch (e: any) {
    console.error('Error generating menu:', e);
    if (e.message.toLowerCase().includes('quota')) {
        throw new Error('Elérte a napi ingyenes korlátot. Kérjük, próbálja újra később.');
    } else if (e.message.includes('JSON')) {
        throw new Error('Az AI válasza hibás formátumú volt. Próbálja újra egy kicsit más feltételekkel!');
    }
    throw new Error(`Hiba történt a menü generálása közben: ${e.message}`);
  }
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
  customCuisineOptions: OptionItem[],
  customCookingMethods: OptionItem[]
): Promise<DailyMenuRecipe> => {
  const dietLabel = DIET_OPTIONS.find((d) => d.value === diet)?.label || '';
  const cuisineLabel = customCuisineOptions.find((c) => c.value === cuisine)?.label || cuisine;
  const cookingMethodLabels = cookingMethods
    .map(cm => customCookingMethods.find(c => c.value === cm)?.label || cm)
    .filter(Boolean);

  let prompt = `Generálj egy teljes, 3 fogásos napi menüt, ami pontosan ${numberOfServings} személyre szól. A menü részei: reggeli, ebéd, és vacsora. Az ételek harmonizáljanak egymással, és alkossanak egy kiegyensúlyozott, egészséges napi étrendet. Adj a teljes napi menünek egy fantázianevet és egy rövid leírást.`;

  if (ingredients.trim()) {
    prompt += ` A menü legalább részben épüljön a következő alapanyagokra: ${ingredients}.`;
  }
  
  if (useSeasonalIngredients) {
    prompt += ` Különös figyelmet fordíts arra, hogy a receptek lehetőség szerint friss, helyi és idényjellegű (szezonális) alapanyagokat használjanak.`;
  }

  if (excludedIngredients.trim()) {
    prompt += ` FONTOS KIKÖTÉS: Egyik recept SE TARTALMAZZA a következőket: ${excludedIngredients}.`;
  }
  
  if (cookingMethodLabels.length > 0) {
    prompt += ` Az elkészítési mód legyen: ${cookingMethodLabels.join(' és ')}. FONTOS: Az elkészítési lépéseknek, beleértve a gépekhez (pl. Thermomixer) tartozó specifikus utasításokat is (hőfok, sebesség, idő), KIZÁRÓLAG magyar nyelven kell lenniük.`;
  }
  
  if (diet !== DietOption.NONE && dietLabel) {
    prompt += ` A teljes napi menü feleljen meg a következő diétás előírásnak: ${dietLabel}.`;
  }
  
  if (cuisine !== CuisineOption.NONE && cuisineLabel) {
    prompt += ` A menü stílusa legyen: ${cuisineLabel}.`;
  }
  
  if (specialRequest.trim()) {
    prompt += ` A menünek a következő különleges kérésnek is meg kell felelnie: ${specialRequest.trim()}.`;
  }

  if (recipePace === RecipePace.QUICK) {
    prompt += ` Az egész menü a lehető leggyorsabban elkészíthető legyen.`;
  } else if (recipePace === RecipePace.SIMPLE) {
    prompt += ` A menü minden fogása a lehető legkevesebb hozzávalóból álljon, és az elkészítése legyen rendkívül egyszerű.`;
  }

  if (diet === DietOption.DIABETIC) {
    prompt += ` Mivel a menü cukorbeteg diétához készül, minden fogásnál add meg a becsült tápértékadatokat (kalória, szénhidrát, fehérje, zsír), a glikémiás indexet, és egy rövid tanácsot cukorbetegeknek.`;
  }

  if (withCost) {
    prompt += ` Minden fogásnál adj egy becsült teljes költséget forintban (Ft).`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: dailyMenuSchema,
      },
    });
    
    // FIX: Incorrectly accessing `response.json`. The correct property is `response.text` as per Gemini API guidelines.
    const json = JSON.parse(response.text);
    const menu = json as DailyMenuRecipe;
    
    // Add shared metadata to each recipe in the menu
    const metadata = { diet, cuisine, cookingMethods, recipePace };
    menu.breakfast = { ...menu.breakfast, ...metadata, mealType: MealType.BREAKFAST };
    menu.lunch = { ...menu.lunch, ...metadata, mealType: MealType.LUNCH };
    menu.dinner = { ...menu.dinner, ...metadata, mealType: MealType.DINNER };

    return menu;

  } catch (e: any) {
    console.error('Error generating daily menu:', e);
    if (e.message.toLowerCase().includes('quota')) {
        throw new Error('Elérte a napi ingyenes korlátot. Kérjük, próbálja újra később.');
    } else if (e.message.includes('JSON')) {
        throw new Error('Az AI válasza hibás formátumú volt. Próbálja újra egy kicsit más feltételekkel!');
    }
    throw new Error(`Hiba történt a napi menü generálása közben: ${e.message}`);
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
        
        // FIX: Incorrectly accessing `response.json`. The correct property is `response.text` as per Gemini API guidelines.
        const json = JSON.parse(response.text);
        
        // Ensure the response matches the expected structure
        if (json.categorizedIngredients && Array.isArray(json.categorizedIngredients)) {
            // FIX: Explicitly cast the parsed JSON to ensure type safety in consuming components.
            return json.categorizedIngredients as CategorizedIngredient[];
        } else {
            console.error("AI response for categorization is malformed:", json);
            throw new Error("Az AI válasza nem a várt formátumban érkezett.");
        }

    } catch (e: any) {
        console.error('Error categorizing ingredients:', e);
        if (e.message.toLowerCase().includes('quota')) {
            throw new Error('Elérte a napi ingyenes korlátot. Kérjük, próbálja újra később.');
        }
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
    // FIX: Incorrectly accessing `response.json`. The correct property is `response.text` as per Gemini API guidelines.
    return JSON.parse(response.text) as RecipeSuggestions;
  } catch (e: any) {
    console.error('Error getting recipe modification suggestions:', e);
    if (e.message.toLowerCase().includes('quota')) {
        throw new Error('Elérte a napi ingyenes korlátot. Kérjük, próbálja újra később.');
    }
    throw new Error('Hiba történt a javaslatok generálása közben.');
  }
};

export const interpretAppCommand = async (transcript: string, view: AppView, context: any): Promise<AppCommand> => {
  const prompt = `Értelmezd a következő parancsot egy receptalkalmazás kontextusában: "${transcript}".
  Az egyszerű navigációs és görgetési parancsokat már egy másik rendszer feldgozta; a te feladatod az ennél összetettebb, adat-alapú parancsok értelmezése.
  A jelenlegi nézet: "${view}".
  Elérhető kategóriák a kedvencekben: ${context.categories.join(', ')}.
  Bevásárlólista elemei: ${context.shoppingListItems.join(', ')}.
  Kamra elemei: ${context.pantryItems.join(', ')}.

  A lehetséges műveletek (action): 'add_shopping_list_item', 'remove_shopping_list_item', 'check_shopping_list_item', 'uncheck_shopping_list_item', 'clear_checked_shopping_list', 'clear_all_shopping_list', 'add_pantry_item', 'remove_pantry_item', 'view_favorite_recipe', 'delete_favorite_recipe', 'filter_favorites', 'clear_favorites_filter', 'expand_category', 'collapse_category', 'unknown'.
  A válaszod egy JSON objektum legyen "action" és "payload" kulcsokkal. A payload a parancs tárgya (pl. a hozzáadandó tétel neve).
  Példák:
  - "adj tejet a bevásárlólistához" -> action: 'add_shopping_list_item', payload: 'tej'
  - "pipáld ki a kenyeret" -> action: 'check_shopping_list_item', payload: 'kenyér'
  - "mutasd a rántott hús receptjét" -> action: 'view_favorite_recipe', payload: 'rántott hús'
  `;

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
    // FIX: Incorrectly accessing `response.json`. The correct property is `response.text` as per Gemini API guidelines.
    return JSON.parse(response.text) as AppCommand;
  } catch (e: any) {
    console.error('Error interpreting app command:', e);
    if (e.message && e.message.toLowerCase().includes('quota')) {
        throw new Error('Elérte a napi ingyenes korlátot. Kérjük, próbálja újra később.');
    }
    throw new Error(`Hiba történt a parancs értelmezése közben: ${e.message}`);
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
      config: {
        responseMimeType: 'application/json'
      }
    });
    
    // FIX: Incorrectly accessing `response.json`. The correct property is `response.text` as per Gemini API guidelines.
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
    if (e.message.toLowerCase().includes('quota')) {
        throw new Error('Elérte a napi ingyenes korlátot. Kérjük, próbálja újra később.');
    }
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
        // FIX: Incorrectly accessing `response.json`. The correct property is `response.text` as per Gemini API guidelines.
        return (response.text ?? '').trim();
    } catch (e: any) {
        console.error('Error suggesting meal type:', e);
        if (e.message.toLowerCase().includes('quota')) {
            throw new Error('Elérte a napi ingyenes korlátot. Kérjük, próbálja újra később.');
        }
        return '';
    }
};

export const interpretUserCommand = async (transcript: string): Promise<VoiceCommandResult> => {
  const prompt = `Értelmezd a következő magyar nyelvű hangparancsot egy recept olvasása közben: "${transcript}".
  Lehetséges parancsok (command): 'NEXT', 'PREVIOUS', 'REPEAT', 'STOP', 'READ_INTRO', 'READ_INGREDIENTS', 'START_COOKING', 'START_TIMER', 'UNKNOWN'.

  A parancsok értelmezése (szinonimák):
  - 'NEXT': "következő", "tovább", "menjünk tovább", "lapozz", "lapozzunk tovább", "mutasd a következőt"
  - 'PREVIOUS': "előző", "vissza", "menjünk vissza", "lapozz vissza", "mutasd az előzőt"
  - 'REPEAT': "ismételd", "olvasd újra", "mondd újra", "mi volt ez?"
  - 'STOP': "állj", "leállítás", "bezárás", "elég", "vissza a főmenübe"
  - 'READ_INTRO': "olvasd a bevezetőt", "mi ez a recept", "mutasd be a receptet"
  - 'READ_INGREDIENTS': "olvasd a hozzávalókat", "mik a hozzávalók", "hozzávalók listája"
  - 'START_COOKING': "főzés indítása", "főzés mód", "indítsd a főzést", "kezdjük a főzést"
  - 'START_TIMER': Ha a parancs időzítő indítására vonatkozik (pl. "indíts egy 5 perces időzítőt"), a payload objektumban add vissza az órákat, perceket, másodperceket.
  - 'UNKNOWN': Ha a parancs nem felel meg a fentieknek.

  A válaszod egy JSON objektum legyen { "command": "...", "payload": { "hours": ..., "minutes": ..., "seconds": ... } } formában. A payload csak a 'START_TIMER' parancs esetén szükséges.`;

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
    // FIX: Incorrectly accessing `response.json`. The correct property is `response.text` as per Gemini API guidelines.
    return JSON.parse(response.text) as VoiceCommandResult;
  } catch (e: any) {
    console.error('Error interpreting user command:', e);
    if (e.message.toLowerCase().includes('quota')) {
        throw new Error('Elérte a napi ingyenes korlátot. Kérjük, próbálja újra később.');
    }
    throw new Error('Hiba történt a hangparancs értelmezése közben.');
  }
};

export const analyzeInstructionForTimer = async (instructionText: string): Promise<{ hours?: number; minutes?: number; seconds?: number } | null> => {
  if (!instructionText || instructionText.trim() === '') return null;

  const prompt = `Elemezd a következő magyar nyelvű főzési utasítást, és nyerd ki belőle az időtartamot: "${instructionText}".
  A válaszod egy JSON objektum legyen, ami 'hours', 'minutes', és 'seconds' kulcsokat tartalmazhat.
  Példák:
  - "Főzzük 15 percig." -> {"minutes": 15}
  - "Süssük egy órán át." -> {"hours": 1}
  - "Pihentessük 30 másodpercig." -> {"seconds": 30}
  - "Forraljuk fel a vizet." -> null
  - "Süssük 1 óra 20 percig." -> {"hours": 1, "minutes": 20}
  Ha nincs konkrét időtartam az utasításban, a válaszod legyen 'null'. Csak a JSON objektumot vagy a 'null' szót add vissza.`;
  
  const schema = {
    type: Type.OBJECT,
    properties: {
      hours: { type: Type.NUMBER, description: "Az órák száma." },
      minutes: { type: Type.NUMBER, description: "A percek száma." },
      seconds: { type: Type.NUMBER, description: "A másodpercek száma." },
    },
    nullable: true,
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

    // FIX: Incorrectly accessing `response.json`. The correct property is `response.text` as per Gemini API guidelines.
    const jsonText = response.text.trim();
    if (jsonText.toLowerCase() === 'null') {
      return null;
    }
    
    const result = JSON.parse(jsonText);
    if (!result || (result.hours === undefined && result.minutes === undefined && result.seconds === undefined)) {
        return null;
    }
    return result;

  } catch (e: any) {
    console.error('Error analyzing instruction for timer:', e);
    if (e.message.toLowerCase().includes('quota')) {
        // Don't throw, just return null and log.
        console.warn('Quota limit reached while analyzing timer instruction.');
    }
    return null;
  }
};

export const generateRecipeImage = async (recipe: Recipe, cookingMethodLabels: string[]): Promise<string> => {
  // A felhasználó panaszkodott, hogy a képek irrelevánsak. A promptot megerősítettük, hogy több kontextust adjon az ételről.
  const prompt = `Tárgy: Ételfotó generálása.
Stílus: Professzionális ételfotó, fotórealisztikus, makró, éttermi minőségű tálalás, egyszerű, letisztult, elmosódott háttér.
Étel neve: "${recipe.recipeName}"
Étel leírása: "${recipe.description}"
Főbb hozzávalók: "${recipe.ingredients.slice(0, 5).join(', ')}"
Utasítás: Generálj egy képet, ami PONTOSAN a fent leírt ételt ábrázolja. Az étel legyen a kép egyetlen és központi témája. A tálalás legyen gusztusos, mintha egy szakácskönyvben szerepelne.
SZIGORÚAN TILOS: A képen nem lehet semmilyen szöveg, betű, logó, ember, kéz, állat vagy az ételhez nem kapcsolódó tárgy. A kép kizárólag az ételt mutassa be egy egyszerű tányéron.`;
  
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
    if (e && e.message && (e.message.includes('429') || e.message.toLowerCase().includes('quota'))) {
        throw new Error('Elérte a percenkénti kép-generálási korlátot. Kérjük, várjon egy percet, majd próbálja újra.');
    }
    const errorMessage = e?.error?.message || e.message || 'Ismeretlen hiba.';
    throw new Error(`Hiba történt az ételfotó generálása közben: ${errorMessage}`);
  }
};

export const calculateRecipeCost = async (recipe: Recipe): Promise<string> => {
  const prompt = `Becsüld meg magyar forintban (Ft), mennyibe kerül elkészíteni ezt a receptet a következő hozzávalókból: ${recipe.ingredients.join(', ')}. A válasz csak a becsült összeget tartalmazza, pl. "kb. 2500 Ft".`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    // FIX: Incorrectly accessing `response.json`. The correct property is `response.text` as per Gemini API guidelines.
    return response.text.trim();
  } catch (e: any) {
    console.error('Error calculating recipe cost:', e);
    if (e.message.toLowerCase().includes('quota')) {
        throw new Error('Elérte a napi ingyenes korlátot. Kérjük, próbálja újra később.');
    }
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
    // FIX: Incorrectly accessing `response.json`. The correct property is `response.text` as per Gemini API guidelines.
    const simplified = JSON.parse(response.text);
    return {
      ...recipe, // Keep original meta-data
      ...simplified, // Overwrite with simplified data
    };
  } catch (e: any) {
    console.error('Error simplifying recipe:', e);
    if (e.message.toLowerCase().includes('quota')) {
        throw new Error('Elérte a napi ingyenes korlátot. Kérjük, próbálja újra később.');
    }
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
    // FIX: Incorrectly accessing `response.json`. The correct property is `response.text` as per Gemini API guidelines.
    const json = JSON.parse(response.text);
    return json as { suggestions: AlternativeRecipeSuggestion[] };
  } catch (e: any) {
    console.error('Error generating alternative recipe suggestions:', e);
    if (e.message.toLowerCase().includes('quota')) {
        throw new Error('Elérte a napi ingyenes korlátot. Kérjük, próbálja újra később.');
    }
    throw new Error('Hiba történt a receptjavaslatok generálása közben.');
  }
};

export const generateRecipeVariations = async (
  originalRecipe: Recipe,
  availableCookingMethods: OptionItem[],
  customCuisineOptions: OptionItem[],
  customMealTypes: OptionItem[],
  customCookingMethodCapacities: Record<string, number | null>
): Promise<Recipe[]> => {
  // 1. Get suggestions
  const { suggestions } = await generateAlternativeRecipeSuggestions(originalRecipe, availableCookingMethods);

  if (!suggestions || suggestions.length === 0) {
    throw new Error('Nem sikerült alternatívákat generálni. Próbálja meg később.');
  }

  // 2. Create a generation promise for each suggestion
  const generationPromises = suggestions.map(suggestion => {
    const newParams = suggestion.newParameters;
    
    // Construct params for generateRecipe
    const params = {
      ingredients: newParams.ingredients || originalRecipe.ingredients.join(', '),
      excludedIngredients: '', // Keep this simple for variations
      diet: originalRecipe.diet,
      mealType: originalRecipe.mealType,
      cuisine: originalRecipe.cuisine,
      cookingMethods: newParams.cookingMethods || originalRecipe.cookingMethods,
      specialRequest: newParams.specialRequest || `Készíts egy változatot a(z) "${originalRecipe.recipeName}" receptre, ami a következő leírásnak felel meg: ${suggestion.description}`,
      withCost: !!originalRecipe.estimatedCost,
      numberOfServings: parseInt(originalRecipe.servings, 10) || 2,
      recipePace: originalRecipe.recipePace,
      mode: 'standard' as const,
      useSeasonalIngredients: true, // A good default for variations
      // These are needed by generateRecipe
      customMealTypes,
      customCuisineOptions,
      customCookingMethods: availableCookingMethods,
      customCookingMethodCapacities,
    };

    // Return the promise from generateRecipe
    return generateRecipe(
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
      params.useSeasonalIngredients,
      params.customMealTypes,
      params.customCuisineOptions,
      params.customCookingMethods,
      params.customCookingMethodCapacities,
    );
  });

  // 3. Await all promises
  const generatedRecipes = await Promise.all(generationPromises);

  return generatedRecipes;
};


export const generateAppGuide = async (): Promise<string> => {
  const prompt = `Generálj egy részletes, mégis könnyen érthető felhasználói útmutatót magyar nyelven az **"AI receptgenerátor - Konyha Miki módra"** nevű alkalmazáshoz. Amikor az alkalmazás nevére hivatkozol, mindig ezt a formát használd, és tedd idézőjelbe vagy emeld ki. A kimenet legyen HTML formátumú, egyszerű tagekkel. A HTML tagekhez használj Tailwind CSS osztályokat a stílusozáshoz, hogy az esztétikus és olvasható legyen. Például:
<h2 class="text-2xl font-bold text-primary-800 mt-6 mb-3">Fejléc</h2>
<p class="text-gray-700 mb-4">Ez egy paragrafus.</p>
<ul class="list-disc list-inside space-y-2 pl-4"><li>Ez egy lista elem.</li></ul>

Ne használj <head>, <body> vagy <html> tageket, csak a tartalmi részt.

Az útmutatónak az alábbi funkciókat kell bemutatnia, az aktuális verzió alapján:

1.  **Fő nézetek (Navigációs sáv):**
    *   **Receptgenerátor:** Az alkalmazás fő funkciója. Magyarázd el, hogy a felhasználó megadhat alapanyagokat (vagy hagyhatja üresen meglepetés recepthez), kizárhat alapanyagokat, választhat diétát, étkezés típusát, konyhát, recept jellegét (gyors, egyszerű), és elkészítési módot. Emelj ki olyan speciális funkciókat, mint a maradékfelhasználás mód, szezonális alapanyagok használata, és a felhasználói profilok (preferenciák, allergiák) automatikus figyelembevétele.
    *   **Mentett Receptek:** Itt tárolhatók a kedvenc receptek kategóriákba rendezve. Említsd meg a szűrési és rendezési lehetőségeket (kategória, név, dátum, értékelés, felhasználói kedvencek alapján), a menük kezelését és a receptek szerkesztését.
    *   **Kamra:** A felhasználók itt tarthatják nyilván az otthoni készleteiket, több helyszínen is (Tiszadada, Vásárosnamény). Magyarázd el a tételek hozzáadását, szerkesztését, törlését, és az alapanyagok áthelyezését a bevásárlólistáról a kamrába, vagy kamrák között. Említsd meg a "Főzés a kamrából" funkciót.
    *   **Bevásárlólista:** Egy egyszerű lista a beszerzendő dolgokról. Említsd meg a tételek hozzáadását, kipipálását, törlését és az AI-alapú kategorizálást.
    *   **Felhasználók:** Profilok létrehozása a családtagoknak, ahol rögzíthetők a kedvelt és nem kedvelt alapanyagok, valamint az allergiák.

2.  **Fontosabb funkciók:**
    *   **Adatkezelés:** A "Mentés Fájlba" és "Betöltés Fájlból" funkciók, amelyekkel a felhasználók biztonsági mentést készíthetnek minden adatukról (receptek, listák, profilok).
    *   **Recept Importálás:** Mutasd be, hogy a felhasználók beolvashatnak recepteket külső forrásokból. Ez magában foglalja a receptek importálását weboldal linkjéről (URL), vagy képfájloból. A kép lehet egy elmentett fotó, vagy egy frissen, a telefon kamerájával készített kép egy szakácskönyvről, újságról, vagy akár a nagymama kézzel írt receptfüzetéről. Az AI megpróbálja kinyerni az adatokat és kitölteni a receptgenerátor űrlapot.
    *   **Hangvezérlés:** Magyarázd el röviden, hogy a főbb navigációs és űrlapkitöltési műveletek hanggal is vezérelhetők.
    *   **Kép- és Menügenerálás:** Említsd meg, hogy az AI képes ételfotókat generálni a receptekhez, sőt, komplett 4 fogásos (előétel, leves, főétel, desszert) vagy napi menüket (reggeli, ebéd, vacsora) is tud készíteni. Az elkészítési lépésekhez már nem generál képet a rendszer.
    *   **Recept Variációk:** Mutasd be, hogy egy elkészült receptnél a "Variációk" gombra kattintva az AI nem csak ötleteket ad, hanem legenerálja a teljes recept-alternatívákat. Ezeket egy új, füles felületen lehet kényelmesen összehasonlítani az eredetivel, és lehetőség van az összes vagy csak a kiválasztott variációk elmentésére.
    *   **Testreszabás:** A felhasználók szerkeszthetik az étkezés típusok, konyhák és elkészítési módok listáját az "Opciók szerkesztése" gombbal.

A leírás legyen barátságos és segítőkész. A cél, hogy egy új felhasználó is megértse az alkalmazás teljes működését.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    // FIX: Incorrectly accessing `response.json`. The correct property is `response.text` as per Gemini API guidelines.
    return response.text;
  } catch (e: any) {
    console.error('Error generating app guide:', e);
    if (e.message.toLowerCase().includes('quota')) {
        throw new Error('Elérte a napi ingyenes korlátot. Kérjük, próbálja újra később.');
    }
    throw new Error(`Hiba történt az útmutató generálása közben: ${e.message}`);
  }
};

export const parseRecipeFromUrl = async (url: string): Promise<Partial<Recipe>> => {
    const prompt = `Viselkedj recept-értelmezőként. Elemezd a weboldal tartalmát a következő URL-en, és nyerd ki a receptinformációkat: ${url}.

    A következő adatokat add vissza egy strukturált JSON formátumban. Ha egy adott információt nem találsz, hagyd ki a kulcsot, vagy adj neki üres értéket.

    - recipeName: Az étel neve.
    - description: Rövid leírás a receptről.
    - prepTime: Előkészítési idő.
    - cookTime: Főzési idő.
    - servings: Adagok száma.
    - ingredients: Stringek tömbje, ahol minden elem egy hozzávaló a mennyiségével együtt.
    - instructions: Objektumok tömbje, ahol minden objektumnak van egy 'text' tulajdonsága az utasítási lépéshez.

    A kimenet szigorúan tartsa be a megadott JSON sémát. Csak a JSON objektumot add vissza, mindenféle magyarázat vagy extra szöveg nélkül.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: partialRecipeSchema,
            },
        });

        // FIX: Incorrectly accessing `response.json`. The correct property is `response.text` as per Gemini API guidelines.
        const json = JSON.parse(response.text);
        return json as Partial<Recipe>;

    } catch (e: any) {
        console.error('Error parsing recipe from URL:', e);
        if (e.message.toLowerCase().includes('quota')) {
            throw new Error('Elérte a napi ingyenes korlátot. Kérjük, próbálja újra később.');
        } else if (e.message.includes('JSON')) {
            throw new Error('Az AI válasza hibás formátumú volt a weboldal elemzése során. Lehet, hogy a linkelt oldal nem tartalmaz receptet.');
        }
        throw new Error(`Hiba történt a recept URL-ből való beolvasása közben: ${e.message}`);
    }
};

export const parseRecipeFromFile = async (fileData: {inlineData: { data: string, mimeType: string }}): Promise<Partial<Recipe>> => {
    const prompt = `Viselkedj recept-értelmezőként. Elemezd a feltöltött fájl (kép vagy PDF) tartalmát, ami egy receptet tartalmaz (lehet kézzel írott vagy nyomtatott), és nyerd ki a receptinformációkat.

    A következő adatokat add vissza egy strukturált JSON formátumban. Ha egy adott információt nem találsz, hagyd ki a kulcsot, vagy adj neki üres értéket.

    - recipeName: Az étel neve.
    - description: Rövid leírás a receptről.
    - prepTime: Előkészítési idő.
    - cookTime: Főzési idő.
    - servings: Adagok száma.
    - ingredients: Stringek tömbje, ahol minden elem egy hozzávaló a mennyiségével együtt.
    - instructions: Objektumok tömbje, ahol minden objektumnak van egy 'text' tulajdonsága az utasítási lépéshez.

    A kimenet szigorúan tartsa be a megadott JSON sémát. Csak a JSON objektumot add vissza, mindenféle magyarázat vagy extra szöveg nélkül.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    fileData,
                    { text: prompt },
                ],
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: partialRecipeSchema,
            },
        });

        // FIX: Incorrectly accessing `response.json`. The correct property is `response.text` as per Gemini API guidelines.
        const json = JSON.parse(response.text);
        return json as Partial<Recipe>;

    } catch (e: any) {
        console.error('Error parsing recipe from file:', e);
        if (e.message.toLowerCase().includes('quota')) {
            throw new Error('Elérte a napi ingyenes korlátot. Kérjük, próbálja újra később.');
        } else if (e.message.includes('JSON')) {
            throw new Error('Az AI válasza hibás formátumú volt a fájl elemzése során. Lehet, hogy a fájl nem volt felismerhető recept.');
        }
        throw new Error(`Hiba történt a recept fájlból való beolvasása közben: ${e.message}`);
    }
};
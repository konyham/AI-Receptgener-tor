
// FIX: This file has been cleaned up to only contain constant definitions, importing its types from the now-correct `types.ts` file.
import { DietOption, MealType, TRADITIONAL_COOKING_METHOD, CuisineOption, RecipePace } from './types';

export const APP_VERSION = '1.24.0';

export const LOADING_TIPS = [
  'Tudta? A tompa kés balesetveszélyesebb, mint az éles. Tartsa késeit mindig élesen!',
  'Tipp: A zöldségeket mindig folyó víz alatt mossa, ne áztassa őket, hogy megőrizzék vitamintartalmukat.',
  'Tárolás: A főtt rizst vagy tésztát hűtse le gyorsan és tárolja hűtőben, legfeljebb 2 napig.',
  'Konyhatechnika: A húst sütés előtt mindig törölje szárazra a tökéletes, ropós kéregért.',
  'Ne zsúfolja túl a serpenyőt! A hozzávalóknak legyen helyük pirulni, ne csak párolódni.',
  'A fűszereket sötét, hűvös helyen tárolja, hogy megőrizzék aromájukat.',
  'A maradékokat légmentesen záródó edényben tegye a hűtőbe, miután szobahőmérsékletűre hűltek.',
  'Sütésnél a hozzávalók legyenek szobahőmérsékletűek a jobb állag érdekében (kivéve, ha a recept mást ír).',
  'A fokhagymát nyomja át, vagy vágja apróra 10 perccel a felhasználás előtt, hogy aktiválódjon az allicin.',
  'A tésztát mindig bő, lobogó, sós vízben főzze a legjobb eredményért.',
  'Ha bort használ a főzéshez, olyat válasszon, amit szívesen meg is inna.',
  'A salátaöntetet csak közvetlenül tálalás előtt adja a salátához, hogy a levelek ropósak maradjanak.',
];

export const ALL_LOCAL_COMMAND_EXAMPLES = [
  // Navigáció
  'Menj a kedvencekhez',
  'Nyisd meg a kamrát',
  'Irány a bevásárlólista',
  // Görgetés
  'Görgess lejjebb',
  'Lapozz feljebb',
  // Bevásárlólista
  'Töröld a kipipáltakat',
  'Töröld az egész listát',
  // Recept generálás
  'Jöhet a recept!',
  'Készítsd el a receptet',
  // Recept nézet
  'Következő lépés',
  'Előző lépés',
  'Ismételd',
  'Olvasd a hozzávalókat',
  'Főzés indítása',
  'Állj',
  // Időzítő
  'Indíts egy 5 perces időzítőt',
  'Állíts be 30 másodperces időzítőt'
];


export const MEAL_TYPES_STORAGE_KEY = 'ai-recipe-generator-meal-types';
export const CUISINE_OPTIONS_STORAGE_KEY = 'ai-recipe-generator-cuisine-options';
export const COOKING_METHODS_STORAGE_KEY = 'ai-recipe-generator-cooking-methods';
export const COOKING_METHOD_CAPACITIES_STORAGE_KEY = 'ai-recipe-generator-cooking-method-capacities';
export const MEAL_TYPES_ORDER_KEY = 'ai-recipe-generator-meal-types-order';
export const COOKING_METHODS_ORDER_KEY = 'ai-recipe-generator-cooking-methods-order';
export const CUISINE_OPTIONS_ORDER_KEY = 'ai-recipe-generator-cuisine-options-order';

export const DIET_OPTIONS: { value: DietOption; label: string; description: string }[] = [
  { value: DietOption.NONE, label: 'Nincs megadva', description: 'Nem követ semmilyen speciális étrendet.' },
  { value: DietOption.DIABETIC, label: 'Cukorbeteg', description: 'Célja a vércukorszint stabilizálása, alacsony glikémiás indexű, lassan felszívódó szénhidrátokat részesít előnyben.' },
  { value: DietOption.VEGETARIAN, label: 'Vegetáriánus', description: 'Húsmentes étrend, de jellemzően tartalmaz tejtermékeket és tojást.' },
  { value: DietOption.VEGAN, label: 'Vegán', description: 'Minden állati eredetű terméket (hús, tej, tojás, méz) mellőző étrend.' },
  { value: DietOption.GLUTEN_FREE, label: 'Gluténmentes', description: 'A glutént tartalmazó gabonaféléket (búza, árpa, rozs) és az ezekből készült termékeket kerüli.' },
  { value: DietOption.KETOGENIC, label: 'Ketogén', description: 'Nagyon alacsony szénhidrát-, magas zsír- és mérsékelt fehérjetartalmú diéta, melynek célja a test ketózis állapotba hozása.' },
  { value: DietOption.PALEO, label: 'Paleo', description: 'A feldgozott élelmiszereket, gabonaféléket, hüvelyeseket és tejtermékeket kerüli, a hangsúly a húson, zöldségeken, gyümölcsökön van.' },
  { value: DietOption.ZONE, label: 'Zóna', description: 'A makrotápanyagok (szénhidrát, fehérje, zsír) meghatározott arányára (40-30-30) fókuszál minden étkezésnél.' },
  { value: DietOption.CANDIDA, label: 'Candida', description: 'Célja a candida gomba elszaporodásának visszaszorítása a cukor, élesztő, finomított szénhidrátok és bizonyos tejtermékek kerülésével.' },
  { value: DietOption.MACROBIOTIC, label: 'Makrobiotikus', description: 'A jin és jang elvén alapuló, főként teljes kiőrlésű gabonákra, zöldségekre és hüvelyesekre épülő, feldolgozott élelmiszereket kerülő étrend.' },
];

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: MealType.MENU, label: 'Teljes Menü (Előétel, Leves, Főétel, Desszert)' },
  { value: MealType.DAILY_MENU, label: 'Napi menü (Reggeli, Ebéd, Vacsora)' },
  { value: MealType.BREAKFAST, label: 'Reggeli' },
  { value: MealType.ELEVENSES, label: 'Tízórai' },
  { value: MealType.LUNCH, label: 'Ebéd' },
  { value: MealType.AFTERNOON_SNACK, label: 'Uzsonna' },
  { value: MealType.DINNER, label: 'Vacsora' },
  { value: MealType.SOUP, label: 'Leves' },
  { value: MealType.DESSERT, label: 'Desszert' },
  { value: MealType.SNACK, label: 'Nassolnivaló' },
  { value: MealType.PASTA_MAKING, label: 'Tésztakészítés' },
];

export const CUISINE_OPTIONS: { value: CuisineOption; label: string }[] = [
  { value: CuisineOption.NONE, label: 'Nincs megadva' },
  { value: CuisineOption.HUNGARIAN, label: 'Magyaros' },
  { value: CuisineOption.ERDELYI, label: 'Erdélyi' },
  { value: CuisineOption.ITALIAN, label: 'Olasz' },
  { value: CuisineOption.FRENCH, label: 'Francia' },
  { value: CuisineOption.SPANISH, label: 'Spanyol' },
  { value: CuisineOption.GREEK, label: 'Görög' },
  { value: CuisineOption.BULGARIAN, label: 'Bolgár' },
  { value: CuisineOption.TURKISH, label: 'Török' },
  { value: CuisineOption.CHINESE, label: 'Kínai' },
  { value: CuisineOption.JAPANESE, label: 'Japán' },
  { value: CuisineOption.THAI, label: 'Thai' },
  { value: CuisineOption.VIETNAMESE, label: 'Vietnámi' },
  { value: CuisineOption.INDIAN, label: 'Indiai' },
  { value: CuisineOption.MEXICAN, label: 'Mexikói' },
  { value: CuisineOption.AMERICAN, label: 'Amerikai' },
];

export const COOKING_METHODS: { value: string; label: string }[] = [
  { value: TRADITIONAL_COOKING_METHOD, label: 'Hagyományos' },
  { value: 'air-fryer', label: 'Forrólevegős fritőz' },
  { value: 'slow-cooker', label: 'Lassú főző (Slow cooker)' },
  { value: 'pressure-cooker', label: 'Kukta (Pressure cooker)' },
  { value: 'baking', label: 'Sütőben sütés' },
  { value: 'grilling', label: 'Grillezés' },
  { value: 'steaming', label: 'Párolás' },
  { value: 'frying', label: 'Serpenyőben sütés' },
];

export const COOKING_METHOD_CAPACITIES: Record<string, number | null> = {
  [TRADITIONAL_COOKING_METHOD]: null, // Nincs gyakorlati korlát
  'air-fryer': 4,
  'slow-cooker': 8,
  'pressure-cooker': 6,
  'baking': null,
  'grilling': null,
  'steaming': null,
  'frying': null,
};

export const RECIPE_PACE_OPTIONS: { value: RecipePace; label: string; description: string }[] = [
  { value: RecipePace.NORMAL, label: 'Normál', description: 'Kiegyensúlyozott recept, nincsenek különleges korlátozások.' },
  { value: RecipePace.QUICK, label: 'Gyors', description: 'A lehető legrövidebb előkészítési és főzési időre optimalizálva.' },
  { value: RecipePace.SIMPLE, label: 'Egyszerű', description: 'Kevés hozzávalót és egyszerű lépéseket igénylő recept.' },
];

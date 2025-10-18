// FIX: This file has been cleaned up to only contain constant definitions, importing its types from the now-correct `types.ts` file. This resolves circular dependencies.
import { DietOption, MealType, CookingMethod, CuisineOption, RecipePace } from './types';

export const APP_VERSION = '1.4.27';

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
  { value: DietOption.PALEO, label: 'Paleo', description: 'A feldolgozott élelmiszereket, gabonaféléket, hüvelyeseket és tejtermékeket kerüli, a hangsúly a húson, zöldségeken, gyümölcsökön van.' },
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

export const COOKING_METHODS: { value: CookingMethod; label: string }[] = [
  { value: CookingMethod.TRADITIONAL, label: 'Hagyományos' },
];

export const COOKING_METHOD_CAPACITIES: Record<string, number | null> = {
  [CookingMethod.TRADITIONAL]: null, // Nincs gyakorlati korlát
};

export const RECIPE_PACE_OPTIONS: { value: RecipePace; label: string; description: string }[] = [
  { value: RecipePace.NORMAL, label: 'Normál', description: 'Kiegyensúlyozott recept, nincsenek különleges korlátozások.' },
  { value: RecipePace.QUICK, label: 'Gyors', description: 'A lehető legrövidebb előkészítési és főzési időre optimalizálva.' },
  { value: RecipePace.SIMPLE, label: 'Egyszerű', description: 'Kevés hozzávalót és egyszerű lépéseket igénylő recept.' },
];



import { DietOption, MealType, CookingMethod, CuisineOption, RecipePace } from './types';

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
  { value: CookingMethod.SMART_COOKER, label: 'Westinghouse WKCPPC100 okoskukta (angolmenüs)' },
  { value: CookingMethod.THERMOMIXER, label: 'Monsieur Cuisine Connect termomixer' },
  { value: CookingMethod.THERMOMIXER_PLUS, label: 'Monsieur Cuisine Plus termomixer' },
  { value: CookingMethod.CUCKOO_RICE_COOKER, label: 'CUCKOO CRP-M1001SK okos rizsfőző (kínai menüs)' },
  { value: CookingMethod.CROCK_POT_SLOW_COOKER, label: 'CROCK-POT SCCPRC507B-60 lassúfőző' },
  { value: CookingMethod.UNOLD_ICE_CREAM_MAKER, label: 'Unold 48808 fagylaltgép (német menüs)' },
  { value: CookingMethod.REDMOND_SMART_COOKER, label: 'REDMOND RMC-M70 okosfőző (orosz menüs)' },
];

export const COOKING_METHOD_CAPACITIES: Record<CookingMethod, number | null> = {
  [CookingMethod.TRADITIONAL]: null, // Nincs gyakorlati korlát
  [CookingMethod.SMART_COOKER]: 8,
  [CookingMethod.THERMOMIXER]: 6,
  [CookingMethod.THERMOMIXER_PLUS]: 6,
  [CookingMethod.CUCKOO_RICE_COOKER]: 6,
  [CookingMethod.CROCK_POT_SLOW_COOKER]: 6,
  [CookingMethod.UNOLD_ICE_CREAM_MAKER]: 8,
  [CookingMethod.REDMOND_SMART_COOKER]: 10,
};

export const RECIPE_PACE_OPTIONS: { value: RecipePace; label: string; description: string }[] = [
  { value: RecipePace.NORMAL, label: 'Normál', description: 'Kiegyensúlyozott recept, nincsenek különleges korlátozások.' },
  { value: RecipePace.QUICK, label: 'Gyors', description: 'A lehető legrövidebb előkészítési és főzési időre optimalizálva.' },
  { value: RecipePace.SIMPLE, label: 'Egyszerű', description: 'Kevés hozzávalót és egyszerű lépéseket igénylő recept.' },
];


import { DietOption, MealType, CookingMethod } from './types';

export const DIET_OPTIONS: { value: DietOption; label: string }[] = [
  { value: DietOption.NONE, label: 'Nincs megadva' },
  { value: DietOption.DIABETIC, label: 'Cukorbeteg diéta' },
  { value: DietOption.VEGETARIAN, label: 'Vegetáriánus' },
  { value: DietOption.VEGAN, label: 'Vegán' },
  { value: DietOption.GLUTEN_FREE, label: 'Gluténmentes' },
  { value: DietOption.KETOGENIC, label: 'Ketogén' },
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

export const COOKING_METHODS: { value: CookingMethod; label: string }[] = [
  { value: CookingMethod.TRADITIONAL, label: 'Hagyományos' },
  { value: CookingMethod.SMART_COOKER, label: 'Okoskukta' },
  { value: CookingMethod.THERMOMIXER, label: 'Monsieur Cuisine Connect termomixer' },
  { value: CookingMethod.CUCKOO_RICE_COOKER, label: 'CUCKOO CRP-M1001SK okos rizsfőző (kínai menüs)' },
  { value: CookingMethod.REDMOND_SMART_COOKER, label: 'REDMOND RMC-M70 okosfőző (orosz menüs)' },
  { value: CookingMethod.CROCK_POT_SLOW_COOKER, label: 'CROCK-POT SCCPRC507B-60 lassúfőző' },
];

export const COOKING_METHOD_CAPACITIES: Record<CookingMethod, number | null> = {
  [CookingMethod.TRADITIONAL]: null, // Nincs gyakorlati korlát
  [CookingMethod.SMART_COOKER]: 8,
  [CookingMethod.THERMOMIXER]: 6,
  [CookingMethod.CUCKOO_RICE_COOKER]: 6,
  [CookingMethod.REDMOND_SMART_COOKER]: 8,
  [CookingMethod.CROCK_POT_SLOW_COOKER]: 6,
};

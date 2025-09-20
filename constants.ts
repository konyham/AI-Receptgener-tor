
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
];

export const COOKING_METHODS: { value: CookingMethod; label: string }[] = [
  { value: CookingMethod.TRADITIONAL, label: 'Hagyományos' },
  { value: CookingMethod.SMART_COOKER, label: 'Okoskukta' },
];
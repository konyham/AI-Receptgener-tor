export interface Recipe {
  recipeName: string;
  description: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: string[];
  instructions: string[];
  calories?: string;
  carbohydrates?: string;
  protein?: string;
  fat?: string;
  glycemicIndex?: string;
  diabeticAdvice?: string;
  imageUrl?: string;
}

export enum DietOption {
  NONE = 'none',
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  GLUTEN_FREE = 'gluten-free',
  DIABETIC = 'diabetic',
  KETOGENIC = 'ketogenic',
}

export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  DESSERT = 'dessert',
  SNACK = 'snack',
  ELEVENSES = 'elevenses',
  AFTERNOON_SNACK = 'afternoon_snack',
  SOUP = 'soup',
}

export enum CookingMethod {
  TRADITIONAL = 'traditional',
  SMART_COOKER = 'smart_cooker',
  THERMOMIXER = 'thermomixer',
}

export enum VoiceCommand {
    NEXT = 'NEXT',
    STOP = 'STOP',
    READ_INTRO = 'READ_INTRO',
    READ_INGREDIENTS = 'READ_INGREDIENTS',
    START_COOKING = 'START_COOKING',
    START_TIMER = 'START_TIMER',
    UNKNOWN = 'UNKNOWN',
}

export interface VoiceCommandResult {
    command: VoiceCommand;
    payload?: {
        hours?: number;
        minutes?: number;
        seconds?: number;
    };
}

export interface SelectionResult {
  key: string;
  label: string;
}

export type FormAction = 'add_ingredients' | 'set_diet' | 'set_meal_type' | 'set_cooking_method' | 'generate_recipe' | 'unknown';

export interface FormCommand {
    action: FormAction;
    payload: string[] | SelectionResult | null;
}

// Centralized SpeechRecognition types to be used across the application.
export interface SpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: { new(): SpeechRecognition };
    webkitSpeechRecognition: { new(): SpeechRecognition };
  }
}

export type Favorites = Record<string, Recipe[]>;

export interface RecipeSuggestions {
  suggestedIngredients: string[];
  modificationIdeas: string[];
}

export interface ShoppingListItem {
  text: string;
  checked: boolean;
}

// New types for app-wide voice control
export type AppView = 'generator' | 'favorites' | 'shopping-list';

export type AppCommandAction =
  | 'navigate'
  | 'add_shopping_list_item'
  | 'remove_shopping_list_item'
  | 'check_shopping_list_item'
  | 'uncheck_shopping_list_item'
  | 'clear_checked_shopping_list'
  | 'clear_all_shopping_list'
  | 'view_favorite_recipe'
  | 'delete_favorite_recipe'
  | 'filter_favorites'
  | 'clear_favorites_filter'
  | 'expand_category'
  | 'collapse_category'
  | 'unknown';

export interface AppCommand {
    action: AppCommandAction;
    payload?: string | { recipeName: string; category: string };
}

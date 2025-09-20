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
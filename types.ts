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
  estimatedCost?: string;
  cookingMethods?: CookingMethod[];
  // FIX: Add optional 'diet' and 'mealType' to the Recipe interface to resolve errors in RecipeDisplay.tsx.
  diet?: DietOption;
  mealType?: MealType;
  dateAdded?: string; // Hozzáadva a dátum alapú rendezéshez
}

export enum DietOption {
  NONE = 'none',
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  GLUTEN_FREE = 'gluten-free',
  DIABETIC = 'diabetic',
  KETOGENIC = 'ketogenic',
  PALEO = 'paleo',
  ZONE = 'zone',
  CANDIDA = 'candida',
  MACROBIOTIC = 'macrobiotic',
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
  PASTA_MAKING = 'pasta_making',
}

export enum CuisineOption {
  NONE = 'none',
  HUNGARIAN = 'hungarian',
  ITALIAN = 'italian',
  FRENCH = 'french',
  SPANISH = 'spanish',
  GREEK = 'greek',
  BULGARIAN = 'bulgarian',
  TURKISH = 'turkish',
  CHINESE = 'chinese',
  JAPANESE = 'japanese',
  THAI = 'thai',
  VIETNAMESE = 'vietnamese',
  INDIAN = 'indian',
  MEXICAN = 'mexican',
  AMERICAN = 'american',
  ERDELYI = 'erdelyi',
}

export enum CookingMethod {
  TRADITIONAL = 'traditional',
  SMART_COOKER = 'smart_cooker',
  THERMOMIXER = 'thermomixer',
  THERMOMIXER_PLUS = 'thermomixer_plus',
  CUCKOO_RICE_COOKER = 'cuckoo_rice_cooker',
  CROCK_POT_SLOW_COOKER = 'crock_pot_slow_cooker',
  UNOLD_ICE_CREAM_MAKER = 'unold_ice_cream_maker',
  REDMOND_SMART_COOKER = 'redmond_smart_cooker',
}

export enum RecipePace {
  NORMAL = 'normal',
  QUICK = 'quick',
  SIMPLE = 'simple',
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
    // FIX: Add `showSaveFilePicker` to the global Window type to resolve errors in FavoritesView.tsx and ShoppingListView.tsx.
    // This browser API is not in the default TS DOM library.
    showSaveFilePicker?(options?: any): Promise<any>;
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

// Új enum a kedvencek rendezési opcióihoz
export enum SortOption {
  DATE_DESC = 'date_desc',
  DATE_ASC = 'date_asc',
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
}

// Interface for data backup/restore functionality
export interface BackupData {
  favorites: Favorites;
  shoppingList: ShoppingListItem[];
}

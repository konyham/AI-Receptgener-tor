// FIX: This file has been completely rewritten to define all necessary types, enums, and interfaces for the application. This resolves numerous circular dependency and missing type errors across the project.
declare global {
  interface Window {
    showSaveFilePicker(options?: any): Promise<any>;
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    html2pdf: any;
  }
}

export enum DietOption {
  NONE = 'none',
  DIABETIC = 'diabetic',
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  GLUTEN_FREE = 'gluten-free',
  KETOGENIC = 'ketogenic',
  PALEO = 'paleo',
  ZONE = 'zone',
  CANDIDA = 'candida',
  MACROBIOTIC = 'macrobiotic',
}

export enum MealType {
  MENU = 'menu',
  DAILY_MENU = 'daily-menu',
  BREAKFAST = 'breakfast',
  ELEVENSES = 'elevenses',
  LUNCH = 'lunch',
  AFTERNOON_SNACK = 'afternoon-snack',
  DINNER = 'dinner',
  SOUP = 'soup',
  DESSERT = 'dessert',
  SNACK = 'snack',
  PASTA_MAKING = 'pasta-making',
}

export enum CuisineOption {
    NONE = 'none',
    HUNGARIAN = 'hungarian',
    ERDELYI = 'erdelyi',
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
}

export type CookingMethod = string;
export const TRADITIONAL_COOKING_METHOD: CookingMethod = 'traditional';

export enum RecipePace {
  NORMAL = 'normal',
  QUICK = 'quick',
  SIMPLE = 'simple',
}

export interface InstructionStep {
  text: string;
  imageUrl?: string;
}

export interface Recipe {
  recipeName: string;
  description: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: string[];
  instructions: InstructionStep[];
  calories?: string;
  carbohydrates?: string;
  protein?: string;
  fat?: string;
  glycemicIndex?: string;
  diabeticAdvice?: string;
  estimatedCost?: string;
  imageUrl?: string;
  dateAdded?: string;
  rating?: number;
  favoritedBy?: string[];
  menuName?: string;
  menuCourse?: 'appetizer' | 'soup' | 'mainCourse' | 'dessert' | 'breakfast' | 'lunch' | 'dinner';
  
  diet: DietOption;
  mealType: MealType;
  cuisine: CuisineOption;
  cookingMethods: CookingMethod[];
  recipePace: RecipePace;
}

export interface MenuRecipe {
  menuName: string;
  menuDescription: string;
  appetizer: Recipe;
  soup: Recipe;
  mainCourse: Recipe;
  dessert: Recipe;
}

export interface DailyMenuRecipe {
  menuName: string;
  menuDescription: string;
  breakfast: Recipe;
  lunch: Recipe;
  dinner: Recipe;
}

export type Favorites = Record<string, Recipe[]>;

export interface RecipeSuggestions {
  suggestedIngredients: string[];
  modificationIdeas: string[];
}

export type AppView = 'generator' | 'favorites' | 'shopping-list' | 'pantry' | 'users';

export enum SortOption {
  DATE_DESC = 'date_desc',
  DATE_ASC = 'date_asc',
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  RATING_DESC = 'rating_desc',
  RATING_ASC = 'rating_asc',
}

export interface OptionItem {
  value: string;
  label: string;
}

export interface ShoppingListItem {
  text: string;
  checked: boolean;
}

export enum StorageType {
  PANTRY = 'pantry',
  REFRIGERATOR = 'refrigerator',
  FREEZER = 'freezer',
}

export interface PantryItem {
  text: string;
  quantity?: string;
  dateAdded: string | null;
  storageType: StorageType;
}

export const PANTRY_LOCATIONS = ['Tiszadada', 'Vásárosnamény'] as const;
export type PantryLocation = typeof PANTRY_LOCATIONS[number];


export interface UserProfile {
  id: string;
  name: string;
  likes: string;
  dislikes: string;
  allergies: string;
}

export interface BackupData {
  favorites: Favorites;
  shoppingList: ShoppingListItem[];
  pantry: Record<PantryLocation, PantryItem[]>;
  users: UserProfile[];
  images: Record<string, string>;
  mealTypes: OptionItem[];
  cuisineOptions: OptionItem[];
  cookingMethods: OptionItem[];
  cookingMethodCapacities: Record<string, number | null>;
  mealTypesOrder: string[];
  cuisineOptionsOrder: string[];
  cookingMethodsOrder: string[];
}

export type FormAction = 'add_ingredients' | 'set_diet' | 'set_meal_type' | 'set_cooking_method' | 'generate_recipe' | 'unknown';

export interface SelectionResult {
  key: string;
  label: string;
}

export interface FormCommand {
  action: FormAction;
  payload: string[] | SelectionResult | null;
}

export enum VoiceCommand {
  NEXT = 'NEXT',
  PREVIOUS = 'PREVIOUS',
  REPEAT = 'REPEAT',
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

export type AppCommandAction =
  | 'navigate'
  | 'add_shopping_list_item'
  | 'remove_shopping_list_item'
  | 'check_shopping_list_item'
  | 'uncheck_shopping_list_item'
  | 'clear_checked_shopping_list'
  | 'clear_all_shopping_list'
  | 'add_pantry_item'
  | 'remove_pantry_item'
  | 'view_favorite_recipe'
  | 'delete_favorite_recipe'
  | 'filter_favorites'
  | 'clear_favorites_filter'
  | 'expand_category'
  | 'collapse_category'
  | 'scroll_up'
  | 'scroll_down'
  | 'unknown';

export interface AppCommand {
  action: AppCommandAction;
  payload: any;
}

export interface CategorizedIngredient {
  ingredient: string;
  category: string;
}

export interface AlternativeRecipeSuggestion {
  recipeName: string;
  description: string;
  newParameters: {
    ingredients?: string;
    cookingMethods?: CookingMethod[];
    specialRequest?: string;
  };
}

export interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: () => void;
  onend: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  // FIX: Added the 'abort' method to the SpeechRecognition interface to match the Web Speech API and resolve a type error in the useSpeechRecognition hook.
  abort(): void;
}
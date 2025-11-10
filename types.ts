// types.ts

export interface Recipe {
  recipeName: string;
  description: string;
  ingredients: string[];
  instructions: InstructionStep[];
  prepTime: string;
  cookTime: string;
  servings: string;
  estimatedCost?: string;
  imageUrl?: string; // Can be data URL or indexeddb: link
  calories?: string;
  carbohydrates?: string;
  protein?: string;
  fat?: string;
  glycemicIndex?: string;
  diabeticAdvice?: string;
  dateAdded?: string;
  rating?: number; // 1-5
  favoritedBy?: string[]; // Array of user IDs
  mealType: MealType;
  cuisine: CuisineOption;
  diet: DietOption;
  cookingMethods: CookingMethod[];
  recipePace: RecipePace;
  // For menus
  menuName?: string;
  menuCourse?: 'appetizer' | 'soup' | 'mainCourse' | 'dessert' | 'breakfast' | 'lunch' | 'dinner';
}

export interface InstructionStep {
  text: string;
  imageUrl?: string;
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

export interface Favorites {
  [category: string]: Recipe[];
}

export interface RecipeSuggestions {
  suggestedIngredients: string[];
  modificationIdeas: string[];
}

export interface AlternativeRecipeSuggestion {
  reason: string;
  recipe: Recipe;
}

export type AppView = 'generator' | 'favorites' | 'shopping-list' | 'pantry' | 'users';

export enum SortOption {
  DATE_DESC = 'date-desc',
  DATE_ASC = 'date-asc',
  NAME_ASC = 'name-asc',
  NAME_DESC = 'name-desc',
  RATING_DESC = 'rating-desc',
  RATING_ASC = 'rating-asc',
}

export interface ShoppingListItem {
  text: string;
  checked: boolean;
}

export enum StorageType {
  PANTRY = 'pantry',
  REFRIGERATOR = 'refrigerator',
  FREEZER = 'freezer'
}

export interface PantryItem {
  text: string;
  dateAdded: string | null;
  storageType: StorageType;
}

export const PANTRY_LOCATIONS = ['Tiszadada', 'Vásárosnamény'] as const;
export type PantryLocation = typeof PANTRY_LOCATIONS[number];


export interface BackupData {
  favorites: Favorites;
  shoppingList: ShoppingListItem[];
  pantry: Record<PantryLocation, PantryItem[]>;
  users: UserProfile[];
  images: Record<string, string>; // id -> dataURL
  mealTypes?: OptionItem[];
  cuisineOptions?: OptionItem[];
  cookingMethods?: OptionItem[];
  cookingMethodCapacities?: Record<string, number | null>;
  mealTypesOrder?: string[];
  cuisineOptionsOrder?: string[];
  cookingMethodsOrder?: string[];
  appGuideContent?: string;
  appGuideVersion?: string;
}

export interface UserProfile {
    id: string;
    name: string;
    likes: string;
    dislikes: string;
    allergies: string;
}

export interface OptionItem {
    value: string;
    label: string;
}

export type AppCommandAction = 
  | 'navigate' 
  | 'scroll_down' 
  | 'scroll_up'
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
    payload: any;
}

export interface SelectionResult {
  key: string;
  label: string;
}

export interface FormCommand {
  action: 'add_ingredients' | 'set_diet' | 'set_meal_type' | 'set_cooking_method' | 'generate_recipe';
  payload: any;
}

export enum VoiceCommand {
  NEXT = 'next',
  PREVIOUS = 'previous',
  REPEAT = 'repeat',
  STOP = 'stop',
  READ_INTRO = 'read-intro',
  READ_INGREDIENTS = 'read-ingredients',
  START_COOKING = 'start-cooking',
  START_TIMER = 'start-timer',
  UNKNOWN = 'unknown',
}

export interface VoiceCommandResult {
  command: VoiceCommand;
  payload?: any;
}

export interface CategorizedIngredient {
  ingredient: string;
  category: string;
}

// For useSpeechRecognition hook
export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onstart: () => void;
  onend: () => void;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}
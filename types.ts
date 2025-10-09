// For extending the Window object for browser APIs
declare global {
  interface Window {
    // FIX: Correctly typed SpeechRecognition as a constructable type.
    SpeechRecognition: { new (): SpeechRecognition };
    // FIX: Correctly typed webkitSpeechRecognition as a constructable type.
    webkitSpeechRecognition: { new (): SpeechRecognition };
    showSaveFilePicker: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  }

  // Types for File System Access API (for showSaveFilePicker)
  interface SaveFilePickerOptions {
    suggestedName?: string;
    types?: {
      description: string;
      accept: { [mimeType: string]: string[] };
    }[];
  }

  interface FileSystemFileHandle {
    createWritable(): Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: Blob | string): Promise<void>;
    close(): Promise<void>;
  }
}

// Interfaces for Speech Recognition API
export interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

export interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
  // Based on MDN, the error property is part of the event, not a separate type
  error?: 'no-speech' | 'aborted' | 'audio-capture' | 'network' | 'not-allowed' | 'service-not-allowed' | 'bad-grammar' | 'language-not-supported';
}

export interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionEvent) => void;
  onstart: () => void;
  onend: () => void;
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

export enum CookingMethod {
  TRADITIONAL = 'traditional',
  SMART_COOKER = 'smart-cooker',
  THERMOMIXER = 'thermomixer',
  THERMOMIXER_PLUS = 'thermomixer-plus',
  CUCKOO_RICE_COOKER = 'cuckoo-rice-cooker',
  CROCK_POT_SLOW_COOKER = 'crock-pot-slow-cooker',
  UNOLD_ICE_CREAM_MAKER = 'unold-ice-cream-maker',
  REDMOND_SMART_COOKER = 'redmond-smart-cooker',
  GARDEN_GRILL = 'garden-grill',
  BOGRACS = 'bogracs',
}

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
  cookingMethods: CookingMethod[];
  diet: DietOption;
  mealType: MealType;
  cuisine: CuisineOption;
  recipePace: RecipePace;
  favoritedBy?: string[];
}

export interface RecipeSuggestions {
  suggestedIngredients: string[];
  modificationIdeas: string[];
}

export type FormAction =
  | 'add_ingredients'
  | 'set_diet'
  | 'set_meal_type'
  | 'set_cooking_method'
  | 'generate_recipe'
  | 'unknown';

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
  } | null;
}

export type AppView = 'generator' | 'favorites' | 'shopping-list' | 'pantry' | 'users';

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
    | 'unknown';

export interface AppCommand {
    action: AppCommandAction;
    payload?: any;
}

export type Favorites = Record<string, Recipe[]>;

export enum SortOption {
    DATE_DESC = 'date_desc',
    DATE_ASC = 'date_asc',
    NAME_ASC = 'name_asc',
    NAME_DESC = 'name_desc',
    RATING_DESC = 'rating_desc',
    RATING_ASC = 'rating_asc',
}

export interface ShoppingListItem {
  text: string;
  checked: boolean;
}

export const PANTRY_LOCATIONS = ['Tiszadada', 'Vásárosnamény'] as const;
export type PantryLocation = typeof PANTRY_LOCATIONS[number];

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

export interface BackupData {
  favorites?: Favorites;
  shoppingList?: ShoppingListItem[];
  pantry?: Record<PantryLocation, PantryItem[]>;
  users?: UserProfile[];
  images?: Record<string, string>;
  mealTypes?: OptionItem[];
  cuisineOptions?: OptionItem[];
  cookingMethods?: OptionItem[];
  cookingMethodCapacities?: Record<string, number | null>;
  mealTypesOrder?: string[];
  cuisineOptionsOrder?: string[];
  cookingMethodsOrder?: string[];
}

export interface CategorizedIngredient {
  ingredient: string;
  category: string;
}
import type { Recipe, Favorites } from '../types';

const FAVORITES_KEY = 'ai-recipe-generator-favorites';

export const getFavorites = (): Favorites => {
  try {
    const favoritesJson = localStorage.getItem(FAVORITES_KEY);
    return favoritesJson ? JSON.parse(favoritesJson) : {};
  } catch (error) {
    console.error("Error reading favorites from localStorage", error);
    return {};
  }
};

export const saveFavorites = (favorites: Favorites): void => {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error("Error saving favorites to localStorage", error);
  }
};

export const addRecipeToFavorites = (recipe: Recipe, category: string): Favorites => {
  const favorites = getFavorites();
  if (!favorites[category]) {
    favorites[category] = [];
  }
  // Avoid duplicates within the same category
  if (!favorites[category].some(r => r.recipeName === recipe.recipeName)) {
    favorites[category].push(recipe);
    saveFavorites(favorites);
  }
  return favorites;
};

export const removeRecipeFromFavorites = (recipeName: string, category: string): Favorites => {
  const favorites = getFavorites();
  if (favorites[category]) {
    favorites[category] = favorites[category].filter(r => r.recipeName !== recipeName);
    if (favorites[category].length === 0) {
      delete favorites[category];
    }
    saveFavorites(favorites);
  }
  return favorites;
};

export const removeCategory = (category: string): Favorites => {
  const favorites = getFavorites();
  if (favorites[category]) {
    delete favorites[category];
    saveFavorites(favorites);
  }
  return favorites;
};
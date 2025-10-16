import React from 'react';
import { Recipe } from '../types';
import { konyhaMikiLogo } from '../assets';

interface SharedRecipeViewerProps {
  recipe: Recipe;
}

const SharedRecipeViewer: React.FC<SharedRecipeViewerProps> = ({ recipe }) => {
  return (
    <div className="min-h-screen bg-primary-50 font-sans p-4 sm:p-6 md:p-8">
      <main className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-2xl">
        <header className="text-center border-b-2 border-primary-100 pb-6 mb-6">
          <img src={konyhaMikiLogo} alt="Konyha Miki Logó" className="h-16 mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl font-bold text-primary-800 break-words">{recipe.recipeName}</h1>
          <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">{recipe.description}</p>
        </header>

        {recipe.imageUrl && (
            <img 
                src={recipe.imageUrl} 
                alt={`Fotó a receptről: ${recipe.recipeName}`} 
                className="w-full max-w-lg mx-auto aspect-[4/3] object-cover rounded-lg shadow-lg my-8" 
            />
        )}

        <div className="my-8 grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-primary-50 p-3 rounded-lg">
                <p className="text-sm text-primary-700 font-semibold">Előkészítés</p>
                <p className="text-lg font-bold text-primary-900">{recipe.prepTime}</p>
            </div>
            <div className="bg-primary-50 p-3 rounded-lg">
                <p className="text-sm text-primary-700 font-semibold">Főzési idő</p>
                <p className="text-lg font-bold text-primary-900">{recipe.cookTime}</p>
            </div>
            <div className="bg-primary-50 p-3 rounded-lg col-span-2 sm:col-span-1">
                <p className="text-sm text-primary-700 font-semibold">Adag</p>
                <p className="text-lg font-bold text-primary-900">{recipe.servings}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Hozzávalók</h2>
                <ul className="bg-primary-50 p-4 rounded-lg space-y-2 border border-primary-100 text-gray-700">
                    {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                </ul>
            </div>

            <div className="md:col-span-3">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Elkészítés</h2>
                <ol className="space-y-6 text-gray-800 list-decimal list-inside">
                    {recipe.instructions.map((step, i) => (
                        <li key={i} className="pl-2">
                            <p className="inline">{step.text}</p>
                             {step.imageUrl && (
                                <img 
                                    src={step.imageUrl} 
                                    alt={`Illusztráció a(z) ${i + 1}. lépéshez`} 
                                    className="w-full max-w-xs mx-auto aspect-[4/3] object-cover rounded-md shadow-md my-3"
                                />
                            )}
                        </li>
                    ))}
                </ol>
            </div>
        </div>
        <footer className="text-center mt-12 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">Ezt a receptet a Konyha Miki AI Receptgenerátor készítette.</p>
            <a href={window.location.origin} className="text-sm text-primary-600 hover:underline">Új recept készítése</a>
        </footer>
      </main>
    </div>
  );
};

export default SharedRecipeViewer;

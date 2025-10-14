import React, { useState } from 'react';
import { MenuRecipe, Recipe, OptionItem } from '../types';
import SaveMenuModal from './SaveMenuModal';

interface MenuDisplayProps {
  menu: MenuRecipe;
  onClose: () => void;
  onSave: (menuName: string) => void;
  onAddItemsToShoppingList: (menu: MenuRecipe) => void;
  shouldGenerateImages: boolean;
  onMenuUpdate: (updatedMenu: MenuRecipe) => void;
  mealTypes: OptionItem[];
  cookingMethodsList: OptionItem[];
}

type Course = 'appetizer' | 'soup' | 'mainCourse' | 'dessert';

const courseLabels: Record<Course, string> = {
  appetizer: 'Előétel',
  soup: 'Leves',
  mainCourse: 'Főétel',
  dessert: 'Desszert',
};

// Simplified view for a single recipe within the menu
const SingleRecipeView: React.FC<{ recipe: Recipe }> = ({ recipe }) => {
  if (!recipe) {
    return <p className="text-gray-500">Ehhez a fogáshoz nem tartozik recept.</p>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h3 className="text-2xl font-bold text-primary-800">{recipe.recipeName}</h3>
      <p className="text-gray-600">{recipe.description}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500 font-semibold">Előkészítés</p>
            <p className="text-lg font-bold text-gray-900">{recipe.prepTime}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500 font-semibold">Főzési idő</p>
            <p className="text-lg font-bold text-gray-900">{recipe.cookTime}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500 font-semibold">Adag</p>
            <p className="text-lg font-bold text-gray-900">{recipe.servings}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-xl font-semibold mb-2 text-gray-800">Hozzávalók</h4>
          <ul className="list-disc list-inside bg-primary-50 p-4 rounded-lg space-y-1 text-gray-700">
            {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
          </ul>
        </div>
        <div>
          <h4 className="text-xl font-semibold mb-2 text-gray-800">Elkészítés</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            {recipe.instructions.map((step, i) => <li key={i}>{step.text}</li>)}
          </ol>
        </div>
      </div>
    </div>
  );
};

const MenuDisplay: React.FC<MenuDisplayProps> = ({
  menu,
  onClose,
  onSave,
  onAddItemsToShoppingList,
  // onMenuUpdate is for editing, which is complex and not part of the current fix.
}) => {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [activeCourse, setActiveCourse] = useState<Course>('appetizer');
  
  const courses: Course[] = ['appetizer', 'soup', 'mainCourse', 'dessert'];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary-800">{menu.menuName}</h2>
          <p className="text-lg text-gray-600 mt-1">{menu.menuDescription}</p>
        </div>
        <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 flex-shrink-0">Új recept</button>
      </div>

      <div className="flex flex-wrap border-b border-gray-200 -mb-px">
        {courses.map(course => (
          <li key={course} className="list-none">
            <button
              onClick={() => setActiveCourse(course)}
              className={`py-3 px-4 font-semibold rounded-t-lg transition-colors text-sm sm:text-base ${activeCourse === course ? 'border-l border-t border-r border-gray-200 bg-white text-primary-600' : 'text-gray-500 hover:text-primary-600 hover:bg-gray-50'}`}
            >
              {courseLabels[course]}
            </button>
          </li>
        ))}
      </div>
      
      <div className="bg-white rounded-b-lg border-l border-r border-b border-gray-200">
        <div className="p-4 sm:p-6">
            <SingleRecipeView recipe={menu[activeCourse]} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
        <button onClick={() => setIsSaveModalOpen(true)} className="flex-1 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-primary-700">Teljes Menü Mentése</button>
        <button onClick={() => onAddItemsToShoppingList(menu)} className="flex-1 bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-green-700">Minden Hozzávaló a Listára</button>
      </div>

      {isSaveModalOpen && (
        <SaveMenuModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onSave={onSave}
          suggestedName={menu.menuName}
        />
      )}
    </div>
  );
};

export default MenuDisplay;
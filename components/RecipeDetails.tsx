import React from 'react';
import { Recipe, OptionItem, DietOption } from '../types';
import { DIET_OPTIONS } from '../constants';

const NutritionalInfo: React.FC<{ recipe: Recipe }> = ({ recipe }) => {
    const fields: (keyof Recipe)[] = ['calories', 'carbohydrates', 'protein', 'fat', 'glycemicIndex'];
    const info = fields.map(field => ({
        field,
        label: {
            calories: 'Kalória',
            carbohydrates: 'Szénhidrát',
            protein: 'Fehérje',
            fat: 'Zsír',
            glycemicIndex: 'Glikémiás Index',
        }[field] || '',
        value: recipe[field] as string,
        icon: {
            calories: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM10 18a1 1 0 01.707.293l2.5 2.5a1 1 0 11-1.414 1.414l-2.5-2.5A1 1 0 0110 18zM10 4a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /><path d="M10 18a7.953 7.953 0 01-4.16-1.115l-1.558 1.558a1 1 0 11-1.414-1.414l1.558-1.558A8 8 0 1110 18zm0-2a6 6 0 100-12 6 6 0 000 12z" /></svg>,
            carbohydrates: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 20 20" fill="currentColor"><path d="M17 5a2 2 0 10-4 0v.586a1 1 0 01-.293.707l-3.414 3.414a1 1 0 01-1.414 0l-1.414-1.414A1 1 0 017 8.586V7a2 2 0 10-4 0v1.586a1 1 0 01-.293.707l-3.414 3.414a1 1 0 01-1.414 0l-1.414-1.414a1 1 0 010-1.414l3.414-3.414A1 1 0 015 6.586V5a2 2 0 104 0v.586a1 1 0 01.293.707l1.414 1.414a1 1 0 010 1.414l-1.414 1.414A1 1 0 019 10.414V12a2 2 0 104 0v-1.586a1 1 0 01.293-.707l3.414-3.414a1 1 0 01-1.414-1.414L13 8.586V7a2 2 0 10-4 0v.586a1 1 0 01-.293.707L7.293 9.707a1 1 0 01-1.414 0L4.464 8.293A1 1 0 014 7.586V6a2 2 0 10-4 0v1.586a1 1 0 01.293.707l1.414 1.414a1 1 0 010 1.414l-1.414 1.414A1 1 0 01.293 12.414V14a2 2 0 104 0v-.586a1 1 0 01.293-.707l3.414-3.414a1 1 0 011.414 0l1.414 1.414a1 1 0 01.293.707V15a2 2 0 104 0v-1.586a1 1 0 01.293-.707l1.414-1.414a1 1 0 011.414 0l1.414 1.414a1 1 0 01.293.707V17a2 2 0 104 0v-1.586a1 1 0 01-.293-.707l-3.414-3.414a1 1 0 010-1.414l1.414-1.414A1 1 0 0115 8.414V7a2 2 0 10-4 0v.586a1 1 0 01.293.707l1.414 1.414a1 1 0 01-1.414 1.414L9.586 9.414A1 1 0 019 8.586V7a2 2 0 10-4 0v.586a1 1 0 01-.293.707L3.293 9.707a1 1 0 01-1.414 0L.464 8.293A1 1 0 010 7.586V6a2 2 0 104 0v.586a1 1 0 01.293.707l1.414 1.414a1 1 0 011.414 0l1.414-1.414A1 1 0 019 6.586V5a2 2 0 10-4 0v.586a1 1 0 01-.293.707l-1.414 1.414a1 1 0 01-1.414-1.414l1.414-1.414A1 1 0 014.586 5H6a2 2 0 100-4h1.586a1 1 0 01.707.293l1.414 1.414a1 1 0 010 1.414l-1.414 1.414A1 1 0 018.586 6H7a2 2 0 100 4h1.586a1 1 0 01.707.293l1.414 1.414a1 1 0 010 1.414l-1.414 1.414A1 1 0 019.586 15H8a2 2 0 100 4h1.586a1 1 0 01.707-.293l3.414-3.414a1 1 0 011.414 0l1.414 1.414a1 1 0 01.293.707V18a2 2 0 104 0v-1.586a1 1 0 01-.293-.707l-1.414-1.414a1 1 0 010-1.414l1.414-1.414A1 1 0 0115.586 12H17a2 2 0 100-4h-1.586a1 1 0 01-.707-.293l-3.414-3.414a1 1 0 010-1.414l3.414-3.414A1 1 0 0115.414 3H17a2 2 0 100-4h-1.586a1 1 0 01-.707.293l-1.414 1.414a1 1 0 01-1.414 0l-1.414-1.414A1 1 0 019.586 0H8a2 2 0 100 4h.586a1 1 0 01.707.293l1.414 1.414a1 1 0 010 1.414l-1.414 1.414A1 1 0 019.586 8H8a2 2 0 100 4h.586a1 1 0 01.707.293l1.414 1.414a1 1 0 01-1.414 1.414l-1.414-1.414A1 1 0 016.586 13H5a2 2 0 100 4h1.586a1 1 0 01.707.293l1.414 1.414a1 1 0 011.414 0l1.414 1.414A1 1 0 0110.414 19H12a2 2 0 100-4h-.586a1 1 0 01-.707-.293L7.293 11.293a1 1 0 010-1.414L8.707 8.464A1 1 0 019.414 8H11a2 2 0 100-4h-.586a1 1 0 01-.707-.293L8.293 2.293a1 1 0 01-1.414 0L5.464 3.707A1 1 0 014.586 4H3a2 2 0 100-4h.586a1 1 0 01.707.293l1.414 1.414a1 1 0 011.414 0l1.414-1.414A1 1 0 0110.414 0H12a2 2 0 100 4h-.586a1 1 0 01-.707-.293l-1.414-1.414a1 1 0 010-1.414l1.414-1.414A1 1 0 0111.414 0H13a2 2 0 100-4h-.586a1 1 0 01-.707.293L10.293-1.121a1 1 0 01-1.414 0L7.464.293A1 1 0 016.586 1H5a2 2 0 100 4z" /></svg>,
            protein: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 6a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm1 3a1 1 0 000 2h8a1 1 0 100-2H5z" /><path fillRule="evenodd" d="M2 10a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6zm2-1a1 1 0 00-1 1v6a1 1 0 001 1h12a1 1 0 001-1v-6a1 1 0 00-1-1H4z" clipRule="evenodd" /></svg>,
            fat: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9a1 1 0 000 2h12a1 1 0 100-2H4z" clipRule="evenodd" /></svg>,
            glycemicIndex: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>,
        }[field]
    })).filter(info => info.value);

    if (info.length === 0) return null;

    return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Tápérték adatok <span className="text-sm font-normal text-gray-500">(becsült / 100g)</span></h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {info.map(({ field, label, value, icon }) => (
                    <div key={field} className="flex items-center gap-3">
                        <div className="w-8 h-8 p-1.5 bg-primary-100 text-primary-600 rounded-full flex-shrink-0">
                           {icon}
                        </div>
                        <div>
                            <span className="text-sm text-gray-500 block">{label}</span>
                            <span className="text-md font-bold text-gray-900">{value}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


interface RecipeDetailsProps {
    recipe: Recipe;
    mealTypes: OptionItem[];
    cuisineOptions: OptionItem[];
    cookingMethodsList: OptionItem[];
}

const RecipeDetails: React.FC<RecipeDetailsProps> = ({ recipe, mealTypes, cuisineOptions, cookingMethodsList }) => {
    
    const mealTypeLabel = mealTypes.find(m => m.value === recipe.mealType)?.label || recipe.mealType;
    const cuisineLabel = cuisineOptions.find(c => c.value === recipe.cuisine)?.label || recipe.cuisine;
    const cookingMethodLabels = recipe.cookingMethods
        .map(cm => cookingMethodsList.find(c => c.value === cm)?.label || cm)
        .join(', ');

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                {[
                    { label: 'Előkészítés', value: recipe.prepTime },
                    { label: 'Főzési idő', value: recipe.cookTime },
                    { label: 'Adag', value: recipe.servings },
                    { label: 'Étkezés', value: mealTypeLabel },
                    { label: 'Konyha', value: cuisineLabel || 'Nincs megadva' },
                    { label: 'Becsült költség', value: recipe.estimatedCost },
                ].filter(item => item.value).map(item => (
                    <div key={item.label} className="bg-primary-50 p-3 rounded-lg">
                        <p className="text-sm text-primary-700 font-semibold">{item.label}</p>
                        <p className="text-lg font-bold text-primary-900">{item.value}</p>
                    </div>
                ))}
            </div>
            <div className="bg-primary-50 p-3 rounded-lg">
                <p className="text-sm text-primary-700 font-semibold text-center">Elkészítés módja</p>
                <p className="text-lg font-bold text-primary-900 text-center">{cookingMethodLabels}</p>
            </div>

            {/* Ingredients Section */}
            <div>
                <h3 className="text-xl font-bold text-gray-800">Hozzávalók</h3>
                <ul className="bg-primary-50 p-4 rounded-lg space-y-2 border border-primary-100 mt-2">
                {recipe.ingredients.map((ing, i) => <li key={i} className="text-gray-700">{ing}</li>)}
                </ul>
            </div>

            {/* Nutritional Info */}
            <NutritionalInfo recipe={recipe} />

            {/* Diabetic Advice */}
            {recipe.diabeticAdvice && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-bold text-blue-800 mb-2">Tipp cukorbetegeknek</h3>
                    <p className="text-blue-700">{recipe.diabeticAdvice}</p>
                </div>
            )}
        </div>
    );
};

export default RecipeDetails;
import React, { useState } from 'react';
import { ShoppingListItem } from '../types';

interface ShoppingListViewProps {
  list: ShoppingListItem[];
  onAddItems: (items: string[]) => void;
  onUpdateItem: (index: number, updatedItem: ShoppingListItem) => void;
  onRemoveItem: (index: number) => void;
  onClearChecked: () => void;
  onClearAll: () => void;
}

const ShoppingListView: React.FC<ShoppingListViewProps> = ({
  list,
  onAddItems,
  onUpdateItem,
  onRemoveItem,
  onClearChecked,
  onClearAll,
}) => {
  const [newItem, setNewItem] = useState('');

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim()) {
      const itemsToAdd = newItem.split(',').map(item => item.trim()).filter(Boolean);
      if (itemsToAdd.length > 0) {
        onAddItems(itemsToAdd);
        setNewItem('');
      }
    }
  };

  const handleToggleCheck = (index: number) => {
    const item = list[index];
    onUpdateItem(index, { ...item, checked: !item.checked });
  };

  const handleSaveToGoogleKeep = () => {
    if (list.length === 0) return;

    const title = "AI bevásárlólista";
    // Using `[ ] ` with a space is a more compatible format for checklists.
    const checklistItems = list.map(item => `[ ] ${item.text}`).join('\n');

    const encodedTitle = encodeURIComponent(title);
    const encodedText = encodeURIComponent(checklistItems);
    
    // FINAL FIX: This endpoint is specifically for creating notes and is more reliable
    // than trying to manipulate the main app's hash routes.
    const keepUrl = `https://keep.google.com/keep/createnote?title=${encodedTitle}&text=${encodedText}`;

    window.open(keepUrl, '_blank', 'noopener,noreferrer');
  };
  
  const checkedCount = list.filter(item => item.checked).length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-primary-800">Bevásárlólista</h2>
      
      <form onSubmit={handleAddItem} className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Új tétel (vesszővel elválasztva)..."
          className="flex-grow p-3 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
          aria-label="Új bevásárlólista tétel"
        />
        <button
          type="submit"
          className="bg-primary-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition"
          aria-label="Tétel hozzáadása"
        >
          Hozzáad
        </button>
      </form>
      
      {list.length > 0 ? (
        <div className="space-y-2">
            <ul className="divide-y divide-gray-200">
                {list.map((item, index) => (
                <li
                    key={index}
                    className="flex items-center justify-between p-3"
                >
                    <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleToggleCheck(index)}
                        className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        aria-labelledby={`item-label-${index}`}
                    />
                    <span id={`item-label-${index}`} className={`font-medium ${item.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {item.text}
                    </span>
                    </label>
                    <button
                    onClick={() => onRemoveItem(index)}
                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"
                    aria-label={`'${item.text}' törlése`}
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    </button>
                </li>
                ))}
            </ul>
            <div className="pt-4 flex flex-col sm:flex-row gap-2 justify-end flex-wrap">
                 <button 
                    onClick={handleSaveToGoogleKeep}
                    className="text-sm bg-yellow-400 text-black font-semibold py-2 px-4 rounded-lg hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24"><path d="M18.333 2H5.667C3.646 2 2 3.646 2 5.667V18.333C2 20.354 3.646 22 5.667 22H18.333C20.354 22 22 20.354 22 18.333V5.667C22 3.646 20.354 2 18.333 2ZM10.5 15.5H7V12.5H10.5V15.5ZM17 15.5H13.5V12.5H17V15.5ZM17 10.5H7V7.5H17V10.5Z" fill="#202124"></path></svg>
                    Mentés a Google Keepbe
                </button>
                <button 
                    onClick={onClearChecked}
                    disabled={checkedCount === 0}
                    className="text-sm bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-yellow-300 disabled:cursor-not-allowed"
                >
                    Kipipáltak törlése ({checkedCount})
                </button>
                <button 
                    onClick={onClearAll}
                    className="text-sm bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
                >
                    Teljes lista törlése
                </button>
            </div>
        </div>
      ) : (
        <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">A bevásárlólistád üres</h3>
            <p className="mt-1 text-sm text-gray-500">Adj hozzá tételeket manuálisan, vagy egy recept hozzávalóiból.</p>
        </div>
      )}
    </div>
  );
};

export default ShoppingListView;
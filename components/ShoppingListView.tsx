
import React, { useState, useRef } from 'react';
import { ShoppingListItem, Favorites, BackupData, PantryItem, PantryLocation, StorageType, UserProfile, OptionItem } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import * as imageStore from '../services/imageStore';
import ShoppingListItemActionModal from './ShoppingListItemActionModal';
import { categorizeIngredients } from '../services/geminiService';

interface ShoppingListViewProps {
  list: ShoppingListItem[];
  onAddItems: (items: string[]) => void;
  onUpdateItem: (index: number, updatedItem: ShoppingListItem) => void;
  onRemoveItem: (index: number) => void;
  onClearChecked: () => void;
  onClearAll: () => void;
  onMoveItemToPantryRequest: (index: number, itemText: string, storageType: StorageType) => void;
}

const ShoppingListView: React.FC<ShoppingListViewProps> = ({
  list,
  onAddItems,
  onUpdateItem,
  onRemoveItem,
  onClearChecked,
  onClearAll,
  onMoveItemToPantryRequest,
}) => {
  const [newItem, setNewItem] = useState('');
  const [actionItem, setActionItem] = useState<{ item: ShoppingListItem; index: number } | null>(null);
  const { showNotification } = useNotification();
  
  // State for AI categorization
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [categorizedList, setCategorizedList] = useState<Record<string, ShoppingListItem[]> | null>(null);
  const [expandedAIGroups, setExpandedAIGroups] = useState<Record<string, boolean>>({});


  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim()) {
      const itemsToAdd = newItem.split(',').map(item => item.trim()).filter(Boolean);
      if (itemsToAdd.length > 0) {
        onAddItems(itemsToAdd);
        setNewItem('');
        setCategorizedList(null); // Invalidate categorization when new items are added
      }
    }
  };

  const handleToggleCheck = (index: number, originalItem: ShoppingListItem) => {
    // Find the original index in the main list
    const originalIndex = list.findIndex(item => item.text === originalItem.text);
    if (originalIndex !== -1) {
        const item = list[originalIndex];
        onUpdateItem(originalIndex, { ...item, checked: !item.checked });
    }
  };
  
  const handleItemAction = (action: StorageType | 'delete') => {
    if (!actionItem) return;
    
    const originalIndex = list.findIndex(item => item.text === actionItem.item.text);
    if (originalIndex === -1) {
        showNotification('Hiba: A módosítandó elem nem található.', 'info');
        setActionItem(null);
        return;
    }

    if (action === 'delete') {
      onRemoveItem(originalIndex);
      showNotification(`'${actionItem.item.text}' törölve.`, 'success');
    } else {
      onMoveItemToPantryRequest(originalIndex, actionItem.item.text, action);
    }
    setActionItem(null);
  };


  const handleCopyList = async () => {
    if (list.length === 0) {
      showNotification('A lista üres, nincs mit másolni.', 'info');
      return;
    }

    const textToCopy = list.map(item => item.text).join('\n');

    try {
      if (!navigator.clipboard) {
        throw new Error('A vágólap API nem érhető el a böngésződben.');
      }
      await navigator.clipboard.writeText(textToCopy);
      showNotification('Bevásárlólista a vágólapra másolva!', 'success');
    } catch (err) {
      console.error('Hiba a vágólapra másolás közben:', err);
      showNotification('Nem sikerült a listát vágólapra másolni. Lehet, hogy a böngészője nem támogatja ezt a funkciót.', 'info');
    }
  };
  
  const handleCategorize = async () => {
    if (isCategorizing || list.length === 0) return;
    setIsCategorizing(true);
    try {
        const uncheckedItems = list.filter(item => !item.checked);
        const ingredientTexts = uncheckedItems.map(item => item.text);
        const result = await categorizeIngredients(ingredientTexts);
        
        const originalItemMap = new Map(list.map(item => [item.text.toLowerCase(), item]));
        
        const grouped: Record<string, ShoppingListItem[]> = {};
        
        result.forEach(({ ingredient, category }) => {
            const originalItem = originalItemMap.get(ingredient.toLowerCase());
            if (originalItem) {
                if (!grouped[category]) {
                    grouped[category] = [];
                }
                grouped[category].push(originalItem);
            }
        });
        
        // Add checked items to a separate "Kipipálva" category at the end
        const checkedItems = list.filter(item => item.checked);
        if(checkedItems.length > 0) {
            grouped['Kipipálva'] = checkedItems;
        }

        setCategorizedList(grouped);
        // Expand all categories by default
        // FIX: The `reduce` method was using a type-casted empty object as an initial value, which can lead to incorrect type inference for the accumulator. This has been corrected by using the generic form of `reduce` to explicitly type the accumulator, ensuring type safety. This likely resolves the reported cascading type error about `ShoppingListItem`.
        setExpandedAIGroups(Object.keys(grouped).reduce<Record<string, boolean>>((acc, key) => {
            acc[key] = true;
            return acc;
        }, {}));

    } catch (e: any) {
        showNotification(e.message, 'info');
    } finally {
        setIsCategorizing(false);
    }
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
      
      {list.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
            <button
                onClick={handleCategorize}
                disabled={isCategorizing}
                className="flex-1 bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-purple-700 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
                {isCategorizing ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a1 1 0 000 2c5.523 0 10 4.477 10 10a1 1 0 102 0C17 7.373 11.627 2 5 2a1 1 0 00-1 1z" /><path d="M13 5a1 1 0 00-1-1C6.477 4 2 8.477 2 14a1 1 0 102 0c0-4.418 3.582-8 8-8a1 1 0 001-1z" /><path d="M5 9a1 1 0 011-1h2a1 1 0 110 2H6a1 1 0 01-1-1zm8 2a1 1 0 00-1 1v2a1 1 0 102 0v-2a1 1 0 00-1-1z" /></svg>
                )}
                {isCategorizing ? 'Kategorizálás...' : 'AI-alapú kategorizálás'}
            </button>
            {categorizedList && (
                 <button
                    onClick={() => setCategorizedList(null)}
                    className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition"
                >
                    Kategorizálás törlése
                </button>
            )}
        </div>
      )}

      {list.length > 0 ? (
        <div className="space-y-2">
            {categorizedList ? (
                 <div className="space-y-3">
                    {/* FIX: Explicitly type the destructured array from Object.entries to resolve type errors. */}
                    {Object.entries(categorizedList).map(([category, items]: [string, ShoppingListItem[]]) => (
                        <div key={category} className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                             <button
                                onClick={() => setExpandedAIGroups(prev => ({ ...prev, [category]: !prev[category] }))}
                                className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100"
                                aria-expanded={!!expandedAIGroups[category]}
                            >
                                <span className="font-bold text-primary-700">{category}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 transform transition-transform ${expandedAIGroups[category] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {expandedAIGroups[category] && (
                                <ul className="divide-y divide-gray-200">
                                {items.map((item, index) => (
                                    <li key={`${item.text}-${index}`} className="flex items-center justify-between p-3 gap-2">
                                    <label className="flex items-center gap-3 cursor-pointer flex-grow min-w-0">
                                        <input
                                        type="checkbox"
                                        checked={item.checked}
                                        onChange={() => handleToggleCheck(index, item)}
                                        className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0"
                                        />
                                        <span className={`font-medium break-words ${item.checked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                        {item.text}
                                        </span>
                                    </label>
                                    <button
                                        onClick={() => setActionItem({ item, index })}
                                        className="text-gray-500 hover:text-primary-600 p-1 rounded-full hover:bg-gray-100 flex-shrink-0"
                                        aria-label={`Műveletek a(z) '${item.text}' tétellel`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                                        </svg>
                                    </button>
                                    </li>
                                ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                {list.map((item, index) => (
                    <li key={`${item.text}-${index}`} className="flex items-center justify-between p-3 gap-2 bg-white">
                    <label className="flex items-center gap-3 cursor-pointer flex-grow min-w-0">
                        <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleToggleCheck(index, item)}
                        className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0"
                        />
                        <span className={`font-medium break-words ${item.checked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                        {item.text}
                        </span>
                    </label>
                    <button
                        onClick={() => setActionItem({ item, index })}
                        className="text-gray-500 hover:text-primary-600 p-1 rounded-full hover:bg-gray-100 flex-shrink-0"
                        aria-label={`Műveletek a(z) '${item.text}' tétellel`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                        </svg>
                    </button>
                    </li>
                ))}
                </ul>
            )}
            <div className="pt-4 flex flex-col sm:flex-row gap-2 justify-between items-center">
                 <button onClick={handleCopyList} className="text-sm bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
                    Lista vágólapra másolása
                </button>
                <div className="flex gap-2">
                    <button
                    onClick={onClearChecked}
                    disabled={checkedCount === 0}
                    className="text-sm bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                    Kipipáltak törlése ({checkedCount})
                    </button>
                    <button
                    onClick={() => {
                        if(window.confirm('Biztosan törli a teljes bevásárlólistát?')) {
                        onClearAll();
                        }
                    }}
                    className="text-sm bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
                    >
                    Teljes lista törlése
                    </button>
                </div>
            </div>
        </div>
      ) : (
        <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">A bevásárlólistád üres</h3>
            <p className="mt-1 text-sm text-gray-500">Adj hozzá tételeket, vagy generálj egy receptet és add a hozzávalókat a listához.</p>
        </div>
      )}
      
      {actionItem && (
        <ShoppingListItemActionModal
          isOpen={!!actionItem}
          itemName={actionItem.item.text}
          onClose={() => setActionItem(null)}
          onAction={handleItemAction}
        />
      )}
    </div>
  );
};

// FIX: Added missing default export for the ShoppingListView component.
export default ShoppingListView;

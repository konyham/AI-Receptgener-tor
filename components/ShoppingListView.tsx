// components/ShoppingListView.tsx
import React, { useState } from 'react';
import { ShoppingListItem, StorageType } from '../types';
import ShoppingListItemActionModal from './ShoppingListItemActionModal';
import { categorizeIngredients } from '../services/geminiService';
import { CategorizedIngredient } from '../types';
import { useNotification } from '../contexts/NotificationContext';

interface ShoppingListViewProps {
  list: ShoppingListItem[];
  onAddItems: (items: string[]) => void;
  onUpdateItem: (index: number, item: ShoppingListItem) => void;
  onRemoveItem: (index: number) => void;
  onClearChecked: () => void;
  onClearAll: () => void;
  onMoveItemToPantryRequest: (index: number, itemText: string, storageType: StorageType) => void;
  onReorder: (reorderedList: ShoppingListItem[]) => void;
}

const ShoppingListView: React.FC<ShoppingListViewProps> = ({
  list,
  onAddItems,
  onUpdateItem,
  onRemoveItem,
  onClearChecked,
  onClearAll,
  onMoveItemToPantryRequest,
  onReorder,
}) => {
  const [newItemText, setNewItemText] = useState('');
  const [actionModalState, setActionModalState] = useState<{ index: number; item: ShoppingListItem } | null>(null);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [categorizedList, setCategorizedList] = useState<Record<string, ShoppingListItem[]> | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const { showNotification } = useNotification();

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const itemsToAdd = newItemText.split(',').map(s => s.trim()).filter(Boolean);
    if (itemsToAdd.length > 0) {
      onAddItems(itemsToAdd);
      setNewItemText('');
      setCategorizedList(null); // Adding items resets categorization
    }
  };

  const handleAction = (action: StorageType | 'delete') => {
    if (!actionModalState) return;
    
    if (action === 'delete') {
        onRemoveItem(actionModalState.index);
    } else {
        onMoveItemToPantryRequest(actionModalState.index, actionModalState.item.text, action);
    }
    setCategorizedList(null); // Any action resets categorization
    setActionModalState(null);
  };

  const handleCategorizeToggle = async () => {
    if (categorizedList) {
      setCategorizedList(null);
      return;
    }

    setIsCategorizing(true);
    try {
      const itemTexts = list.map(item => item.text);
      const categories = await categorizeIngredients(itemTexts);
      
      const categoryMap = new Map<string, CategorizedIngredient>();
      categories.forEach(catItem => categoryMap.set(catItem.ingredient.toLowerCase(), catItem));

      const grouped: Record<string, ShoppingListItem[]> = {};
      list.forEach(item => {
        const result = categoryMap.get(item.text.toLowerCase());
        const category = result?.category || 'Egyéb';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(item);
      });

      setCategorizedList(grouped);
      setExpandedCategories(Object.keys(grouped).reduce((acc, key) => ({ ...acc, [key]: true }), {}));

    } catch (error: any) {
      console.error("Categorization failed:", error);
      showNotification(`Hiba a kategorizálás közben: ${error.message}`, 'info');
    } finally {
      setIsCategorizing(false);
    }
  };

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const renderList = () => {
    if (isCategorizing) {
        return <div className="text-center p-8 text-gray-500">Kategorizálás folyamatban...</div>;
    }
    
    if (categorizedList) {
        return (
            <div className="space-y-4">
                {/* FIX: Explicitly type the destructured arguments from Object.entries to resolve 'unknown' type errors. */}
                {Object.entries(categorizedList).sort((a, b) => a[0].localeCompare(b[0])).map(([category, items]: [string, ShoppingListItem[]]) => (
                    <div key={category} className="border border-gray-200 rounded-lg dark:border-gray-700 overflow-hidden">
                        <button onClick={() => toggleCategoryExpansion(category)} className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700">
                            <span className="font-bold text-primary-700 dark:text-primary-300">{category} ({items.length})</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 transform transition-transform ${expandedCategories[category] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {expandedCategories[category] && (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                {items.map(item => {
                                    const originalIndex = list.findIndex(li => li.text === item.text);
                                    if (originalIndex === -1) return null; // Should not happen
                                    return (
                                       <li key={originalIndex} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" checked={item.checked} onChange={() => onUpdateItem(originalIndex, { ...item, checked: !item.checked })} className="h-6 w-6 rounded border-gray-300 text-primary-600 focus:ring-primary-500"/>
                                                <span className={`text-lg ${item.checked ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>{item.text}</span>
                                            </label>
                                            <button onClick={() => setActionModalState({ index: originalIndex, item })} className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600" aria-label={`Műveletek: ${item.text}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                            </button>
                                       </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <ul className="space-y-2">
            {list.map((item, index) => (
            <li key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-700 dark:border-gray-600">
                <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={item.checked} onChange={() => onUpdateItem(index, { ...item, checked: !item.checked })} className="h-6 w-6 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <span className={`text-lg ${item.checked ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{item.text}</span>
                </label>
                <button onClick={() => setActionModalState({ index, item })} className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600" aria-label={`Műveletek a(z) '${item.text}' tétellel`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                </button>
            </li>
            ))}
        </ul>
    );
  };


  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-primary-800 dark:text-primary-300">Bevásárlólista</h2>
      
      <form onSubmit={handleAddItem} className="flex gap-2">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="Új tétel (vesszővel elválasztva több is megadható)"
          className="flex-grow p-3 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
        />
        <button type="submit" className="bg-primary-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-primary-700">
          Hozzáadás
        </button>
      </form>

      {list.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleCategorizeToggle}
            disabled={isCategorizing}
            className="bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            {isCategorizing ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM13 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" /></svg>
            )}
            {isCategorizing ? 'Kategorizálás...' : (categorizedList ? 'Eredeti nézet' : 'AI-alapú kategorizálás')}
          </button>
        </div>
      )}

      {list.length > 0 ? (
        renderList()
      ) : (
        <p className="text-center text-gray-500 dark:text-gray-400">A bevásárlólista üres.</p>
      )}

      {list.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={onClearChecked} className="flex-1 bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg">
            Kipipáltak törlése
          </button>
          <button onClick={onClearAll} className="flex-1 bg-red-600 text-white font-semibold py-2 px-4 rounded-lg">
            Teljes lista törlése
          </button>
        </div>
      )}

      {actionModalState && (
        <ShoppingListItemActionModal
            isOpen={!!actionModalState}
            itemName={actionModalState.item.text}
            onClose={() => setActionModalState(null)}
            onAction={handleAction}
        />
      )}
    </div>
  );
};

export default ShoppingListView;
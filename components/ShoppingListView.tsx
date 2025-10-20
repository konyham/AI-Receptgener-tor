import React, { useState, useRef } from 'react';
import { ShoppingListItem, StorageType, CategorizedIngredient } from '../types';
import { useNotification } from '../contexts/NotificationContext';
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
  const [newItem, setNewItem] = useState('');
  const [actionItem, setActionItem] = useState<{ item: ShoppingListItem; index: number } | null>(null);
  const { showNotification } = useNotification();
  
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [categorizedList, setCategorizedList] = useState<Record<string, ShoppingListItem[]> | null>(null);
  const [expandedAIGroups, setExpandedAIGroups] = useState<Record<string, boolean>>({});

  const [editingItem, setEditingItem] = useState<{ index: number; text: string } | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);


  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim()) {
      const itemsToAdd = newItem.split(',').map(item => item.trim()).filter(Boolean);
      if (itemsToAdd.length > 0) {
        onAddItems(itemsToAdd);
        setNewItem('');
        setCategorizedList(null); 
      }
    }
  };

  const handleToggleCheck = (originalIndex: number) => {
    if (originalIndex !== -1) {
        const item = list[originalIndex];
        onUpdateItem(originalIndex, { ...item, checked: !item.checked });
    }
  };

  const handleEditStart = (originalIndex: number) => {
    if (categorizedList) {
        showNotification('A szerkesztés csak a nem kategorizált nézetben lehetséges.', 'info');
        return;
    }
    setEditingItem({ index: originalIndex, text: list[originalIndex].text });
  };
  
  const handleEditSave = () => {
      if (!editingItem) return;
      const originalItem = list[editingItem.index];
      const newText = editingItem.text.trim();
      if (newText && newText !== originalItem.text) {
          onUpdateItem(editingItem.index, { ...originalItem, text: newText });
      }
      setEditingItem(null);
  };
  
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          handleEditSave();
      } else if (e.key === 'Escape') {
          setEditingItem(null);
      }
  };

  // FIX: Rewrote drag sort logic to be more explicit and type-safe, avoiding potential 'unknown' type errors from splice.
  const handleDragSort = () => {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
        dragItem.current = null;
        dragOverItem.current = null;
        return;
    };
    
    const reorderedList = [...list];
    // Remove the dragged item using splice. Destructuring the result array ensures `draggedItem` is correctly typed.
    const [draggedItem] = reorderedList.splice(dragItem.current, 1);
    
    // If an item was successfully removed (is not undefined), insert it at the new position.
    if (draggedItem) {
        reorderedList.splice(dragOverItem.current, 0, draggedItem);
    }
    
    // Reset refs and update state.
    dragItem.current = null;
    dragOverItem.current = null;
    onReorder(reorderedList);
    setCategorizedList(null); 
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
    if (isCategorizing || list.filter(item => !item.checked).length === 0) return;
    setIsCategorizing(true);
    setEditingItem(null); // Close any open editor
    try {
        const uncheckedItems = list.filter(item => !item.checked);
        const ingredientTexts = uncheckedItems.map(item => item.text);
        const result: CategorizedIngredient[] = await categorizeIngredients(ingredientTexts);
        
        const originalItemMap = new Map(list.map(item => [item.text.toLowerCase(), item]));
        
        const grouped: Record<string, ShoppingListItem[]> = {};
        
        for (const categorizedItem of result) {
            const { ingredient, category } = categorizedItem as CategorizedIngredient;
            const originalItem = originalItemMap.get(ingredient.toLowerCase());
            if (originalItem) {
                if (!grouped[category]) {
                    grouped[category] = [];
                }
                grouped[category].push(originalItem);
            }
        }
        
        const checkedItems = list.filter(item => item.checked);
        if(checkedItems.length > 0) {
            grouped['Kipipálva'] = checkedItems;
        }

        setCategorizedList(grouped);
        const newExpanded: Record<string, boolean> = {};
        for (const key of Object.keys(grouped)) {
            newExpanded[key] = true;
        }
        setExpandedAIGroups(newExpanded);

    } catch (e: any) {
        showNotification(e.message, 'info');
    } finally {
        setIsCategorizing(false);
    }
  };

  const checkedCount = list.filter(item => item.checked).length;
  
  const renderListItem = (item: ShoppingListItem, originalIndex: number) => (
    <li
      key={`${item.text}-${originalIndex}`}
      draggable={!categorizedList}
      onDragStart={!categorizedList ? () => (dragItem.current = originalIndex) : undefined}
      onDragEnter={!categorizedList ? () => (dragOverItem.current = originalIndex) : undefined}
      onDragEnd={handleDragSort}
      onDragOver={!categorizedList ? (e) => e.preventDefault() : undefined}
      className={`flex items-center justify-between p-3 gap-2 transition-shadow ${!categorizedList ? 'cursor-grab' : ''} ${dragItem.current === originalIndex ? 'shadow-lg' : ''}`}
    >
      <label className="flex items-center gap-3 cursor-pointer flex-grow min-w-0">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={() => handleToggleCheck(originalIndex)}
          className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0"
        />
        {editingItem?.index === originalIndex ? (
            <input
                type="text"
                value={editingItem.text}
                onChange={(e) => setEditingItem({ ...editingItem, text: e.target.value })}
                onBlur={handleEditSave}
                onKeyDown={handleEditKeyDown}
                className="font-medium text-gray-800 bg-yellow-50 border-b-2 border-primary-500 outline-none w-full"
                autoFocus
            />
        ) : (
            <span
              onDoubleClick={() => handleEditStart(originalIndex)}
              className={`font-medium break-words ${item.checked ? 'text-gray-400 line-through' : 'text-gray-800'}`}
            >
              {item.text}
            </span>
        )}
      </label>
      <button
        onClick={() => setActionItem({ item, index: originalIndex })}
        className="text-gray-500 hover:text-primary-600 p-1 rounded-full hover:bg-gray-100 flex-shrink-0"
        aria-label={`Műveletek a(z) '${item.text}' tétellel`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      </button>
    </li>
  );

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
          aria-label="Tétel hozzáadása a listához"
        >
          Hozzáadás
        </button>
      </form>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
            onClick={handleCategorize}
            disabled={isCategorizing || list.filter(item => !item.checked).length === 0}
            className="flex-1 bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
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

      <div className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {list.length > 0 ? (
            categorizedList ? (
                <div className="space-y-3 p-2">
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
                                <ul className="divide-y divide-gray-100 bg-white">
                                    {items.map((item) => {
                                        const originalIndex = list.findIndex(li => li.text === item.text);
                                        return renderListItem(item, originalIndex);
                                    })}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <ul className="divide-y divide-gray-100">
                    {list.map((item, index) => renderListItem(item, index))}
                </ul>
            )
        ) : (
          <p className="text-center text-gray-500 p-8">A bevásárlólista üres.</p>
        )}
      </div>

      {list.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onClearChecked}
            disabled={checkedCount === 0}
            className="flex-1 bg-yellow-500 text-white font-semibold py-3 px-4 rounded-lg shadow-sm hover:bg-yellow-600 transition disabled:bg-gray-300"
          >
            Kipipáltak törlése ({checkedCount})
          </button>
          <button
            onClick={onClearAll}
            className="flex-1 bg-red-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-red-600 transition"
          >
            Teljes lista törlése
          </button>
           <button
            onClick={handleCopyList}
            className="flex-1 bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition"
          >
            Lista másolása vágólapra
          </button>
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

export default ShoppingListView;

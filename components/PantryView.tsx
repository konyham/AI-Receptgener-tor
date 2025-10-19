import React, { useState, useRef, useMemo, useEffect } from 'react';
import { PantryItem, Favorites, BackupData, ShoppingListItem, PantryLocation, PANTRY_LOCATIONS, StorageType, UserProfile, OptionItem, CategorizedIngredient } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import * as imageStore from '../services/imageStore';
import MoveItemsModal from './MoveItemsModal';
import { categorizeIngredients } from '../services/geminiService';

// Modal for editing a pantry item
const EditPantryItemModal: React.FC<{
  item: PantryItem;
  onClose: () => void;
  onSave: (updatedItem: PantryItem) => void;
}> = ({ item, onClose, onSave }) => {
  const [text, setText] = useState(item.text);
  const [quantity, setQuantity] = useState(item.quantity || '');
  const [dateAdded, setDateAdded] = useState(item.dateAdded || new Date().toISOString().split('T')[0]);
  const [isDateUnknown, setIsDateUnknown] = useState(item.dateAdded === null);
  const [storageType, setStorageType] = useState(item.storageType);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = () => {
    if (text.trim()) {
      onSave({ 
        text: text.trim(), 
        quantity: quantity.trim(), 
        dateAdded: isDateUnknown ? null : dateAdded, 
        storageType 
      });
    }
  };
  
  const storageTypeOptions = [
    { value: StorageType.PANTRY, label: "Kamra" },
    { value: StorageType.REFRIGERATOR, label: "Hűtő" },
    { value: StorageType.FREEZER, label: "Fagyasztó" },
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in"
      role="dialog" aria-modal="true" aria-labelledby="edit-item-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-item-title" className="text-xl font-bold text-gray-800 mb-4">Tétel szerkesztése</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-text" className="block text-sm font-medium text-gray-700">Név</label>
            <input id="edit-text" type="text" value={text} onChange={(e) => setText(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
          </div>
          <div>
            <label htmlFor="edit-quantity" className="block text-sm font-medium text-gray-700">Mennyiség (opcionális)</label>
            <input id="edit-quantity" type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Pl. 2 kg, 500g, 1 doboz" className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
          </div>
          <div>
            <label htmlFor="edit-date" className="block text-sm font-medium text-gray-700">Betárolás dátuma</label>
            <input id="edit-date" type="date" value={dateAdded || ''} onChange={(e) => setDateAdded(e.target.value)} disabled={isDateUnknown} className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm disabled:bg-gray-100"/>
            <div className="flex items-center mt-2">
                <input id="date-unknown" type="checkbox" checked={isDateUnknown} onChange={(e) => setIsDateUnknown(e.target.checked)} className="h-4 w-4 text-primary-600 border-gray-300 rounded"/>
                <label htmlFor="date-unknown" className="ml-2 block text-sm text-gray-900">Ismeretlen dátum</label>
            </div>
          </div>
           <div>
            <label htmlFor="storage-type" className="block text-sm font-medium text-gray-700">Tárolás helye</label>
            <select id="storage-type" value={storageType} onChange={(e) => setStorageType(e.target.value as StorageType)} className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm">
                {storageTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Mégse</button>
          <button onClick={handleSave} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700">Mentés</button>
        </div>
      </div>
    </div>
  );
};


interface PantryViewProps {
  pantry: Record<PantryLocation, PantryItem[]>;
  onAddItems: (items: string[], location: PantryLocation, date: string | null, storageType: StorageType) => void;
  onUpdateItem: (originalItem: PantryItem, updatedItem: PantryItem, location: PantryLocation) => void;
  onRemoveItem: (item: PantryItem, location: PantryLocation) => void;
  onClearAll: (location: PantryLocation) => void;
  onMoveCheckedToPantryRequest: () => void;
  onGenerateFromPantryRequest: () => void;
  onGenerateFromSelectedPantryItemsRequest: (items: string[]) => void;
  shoppingListItems: ShoppingListItem[];
  onMoveItems: (indices: number[], sourceLocation: PantryLocation, destinationLocation: PantryLocation) => void;
}

type PantryItemWithIndex = PantryItem & { originalIndex: number };

const PantryView: React.FC<PantryViewProps> = ({
  pantry,
  onAddItems,
  onUpdateItem,
  onRemoveItem,
  onClearAll,
  onMoveCheckedToPantryRequest,
  onGenerateFromPantryRequest,
  onGenerateFromSelectedPantryItemsRequest,
  shoppingListItems,
  onMoveItems,
}) => {
  const [newItem, setNewItem] = useState('');
  const [newItemDate, setNewItemDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [newItemStorageType, setNewItemStorageType] = useState<StorageType>(StorageType.PANTRY);
  const [activeLocation, setActiveLocation] = useState<PantryLocation>(PANTRY_LOCATIONS[0]);
  const [editingItem, setEditingItem] = useState<{ item: PantryItem } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<PantryLocation, Set<number>>>({ Tiszadada: new Set(), Vásárosnamény: new Set() });
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [storageFilter, setStorageFilter] = useState<StorageType | 'all'>('all');

  const [isCategorizing, setIsCategorizing] = useState(false);
  const [categorizedPantry, setCategorizedPantry] = useState<Record<string, PantryItemWithIndex[]> | null>(null);
  const [expandedAIGroups, setExpandedAIGroups] = useState<Record<string, boolean>>({});
  const { showNotification } = useNotification();

  useEffect(() => {
    // Reset categorization when location changes
    setCategorizedPantry(null);
    setSearchTerm('');
    setStorageFilter('all');
  }, [activeLocation]);
  
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim()) {
      const itemsToAdd = newItem.split(',').map(item => item.trim()).filter(Boolean);
      onAddItems(itemsToAdd, activeLocation, newItemDate, newItemStorageType);
      setNewItem('');
      setCategorizedPantry(null); // Invalidate categorization
    }
  };

  const handleEditSave = (updatedItem: PantryItem) => {
    if (editingItem) {
      onUpdateItem(editingItem.item, updatedItem, activeLocation);
      setEditingItem(null);
      setCategorizedPantry(null); // Invalidate categorization
    }
  };

  const handleToggleSelectItem = (originalIndex: number) => {
    // FIX: Explicitly typed the `prev` parameter to `Record<PantryLocation, Set<number>>` to resolve an error where it was being inferred as `unknown`, preventing property access.
    setSelectedItems((prev: Record<PantryLocation, Set<number>>) => {
        const newSelection = new Set(prev[activeLocation]);
        if (newSelection.has(originalIndex)) {
            newSelection.delete(originalIndex);
        } else {
            newSelection.add(originalIndex);
        }
        return { ...prev, [activeLocation]: newSelection };
    });
  };

  const handleSelectAll = () => {
      setSelectedItems(prev => {
          const allIndices = new Set(filteredAndSortedPantry.map((item) => item.originalIndex));
          return { ...prev, [activeLocation]: allIndices };
      });
  };

  const handleDeselectAll = () => {
      setSelectedItems(prev => ({ ...prev, [activeLocation]: new Set() }));
  };

  const handleGenerateFromSelected = () => {
    const allItems = pantry[activeLocation] || [];
    const selectedItemTexts = Array.from(selectedItems[activeLocation]).map(index => allItems[index].text);
    onGenerateFromSelectedPantryItemsRequest(selectedItemTexts);
  };
  
  const handleMoveSelected = () => {
    if (selectedItems[activeLocation].size > 0) {
      setIsMoveModalOpen(true);
    }
  };
  
  const executeMove = (destination: PantryLocation) => {
    onMoveItems(Array.from(selectedItems[activeLocation]), activeLocation, destination);
    handleDeselectAll();
    setIsMoveModalOpen(false);
    setCategorizedPantry(null);
  };
  
  const handleCategorize = async () => {
    if (isCategorizing || filteredAndSortedPantry.length === 0) return;
    setIsCategorizing(true);
    setEditingItem(null); // Close any open editor
    try {
        const ingredientTexts = filteredAndSortedPantry.map(item => item.text);
        const result: CategorizedIngredient[] = await categorizeIngredients(ingredientTexts);
        
        const originalItemMap = new Map(filteredAndSortedPantry.map(item => [item.text.toLowerCase(), item]));
        
        const grouped: Record<string, PantryItemWithIndex[]> = {};
        
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

        const newExpanded: Record<string, boolean> = {};
        for (const key of Object.keys(grouped)) {
            newExpanded[key] = true;
        }
        setExpandedAIGroups(newExpanded);
        setCategorizedPantry(grouped);

    } catch (e: any) {
        showNotification(e.message, 'info');
    } finally {
        setIsCategorizing(false);
    }
  };

  const filteredAndSortedPantry: PantryItemWithIndex[] = useMemo(() => {
    const list = pantry[activeLocation] || [];
    
    return list
      .map((item, originalIndex) => ({ ...item, originalIndex })) // Add original index
      .filter(item => item.text.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(item => {
        if (storageFilter === 'all') return true;
        return item.storageType === storageFilter;
      })
      .sort((a, b) => {
        const urgency: Record<StorageType, number> = {
          [StorageType.REFRIGERATOR]: 1,
          [StorageType.PANTRY]: 2,
          [StorageType.FREEZER]: 3,
        };
        
        const urgencyA = urgency[a.storageType];
        const urgencyB = urgency[b.storageType];

        if (urgencyA !== urgencyB) {
            return urgencyA - urgencyB;
        }

        if (a.dateAdded === null && b.dateAdded !== null) return -1;
        if (a.dateAdded !== null && b.dateAdded === null) return 1;
        if (a.dateAdded === null && b.dateAdded === null) {
            return a.text.localeCompare(b.text);
        }

        const timeA = new Date(a.dateAdded!).getTime();
        const timeB = new Date(b.dateAdded!).getTime();
        if (timeA !== timeB) {
            return timeA - timeB;
        }

        return a.text.localeCompare(b.text);
    });
  }, [pantry, activeLocation, searchTerm, storageFilter]);
  
  const today = new Date();
  const getDaysOld = (dateString: string | null): number | null => {
    if (!dateString) return null;
    const itemDate = new Date(dateString);
    const diffTime = today.getTime() - itemDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getUrgency = (item: PantryItem): { colorClass: string; label: string } => {
    const daysOld = getDaysOld(item.dateAdded);
    if (daysOld === null) {
      return { colorClass: 'border-yellow-400 bg-yellow-50', label: 'Ismeretlen korú' };
    }

    switch (item.storageType) {
      case StorageType.REFRIGERATOR:
        if (daysOld > 7) return { colorClass: 'border-red-500 bg-red-50', label: `${daysOld} napos (sürgős)` };
        if (daysOld > 4) return { colorClass: 'border-orange-400 bg-orange-50', label: `${daysOld} napos` };
        return { colorClass: 'border-gray-200', label: `${daysOld} napos` };
      case StorageType.FREEZER:
        if (daysOld > 365) return { colorClass: 'border-red-500 bg-red-50', label: `${daysOld} napos` };
        if (daysOld > 180) return { colorClass: 'border-orange-400 bg-orange-50', label: `${daysOld} napos` };
        return { colorClass: 'border-gray-200', label: `${daysOld} napos` };
      case StorageType.PANTRY:
      default:
        if (daysOld > 180) return { colorClass: 'border-red-500 bg-red-50', label: `${daysOld} napos` };
        if (daysOld > 90) return { colorClass: 'border-orange-400 bg-orange-50', label: `${daysOld} napos` };
        return { colorClass: 'border-gray-200', label: `${daysOld} napos` };
    }
  };
  
  const storageTypeLabels: Record<StorageType, { label: string; icon: string }> = {
    [StorageType.FREEZER]: { label: "Fagyasztó", icon: "❄️" },
    [StorageType.REFRIGERATOR]: { label: "Hűtő", icon: "🧊" },
    [StorageType.PANTRY]: { label: "Kamra", icon: "🥫" },
  };

  const filterOptions: {value: StorageType | 'all', label: string}[] = [
    { value: 'all', label: 'Minden' },
    { value: StorageType.REFRIGERATOR, label: 'Hűtő' },
    { value: StorageType.PANTRY, label: 'Kamra' },
    { value: StorageType.FREEZER, label: 'Fagyasztó' },
  ];
  
  const renderItemList = (items: PantryItemWithIndex[]) => (
     <ul className="divide-y divide-gray-200">
        {items.map((item: PantryItemWithIndex) => {
          const urgency = getUrgency(item);
          const isSelected = selectedItems[activeLocation].has(item.originalIndex);

          return (
            <li key={`${item.text}-${item.dateAdded}-${item.originalIndex}`} className={`flex items-center justify-between p-3 gap-2 transition-colors ${isSelected ? 'bg-primary-100' : ''}`}>
              <div className="flex items-center gap-3 flex-grow min-w-0">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleSelectItem(item.originalIndex)}
                  className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0"
                  aria-label={`'${item.text}' kiválasztása`}
                />
                <div className="flex-grow">
                  <p className="font-medium text-gray-800 break-words">{item.text}</p>
                  <div className="flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                    {item.quantity && <p>{item.quantity}</p>}
                    <p className={`border-l-4 pl-2 ${urgency.colorClass}`}>
                       {urgency.label}
                    </p>
                    <p>{storageTypeLabels[item.storageType].icon} {storageTypeLabels[item.storageType].label}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <button onClick={() => setEditingItem({ item })} className="text-sm font-medium text-blue-600 hover:text-blue-800 p-1">
                  Szerkesztés
                </button>
                <button onClick={() => onRemoveItem(item, activeLocation)} className="text-sm font-medium text-red-600 hover:text-red-800 p-1">
                  Törlés
                </button>
              </div>
            </li>
          );
        })}
      </ul>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-primary-800">Kamra Tartalma</h2>
      
        <div className="mb-4">
            <div className="flex border-b border-gray-200">
                {PANTRY_LOCATIONS.map(location => (
                    <button
                        key={location}
                        onClick={() => setActiveLocation(location)}
                        className={`py-3 px-4 font-semibold rounded-t-lg transition-colors text-sm sm:text-base ${
                            activeLocation === location 
                            ? 'border-l border-t border-r border-gray-200 bg-white text-primary-600'
                            : 'text-gray-500 hover:text-primary-600 hover:bg-gray-50'
                        }`}
                    >
                        Kamra ({location})
                    </button>
                ))}
            </div>
        </div>

      <form onSubmit={handleAddItem} className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
        <h3 className="text-lg font-semibold text-gray-700">Új tétel hozzáadása</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Új tétel (vesszővel elválasztva)..."
              className="p-3 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
              aria-label="Új kamra tétel"
            />
            <input
              type="date"
              value={newItemDate || ''}
              onChange={(e) => setNewItemDate(e.target.value)}
              className="p-3 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
              aria-label="Betárolás dátuma"
            />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
             <select 
                value={newItemStorageType}
                onChange={(e) => setNewItemStorageType(e.target.value as StorageType)}
                className="p-3 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
              >
                  {Object.entries(storageTypeLabels).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
              </select>
            <button
              type="submit"
              className="bg-primary-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition"
              aria-label="Tétel hozzáadása a kamrához"
            >
              Hozzáadás
            </button>
        </div>
      </form>
      
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
                onClick={onGenerateFromPantryRequest}
                className="flex-1 bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg shadow-sm hover:bg-purple-700"
            >
                Főzés a legrégebbi alapanyagokból
            </button>
            <button
                onClick={onMoveCheckedToPantryRequest}
                disabled={shoppingListItems.filter(i => i.checked).length === 0}
                className="flex-1 bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-sm hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                Kipipáltak áthelyezése a kamrába
            </button>
        </div>

        <div className="p-4 bg-gray-50 border rounded-lg space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="search"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Szűrés név alapján..."
                className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
              />
              <select 
                value={storageFilter}
                onChange={e => setStorageFilter(e.target.value as StorageType | 'all')}
                className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
              >
                  {filterOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
          </div>
          {filteredAndSortedPantry.length > 0 && (
             <div className="flex flex-col sm:flex-row gap-2">
                <button
                    onClick={handleCategorize}
                    disabled={isCategorizing}
                    className="flex-1 bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-purple-700 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                    {isCategorizing ? 'Kategorizálás...' : 'AI-alapú kategorizálás'}
                </button>
                {categorizedPantry && (
                    <button
                        onClick={() => setCategorizedPantry(null)}
                        className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition"
                    >
                        Kategorizálás törlése
                    </button>
                )}
            </div>
          )}
        </div>

        {filteredAndSortedPantry.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
              <div className="flex gap-2">
                <button onClick={handleSelectAll} className="text-sm font-medium text-primary-600 hover:underline">Összes kijelölése</button>
                <button onClick={handleDeselectAll} disabled={selectedItems[activeLocation].size === 0} className="text-sm font-medium text-primary-600 hover:underline disabled:text-gray-400 disabled:no-underline">Kijelölés törlése</button>
              </div>
              <div className="flex gap-2">
                <button onClick={handleMoveSelected} disabled={selectedItems[activeLocation].size === 0} className="text-sm font-medium text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline">Kijelöltek áthelyezése...</button>
                <button onClick={handleGenerateFromSelected} disabled={selectedItems[activeLocation].size === 0} className="text-sm font-medium text-purple-600 hover:underline disabled:text-gray-400 disabled:no-underline">Főzés a kijelöltekből</button>
              </div>
          </div>
        )}

        {categorizedPantry ? (
          <div className="space-y-3">
              {Object.entries(categorizedPantry).map(([category, items]: [string, PantryItemWithIndex[]]) => (
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
                            renderItemList(items)
                        )}
                    </div>
                  ))}
          </div>
        ) : (
          filteredAndSortedPantry.length > 0 ? (
            <div className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              {renderItemList(filteredAndSortedPantry)}
            </div>
          ) : (
             <p className="text-center text-gray-500 py-8">Nincs a szűrésnek megfelelő tétel a kamrában.</p>
          )
        )}
      </div>

      <button
        onClick={() => onClearAll(activeLocation)}
        disabled={(pantry[activeLocation] || []).length === 0}
        className="w-full bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-300"
      >
        Teljes kamra ({activeLocation}) törlése
      </button>

      {editingItem && (
        <EditPantryItemModal
          item={editingItem.item}
          onClose={() => setEditingItem(null)}
          onSave={handleEditSave}
        />
      )}
      <MoveItemsModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onMove={executeMove}
        sourceLocation={activeLocation}
        itemCount={selectedItems[activeLocation].size}
      />
    </div>
  );
};

export default PantryView;
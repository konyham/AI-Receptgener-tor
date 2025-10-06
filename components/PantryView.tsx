import React, { useState, useRef, useMemo, useEffect } from 'react';
import { PantryItem, Favorites, BackupData, ShoppingListItem, PantryLocation, PANTRY_LOCATIONS, StorageType, UserProfile, OptionItem } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import * as imageStore from '../services/imageStore';
import MoveItemsModal from './MoveItemsModal';

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
  favorites: Favorites;
  shoppingList: ShoppingListItem[];
  users: UserProfile[];
  onAddItems: (items: string[], location: PantryLocation, date: string | null, storageType: StorageType) => void;
  onUpdateItem: (index: number, updatedItem: PantryItem, location: PantryLocation) => void;
  onRemoveItem: (index: number, location: PantryLocation) => void;
  onClearAll: (location: PantryLocation) => void;
  onMoveCheckedToPantryRequest: () => void;
  onGenerateFromPantryRequest: () => void;
  onGenerateFromSelectedPantryItemsRequest: (items: string[]) => void;
  onImportData: (data: BackupData) => void;
  shoppingListItems: ShoppingListItem[];
  onMoveItems: (indices: number[], sourceLocation: PantryLocation, destinationLocation: PantryLocation) => void;
  mealTypes: OptionItem[];
  cuisineOptions: OptionItem[];
  cookingMethodsList: OptionItem[];
  cookingMethodCapacities: Record<string, number | null>;
  orderedMealTypes: OptionItem[];
  orderedCuisineOptions: OptionItem[];
  orderedCookingMethods: OptionItem[];
}

const PantryView: React.FC<PantryViewProps> = ({
  pantry,
  favorites,
  shoppingList,
  users,
  onAddItems,
  onUpdateItem,
  onRemoveItem,
  onClearAll,
  onMoveCheckedToPantryRequest,
  onGenerateFromPantryRequest,
  onGenerateFromSelectedPantryItemsRequest,
  onImportData,
  shoppingListItems,
  onMoveItems,
  mealTypes,
  cuisineOptions,
  cookingMethodsList,
  cookingMethodCapacities,
  orderedMealTypes,
  orderedCuisineOptions,
  orderedCookingMethods,
}) => {
  const [newItem, setNewItem] = useState('');
  const [newItemDate, setNewItemDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [newItemStorageType, setNewItemStorageType] = useState<StorageType>(StorageType.PANTRY);
  const [activeLocation, setActiveLocation] = useState<PantryLocation>(PANTRY_LOCATIONS[0]);
  const [editingItem, setEditingItem] = useState<{ index: number; item: PantryItem } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<PantryLocation, Set<number>>>({ Tiszadada: new Set(), Vásárosnamény: new Set() });
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [storageFilter, setStorageFilter] = useState<StorageType | 'all'>('all');
  
  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim()) {
      const itemsToAdd = newItem.split(',').map(item => item.trim()).filter(Boolean);
      onAddItems(itemsToAdd, activeLocation, newItemDate, newItemStorageType);
      setNewItem('');
    }
  };

  const handleEditSave = (updatedItem: PantryItem) => {
    if (editingItem) {
      onUpdateItem(editingItem.index, updatedItem, activeLocation);
      setEditingItem(null);
    }
  };

  const handleToggleSelectItem = (index: number) => {
    setSelectedItems(prev => {
        const newSelection = new Set(prev[activeLocation]);
        if (newSelection.has(index)) {
            newSelection.delete(index);
        } else {
            newSelection.add(index);
        }
        return { ...prev, [activeLocation]: newSelection };
    });
  };

  const handleSelectAll = () => {
      setSelectedItems(prev => {
          const allIndices = new Set(filteredAndSortedPantry.map((_, index) => index));
          return { ...prev, [activeLocation]: allIndices };
      });
  };

  const handleDeselectAll = () => {
      setSelectedItems(prev => ({ ...prev, [activeLocation]: new Set() }));
  };

  const handleGenerateFromSelected = () => {
    const selectedItemTexts = Array.from(selectedItems[activeLocation]).map(index => filteredAndSortedPantry[index].text);
    onGenerateFromSelectedPantryItemsRequest(selectedItemTexts);
  };
  
  const handleMoveSelected = () => {
    if (selectedItems[activeLocation].size > 0) {
      setIsMoveModalOpen(true);
    }
  };
  
  const executeMove = (destination: PantryLocation) => {
    onMoveItems(Array.from(selectedItems[activeLocation]), activeLocation, destination);
    handleDeselectAll(); // Clear selection after moving
    setIsMoveModalOpen(false);
  };

  const filteredAndSortedPantry = useMemo(() => {
    const list = pantry[activeLocation] || [];
    
    return list
      .filter(item => item.text.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(item => {
        if (storageFilter === 'all') return true;
        return item.storageType === storageFilter;
      })
      .sort((a, b) => {
        const urgency = {
          [StorageType.REFRIGERATOR]: 1,
          [StorageType.PANTRY]: 2,
          [StorageType.FREEZER]: 3,
        };
        
        const urgencyA = urgency[a.storageType];
        const urgencyB = urgency[b.storageType];

        if (urgencyA !== urgencyB) {
            return urgencyA - urgencyB;
        }

        // Storage types are the same, sort by date
        if (a.dateAdded === null && b.dateAdded !== null) return -1; // a is more urgent
        if (a.dateAdded !== null && b.dateAdded === null) return 1;  // b is more urgent
        if (a.dateAdded === null && b.dateAdded === null) {
            return a.text.localeCompare(b.text); // stable sort for items with no date
        }

        // Both have dates, sort oldest first
        const timeA = new Date(a.dateAdded!).getTime();
        const timeB = new Date(b.dateAdded!).getTime();
        if (timeA !== timeB) {
            return timeA - timeB;
        }

        return a.text.localeCompare(b.text); // stable sort for items with same date
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
  
  const handleExport = async () => {
    try {
      const allImages = await imageStore.getAllImages();
      const favoritesWithImages = JSON.parse(JSON.stringify(favorites));

      for (const category in favoritesWithImages) {
        for (const recipe of favoritesWithImages[category]) {
          if (recipe.imageUrl && recipe.imageUrl.startsWith('indexeddb:')) {
            const imageId = recipe.imageUrl.substring(10);
            if (allImages[imageId]) recipe.imageUrl = allImages[imageId];
          }
          if (recipe.instructions) {
            for (const instruction of recipe.instructions) {
              if (instruction.imageUrl && instruction.imageUrl.startsWith('indexeddb:')) {
                const imageId = instruction.imageUrl.substring(10);
                if (allImages[imageId]) instruction.imageUrl = allImages[imageId];
              }
            }
          }
        }
      }

      const dataToSave: BackupData = {
        favorites: favoritesWithImages,
        shoppingList,
        pantry,
        users,
        mealTypes,
        cuisineOptions,
        cookingMethods: cookingMethodsList,
        cookingMethodCapacities,
        mealTypesOrder: orderedMealTypes.map(item => item.value),
        cuisineOptionsOrder: orderedCuisineOptions.map(item => item.value),
        cookingMethodsOrder: orderedCookingMethods.map(item => item.value),
      };
      const jsonString = JSON.stringify(dataToSave, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const time = now.toTimeString().split(' ')[0].substring(0, 5).replace(':', '-');
      const suggestedName = `konyhamiki_mentes_${date}_${time}.json`;

      if ('showSaveFilePicker' in window && window.self === window.top) {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{ description: 'JSON Fájl', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        showNotification('Adatok sikeresen mentve!', 'success');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Hiba a mentés során:", err);
        showNotification('Hiba történt az adatok mentése közben.', 'info');
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const data = JSON.parse(text);
          onImportData(data);
        } else {
           throw new Error('A fájl tartalma nem olvasható szövegként.');
        }
      } catch (error) {
        console.error("Hiba a betöltés során:", error);
        showNotification('Hiba történt a fájl beolvasása vagy feldolgozása közben.', 'info');
      }
    };
     reader.onerror = () => {
        showNotification('Hiba történt a fájl olvasása közben.', 'info');
    };
    reader.onloadend = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    reader.readAsText(file);
  };
  
  // FIX: Explicitly type `l` to `PantryItem[]` to resolve type error when accessing `.length`.
  const hasAnyData = Object.keys(favorites).length > 0 || shoppingListItems.length > 0 || Object.values(pantry).some((l: PantryItem[]) => l.length > 0) || users.length > 0;
  
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
                className="flex-1 bg-purple-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition"
            >
                Meglepetés recept a kamrából
            </button>
            <button
                onClick={handleGenerateFromSelected}
                disabled={selectedItems[activeLocation].size === 0}
                className="flex-1 bg-green-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                Recept a kijelöltekből ({selectedItems[activeLocation].size})
            </button>
        </div>
         <button 
            onClick={onMoveCheckedToPantryRequest}
            disabled={shoppingListItems.filter(item => item.checked).length === 0}
            className="w-full bg-blue-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
            Kipipáltak áthelyezése a bevásárlólistáról ide
        </button>
      </div>

       <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-lg p-2 bg-gray-100">
                <span className="text-sm font-semibold text-gray-600 mr-2">Szűrés:</span>
                {filterOptions.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => setStorageFilter(opt.value)}
                        className={`flex-1 sm:flex-auto py-2 px-4 rounded-md font-semibold transition-colors text-sm ${storageFilter === opt.value ? 'bg-primary-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-primary-50'}`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Keresés a listában..."
              className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
              aria-label="Keresés a kamra tételei között"
            />
       </div>
      
      {filteredAndSortedPantry.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 justify-between items-center">
            <div className="flex gap-2">
                <button onClick={handleSelectAll} className="text-sm font-semibold text-primary-600 hover:underline">Összes kijelölése</button>
                <button onClick={handleDeselectAll} disabled={selectedItems[activeLocation].size === 0} className="text-sm font-semibold text-primary-600 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed">Kijelölés törlése</button>
            </div>
            {PANTRY_LOCATIONS.length > 1 && (
                <button onClick={handleMoveSelected} disabled={selectedItems[activeLocation].size === 0} className="text-sm font-semibold text-blue-600 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed">
                    Kijelöltek áthelyezése
                </button>
            )}
          </div>
          <ul className="divide-y divide-gray-200">
            {filteredAndSortedPantry.map((item, index) => {
              const urgency = getUrgency(item);
              const isSelected = selectedItems[activeLocation].has(index);

              return (
                <li key={index} className={`flex items-center justify-between p-3 gap-2 transition-colors ${isSelected ? 'bg-primary-100' : ''}`}>
                  <div className="flex items-center gap-3 flex-grow min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectItem(index)}
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
                    <button onClick={() => setEditingItem({ index, item })} className="text-sm font-medium text-blue-600 hover:text-blue-800 p-1">
                      Szerkesztés
                    </button>
                    <button onClick={() => onRemoveItem(index, activeLocation)} className="text-sm font-medium text-red-600 hover:text-red-800 p-1">
                      Törlés
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="pt-4 flex flex-col sm:flex-row gap-2 justify-end">
            <button
              onClick={() => {
                if(window.confirm(`Biztosan törli a(z) "${activeLocation}" kamra teljes tartalmát?`)) {
                  onClearAll(activeLocation);
                }
              }}
              className="text-sm bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
            >
              Teljes kamra ürítése ({activeLocation})
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">A kamrád üres vagy a szűrő nem ad eredményt</h3>
            <p className="mt-1 text-sm text-gray-500">Adj hozzá tételeket, vagy módosítsd a keresési/szűrési feltételeket.</p>
        </div>
      )}
      
       <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-200">
        <h3 className="text-lg font-bold text-center text-gray-700 mb-4">Adatkezelés</h3>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
                onClick={handleExport}
                disabled={!hasAnyData}
                className="flex-1 bg-blue-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                Mentés Fájlba
            </button>
            <button
                onClick={handleImportClick}
                className="flex-1 bg-green-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition"
            >
                Betöltés Fájlból
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
              aria-hidden="true"
            />
        </div>
         <p className="text-xs text-center text-gray-500 mt-3">A betöltés összefésüli a meglévő adatokat az újonnan betöltöttekkel.</p>
      </div>

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

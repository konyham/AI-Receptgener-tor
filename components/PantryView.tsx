// components/PantryView.tsx
import React, { useState } from 'react';
import { PantryItem, PantryLocation, PANTRY_LOCATIONS, ShoppingListItem, StorageType } from '../types';
import TransferItemsModal from './MoveItemsModal';
import { categorizeIngredients } from '../services/geminiService';
import { CategorizedIngredient } from '../types';
import { useNotification } from '../contexts/NotificationContext';


interface PantryViewProps {
  pantry: Record<PantryLocation, PantryItem[]>;
  onAddItems: (items: string[], location: PantryLocation, date: string | null, storageType: StorageType) => void;
  onUpdateItem: (originalItem: PantryItem, updatedItem: PantryItem, location: PantryLocation) => void;
  onRemoveItem: (item: PantryItem, location: PantryLocation) => void;
  onClearAll: (location: PantryLocation) => void;
  onMoveCheckedToPantryRequest: () => void;
  onGenerateFromPantryRequest: () => void;
  shoppingListItems: ShoppingListItem[];
  onMoveItems: (indices: number[], source: PantryLocation, destination: PantryLocation) => void;
  onCopyItems: (indices: number[], source: PantryLocation, destination: PantryLocation) => void;
  onGenerateFromSelectedPantryItemsRequest: (items: string[]) => void;
  onAddItemsToShoppingList: (items: string[]) => void;
}

const PantryLocationView: React.FC<{
    location: PantryLocation;
    items: PantryItem[];
    onAddItem: (itemText: string, date: string | null, storageType: StorageType) => void;
    onUpdateItem: (originalItem: PantryItem, updatedItem: PantryItem) => void;
    onRemoveItem: (item: PantryItem) => void;
    onClearAll: () => void;
    onTransferSelected: (indices: number[]) => void;
    onGenerateFromSelected: (items: string[]) => void;
    onAddItemsToShoppingList: (items: string[]) => void;
}> = ({ location, items, onAddItem, onUpdateItem, onRemoveItem, onClearAll, onTransferSelected, onGenerateFromSelected, onAddItemsToShoppingList }) => {
    const [newItemText, setNewItemText] = useState('');
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [isCategorizing, setIsCategorizing] = useState(false);
    const [categorizedItems, setCategorizedItems] = useState<Record<string, PantryItem[]> | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const { showNotification } = useNotification();


    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if(newItemText.trim()) {
            onAddItem(newItemText.trim(), new Date().toISOString().split('T')[0], StorageType.PANTRY);
            setNewItemText('');
            setCategorizedItems(null);
        }
    };
    
    const toggleSelection = (index: number) => {
        setSelectedIndices(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if(selectedIndices.size === items.length) {
            setSelectedIndices(new Set());
        } else {
            setSelectedIndices(new Set(items.map((_, i) => i)));
        }
    };
    
    const sortedItems = [...items].sort((a,b) => (a.text > b.text) ? 1 : -1);
    
    const handleRemoveItem = (item: PantryItem) => {
        onRemoveItem(item);
        setCategorizedItems(null);
    };

    const handleTransfer = () => {
        const selectedItemsFromSorted = Array.from(selectedIndices).map(i => sortedItems[i]);
        const originalIndicesToMove = selectedItemsFromSorted
            .map(selectedItem =>
                items.findIndex(originalItem =>
                    originalItem.text === selectedItem.text &&
                    originalItem.dateAdded === selectedItem.dateAdded &&
                    originalItem.storageType === selectedItem.storageType
                )
            )
            .filter(index => index !== -1);
    
        onTransferSelected(originalIndicesToMove);
        setSelectedIndices(new Set()); // Clear selection after initiating action
    };

    const handleCategorizeToggle = async () => {
        if (categorizedItems) {
            setCategorizedItems(null);
            return;
        }

        setIsCategorizing(true);
        try {
            const itemTexts = sortedItems.map(item => item.text);
            const categories = await categorizeIngredients(itemTexts);
            
            const categoryMap = new Map<string, CategorizedIngredient>();
            categories.forEach(catItem => categoryMap.set(catItem.ingredient.toLowerCase(), catItem));

            const grouped: Record<string, PantryItem[]> = {};
            sortedItems.forEach(item => {
                const result = categoryMap.get(item.text.toLowerCase());
                const category = result?.category || 'Egyéb';
                if (!grouped[category]) {
                grouped[category] = [];
                }
                grouped[category].push(item);
            });

            setCategorizedItems(grouped);
            setExpandedCategories(Object.keys(grouped).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
        } catch (error: any) {
            console.error("Pantry categorization failed:", error);
            showNotification(`Hiba a kategorizálás közben: ${error.message}`, 'info');
        } finally {
            setIsCategorizing(false);
        }
    };

    const toggleCategoryExpansion = (category: string) => {
        setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
    };

    const renderItems = () => {
        if (isCategorizing) {
            return <div className="text-center p-8 text-gray-500">Kategorizálás folyamatban...</div>;
        }

        if (categorizedItems) {
            return (
                <div className="space-y-4">
                {/* FIX: Explicitly type the destructured arguments from Object.entries to resolve 'unknown' type errors. */}
                {Object.entries(categorizedItems).sort((a, b) => a[0].localeCompare(b[0])).map(([category, catItems]: [string, PantryItem[]]) => (
                    <div key={category} className="border border-gray-200 rounded-lg dark:border-gray-700 overflow-hidden">
                        <button onClick={() => toggleCategoryExpansion(category)} className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700">
                            <span className="font-bold text-primary-700 dark:text-primary-300">{category} ({catItems.length})</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 transform transition-transform ${expandedCategories[category] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {expandedCategories[category] && (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                {catItems.map(item => (
                                    <li key={item.text} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800">
                                        <div className="flex items-center gap-2">
                                            <span>{item.text}</span>
                                            <span className="text-xs text-gray-500">({item.dateAdded || 'nincs dátum'})</span>
                                        </div>
                                        <button onClick={() => handleRemoveItem(item)} className="text-red-500 hover:text-red-700 p-1">Törlés</button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}
            </div>
            );
        }

        return (
            <>
                <div className="flex items-center justify-between">
                        <button onClick={handleSelectAll} className="text-sm text-blue-600 hover:underline">
                        {selectedIndices.size === items.length ? 'Kijelölés megszüntetése' : 'Összes kijelölése'}
                    </button>
                    {selectedIndices.size > 0 && (
                        <div className="flex gap-2">
                            <button onClick={handleTransfer} className="text-sm bg-green-500 text-white px-3 py-1 rounded-md">Áthelyezés/Másolás...</button>
                            <button onClick={() => onGenerateFromSelected(Array.from(selectedIndices).map(i => sortedItems[i].text))} className="text-sm bg-purple-500 text-white px-3 py-1 rounded-md">Főzés...</button>
                            <button 
                                onClick={() => {
                                    const selectedItems = Array.from(selectedIndices).map(i => sortedItems[i].text);
                                    onAddItemsToShoppingList(selectedItems);
                                    showNotification(`${selectedItems.length} tétel a bevásárlólistára került.`, 'success');
                                    setSelectedIndices(new Set());
                                }} 
                                className="text-sm bg-blue-500 text-white px-3 py-1 rounded-md"
                            >
                                Bevásárlólistára
                            </button>
                        </div>
                    )}
                </div>
                <ul className="space-y-2">
                    {sortedItems.map((item, index) => (
                        <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={selectedIndices.has(index)} onChange={() => toggleSelection(index)} className="h-5 w-5 rounded" />
                                <span>{item.text}</span>
                                <span className="text-xs text-gray-500">({item.dateAdded || 'nincs dátum'})</span>
                            </div>
                            <button onClick={() => handleRemoveItem(item)} className="text-red-500 hover:text-red-700">Törlés</button>
                        </li>
                    ))}
                </ul>
            </>
        );
    };

    return (
        <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                <h3 className="text-xl font-bold text-primary-700">Kamra ({location})</h3>
                {items.length > 0 && (
                    <button onClick={handleCategorizeToggle} disabled={isCategorizing} className="bg-purple-600 text-white font-semibold py-1 px-3 rounded-lg shadow-sm hover:bg-purple-700 disabled:bg-gray-400 text-sm">
                        {isCategorizing ? '...' : (categorizedItems ? 'Eredeti nézet' : 'AI Kategorizálás')}
                    </button>
                )}
            </div>
            <form onSubmit={handleAddItem} className="flex gap-2">
                <input
                    type="text"
                    value={newItemText}
                    onChange={e => setNewItemText(e.target.value)}
                    placeholder="Új tétel hozzáadása..."
                    className="flex-grow p-2 border rounded-md"
                />
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md">Hozzáadás</button>
            </form>
            {sortedItems.length > 0 ? (
                <>
                    {renderItems()}
                    <button onClick={onClearAll} className="w-full bg-red-500 text-white py-2 rounded-md">Teljes kamra ürítése ({location})</button>
                </>
            ) : (
                <p className="text-gray-500">A kamra ({location}) üres.</p>
            )}
        </div>
    );
}


const PantryView: React.FC<PantryViewProps> = (props) => {
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferPayload, setTransferPayload] = useState<{ indices: number[], source: PantryLocation } | null>(null);

    const handleTransferRequest = (indices: number[], source: PantryLocation) => {
        setTransferPayload({ indices, source });
        setIsTransferModalOpen(true);
    };

    const handleConfirmTransfer = (destination: PantryLocation, mode: 'move' | 'copy') => {
        if(transferPayload) {
            if (mode === 'move') {
                props.onMoveItems(transferPayload.indices, transferPayload.source, destination);
            } else {
                props.onCopyItems(transferPayload.indices, transferPayload.source, destination);
            }
        }
        setIsTransferModalOpen(false);
        setTransferPayload(null);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-primary-800">Kamra Tartalma</h2>
             <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={props.onMoveCheckedToPantryRequest} className="flex-1 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg" disabled={!props.shoppingListItems.some(i => i.checked)}>
                    Kipipáltak áthelyezése a kamrába
                </button>
                <button onClick={props.onGenerateFromPantryRequest} className="flex-1 bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg">
                    Recept generálása kamra tartalmából
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* FIX: Explicitly type the `location` argument in `.map()` to prevent 'unknown' index type errors. */}
                {PANTRY_LOCATIONS.map((location: PantryLocation) => (
                     <PantryLocationView
                        key={location}
                        location={location}
                        items={props.pantry[location] || []}
                        onAddItem={(text, date, st) => props.onAddItems([text], location, date, st)}
                        onUpdateItem={(orig, updated) => props.onUpdateItem(orig, updated, location)}
                        onRemoveItem={(item) => props.onRemoveItem(item, location)}
                        onClearAll={() => props.onClearAll(location)}
                        onTransferSelected={(indices) => handleTransferRequest(indices, location)}
                        onGenerateFromSelected={props.onGenerateFromSelectedPantryItemsRequest}
                        onAddItemsToShoppingList={props.onAddItemsToShoppingList}
                    />
                ))}
            </div>
            {isTransferModalOpen && transferPayload && (
                <TransferItemsModal
                    isOpen={isTransferModalOpen}
                    onClose={() => setIsTransferModalOpen(false)}
                    onConfirm={handleConfirmTransfer}
                    sourceLocation={transferPayload.source}
                    itemCount={transferPayload.indices.length}
                />
            )}
        </div>
    );
};

export default PantryView;

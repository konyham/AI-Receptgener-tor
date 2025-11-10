import React, { useState, useEffect, useRef } from 'react';

interface ImportUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParse: (url: string) => void;
  isParsing: boolean;
  error: string | null;
}

const ImportUrlModal: React.FC<ImportUrlModalProps> = ({ isOpen, onClose, onParse, isParsing, error }) => {
  const [url, setUrl] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleParseClick = () => {
    if (url.trim()) {
      onParse(url.trim());
    }
  };
  
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && e.target === modalRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-url-title"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 m-4 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="import-url-title" className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Recept Importálása URL-ből</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">Illessze be egy recept weboldalának linkjét, és megpróbáljuk beolvasni az adatokat az űrlap kitöltéséhez.</p>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="recipe-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Recept URL</label>
            <input
              ref={inputRef}
              id="recipe-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              disabled={isParsing}
            />
          </div>
          {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} disabled={isParsing} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
            Mégse
          </button>
          <button
            onClick={handleParseClick}
            disabled={isParsing || !url.trim()}
            className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700 flex items-center gap-2 disabled:bg-gray-400 min-w-[120px]"
          >
            {isParsing && (
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {isParsing ? 'Beolvasás...' : 'Beolvasás'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportUrlModal;
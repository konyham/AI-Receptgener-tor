import React, { useEffect, useRef } from 'react';

interface LoadOnStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: () => void;
}

const LoadOnStartModal: React.FC<LoadOnStartModalProps> = ({ isOpen, onClose, onLoad }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="load-on-start-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-md text-center"
      >
        <h2 id="load-on-start-title" className="text-2xl font-bold text-primary-800 mb-4">Üdvözöljük újra!</h2>
        <p className="text-gray-600 mb-6">Úgy tűnik, az alkalmazás üres adatokkal indult. Szeretné betölteni a korábban fájlba mentett adatait?</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
                onLoad();
                onClose();
            }}
            className="flex-1 bg-green-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition"
          >
            Betöltés Fájlból
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Mégsem
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadOnStartModal;

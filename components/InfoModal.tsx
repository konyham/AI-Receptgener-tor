import React, { useEffect, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  isLoading: boolean;
  onRegenerate: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, content, isLoading, onRegenerate }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 m-4 w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="info-modal-title" className="text-2xl font-bold text-primary-800 dark:text-primary-300 mb-4 flex-shrink-0">
          Információ a receptgenerátorról
        </h2>
        <div className="overflow-y-auto pr-2 -mr-4 dark:text-gray-300">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner message="Információ generálása a receptgenerátorról..." />
            </div>
          ) : (
            <div
              className="space-y-4 prose dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>
        <div className="mt-6 flex justify-between items-center gap-3 border-t dark:border-gray-700 pt-4 flex-shrink-0">
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center gap-2 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Újragenerálás
          </button>
          <button
            onClick={onClose}
            className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700 transition-colors"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
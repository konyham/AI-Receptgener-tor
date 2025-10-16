import React, { useEffect, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  isLoading: boolean;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, content, isLoading }) => {
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
        className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="info-modal-title" className="text-2xl font-bold text-primary-800 mb-4 flex-shrink-0">
          Információ a receptgenerátorról
        </h2>
        <div className="overflow-y-auto pr-2 -mr-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner message="Információ generálása a receptgenerátorról..." />
            </div>
          ) : (
            <div
              className="space-y-4"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t pt-4 flex-shrink-0">
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

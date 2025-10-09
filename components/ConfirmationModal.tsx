
import React, { useEffect, useRef } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Törlés',
  cancelText = 'Mégse',
  isConfirming = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!isConfirming) onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isConfirming]);
  
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (modalRef.current && e.target === modalRef.current && !isConfirming) {
        onClose();
      }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-modal-title" className="text-xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:bg-red-400 min-w-[110px]"
          >
            {isConfirming ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Folyamatban...</span>
              </>
            ) : (
                confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

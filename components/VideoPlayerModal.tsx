import React, { useEffect, useRef } from 'react';

interface VideoPlayerModalProps {
  videoUrl: string;
  recipeName: string;
  onClose: () => void;
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ videoUrl, recipeName, onClose }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (modalRef.current && event.target === modalRef.current) {
            onClose();
        }
    };

  return (
    <div
        ref={modalRef}
        onClick={handleBackdropClick}
        className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-title"
    >
      <div className="bg-gray-900 rounded-2xl shadow-xl p-4 w-full max-w-2xl text-center relative mx-4">
        <h2 id="video-title" className="text-xl font-bold text-white mb-3">{recipeName} - Videó</h2>
        <video
            src={videoUrl}
            controls
            autoPlay
            loop
            className="w-full rounded-lg aspect-video"
        >
            A böngészője nem támogatja a videó lejátszását.
        </video>
        <button 
            onClick={onClose} 
            className="absolute -top-3 -right-3 bg-white text-gray-800 rounded-full h-8 w-8 flex items-center justify-center shadow-lg hover:bg-gray-200"
            aria-label="Videó bezárása"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default VideoPlayerModal;

import React from 'react';

interface VideoGenerationModalProps {
  progressMessage: string;
}

const VideoGenerationModal: React.FC<VideoGenerationModalProps> = ({ progressMessage }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true">
      <svg className="animate-spin h-16 w-16 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <h2 className="text-2xl font-bold text-white mt-6">Videó generálása...</h2>
      <p className="text-lg text-primary-200 mt-2 text-center max-w-xs">{progressMessage}</p>
      <p className="text-sm text-gray-400 mt-4">Ez a folyamat néhány percig is eltarthat.</p>
    </div>
  );
};

export default VideoGenerationModal;

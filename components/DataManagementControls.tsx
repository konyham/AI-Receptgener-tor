import React from 'react';

interface DataManagementControlsProps {
  onExport: () => void;
  onImportClick: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  hasAnyData: boolean;
}

const DataManagementControls: React.FC<DataManagementControlsProps> = ({
  onExport,
  onImportClick,
  onFileChange,
  fileInputRef,
  hasAnyData,
}) => {
  return (
    <div className="mb-6 p-4 bg-gray-100 border border-gray-200 rounded-lg">
      <h3 className="text-lg font-bold text-center text-gray-700 mb-4">Adatkezelés</h3>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={onExport}
          disabled={!hasAnyData}
          className="flex-1 bg-blue-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Mentés Fájlba
        </button>
        <button
          onClick={onImportClick}
          className="flex-1 bg-green-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition flex items-center justify-center gap-2"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Betöltés Fájlból
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileChange}
          accept=".json"
          className="hidden"
          aria-hidden="true"
        />
      </div>
      <p className="text-xs text-center text-gray-500 mt-3">Tipp: A betöltés összefésüli a meglévő adatokat az újonnan betöltöttekkel, nem írja felül őket.</p>
    </div>
  );
};

export default DataManagementControls;

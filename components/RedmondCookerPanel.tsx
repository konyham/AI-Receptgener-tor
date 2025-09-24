import React from 'react';

const RedmondCookerPanel: React.FC = () => {
  return (
    <div className="mt-8 p-4 md:p-6 bg-gray-100 border-2 border-gray-300 rounded-2xl no-print">
      <h3 className="text-xl font-semibold text-center text-gray-800 mb-4">REDMOND RMC-M70 Kezelőpanel Referencia</h3>
      <div className="bg-gray-800 p-2 rounded-lg shadow-inner">
        <svg viewBox="0 0 880 560" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
          {/* Main Panel Background */}
          <path 
            d="M 40 100 C 40 40, 40 40, 100 40 H 780 C 840 40, 840 40, 840 100 V 460 C 840 520, 840 520, 780 520 H 100 C 40 520, 40 520, 40 460 V 100 Z"
            fill="#374151" 
          />
          <path 
            d="M 50 100 C 50 50, 50 50, 100 50 H 780 C 830 50, 830 50, 830 100 V 460 C 830 510, 830 510, 780 510 H 100 C 50 510, 50 510, 50 460 V 100 Z"
            fill="#1f2937"
            stroke="#4b5563"
            strokeWidth="2"
          />
           {/* Grid Texture */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(75, 85, 99, 0.5)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect x="50" y="50" width="780" height="460" rx="50" fill="url(#grid)" fillOpacity="0.5" />


          {/* Brand */}
          <text x="440" y="110" textAnchor="middle" fontSize="36" fontWeight="bold" fill="#E5E7EB" letterSpacing="4">REDMOND</text>

          {/* Central Display Area */}
          <rect x="260" y="150" width="360" height="190" rx="10" fill="#111827" stroke="#4b5563" strokeWidth="1" />
          <g transform="translate(270, 160)">
            {/* Display Screen */}
            <rect width="340" height="170" rx="5" fill="#4a5563" />
            <rect x="5" y="5" width="330" height="160" rx="3" fill="#93a2b1" />

            {/* Program indicators - top row */}
            <text x="35" y="30" fontSize="14" fill="#1F2937">PÁROLÁS</text>
            <rect x="25" y="35" width="70" height="2" fill="#1F2937" fillOpacity="0.3" />
            <text x="120" y="30" fontSize="14" fill="#1F2937">SÜTÉS</text>
            <rect x="110" y="35" width="50" height="2" fill="#1F2937" fillOpacity="0.3" />
            <rect x="170" y="15" width="80" height="25" fill="#111827" stroke="#374151" rx="2" />
            <text x="210" y="30" fontSize="14" fill="white" fontWeight="bold" textAnchor="middle">MULTIPOVAR</text>
            <text x="285" y="30" fontSize="14" fill="#1F2937">TÉSZTA</text>
            <rect x="275" y="35" width="60" height="2" fill="#1F2937" fillOpacity="0.3" />

            {/* Program indicators - bottom row */}
            <text x="35" y="60" fontSize="14" fill="#1F2937">FŐZÉS</text>
            <rect x="25" y="65" width="60" height="2" fill="#1F2937" fillOpacity="0.3" />
            <text x="115" y="60" fontSize="14" fill="#1F2937">PÖRKÖLT</text>
            <rect x="105" y="65" width="70" height="2" fill="#1F2937" fillOpacity="0.3" />
            <text x="200" y="60" fontSize="14" fill="#1F2937">LEVES</text>
            <rect x="190" y="65" width="55" height="2" fill="#1F2937" fillOpacity="0.3" />
            <text x="275" y="60" fontSize="14" fill="#1F2937">SÜTEMÉNY</text>
            <rect x="265" y="65" width="80" height="2" fill="#1F2937" fillOpacity="0.3" />

            {/* Icons row */}
            <g transform="translate(60, 80)">
                <text x="0" y="10" fontSize="14" fill="#1F2937" fontWeight="bold">MULTIPOVAR</text>
                <path d="M 100 5 L 110 0 L 110 10 Z" fill="#1F2937" />
                <rect x="120" y="-2" width="2" height="14" fill="#1F2937" />
                <circle cx="121" cy="5" r="5" stroke="#1F2937" strokeWidth="1.5" fill="none" />
                <rect x="120" y="-2" width="2" height="14" fill="#1F2937" transform="rotate(90 121 5)" />
                <text x="140" y="10" fontSize="14" fill="#1F2937" fontWeight="bold">160°C</text>
                <path d="M 190 5 L 200 0 L 200 10 Z" fill="#1F2937" />
                <circle cx="215" cy="5" r="4" stroke="#1F2937" strokeWidth="1.5" fill="none" />
                <path d="M 215 5 L 215 1 L 218 1" stroke="#1F2937" strokeWidth="1.5" fill="none" />
                <text x="230" y="10" fontSize="14" fill="#1F2937" fontWeight="bold">10:00</text>
            </g>

            {/* Main Time Display */}
            <text x="170" y="150" fontFamily="'DSEG7 Classic', 'monospace'" fontSize="64" fill="#111827" textAnchor="middle">00:00</text>
            <text x="120" y="105" fontSize="12" fill="#111827">IDŐ BEÁLLÍTÁSA</text>
            <text x="120" y="120" fontSize="12" fill="#111827">IDŐZÍTŐ 1 2</text>
          </g>

          {/* Left Buttons */}
          <g transform="translate(80, 160)" className="cursor-pointer">
            <rect width="140" height="50" rx="8" fill="#2c3747" stroke="#4b5563" />
            <text x="70" y="25" textAnchor="middle" fill="#E5E7EB" fontSize="16" fontWeight="bold">FŐZÉSI IDŐ</text>
            <text x="70" y="40" textAnchor="middle" fill="#9CA3AF" fontSize="10">ПРИГОТОВЛЕНИЯ</text>
          </g>
          <g transform="translate(80, 230)" className="cursor-pointer">
            <rect width="140" height="50" rx="8" fill="#2c3747" stroke="#4b5563" />
            <text x="70" y="25" textAnchor="middle" fill="#E5E7EB" fontSize="16" fontWeight="bold">IDŐ BEÁLLÍTÁSA</text>
            <text x="70" y="40" textAnchor="middle" fill="#9CA3AF" fontSize="10">УСТАНОВКА</text>
          </g>
          <g transform="translate(80, 300)" className="cursor-pointer">
            <rect width="140" height="50" rx="8" fill="#2c3747" stroke="#4b5563" />
            <text x="70" y="25" textAnchor="middle" fill="#E5E7EB" fontSize="16" fontWeight="bold">KÉSLELTETETT</text>
            <text x="70" y="40" textAnchor="middle" fill="#E5E7EB" fontSize="16" fontWeight="bold">INDÍTÁS</text>
          </g>

          {/* Bottom Buttons */}
          <g transform="translate(140, 400)" className="cursor-pointer">
            <rect width="180" height="70" rx="8" fill="#2c3747" stroke="#4b5563" />
            <text x="90" y="30" textAnchor="middle" fill="#E5E7EB" fontSize="16" fontWeight="bold">MELEGENTARTÁS</text>
            <line x1="40" y1="40" x2="140" y2="40" stroke="#9CA3AF" />
            <text x="90" y="58" textAnchor="middle" fill="#E5E7EB" fontSize="16" fontWeight="bold">MÉGSEM</text>
            <circle cx="150" cy="45" r="6" fill="#f59e0b" />
          </g>
          <g transform="translate(350, 400)" className="cursor-pointer">
            <rect width="180" height="70" rx="8" fill="#2c3747" stroke="#4b5563" />
            <text x="90" y="45" textAnchor="middle" fill="#E5E7EB" fontSize="20" fontWeight="bold">MENÜ</text>
          </g>

          {/* Right Side Panels */}
          <g transform="translate(660, 160)">
            <rect width="140" height="50" rx="8" fill="#2c3747" stroke="#4b5563" />
            <text x="70" y="33" textAnchor="middle" fill="#E5E7EB" fontSize="20" fontWeight="bold">FŐZÉS</text>
          </g>
          <g transform="translate(640, 220)">
            <rect width="180" height="150" rx="8" fill="#2c3747" stroke="#4b5563" />
            <text x="90" y="25" textAnchor="middle" fill="#E5E7EB" fontSize="14">RIZS • GABONA</text>
            <line x1="10" y1="35" x2="170" y2="35" stroke="#4b5563" />
            <text x="90" y="55" textAnchor="middle" fill="#E5E7EB" fontSize="14">PILÁF</text>
            <line x1="10" y1="65" x2="170" y2="65" stroke="#4b5563" />
            <text x="90" y="85" textAnchor="middle" fill="#E5E7EB" fontSize="14">TEJBEKÁSA</text>
            <line x1="10" y1="95" x2="170" y2="95" stroke="#4b5563" />
            <text x="35" y="115" textAnchor="middle" fill="#E5E7EB" fontSize="14">ZÖLDSÉG</text>
            <text x="90" y="115" textAnchor="middle" fill="#E5E7EB" fontSize="14">HAL</text>
            <text x="145" y="115" textAnchor="middle" fill="#E5E7EB" fontSize="14">HÚS</text>
            <line x1="10" y1="125" x2="170" y2="125" stroke="#4b5563" />
             <text x="90" y="142" textAnchor="middle" fill="#9CA3AF" fontSize="12">HOZZÁVALÓ TÍPUSA</text>
          </g>
           <g transform="translate(640, 380)">
             <rect width="180" height="50" rx="8" fill="#2c3747" stroke="#4b5563" />
             <text x="90" y="25" textAnchor="middle" fill="#9CA3AF" fontSize="12">HŐMÉRSÉKLET</text>
             <text x="90" y="40" textAnchor="middle" fill="#9CA3AF" fontSize="10">AUTO MELEGENTARTÁS BE/KI</text>
           </g>

            {/* START Button */}
            <g transform="translate(580, 440)" className="cursor-pointer">
                <rect width="240" height="70" rx="8" fill="#2c3747" stroke="#4b5563" transform="skewX(-20)" />
                <text x="120" y="45" textAnchor="middle" fill="#E5E7EB" fontSize="24" fontWeight="bold">START</text>
            </g>
        </svg>
      </div>
    </div>
  );
};

export default RedmondCookerPanel;

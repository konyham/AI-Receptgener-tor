import React from 'react';

// Helper component for dual-language button text
const ButtonText: React.FC<{ x: number; y: number; text1: string; text2: string; size1?: number; size2?: number; fontWeight?: string; fill?: string }> = ({ x, y, text1, text2, size1 = 12, size2 = 9, fontWeight = 'normal', fill = "#E5E7EB" }) => (
  <g textAnchor="middle" fill={fill} fontFamily="Roboto Condensed, sans-serif">
    <text x={x} y={y} fontSize={size1} fontWeight={fontWeight}>{text1}</text>
    <text x={x} y={y + 13} fontSize={size2} fill="#9CA3AF" fontWeight="normal">{text2}</text>
  </g>
);

// Helper component for program items on the LCD screen
const ProgramItem: React.FC<{ y: number; text1: string; text2: string; active?: boolean }> = ({ y, text1, text2, active }) => (
    <g transform={`translate(0, ${y})`}>
        {active && <rect x="5" y="-12" width="160" height="15" fill="#1f2937" opacity="0.5" rx="2" />}
        <text x="10" y="0" fontFamily="sans-serif" fontSize="11" fill={active ? "#FBBF24" : "#1f2937"} fontWeight="bold">{text1}</text>
        <text x="155" y="0" fontFamily="sans-serif" textAnchor="end" fontSize="10" fill="#4b5563" fontWeight="normal">{text2}</text>
    </g>
);


const RedmondCookerPanel: React.FC = () => {
  return (
    <div className="mt-8 p-4 md:p-6 bg-gray-100 border-2 border-gray-300 rounded-2xl no-print">
      <h3 className="text-xl font-semibold text-center text-gray-800 mb-4">REDMOND RMC-M70 Kezelőpanel Referencia</h3>
      <div className="bg-gray-800 p-2 rounded-lg shadow-inner">
        <svg viewBox="0 0 800 450" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
          <defs>
             <linearGradient id="panelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2c3747" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>
            <linearGradient id="displayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#95a27c" />
              <stop offset="100%" stopColor="#818e69" />
            </linearGradient>
            <style>
              {`@import url('https://fonts.googleapis.com/css2?family=DS-Digital&family=Roboto+Condensed:wght@400;700&display=swap');`}
            </style>
          </defs>
          
          {/* Main Panel Body */}
          <rect x="5" y="5" width="790" height="440" rx="30" fill="url(#panelGradient)" stroke="#111827" strokeWidth="2"/>
          <rect x="15" y="15" width="770" height="420" rx="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
          
          <text x="400" y="55" textAnchor="middle" fontSize="32" fontWeight="bold" fill="#E5E7EB" letterSpacing="4" fontFamily="Roboto Condensed, sans-serif">REDMOND</text>
          <text x="400" y="80" textAnchor="middle" fontSize="12" fontWeight="normal" fill="#9CA3AF" letterSpacing="2" fontFamily="Roboto Condensed, sans-serif">MULTICOOKER</text>

          {/* Central Display Area */}
          <g transform="translate(180, 100)">
            <rect width="440" height="200" rx="5" fill="#111827" />
            <rect x="2" y="2" width="436" height="196" rx="3" fill="url(#displayGradient)" />

            {/* Program List (Left side of display) */}
            <g transform="translate(15, 20)">
                <ProgramItem y={0} text1="• ПАР" text2="Párolás" />
                <ProgramItem y={18} text1="• ЖАРКА" text2="Sütés" />
                <ProgramItem y={36} text1="• ВАРКА" text2="Főzés" />
                <ProgramItem y={54} text1="• ТУШЕНИЕ" text2="Ragu" active/>
                <ProgramItem y={72} text1="• ПЛОВ" text2="Piláf" />
                <ProgramItem y={90} text1="• СУП" text2="Leves" />
                <ProgramItem y={108} text1="• МАКАРОНЫ" text2="Tészta" />
                <ProgramItem y={126} text1="• ВЫПЕЧКА" text2="Sütemény" />
                <ProgramItem y={144} text1="• КРУПЫ" text2="Gabona" />
                <ProgramItem y={162} text1="• МОЛОЧНАЯ КАША" text2="Tejbekása" />
            </g>

            {/* Main Timer & Status (Right side of display) */}
            <g transform="translate(200, 15)">
                {/* Time Display */}
                <g>
                    <text x="110" y="80" textAnchor="middle" fill="#1f2937" fontSize="100" fontFamily="'DS-Digital', 'monospace'">01:30</text>
                    <text x="55" y="110" textAnchor="middle" fill="#1f2937" fontSize="20" fontFamily="sans-serif">ЧАСЫ</text>
                    <text x="165" y="110" textAnchor="middle" fill="#1f2937" fontSize="20" fontFamily="sans-serif">МИН</text>
                </g>
                 
                 {/* Status Indicators */}
                 <g transform="translate(10, 140)">
                    <text x="0" y="0" fontFamily="sans-serif" fontSize="12" fill="#1f2937" fontWeight="bold">t°C</text>
                    <text x="0" y="20" fontFamily="sans-serif" fontSize="12" fill="#1f2937" fontWeight="bold">ОТЛОЖЕННЫЙ СТАРТ</text>
                    <text x="0" y="40" fontFamily="sans-serif" fontSize="12" fill="#1f2937" fontWeight="bold">ПОДОГРЕВ</text>
                 </g>
            </g>

          </g>
          
          {/* Top Row Buttons */}
           <g transform="translate(250, 315)">
             <rect width="130" height="50" rx="5" fill="#1f2937" stroke="#4b5563" strokeWidth="1.5" />
             <ButtonText x={65} y={20} text1="t°C / ЧАСЫ" text2="TEMP / ÓRA" />
          </g>
          <g transform="translate(420, 315)">
             <rect width="130" height="50" rx="5" fill="#1f2937" stroke="#4b5563" strokeWidth="1.5" />
             <ButtonText x={65} y={20} text1="МИНУТЫ" text2="PERC" />
          </g>

          {/* Central Menu Button */}
          <g transform="translate(335, 375)">
             <rect width="130" height="50" rx="5" fill="#1f2937" stroke="#4b5563" strokeWidth="1.5" />
             <ButtonText x={65} y={28} text1="МЕНЮ" text2="MENÜ" size1={16} fontWeight="bold"/>
          </g>

          {/* Bottom Row Buttons */}
          <g transform="translate(30, 340)">
             <rect width="170" height="50" rx="5" fill="#1f2937" stroke="#4b5563" strokeWidth="1.5" />
             <ButtonText x={85} y={20} text1="ОТЛОЖЕННЫЙ СТАРТ" text2="KÉSLELTETETT INDÍTÁS" />
          </g>

           <g transform="translate(600, 340)">
             <rect width="170" height="50" rx="5" fill="#1f2937" stroke="#4b5563" strokeWidth="1.5" />
             <ButtonText x={85} y={20} text1="ПОДОГРЕВ / ОТМЕНА" text2="MELEGENTARTÁS / TÖRLÉS" />
          </g>

          {/* Start Button */}
           <g transform="translate(670, 150)">
             <circle cx="50" cy="50" r="48" fill="#e11d48" stroke="#fecdd3" strokeWidth="3" />
             <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
             <ButtonText x={50} y={45} text1="СТАРТ" text2="START" size1={20} fontWeight="bold" fill="white" />
          </g>
          
        </svg>
      </div>
      <p className="text-center text-xs text-gray-500 mt-2">Ez a panel a REDMOND RMC-M70 modell vizuális másolata a könnyebb kezelhetőség érdekében.</p>
    </div>
  );
};

export default RedmondCookerPanel;

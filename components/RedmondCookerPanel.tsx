import React from 'react';

const RedmondCookerPanel: React.FC = () => {

  const Button: React.FC<{ x: number; y: number; width: number; height: number; text1: string; text2?: string; text3?: string; light?: 'orange' | 'red'; active?: boolean }> = ({ x, y, width, height, text1, text2, text3, light, active }) => (
    <g transform={`translate(${x}, ${y})`} className="cursor-pointer">
      <rect 
        width={width} 
        height={height} 
        rx="8" 
        fill={active ? "#4b5563" : "#2c3747"} 
        stroke="#4b5563" 
        strokeWidth="2"
      />
      <text x={width / 2} y={text3 ? 28 : (text2 ? 34: 45)} textAnchor="middle" fill="#E5E7EB" fontSize="24" fontWeight="bold">{text1}</text>
      {text2 && <text x={width / 2} y={58} textAnchor="middle" fill="#9CA3AF" fontSize="16">{text2}</text>}
      {text3 && <text x={width / 2} y={72} textAnchor="middle" fill="#9CA3AF" fontSize="16">{text3}</text>}
      {light && <circle cx={width - 20} cy={height / 2} r="8" fill={light === 'orange' ? '#f59e0b' : '#ef4444'} stroke="#111827" strokeWidth="2" />}
    </g>
  );

  const ProgramItem: React.FC<{ y: number; text1: string; text2: string; selected?: boolean }> = ({ y, text1, text2, selected }) => (
     <g transform={`translate(5, ${y})`}>
      {selected && <rect x="-5" y="-12" width="220" height="24" rx="4" fill="#4b5563" />}
      <text x="10" y="5" fill="#E5E7EB" fontSize="18" fontWeight={selected ? 'bold' : 'normal'}>{text1}</text>
      <text x="200" y="5" fill="#9CA3AF" fontSize="18" textAnchor="end">{text2}</text>
    </g>
  );


  return (
    <div className="mt-8 p-4 md:p-6 bg-gray-100 border-2 border-gray-300 rounded-2xl no-print">
      <h3 className="text-xl font-semibold text-center text-gray-800 mb-4">REDMOND RMC-M70 Kezelőpanel Referencia</h3>
      <div className="bg-gray-800 p-2 rounded-lg shadow-inner">
        <svg viewBox="0 0 1000 700" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
          {/* Main Panel Background */}
          <rect x="10" y="10" width="980" height="680" rx="30" fill="#1f2937" stroke="#4b5563" strokeWidth="3" />
          
          {/* Brand */}
          <text x="500" y="70" textAnchor="middle" fontSize="48" fontWeight="bold" fill="#E5E7EB" letterSpacing="6">REDMOND</text>
          
          {/* Central Display Area */}
          <g transform="translate(240, 100)">
            <rect width="520" height="300" rx="10" fill="#111827" stroke="#4b5563" strokeWidth="2" />
            <rect x="5" y="5" width="510" height="290" rx="5" fill="#93a2b1" />

            {/* Program List */}
            <g transform="translate(15, 25)">
                <ProgramItem y={0} text1="MULTIPOVAR" text2="МУЛЬТИПОВАР" selected />
                <ProgramItem y={30} text1="PÁROLÁS" text2="ПАР" />
                <ProgramItem y={60} text1="SÜTÉS" text2="ЖАРКА" />
                <ProgramItem y={90} text1="LEVES" text2="СУП" />
                <ProgramItem y={120} text1="GŐZÖLÉS" text2="ВАРКА НА ПАРУ" />
                <ProgramItem y={150} text1="TÉSZTA" text2="МАКАРОНЫ" />
                <ProgramItem y={180} text1="PÖRKÖLT" text2="ТУШЕНИЕ" />
                <ProgramItem y={210} text1="TEJBEKÁSA" text2="МОЛОЧНАЯ КАША" />
                <ProgramItem y={240} text1="PÁROLT RIZS" text2="КРУПЫ" />
                <ProgramItem y={270} text1="JOGHURT" text2="ЙОГУРТ" />
            </g>

            {/* Display Center */}
            <g transform="translate(260, 25)">
                <rect width="240" height="260" rx="5" fill="#aab5c2" />
                <text x="120" y="40" textAnchor="middle" fontSize="18" fill="#1F2937">FŐZÉSI MÓD</text>
                <text x="120" y="60" textAnchor="middle" fontSize="14" fill="#1F2937">РЕЖИМ</text>
                <text x="120" y="140" textAnchor="middle" fontFamily="'DSEG7 Classic', 'monospace'" fontSize="96" fill="#111827">00:00</text>
                 <g transform="translate(20, 200)">
                    <text x="0" y="0" fontSize="14" fill="#1F2937">HŐMÉRSÉKLET</text>
                    <circle cx="100" cy="-5" r="8" stroke="#1F2937" strokeWidth="2" fill="none" />
                    <path d="M 97 -5 L 103 -5 M 100 -8 L 100 -2" stroke="#1F2937" strokeWidth="2" />
                    <text x="120" y="0" fontSize="14" fill="#1F2937">IDŐ</text>
                    <circle cx="150" cy="-5" r="8" stroke="#1F2937" strokeWidth="2" fill="none" />
                    <path d="M 150 -5 L 150 -9 L 153 -9" stroke="#1F2937" strokeWidth="2" fill="none" />
                 </g>
                 <g transform="translate(20, 230)">
                    <text x="0" y="0" fontSize="14" fill="#1F2937">TERMÉKTÍPUS</text>
                    <text x="120" y="0" fontSize="14" fill="#1F2937">HÚS HAL ZÖLDSÉG</text>
                 </g>
            </g>
          </g>

          {/* Left Buttons */}
          <g transform="translate(30, 120)">
            <Button x={0} y={0} width="180" height="90" text1="HŐMÉRSÉKLET" text2="ТЕМПЕРАТУРА" />
            <Button x={0} y={110} width="180" height="90" text1="ÓRA, PERC" text2="ЧАС, МИН" />
            <Button x={0} y={220} width="180" height="90" text1="KÉSLELTETETT" text2="INDÍTÁS" text3="ОТСРОЧКА СТАРТА" />
          </g>

          {/* Right Buttons */}
          <g transform="translate(790, 120)">
            <Button x={0} y={0} width="180" height={90} text1="MENÜ" text2="МЕНЮ" />
            <rect x="0" y="110" width="180" height="150" rx="8" fill="#2c3747" stroke="#4b5563" strokeWidth="2" />
            <text x="90" y="150" textAnchor="middle" fill="#E5E7EB" fontSize="20" fontWeight="bold">TERMÉKTÍPUS</text>
            <text x="90" y="170" textAnchor="middle" fill="#9CA3AF" fontSize="14">ТИП ПРОДУКТА</text>
            <line x1="20" y1="185" x2="160" y2="185" stroke="#4b5563" strokeWidth="2" transform="translate(790, 110)" />
            <text x="90" y="220" textAnchor="middle" fill="#E5E7EB" fontSize="18">HÚS / МЯСО</text>
            <text x="90" y="245" textAnchor="middle" fill="#9CA3AF" fontSize="18">HAL / РЫБА</text>
          </g>


          {/* Bottom Buttons */}
          <g transform="translate(30, 440)">
             <Button x={0} y={0} width="350" height="90" text1="MELEGENTARTÁS / FELMELEGÍTÉS" text2="ПОДОГРЕВ / ОТМЕНА" light="orange" />
          </g>
          <g transform="translate(410, 440)">
             <Button x={0} y={0} width="560" height="90" text1="START" text2="СТАРТ" active={true} />
          </g>

          {/* Program list part 2 */}
           <g transform="translate(30, 560)">
             <rect width="940" height="110" rx="8" fill="#2c3747" stroke="#4b5563" strokeWidth="2" />
             <text x="30" y="40" fill="#E5E7EB" fontSize="20">SÜTEMÉNY</text>
             <text x="30" y="65" fill="#9CA3AF" fontSize="16">ВЫПЕЧКА</text>

             <text x="200" y="40" fill="#E5E7EB" fontSize="20">PÁROLÁS</text>
             <text x="200" y="65" fill="#9CA3AF" fontSize="16">ТУШЕНИЕ</text>

             <text x="370" y="40" fill="#E5E7EB" fontSize="20">PILÁF</text>
             <text x="370" y="65" fill="#9CA3AF" fontSize="16">ПЛОВ</text>
             
             <text x="540" y="40" fill="#E5E7EB" fontSize="20">LEVES</text>
             <text x="540" y="65" fill="#9CA3AF" fontSize="16">СУП</text>

             <text x="710" y="40" fill="#E5E7EB" fontSize="20">KENYÉR</text>
             <text x="710" y="65" fill="#9CA3AF" fontSize="16">ХЛЕБ</text>

             <text x="880" y="40" fill="#E5E7EB" fontSize="20">PIZZA</text>
             <text x="880" y="65" fill="#9CA3AF" fontSize="16">ПИЦЦА</text>
           </g>

        </svg>
      </div>
    </div>
  );
};

export default RedmondCookerPanel;

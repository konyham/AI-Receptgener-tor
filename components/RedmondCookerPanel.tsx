import React, { useRef } from 'react';

const RedmondCookerPanel: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  const handleDownload = () => {
    if (!svgRef.current) return;
    const svgElement = svgRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Use the viewBox for sizing to maintain aspect ratio
      canvas.width = svgElement.viewBox.baseVal.width;
      canvas.height = svgElement.viewBox.baseVal.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Add a white background for JPG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        const jpgUrl = canvas.toDataURL('image/jpeg', 0.9);
        const link = document.createElement('a');
        link.href = jpgUrl;
        link.download = 'redmond_rmc-m70_panel.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };
  
  const Button: React.FC<{ cx: number, cy: number, text: string, subtext?: string, textFill?: string, circleFill?: string, r?: number }> = 
    ({ cx, cy, text, subtext, textFill = "#E5E7EB", circleFill = "#4B5563", r = 35 }) => (
    <g transform={`translate(${cx}, ${cy})`} className="cursor-pointer">
      <circle cx="0" cy="0" r={r} fill={circleFill} stroke="#374151" strokeWidth="2" />
      <text x="0" y={subtext ? "-5" : "5"} textAnchor="middle" fill={textFill} fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif">
        {text}
      </text>
      {subtext && (
        <text x="0" y="15" textAnchor="middle" fill={textFill} fontSize="10" fontFamily="Arial, sans-serif">
          {subtext}
        </text>
      )}
    </g>
  );


  return (
    <div className="mt-8 p-4 md:p-6 bg-gray-100 border-2 border-gray-300 rounded-2xl no-print">
      <h3 className="text-xl font-semibold text-center text-gray-800 mb-4">REDMOND RMC-M70 Kezelőpanel</h3>
      <div className="bg-gray-700 p-4 rounded-lg shadow-inner">
        <svg ref={svgRef} viewBox="0 0 600 400" className="w-full h-auto" aria-labelledby="panel-title" role="img">
          <title id="panel-title">REDMOND RMC-M70 okosfőző kezelőpaneljének grafikája</title>
          {/* Main Panel Body */}
          <rect x="0" y="0" width="600" height="400" rx="20" fill="#2D3748" />
          
          {/* Display */}
          <rect x="175" y="125" width="250" height="150" rx="10" fill="#38B2AC" stroke="#2C7A7B" strokeWidth="3" />
          <text x="300" y="210" textAnchor="middle" fill="#1A202C" fontSize="60" fontWeight="bold" fontFamily="'DS-Digital', 'Courier New', monospace">
            00:25
          </text>
          <text x="300" y="155" textAnchor="middle" fill="#2C7A7B" fontSize="16" fontFamily="Arial, sans-serif">
            РИС / КРУПЫ
          </text>

          {/* Buttons arranged in a circle */}
          <Button cx={300} cy={65} text="РИС" subtext="КРУПЫ" />
          <Button cx={420} cy={95} text="ПЛОВ" />
          <Button cx={500} cy={200} text="НА ПАРУ" subtext="ВАРКА" />
          <Button cx={420} cy={305} text="СУП" />
          <Button cx={300} cy={335} text="ЖАРКА" />
          <Button cx={180} cy={305} text="МОЛОЧНАЯ" subtext="КАША" />
          <Button cx={100} cy={200} text="ТУШЕНИЕ" />
          <Button cx={180} cy={95} text="ВЫПЕЧКА" />

          {/* Control Buttons */}
          <g transform="translate(80, 320)">
            <rect x="-45" y="-20" width="90" height="40" rx="8" fill="#D53F8C" />
            <text x="0" y="5" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">Отмена</text>
          </g>

          <g transform="translate(520, 320)">
            <rect x="-45" y="-20" width="90" height="40" rx="8" fill="#48BB78" />
            <text x="0" y="5" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">Старт</text>
          </g>

          <g transform="translate(50, 50)">
             <circle cx="0" cy="0" r="25" fill="#A0AEC0" />
             <text x="0" y="5" textAnchor="middle" fill="#2D3748" fontSize="12" fontWeight="bold">Меню</text>
          </g>

          <g transform="translate(550, 50)">
             <circle cx="0" cy="0" r="25" fill="#A0AEC0" />
             <text x="0" y="5" textAnchor="middle" fill="#2D3748" fontSize="12" fontWeight="bold">t°C</text>
          </g>
          
        </svg>
      </div>
      <div className="flex justify-center mt-4">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 text-sm font-semibold py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.293a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Letöltés JPG formátumban
        </button>
      </div>
    </div>
  );
};

export default RedmondCookerPanel;

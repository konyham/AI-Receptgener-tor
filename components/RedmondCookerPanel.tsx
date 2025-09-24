import React from 'react';

const RedmondCookerPanel: React.FC = () => {

  const Button: React.FC<{ text: string, transform: string, subtext?: string }> = ({ text, transform, subtext }) => (
    <g transform={transform} className="cursor-pointer" role="button" aria-label={text}>
      <circle cx="0" cy="0" r="28" fill="#555" stroke="#333" strokeWidth="2" />
      <text x="0" y={subtext ? "-4" : "4"} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
        {text}
      </text>
      {subtext && (
         <text x="0" y="12" textAnchor="middle" fill="#ccc" fontSize="8">
            {subtext}
        </text>
      )}
    </g>
  );
  
  const ProgramItem: React.FC<{ text: string, y: number, x: number, active?: boolean }> = ({ text, y, x, active }) => (
     <g transform={`translate(${x}, ${y})`}>
        <circle cx="-10" cy="0" r="3" fill={active ? "#ff6347" : "#444"} />
        <text x="0" y="4" textAnchor="start" fill="#eee" fontSize="11">{text}</text>
     </g>
  );

  return (
    <div className="mt-8 p-4 bg-gray-200 border-2 border-gray-400 rounded-2xl no-print animate-fade-in flex flex-col items-center">
      <h3 className="text-lg font-bold text-gray-800 mb-4">REDMOND RMC-M70 Kezelőpanel</h3>
      <div className="bg-gray-700 p-4 rounded-lg shadow-lg w-full max-w-lg">
        <svg viewBox="0 0 400 300" className="w-full h-auto">
          {/* Panel Body */}
          <rect x="0" y="0" width="400" height="300" rx="10" fill="#4a4a4a" />
          
          {/* Display */}
          <rect x="125" y="110" width="150" height="80" rx="5" fill="#222" />
          <rect x="130" y="115" width="140" height="70" rx="3" fill="#ff8c00" stroke="#333" strokeWidth="1" />
          <text x="200" y="160" fontFamily="monospace" fontSize="40" fill="#333" textAnchor="middle">88:88</text>
          
          {/* Buttons in a circle */}
          <g transform="translate(200, 150)">
              <Button text="Отсрочка старта" transform="translate(0, -90)" />
              <Button text="Меню" transform="translate(64, -64)" />
              <Button text="t°/Время" transform="translate(90, 0)" subtext="Установка" />
              <Button text="Варка" transform="translate(64, 64)" subtext="На пару" />
              <Button text="Жарка" transform="translate(0, 90)" />
              <Button text="Тушение" transform="translate(-64, 64)" />
              <Button text="Выпечка" transform="translate(-90, 0)" />
              <Button text="Старт" transform="translate(-64, -64)" subtext="Автоподогрев" />
          </g>

          {/* Top Buttons */}
          <g transform="translate(200, 40)">
            <rect x="-80" y="-15" width="70" height="30" rx="5" fill="#555" stroke="#333" strokeWidth="2" />
            <text x="-45" y="6" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">Отмена</text>
            <rect x="10" y="-15" width="70" height="30" rx="5" fill="#555" stroke="#333" strokeWidth="2" />
            <text x="45" y="6" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">Подогрев</text>
          </g>

          {/* Program List Left */}
          <g>
            <ProgramItem text="РИС/КРУПЫ" y={30} x={10} active={true} />
            <ProgramItem text="ПЛОВ" y={50} x={10} />
            <ProgramItem text="НА ПАРУ" y={70} x={10} />
            <ProgramItem text="СУП" y={90} x={10} />
            <ProgramItem text="ВАРКА" y={110} x={10} />
            <ProgramItem text="МОЛОЧНАЯ КАША" y={130} x={10} />
            <ProgramItem text="ТУШЕНИЕ" y={150} x={10} />
            <ProgramItem text="ВЫПЕЧКА" y={170} x={10} />
            <ProgramItem text="ЖАРКА" y={190} x={10} />
          </g>

           {/* Program List Right */}
          <g>
            <ProgramItem text="ЙОГУРТ" y={30} x={300} />
            <ProgramItem text="ПАСТА" y={50} x={300} />
            <ProgramItem text="ПИЦЦА" y={70} x={300} />
            <ProgramItem text="ХЛЕБ" y={90} x={300} />
            <ProgramItem text="ДЕСЕРТЫ" y={110} x={300} />
          </g>
        </svg>
      </div>
      <a
        href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgMzAwIj48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgcng9IjEwIiBmaWxsPSIjNGE0YTRhIi8+PHJlY3QgeD0iMTI1IiB5PSIxMTAiIHdpZHRoPSIxNTAiIGhlaWdodD0iODAiIHJ4PSI1IiBmaWxsPSIjMjIyIi8+PHJlY3QgeD0iMTMwIiB5PSIxMTUiIHdpZHRoPSIxNDAiIGhlaWdodD0iNzAiIHJ4PSIzIiBmaWxsPSIjZmY4YzAwIiBzdHJva2U9IiMzMzMiIHN0cm9rZS1widthPSIxIi8+PHRleHQgeD0iMjAwIiB5PSIxNjAiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iNDAiIGZpbGw9IiMzMzMiIHRleHQtYW5jaG9yPSJtaWRkbGUiPjg4Ojg4PC90ZXh0PjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDIwMCwgMTUwKSI+PGcgY2xhc3M9ImN1cnNvci1wb2ludGVyIiByb2xlPSJidXR0b24iIGFyaWEtbGFiZWw9ItCe0YLRg9GA0L7Rh9C60LAg0YHRgtCw0YDRgtCwIj48Y2lyY2xlIGN4PSIwIiBjeT0iMCIgcj0iMjgiIGZpbGw9IiM1NTUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+PHRleHQgeD0iMCIgeT0iNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTAiIGZvbnQtd2VpZ2h0PSJib2xkIj7QntGC0YPRgNC+0YfQutCwINGB0YLQsNGA0YLQsDwvdGV4dD48L2c+PGcgY2xhc3M9ImN1cnNvci1wb2ludGVyIiByb2xlPSJidXR0b24iIGFyaWEtbGFiZWw9ItCc0LXQvdC5IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg2NCwgLTY0KSI+PGNpcmNsZSBjeD0iMCIgY3k9IjAiIHI9IjI4IiBmaWxsPSIjNTU1IiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIvPjx0ZXh0IHg9IjAiIHk9IjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjEwIiBmb250LXdlaWdodD0iYm9sZCI+0JzQtdC90LkgPC90ZXh0PjwvZz48ZyBjbGFzcz0iY3Vyc29yLXBvaW50ZXIiIHJvbGU9ImJ1dHRvbiIgYXJpYS1sYWJlbD0idCvCnC9C0LLRgNC10LzRjyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOTAsIDApIj48Y2lyY2xlIGN4PSIwIiBjeT0iMCIgcj0iMjgiIGZpbGw9IiM1NTUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+PHRleHQgeD0iMCIgeT0iLTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjEwIiBmb250LXdlaWdodD0iYm9sZCI+dCvCnC9C0LLRgNC10LzRjyA8L3RleHQ+PHRleHQgeD0iMCIgeT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNjY2MiIGZvbnQtc2l6ZT0iOCI+0KPRgdCw0LDQvdC+0LLQutCwPC90ZXh0PjwvZz48ZyBjbGFzcz0iY3Vyc29yLXBvaW50ZXIiIHJvbGU9ImJ1dHRvbiIgYXJpYS1sYWJlbD0i0JLQsNGA0LrQsCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNjQsIDY0KSI+PGNpcmNsZSBjeD0iMCIgY3k9IjAiIHI9IjI4IiBmaWxsPSIjNTU1IiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIvPjx0ZXh0IHg9IjAiIHk9Ii00IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxMCIgZm9udC13ZWlnaHQ9ImJvbGQiPtCS0LDRgNC60LAgPC90ZXh0Pjx0ZXh0IHg9IjAiIHk9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjY2NjIiBmb250LXNpemU9IjgiPtC90LAg0L/QsNGA0L48L3RleHQ+PC9nPjxnIGNsYXNzPSJjdXJzb3ItcG9pbnRlciIgcm9sZT0iYnV0dG9uIiBhcmlhLWxhYmVsPSLQltCw0YDRi9CwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLCA5MCkiPjxjaXJjbGUgY3g9IjAiIGN5PSIwIiByPSIyOCIgZmlsbD0iIzU1NSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSIwIiB5PSI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxMCIgZm9udC13ZWlnaHQ9ImJvbGQiPtCW0LDRgNGC0LAgPC90ZXh0PjwvZz48ZyBjbGFzcz0iY3Vyc29yLXBvaW50ZXIiIHJvbGU9ImJ1dHRvbiIgYXJpYS1sYWJlbD0i0KLRg9GI0LXQvdC40LUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC02NCwgNjQpIj48Y2lyY2xlIGN4PSIwIiBjeT0iMCIgcj0iMjgiIGZpbGw9IiM1NTUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+PHRleHQgeD0iMCIgeT0iNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTAiIGZvbnQtd2VpnaHQ9ImJvbGQiPtCi0YPRiNC10L3QuNC1IDwvdGV4dD48L2c+PGcgY2xhc3M9ImN1yc29yLXBvaW50ZXIiIHJvbGU9ImJ1dHRvbiIgYXJpYS1sYWJlbD0i0JLigI/Qv9C10YfQutCwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtOTAsIDApIj48Y2lyY2xlIGN4PSIwIiBjeT0iMCIgcj0iMjgiIGZpbGw9IiM1NTUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+PHRleHQgeD0iMCIgeT0iNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTAiIGZvbnQtd2VpZ2h0PSJib2xkIj7QkuKAj9C/0LXRiNC60LAgPC90ZXh0PjwvZz48ZyBjbGFzcz0iY3Vyc29yLXBvaW50ZXIiIHJvbGU9ImJ1dHRvbiIgYXJpYS1sYWJlbD0i0KHQsgDQkdC6IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNjQsIC02NCkiPjxjaXJjbGUgY3g9IjAiIGN5PSIwIiByPSIyOCIgZmlsbD0iIzU1NSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSIwIiB5PSItNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTAiIGZvbnQtd2VpZ2h0PSJib2xkIj7QodCy0LDRgNCiPC90ZXh0Pjx0ZXh0IHg9IjAiIHk9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjY2NjIiBmb250LXNpemU9IjgiPtCQ0LLRgtC+0L/QvtC00L7QsyDQkdCyPC90ZXh0PjwvZz48L2c+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjAwLCA0MCkiPjxyZWN0IHg9Ii04MCIgeT0iLTE1IiB3aWR0aD0iNzAiIGhlaWdodD0iMzAiIHJ4PSI1IiBmaWxsPSIjNTU1IiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIvPjx0ZXh0IHg9Ii00NSIgeT0iNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtd2VpZ2h0PSJib2xkIj7QntGC0LzQtdC90LA8L3RleHQ+PHJlY3QgeD0iMTAiIHk9Ii0xNSIgd2lkdGg9IjcwIiBoZWlnaHQ9IjMwIiByeD0iNSIgZmlsbD0iIzU1NSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI0NSIgeT0iNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtd2VpZ2h0PSJib2xkIj7Qn9C+0LTQvtCz0YDRg9CyPC90ZXh0PjwvZz48Zz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMCwgMzApIj48Y2lyY2xlIGN4PSItMTAiIGN5PSIwIiByPSIzIiBmaWxsPSIjZmY2MzQ3Ii8+PHRleHQgeD0iMCIgeT0iNCIgdGV4dC1hbmNob3I9InN0YXJ0IiBmaWxsPSIjZWVlIiBmb250LXNpemU9IjExIj7QoNC40KHQoy/QmtGA0K/Qn9C4PC90ZXh0PjwvZz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMCwgNTApIj48Y2lyY2xlIGN4PSItMTAiIGN5PSIwIiByPSIzIiBmaWxsPSIjNDQ0Ii8+PHRleHQgeD0iMCIgeT0iNCIgdGV4dC1hbmNob3I9InN0YXJ0IiBmaWxsPSIjZWVlIiBmb250LXNpemU9IjExIj7Qn9C70L7QkiDQv9C70L7QkzwvdGV4dD48L2c+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTAsIDcwKSI+PGNpcmNsZSBjeD0iLTEwIiBjeT0iMCIgcj0iMyIgZmlsbD0iIzQ0NCIvPjx0ZXh0IHg9IjAiIHk9IjQiIHRleHQtYW5jaG9yPSJzdGFydCIgZmlsbD0iI2VlZSIgZm9udC1zaXplPSIxMSI+0J3QsCDQv9Cw0YDQvzwvdGV4dD48L2c+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTAsIDkwKSI+PGNpcmNsZSBjeD0iLTEwIiBjeT0iMCIgcj0iMyIgZmlsbD0iIzQ0NCIvPjx0ZXh0IHg9IjAiIHk9IjQiIHRleHQtYW5jaG9yPSJzdGFydCIgZmlsbD0iI2VlZSIgZm9udC1zaXplPSIxMSI+0KHQsy/QnzwvdGV4dD48L2c+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTAsIDExMCkiPjxjaXJjbGUgY3g9Ii0xMCIgY3k9IjAiIHI9IjMiIGZpbGw9IiM0NDQiLz48dGV4dCB4PSIwIiB5PSI0IiB0ZXh0LWFuY2hvcj0ic3RhcnQiIGZpbGw9IiNlZWUiIGZvbnQtc2l6ZT0iMTEiPtCS0LDRgNC60LA8L3RleHQ+PC9nPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEwLCAxMzApIj48Y2lyY2xlIGN4PSItMTAiIGN5PSIwIiByPSIzIiBmaWxsPSIjNDQ0Ii8+PHRleHQgeD0iMCIgeT0iNCIgdGV4dC1hbmNob3I9InN0YXJ0IiBmaWxsPSIjZWVlIiBmb250LXNpemU9IjExIj7QnNC+0LvQvtGH0L3QsNC5INC60LDRiNCwPC90ZXh0PjwvZz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMCwgMTUwKSI+PGNpcmNsZSBjeD0iLTEwIiBjeT0iMCIgcj0iMyIgZmlsbD0iIzQ0NCIvPjx0ZXh0IHg9IjAiIHk9IjQiIHRleHQtYW5jaG9yPSJzdGFydCIgZmlsbD0iI2VlZSIgZm9udC1zaXplPSIxMSI+0KLRg9GI0LXQvdC40LU8L3RleHQ+PC9nPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEwLCAxNzApIj48Y2lyY2xlIGN4PSItMTAiIGN5PSIwIiByPSIzIiBmaWxsPSIjNDQ0Ii8+PHRleHQgeD0iMCIgeT0iNCIgdGV4dC1hbmNob3I9InN0YXJ0IiBmaWxsPSIjZWVlIiBmb250LXNpemU9IjExIj7QkuKAj9C/0LXRiNC60LA8L3RleHQ+PC9nPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEwLCAxOTApIj48Y2lyY2xlIGN4PSItMTAiIGN5PSIwIiByPSIzIiBmaWxsPSIjNDQ0Ii8+PHRleHQgeD0iMCIgeT0iNCIgdGV4dC1hbmNob3I9InN0YXJ0IiBmaWxsPSIjZWVlIiBmb250LXNpemU9IjExIj7QltCw0YDRgtCwPC90ZXh0PjwvZz48L2c+PGc+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzAwLCAzMCkiPjxjaXJjbGUgY3g9Ii0xMCIgY3k9IjAiIHI9IjMiIGZpbGw9IiM0NDQiLz48dGV4dCB4PSIwIiB5PSI0IiB0ZXh0LWFuY2hvcj0ic3RhcnQiIGZpbGw9IiNlZWUiIGZvbnQtc2l6ZT0iMTEiPtC40L7QsyDQodC40LDRgNCiPC90ZXh0PjwvZz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMDAsIDUwKSI+PGNpcmNsZSBjeD0iLTEwIiBjeT0iMCIgcj0iMyIgZmlsbD0iIzQ0NCIvPjx0ZXh0IHg9IjAiIHk9IjQiIHRleHQtYW5jaG9yPSJzdGFydCIgZmlsbD0iI2VlZSIgZm9udC1zaXplPSIxMSI+0J/QsNGB0YLQsDwvdGV4dD48L2c+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzAwLCA3MCkiPjxjaXJjbGUgY3g9Ii0xMCIgY3k9IjAiIHI9IjMiIGZpbGw9IiM0NDQiLz48dGV4dCB4PSIwIiB5PSI0IiB0ZXh0LWFuY2hvcj0ic3RhcnQiIGZpbGw9IiNlZWUiIGZvbnQtc2l6ZT0iMTEiPtCf0LjRh9C80LA8L3RleHQ+PC9nPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDMwMCwgOTApIj48Y2lyY2xlIGN4PSItMTAiIGN5PSIwIiByPSIzIiBmaWxsPSIjNDQ0Ii8+PHRleHQgeD0iMCIgeT0iNCIgdGV4dC1hbmNob3I9InN0YXJ0IiBmaWxsPSIjZWVlIiBmb250LXNpemU9IjExIj7QpdC70LXQkDwvdGV4dD48L2c+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzAwLCAxMTApIj48Y2lyY2xlIGN4PSItMTAiIGN5PSIwIiByPSIzIiBmaWxsPSIjNDQ0Ii8+PHRleHQgeD0iMCIgeT0iNCIgdGV4dC1hbmNob3I9InN0YXJ0IiBmaWxsPSIjZWVlIiBmb250LXNpemU9IjExIj7QlNC10YHRgNC40YDQrTwvdGV4dD48L2c+PC9nPjwvc3ZnPg=="
        download="redmond_rmc_m70_panel.svg"
        className="mt-4 text-sm bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
      >
        Panel letöltése SVG-ként
      </a>
    </div>
  );
};

export default RedmondCookerPanel;

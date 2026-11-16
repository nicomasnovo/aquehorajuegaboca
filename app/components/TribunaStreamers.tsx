// Decorador SVG que emula cintas de tela como banderas de la cancha
// Componente decorativo no utilizado actualmente, disponible para uso futuro

export function TribunaStreamers() {
  return (
    <div className="tribunaStreamers" aria-hidden="true">
      <svg viewBox="0 0 800 110" preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id="fabricBlue" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#3765a7" />
            <stop offset=".2" stopColor="#204b88" />
            <stop offset=".53" stopColor="#12376c" />
            <stop offset=".8" stopColor="#092b59" />
            <stop offset="1" stopColor="#051832" />
          </linearGradient>
          <linearGradient id="fabricGold" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#d9b855" />
            <stop offset=".2" stopColor="#cfa438" />
            <stop offset=".52" stopColor="#bb8d22" />
            <stop offset=".8" stopColor="#956d19" />
            <stop offset="1" stopColor="#5e410b" />
          </linearGradient>
        </defs>
        <g className="fabricLayer fabricLayerBack">
          <path
            fill="url(#fabricBlue)"
            d="M-30 18 Q120 5 240 28 T510 30 T830 15 L830 52 Q680 70 520 59 T245 57 T-30 50 Z"
          />
          <path
            fill="url(#fabricGold)"
            d="M-30 37 Q130 19 280 48 T570 59 T830 35 L830 77 Q680 91 560 72 T270 82 T-30 79 Z"
          />
        </g>
        <g className="fabricLayer fabricLayerFront">
          <path
            fill="url(#fabricGold)"
            d="M-30 29 Q140 55 285 27 T560 50 T830 24 L830 70 Q660 43 545 77 T270 57 T-30 73 Z"
          />
          <path
            fill="url(#fabricBlue)"
            d="M-30 73 Q145 40 270 82 T545 57 T830 75 L830 108 Q680 92 545 109 T270 105 T-30 114 Z"
          />
        </g>
      </svg>
    </div>
  );
}

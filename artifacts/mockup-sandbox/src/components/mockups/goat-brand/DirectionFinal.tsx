export function DirectionFinal() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start p-10 gap-10 font-sans">

      {/* Direction label */}
      <div className="w-full">
        <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Final Direction — Mixed</span>
        <p className="text-sm text-gray-500 mt-1">Frame Pin symbol · Violet/Lime palette · 29CM editorial wordmark</p>
      </div>

      {/* Symbol — Frame Pin refined */}
      <div className="flex flex-col items-center gap-3">
        <svg width="100" height="118" viewBox="0 0 100 118" fill="none">
          {/* Photo frame body */}
          <rect x="3" y="3" width="94" height="82" rx="16" fill="#3A2374"/>
          {/* Inner frame — frosted window */}
          <rect x="16" y="16" width="68" height="56" rx="9" fill="white" fillOpacity="0.12"/>
          {/* Corner accent dots */}
          <circle cx="24" cy="24" r="3" fill="white" fillOpacity="0.3"/>
          <circle cx="76" cy="24" r="3" fill="white" fillOpacity="0.3"/>
          {/* Pin neck */}
          <path d="M50 85 L42 108 Q50 116 58 108 Z" fill="#3A2374"/>
          {/* Lime tip */}
          <circle cx="50" cy="110" r="6" fill="#C6E33D"/>
          {/* Lime inner window border top */}
          <rect x="16" y="16" width="68" height="4" rx="2" fill="#C6E33D" fillOpacity="0.6"/>
        </svg>
        <p className="text-xs text-gray-400">Symbol mark</p>
      </div>

      {/* Wordmark — 29CM editorial style */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-4">
          <svg width="38" height="44" viewBox="0 0 100 118" fill="none">
            <rect x="3" y="3" width="94" height="82" rx="16" fill="#3A2374"/>
            <rect x="16" y="16" width="68" height="56" rx="9" fill="white" fillOpacity="0.12"/>
            <rect x="16" y="16" width="68" height="4" rx="2" fill="#C6E33D" fillOpacity="0.6"/>
            <path d="M50 85 L42 108 Q50 116 58 108 Z" fill="#3A2374"/>
            <circle cx="50" cy="110" r="6" fill="#C6E33D"/>
          </svg>
          <div className="flex flex-col" style={{ gap: 4 }}>
            <span style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontWeight: 700,
              letterSpacing: '0.14em',
              fontSize: 34,
              color: '#3A2374',
              lineHeight: 1,
            }}>GOAT</span>
            {/* Lime underline accent */}
            <div style={{ width: '100%', height: 3, backgroundColor: '#C6E33D', borderRadius: 2 }}/>
          </div>
        </div>
        <p className="text-xs text-gray-400">Full horizontal lockup</p>
      </div>

      {/* Landing badge */}
      <div className="flex flex-col items-center gap-2">
        <div style={{
          backgroundColor: '#3A2374',
          borderRadius: 10,
          padding: '8px 18px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}>
          <span style={{
            fontFamily: 'Georgia, serif',
            fontWeight: 700,
            fontSize: 18,
            color: 'white',
            letterSpacing: '0.14em',
          }}>GOAT</span>
          <div style={{ width: '100%', height: 2, backgroundColor: '#C6E33D', borderRadius: 2 }}/>
        </div>
        <p className="text-xs text-gray-400">Landing badge</p>
      </div>

      {/* App icon */}
      <div className="flex flex-col items-center gap-2">
        <svg width="84" height="84" viewBox="0 0 84 84" fill="none">
          <rect width="84" height="84" rx="20" fill="#3A2374"/>
          {/* Miniature frame */}
          <rect x="12" y="11" width="60" height="48" rx="10" fill="white" fillOpacity="0.15"/>
          <rect x="12" y="11" width="60" height="4" rx="2" fill="#C6E33D" fillOpacity="0.7"/>
          {/* Pin */}
          <path d="M42 59 L36 73 Q42 78 48 73 Z" fill="white" fillOpacity="0.9"/>
          <circle cx="42" cy="75" r="4" fill="#C6E33D"/>
        </svg>
        <p className="text-xs text-gray-400">App icon</p>
      </div>

      {/* Stacked / vertical lockup */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex flex-col items-center gap-2">
          <svg width="44" height="52" viewBox="0 0 100 118" fill="none">
            <rect x="3" y="3" width="94" height="82" rx="16" fill="#3A2374"/>
            <rect x="16" y="16" width="68" height="56" rx="9" fill="white" fillOpacity="0.12"/>
            <rect x="16" y="16" width="68" height="4" rx="2" fill="#C6E33D" fillOpacity="0.6"/>
            <path d="M50 85 L42 108 Q50 116 58 108 Z" fill="#3A2374"/>
            <circle cx="50" cy="110" r="6" fill="#C6E33D"/>
          </svg>
          <div className="flex flex-col items-center" style={{ gap: 3 }}>
            <span style={{
              fontFamily: 'Georgia, serif',
              fontWeight: 700,
              letterSpacing: '0.16em',
              fontSize: 20,
              color: '#3A2374',
            }}>GOAT</span>
            <div style={{ width: 48, height: 2, backgroundColor: '#C6E33D', borderRadius: 2 }}/>
          </div>
          <span style={{ fontSize: 10, color: '#888', letterSpacing: '0.08em' }}>강원도 감성 여행</span>
        </div>
        <p className="text-xs text-gray-400">Stacked lockup with tagline</p>
      </div>

      {/* Palette */}
      <div className="w-full">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-widest">Palette</p>
        <div className="flex gap-3">
          {[
            { hex: '#3A2374', label: 'Deep Violet', role: 'Primary' },
            { hex: '#C6E33D', label: 'Electric Lime', role: 'Accent' },
            { hex: '#2E5D3D', label: 'Forest', role: 'Region' },
            { hex: '#EDE9F7', label: 'Surface', role: 'BG' },
          ].map(c => (
            <div key={c.hex} className="flex flex-col items-center gap-1">
              <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: c.hex, border: c.hex === '#EDE9F7' ? '1px solid #ddd' : 'none' }}/>
              <span style={{ fontSize: 9, color: '#888', fontWeight: 600 }}>{c.role}</span>
              <span style={{ fontSize: 9, color: '#bbb' }}>{c.hex}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Typography feel */}
      <div className="w-full pb-4">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-widest">Typography feel</p>
        <p style={{
          fontFamily: 'Georgia, serif',
          fontWeight: 700,
          fontSize: 22,
          color: '#3A2374',
          letterSpacing: '0.02em',
          lineHeight: 1.35,
        }}>
          강원에서 찾는<br/>나만의 해외여행 컷
        </p>
        <div style={{ width: 60, height: 3, backgroundColor: '#C6E33D', borderRadius: 2, marginTop: 8 }}/>
        <p style={{ fontSize: 12, color: '#999', marginTop: 10, lineHeight: 1.6 }}>
          Editorial · Premium · Emotional · Gen Z Korean
        </p>
      </div>

    </div>
  );
}

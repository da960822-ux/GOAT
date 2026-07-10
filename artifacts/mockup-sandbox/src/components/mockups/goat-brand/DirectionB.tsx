export function DirectionB() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start p-10 gap-8 font-sans">

      {/* Direction label */}
      <div className="w-full">
        <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Direction B — Frame Pin</span>
        <p className="text-sm text-gray-500 mt-1">29CM-like · Editorial premium · Photo discovery</p>
      </div>

      {/* Symbol */}
      <div className="flex flex-col items-center gap-4">
        <svg width="96" height="112" viewBox="0 0 96 112" fill="none">
          {/* Photo frame — rounded square */}
          <rect x="4" y="4" width="88" height="80" rx="14" fill="#3A2374"/>
          {/* Inner frame cutout */}
          <rect x="18" y="18" width="60" height="52" rx="7" fill="white" opacity="0.15"/>
          {/* Pin tail */}
          <path d="M48 84 L38 104 Q48 112 58 104 Z" fill="#3A2374"/>
          {/* Lime dot at pin tip */}
          <circle cx="48" cy="106" r="5" fill="#C6E33D"/>
        </svg>
        <p className="text-xs text-gray-400">Symbol mark</p>
      </div>

      {/* Wordmark */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-4">
          <svg width="36" height="42" viewBox="0 0 96 112" fill="none">
            <rect x="4" y="4" width="88" height="80" rx="14" fill="#3A2374"/>
            <rect x="18" y="18" width="60" height="52" rx="7" fill="white" opacity="0.15"/>
            <path d="M48 84 L38 104 Q48 112 58 104 Z" fill="#3A2374"/>
            <circle cx="48" cy="106" r="5" fill="#C6E33D"/>
          </svg>
          <div>
            <span style={{ fontFamily: 'Georgia, serif', fontWeight: 700, letterSpacing: '0.12em', fontSize: 32, color: '#3A2374' }}>GOAT</span>
            <div style={{ width: '100%', height: 2, backgroundColor: '#C6E33D', marginTop: 2 }}/>
          </div>
        </div>
        <p className="text-xs text-gray-400">Full horizontal lockup</p>
      </div>

      {/* App badge */}
      <div className="flex flex-col items-center gap-2">
        <div style={{
          backgroundColor: '#3A2374',
          borderRadius: 8,
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <svg width="14" height="16" viewBox="0 0 96 112" fill="none">
            <rect x="4" y="4" width="88" height="80" rx="14" fill="white"/>
            <path d="M48 84 L38 104 Q48 112 58 104 Z" fill="white"/>
            <circle cx="48" cy="106" r="5" fill="#C6E33D"/>
          </svg>
          <span style={{ fontWeight: 800, fontSize: 16, color: 'white', letterSpacing: '0.1em' }}>GOAT</span>
        </div>
        <p className="text-xs text-gray-400">Landing badge</p>
      </div>

      {/* App icon */}
      <div className="flex flex-col items-center gap-2">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <rect width="80" height="80" rx="18" fill="#3A2374"/>
          <rect x="14" y="12" width="52" height="42" rx="8" fill="white" opacity="0.18"/>
          <path d="M40 54 L33 69 Q40 74 47 69 Z" fill="white"/>
          <circle cx="40" cy="71" r="4" fill="#C6E33D"/>
        </svg>
        <p className="text-xs text-gray-400">App icon</p>
      </div>

      {/* Palette */}
      <div className="w-full">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-widest">Palette</p>
        <div className="flex gap-3">
          {[
            { hex: '#3A2374', label: 'Violet' },
            { hex: '#C6E33D', label: 'Lime' },
            { hex: '#2E5D3D', label: 'Forest' },
            { hex: '#F0EEF8', label: 'Surface' },
          ].map(c => (
            <div key={c.hex} className="flex flex-col items-center gap-1">
              <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: c.hex, border: c.hex === '#F0EEF8' ? '1px solid #ddd' : 'none' }}/>
              <span style={{ fontSize: 10, color: '#888' }}>{c.hex}</span>
              <span style={{ fontSize: 10, color: '#aaa' }}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Feel */}
      <div className="w-full">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-widest">Feel</p>
        <p style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 20, color: '#3A2374', letterSpacing: '0.02em', lineHeight: 1.35 }}>
          강원에서 찾는<br/>나만의 해외여행 컷
        </p>
        <p style={{ fontSize: 13, color: '#888', marginTop: 8, lineHeight: 1.6 }}>
          29CM · Editorial · Premium · Emotional Curation
        </p>
      </div>

    </div>
  );
}

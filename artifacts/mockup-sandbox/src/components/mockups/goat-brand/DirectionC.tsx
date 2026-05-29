export function DirectionC() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start p-10 gap-8 font-sans">

      {/* Direction label */}
      <div className="w-full">
        <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Direction C — Slash G</span>
        <p className="text-sm text-gray-500 mt-1">Musinsa / KREAM-like · Bold Gen Z · Confident minimal</p>
      </div>

      {/* Symbol */}
      <div className="flex flex-col items-center gap-4">
        <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
          {/* Rounded square */}
          <rect width="96" height="96" rx="22" fill="#1A1025"/>
          {/* Bold G letterform */}
          <text
            x="18"
            y="70"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="62"
            fill="white"
          >G</text>
          {/* Lime diagonal slash — bold accent */}
          <rect
            x="56" y="14"
            width="9" height="68"
            rx="4"
            fill="#C6E33D"
            transform="rotate(15 60 48)"
          />
        </svg>
        <p className="text-xs text-gray-400">Symbol mark</p>
      </div>

      {/* Wordmark */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <svg width="40" height="40" viewBox="0 0 96 96" fill="none">
            <rect width="96" height="96" rx="22" fill="#1A1025"/>
            <text x="18" y="70" fontFamily="system-ui" fontWeight="900" fontSize="62" fill="white">G</text>
            <rect x="56" y="14" width="9" height="68" rx="4" fill="#C6E33D" transform="rotate(15 60 48)"/>
          </svg>
          <span style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 900,
            letterSpacing: '0.06em',
            fontSize: 34,
            color: '#1A1025',
          }}>GOAT</span>
        </div>
        <p className="text-xs text-gray-400">Full horizontal lockup</p>
      </div>

      {/* App badge */}
      <div className="flex flex-col items-center gap-2">
        <div style={{
          backgroundColor: '#1A1025',
          borderRadius: 8,
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <span style={{ fontWeight: 900, fontSize: 18, color: 'white', letterSpacing: '0.12em' }}>GOAT</span>
          <div style={{
            position: 'absolute',
            right: 8,
            top: 0,
            width: 4,
            height: '100%',
            backgroundColor: '#C6E33D',
            borderRadius: 2,
            transform: 'rotate(12deg)',
          }}/>
        </div>
        <p className="text-xs text-gray-400">Landing badge</p>
      </div>

      {/* App icon */}
      <div className="flex flex-col items-center gap-2">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <rect width="80" height="80" rx="18" fill="#1A1025"/>
          <text x="10" y="60" fontFamily="system-ui" fontWeight="900" fontSize="52" fill="white">G</text>
          <rect x="48" y="10" width="7" height="60" rx="3" fill="#C6E33D" transform="rotate(12 52 40)"/>
        </svg>
        <p className="text-xs text-gray-400">App icon</p>
      </div>

      {/* Palette */}
      <div className="w-full">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-widest">Palette</p>
        <div className="flex gap-3">
          {[
            { hex: '#1A1025', label: 'Obsidian' },
            { hex: '#C6E33D', label: 'Lime' },
            { hex: '#3A2374', label: 'Violet' },
            { hex: '#F4F4F4', label: 'Surface' },
          ].map(c => (
            <div key={c.hex} className="flex flex-col items-center gap-1">
              <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: c.hex, border: c.hex === '#F4F4F4' ? '1px solid #ddd' : 'none' }}/>
              <span style={{ fontSize: 10, color: '#888' }}>{c.hex}</span>
              <span style={{ fontSize: 10, color: '#aaa' }}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Feel */}
      <div className="w-full">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-widest">Feel</p>
        <p style={{ fontWeight: 900, fontSize: 22, color: '#1A1025', letterSpacing: '0.01em', lineHeight: 1.2 }}>
          강원에서 찾는<br/>나만의 해외여행 컷
        </p>
        <p style={{ fontSize: 13, color: '#888', marginTop: 8, lineHeight: 1.6 }}>
          KREAM · Musinsa · Bold · Confident · Gen Z
        </p>
      </div>

    </div>
  );
}

export function DirectionA() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start p-10 gap-8 font-sans">

      {/* Direction label */}
      <div className="w-full">
        <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Direction A — Lens</span>
        <p className="text-sm text-gray-500 mt-1">Toss-like · Ultra-minimal · Clean trustworthy app</p>
      </div>

      {/* Symbol */}
      <div className="flex flex-col items-center gap-4">
        <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
          {/* Outer circle — brand violet */}
          <circle cx="48" cy="48" r="44" fill="#3A2374"/>
          {/* Inner ring — white */}
          <circle cx="48" cy="48" r="30" stroke="white" strokeWidth="3" fill="none"/>
          {/* Inner fill — white */}
          <circle cx="48" cy="48" r="20" fill="white"/>
          {/* Lime dot accent */}
          <circle cx="48" cy="73" r="5" fill="#C6E33D"/>
        </svg>
        <p className="text-xs text-gray-400">Symbol mark</p>
      </div>

      {/* Wordmark */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <svg width="40" height="40" viewBox="0 0 96 96" fill="none">
            <circle cx="48" cy="48" r="44" fill="#3A2374"/>
            <circle cx="48" cy="48" r="30" stroke="white" strokeWidth="3" fill="none"/>
            <circle cx="48" cy="48" r="20" fill="white"/>
            <circle cx="48" cy="73" r="5" fill="#C6E33D"/>
          </svg>
          <span style={{ fontFamily: 'system-ui', fontWeight: 900, letterSpacing: '-0.04em', fontSize: 36, color: '#3A2374' }}>GOAT</span>
        </div>
        <p className="text-xs text-gray-400">Full horizontal lockup</p>
      </div>

      {/* App badge (landing screen usage) */}
      <div className="flex flex-col items-center gap-2">
        <div style={{ backgroundColor: '#C6E33D', borderRadius: 8, padding: '6px 14px' }}>
          <span style={{ fontWeight: 900, fontSize: 18, color: '#1A2E05', letterSpacing: '0.1em' }}>GOAT</span>
        </div>
        <p className="text-xs text-gray-400">Landing badge</p>
      </div>

      {/* App icon variant */}
      <div className="flex flex-col items-center gap-2">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <rect width="80" height="80" rx="18" fill="#3A2374"/>
          <circle cx="40" cy="38" r="22" stroke="white" strokeWidth="3" fill="none"/>
          <circle cx="40" cy="38" r="13" fill="white"/>
          <circle cx="40" cy="59" r="4" fill="#C6E33D"/>
        </svg>
        <p className="text-xs text-gray-400">App icon</p>
      </div>

      {/* Color palette */}
      <div className="w-full">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-widest">Palette</p>
        <div className="flex gap-3">
          {[
            { hex: '#3A2374', label: 'Violet' },
            { hex: '#C6E33D', label: 'Lime' },
            { hex: '#1A2E05', label: 'Deep' },
            { hex: '#EDEAF7', label: 'Surface' },
          ].map(c => (
            <div key={c.hex} className="flex flex-col items-center gap-1">
              <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: c.hex, border: c.hex === '#EDEAF7' ? '1px solid #ddd' : 'none' }}/>
              <span style={{ fontSize: 10, color: '#888' }}>{c.hex}</span>
              <span style={{ fontSize: 10, color: '#aaa' }}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="w-full">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-widest">Feel</p>
        <p style={{ fontWeight: 900, fontSize: 22, color: '#3A2374', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
          강원에서 찾는<br/>나만의 해외여행 컷
        </p>
        <p style={{ fontSize: 13, color: '#888', marginTop: 8, lineHeight: 1.6 }}>
          Toss · Clean · Trustworthy · Minimal
        </p>
      </div>

    </div>
  );
}

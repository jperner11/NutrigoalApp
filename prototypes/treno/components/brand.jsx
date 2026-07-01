// Brand mark + small shared bits
const MMLogo = ({ size = 28, color = 'currentColor' }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color }}>
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path d="M6 28V18a6 6 0 0112 0v10" stroke={color} strokeWidth="2.6" strokeLinecap="round"/>
      <path d="M22 28V18a6 6 0 0112 0v10" stroke={color} strokeWidth="2.6" strokeLinecap="round"/>
      <path d="M5 32h30" stroke={color} strokeWidth="2.6" strokeLinecap="round"/>
      <circle cx="32" cy="9" r="3" fill={color}/>
    </svg>
    <span style={{ fontFamily: 'Instrument Serif, serif', fontSize: Math.round(size * 0.82),
      letterSpacing: '-0.01em', lineHeight: 1 }}>
      meal<span style={{ fontStyle: 'italic', opacity: 0.85 }}>&</span>motion
    </span>
  </div>
);

const Portrait = ({ seed = 0, label = '', height = 220 }) => {
  const palettes = [
    ['#1B3A5B', '#2A5A85'], ['#203E3A', '#325F58'], ['#3E2A38', '#5E4456'],
    ['#2D2B42', '#474467'], ['#3E3426', '#5F5140'], ['#253A3E', '#3D5F65']
  ];
  const p = palettes[seed % palettes.length];
  return (
    <div style={{
      width: '100%', height, borderRadius: 14,
      background: `linear-gradient(160deg, ${p[0]}, ${p[1]})`,
      position: 'relative', overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.18), transparent 55%)' }}/>
      <svg viewBox="0 0 100 115" preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <circle cx="50" cy="42" r="16" fill="rgba(255,255,255,0.2)"/>
        <path d="M18 115c0-17 14-30 32-30s32 13 32 30z" fill="rgba(255,255,255,0.2)"/>
      </svg>
      <div style={{ position: 'absolute', bottom: 8, left: 10,
        fontFamily: 'Geist Mono, monospace', fontSize: 9,
        letterSpacing: '0.14em', color: 'rgba(255,255,255,0.65)' }}>{label}</div>
    </div>
  );
};

const TopNav = ({ view, setView }) => (
  <nav className="nav">
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '18px 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div onClick={() => setView('home')} style={{ cursor: 'pointer' }}><MMLogo/></div>
      <div className="row gap-24" style={{ fontSize: 13 }}>
        {[
          ['Home','home'],['Find a coach','discover'],
          ['For coaches','forCoaches'],['How it works','how'],['Pricing','pricing']
        ].map(([l,v]) => (
          <span key={v} onClick={() => setView(v)}
            style={{ cursor: 'pointer', color: view === v ? 'var(--fg)' : 'var(--fg-3)' }}>
            {l}
          </span>
        ))}
      </div>
      <div className="row gap-8">
        <button className="btn btn-ghost" onClick={() => setView('signup')}>Sign in</button>
        <button className="btn btn-accent" onClick={() => setView('signup')}>Start free →</button>
      </div>
    </div>
  </nav>
);

Object.assign(window, { MMLogo, Portrait, TopNav });

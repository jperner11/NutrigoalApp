interface PortraitProps {
  seed?: number
  label?: string
  height?: number
  className?: string
}

const PALETTES: Array<[string, string]> = [
  ['#1B3A5B', '#2A5A85'],
  ['#203E3A', '#325F58'],
  ['#3E2A38', '#5E4456'],
  ['#2D2B42', '#474467'],
  ['#3E3426', '#5F5140'],
  ['#253A3E', '#3D5F65'],
]

export default function Portrait({
  seed = 0,
  label = '',
  height = 220,
  className = '',
}: PortraitProps) {
  const [from, to] = PALETTES[seed % PALETTES.length]

  return (
    <div
      className={`relative overflow-hidden ${className}`.trim()}
      style={{
        width: '100%',
        height,
        borderRadius: 14,
        background: `linear-gradient(160deg, ${from}, ${to})`,
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.18), transparent 55%)',
        }}
      />
      <svg
        viewBox="0 0 100 115"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        aria-hidden="true"
      >
        <circle cx="50" cy="42" r="16" fill="rgba(255,255,255,0.2)" />
        <path
          d="M18 115c0-17 14-30 32-30s32 13 32 30z"
          fill="rgba(255,255,255,0.2)"
        />
      </svg>
      {label ? (
        <div
          className="mono"
          style={{
            position: 'absolute',
            bottom: 8,
            left: 10,
            fontSize: 9,
            letterSpacing: '0.14em',
            color: 'rgba(255,255,255,0.65)',
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  )
}

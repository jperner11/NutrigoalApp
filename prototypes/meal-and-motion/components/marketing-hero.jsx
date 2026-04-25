// Marketing — landing hero + ticker + three-lanes + footer
const Hero = ({ setView }) => (
  <section style={{ padding: '80px 32px 60px', maxWidth: 1320, margin: '0 auto' }}>
    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 48 }}>
      <div className="eyebrow eyebrow-dot fade-up">Spring release 01 — open beta</div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}>
        EST. 2024 · LONDON / LISBOA
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 56, alignItems: 'end' }}>
      <div>
        <h1 className="h1 fade-up" style={{ marginBottom: 28 }}>
          <span style={{ display: 'block' }}>Eat better.</span>
          <span style={{ display: 'block' }}>Train smarter.</span>
          <span className="italic-serif" style={{ display: 'block', color: 'var(--acc)' }}>
            Feel yourself moving.
          </span>
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.5, color: 'var(--fg-2)', maxWidth: 560 }}
          className="fade-up">
          One calm app for the plan you follow alone — or the coach you work with
          when you're ready for more. No feed. No noise. Just your momentum.
        </p>
        <div className="row gap-8 fade-up" style={{ marginTop: 32, flexWrap: 'wrap' }}>
          <button className="btn btn-accent" onClick={() => setView('signup')}>I'm here for myself</button>
          <button className="btn btn-ghost" onClick={() => setView('forCoaches')}>I'm a personal trainer</button>
        </div>
        <div className="row gap-12 fade-up" style={{ marginTop: 24, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setView('signup')}>Build my first plan →</button>
          <button className="btn btn-ghost" onClick={() => setView('discover')}>Browse coaches first</button>
          <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>
            7-day free trial · no card
          </span>
        </div>
      </div>
      <ClientPreviewCard/>
    </div>
    <div style={{ marginTop: 64, paddingTop: 32, borderTop: '1px solid var(--line)',
      display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 32 }}>
      {[['418','coaches onboarded'],['12k+','plans generated'],
        ['4.8','avg. client rating'],['<24h','avg. coach reply']].map(([n,l]) => (
        <div key={l}>
          <div className="serif" style={{ fontSize: 56, lineHeight: 1 }}>{n}</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)',
            letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 6 }}>{l}</div>
        </div>
      ))}
    </div>
  </section>
);

const ClientPreviewCard = () => (
  <div className="card fade-up" style={{ padding: 24 }}>
    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
      <div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.16em' }}>
          TUESDAY · WEEK 3
        </div>
        <div className="h3" style={{ marginTop: 4 }}>Today, briefly.</div>
      </div>
      <span className="chip">
        <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--acc)' }}/>
        On track
      </span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
      {[['Protein','142','/ 165g',0.86],['Training','38','/ 45 min',0.84],
        ['Water','2.1','/ 3.0 L',0.70]].map(([l,v,u,p]) => (
        <div key={l} className="card-2" style={{ padding: 14 }}>
          <div className="mono" style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>
            {l.toUpperCase()}
          </div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span className="serif" style={{ fontSize: 28, lineHeight: 1 }}>{v}</span>
            <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{u}</span>
          </div>
          <div style={{ height: 3, background: 'var(--line)', borderRadius: 999,
            marginTop: 10, overflow: 'hidden' }}>
            <div style={{ width: (p*100)+'%', height: '100%', background: 'var(--acc)' }}/>
          </div>
        </div>
      ))}
    </div>
    <div className="card-2" style={{ padding: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.14em' }}>
          NEXT · 12:30 LUNCH
        </div>
        <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>560 kcal</span>
      </div>
      <div style={{ fontSize: 15, marginBottom: 4 }}>Chickpea bowl, tahini, pickled onion</div>
      <div className="row gap-8" style={{ marginTop: 10 }}>
        <span className="chip">42 g P</span>
        <span className="chip">48 g C</span>
        <span className="chip">18 g F</span>
      </div>
    </div>
    <div style={{ marginTop: 12, padding: 12, borderRadius: 12, display: 'flex', gap: 10,
      background: 'rgba(120,180,255,0.06)', border: '1px solid var(--acc)' }}>
      <div style={{ color: 'var(--acc)', fontSize: 14 }}>✦</div>
      <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>
        Sleep dipped last night — <span style={{ color: 'var(--fg)' }}>I lowered today's session by one set.</span>
      </div>
    </div>
  </div>
);

const Ticker = () => {
  const items = ['No streaks. No notifications guilt-tripping you.',
    'AI that reads your sleep, not just your macros.',
    'Coach marketplace — verified, not vibes.',
    'Plans regenerate when life regenerates.',
    'Hybrid training: lift, run, recover.',
    'Built with coaches, not against them.'];
  const all = [...items, ...items];
  return (
    <div style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)',
      overflow: 'hidden', padding: '20px 0' }}>
      <div className="ticker-track" style={{ display: 'flex', gap: 56, whiteSpace: 'nowrap' }}>
        {all.map((t,i) => (
          <span key={i} className="mono" style={{ fontSize: 13, color: 'var(--fg-3)', letterSpacing: '0.04em' }}>
            <span style={{ color: 'var(--acc)', marginRight: 12 }}>✦</span>{t}
          </span>
        ))}
      </div>
    </div>
  );
};

const ThreeLanes = ({ setView }) => {
  const lanes = [
    {tag: '01 · SOLO', t: 'Plan by yourself.', s: 'AI that reads your life, not just your macros.',
     b: 'Nine calm questions. We build your first week of meals and training. Regenerate anything that does not fit.',
     bullets: ['Meal generator with allergens & budget', 'Hybrid strength + cardio splits', 'Grocery list, auto-consolidated'],
     cta: 'Start solo →', go: 'signup'},
    {tag: '02 · COACHED', t: 'Work with a coach.', s: 'The private side of the app, for you and your PT.',
     b: 'If your trainer is on Meal & Motion, their plans land here. You log. They watch. The feedback loop is the product.',
     bullets: ['Assigned plans from your coach', 'Weekly check-ins & feedback loop', 'Messaging without algorithms'],
     cta: 'Have an invite? Open it →', go: 'signup'},
    {tag: '03 · DISCOVER', t: 'Find a new coach.', s: 'A marketplace with quality, not vibes.',
     b: 'Browse by goal, budget, format. Send one structured request. No cold DMs, no pricing roulette.',
     bullets: ['Structured coach profiles', 'One-question matching quiz', 'Accept/decline, no ghosting'],
     cta: 'Browse coaches →', go: 'discover'},
  ];
  return (
    <section style={{ padding: '100px 32px', maxWidth: 1320, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 60, marginBottom: 48 }}>
        <div className="eyebrow eyebrow-dot">Three ways in</div>
        <h2 className="h2">
          One app, three doors.<br/>
          <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>Pick what fits today.</span>
        </h2>
      </div>
      <div className="col gap-12">
        {lanes.map((l,i) => (
          <div key={l.tag} style={{ border: '1px solid var(--line-2)', borderRadius: 20, padding: 28,
            background: i === 0 ? 'var(--ink-2)' : 'transparent' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1.2fr 1fr auto', gap: 32, alignItems: 'center' }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--acc)', letterSpacing: '0.18em' }}>{l.tag}</div>
              <div className="serif" style={{ fontSize: 32 }}>{l.t}</div>
              <div style={{ fontSize: 14, color: 'var(--fg-2)' }}>{l.s}</div>
              <button className="btn btn-ghost" onClick={() => setView(l.go)}>{l.cta}</button>
            </div>
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--line)',
              display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 48 }}>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--fg-2)' }}>{l.b}</p>
              <div className="col gap-10">
                {l.bullets.map(b => (
                  <div key={b} className="row gap-10" style={{ fontSize: 14 }}>
                    <span style={{ color: 'var(--acc)' }}>✓</span> {b}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const Footer = ({ setView }) => (
  <footer style={{ borderTop: '1px solid var(--line)', padding: '60px 32px',
    background: 'var(--ink-0)' }}>
    <div style={{ maxWidth: 1320, margin: '0 auto',
      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40 }}>
      <div>
        <MMLogo/>
        <p style={{ fontSize: 13, color: 'var(--fg-3)', marginTop: 16, lineHeight: 1.55, maxWidth: 360 }}>
          Eat better. Train smarter. Feel yourself moving — alone or with a coach who actually replies.
        </p>
      </div>
      {[
        ['App',[['Home','home'],['Find a coach','discover'],['Pricing','pricing']]],
        ['For coaches',[['Overview','forCoaches'],['How it works','how']]],
        ['Company',[['FAQ','home'],['Privacy','home'],['Terms','home']]],
      ].map(([t, links]) => (
        <div key={t}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)',
            letterSpacing: '0.14em', marginBottom: 14 }}>{t.toUpperCase()}</div>
          <div className="col gap-8">
            {links.map(([l,v]) => (
              <span key={l} onClick={() => setView(v)}
                style={{ fontSize: 13, color: 'var(--fg-2)', cursor: 'pointer' }}>{l}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
    <div className="row" style={{ maxWidth: 1320, margin: '40px auto 0', paddingTop: 24,
      borderTop: '1px solid var(--line)', justifyContent: 'space-between' }}>
      <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>
        © 2026 MEAL & MOTION · LONDON / LISBOA
      </span>
      <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>
        v0.9 · OPEN BETA
      </span>
    </div>
  </footer>
);

Object.assign(window, { Hero, Ticker, ThreeLanes, Footer });

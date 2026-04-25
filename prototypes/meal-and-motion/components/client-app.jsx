// Client web app — sidebar shell + Today + tabs
const ClientShell = ({ tab, setTab, children }) => {
  const items = [
    ['Today','today'],['Diet','diet'],['Training','training'],
    ['Discover','discover'],['My coach','coach'],['AI co-pilot','ai'],['Settings','settings']
  ];
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', margin: '20px 32px',
      maxWidth: 1320, marginLeft: 'auto', marginRight: 'auto' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)',
        display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: '#2a3a52' }}/>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: '#2a3a52' }}/>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: '#2a3a52' }}/>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', marginLeft: 16, letterSpacing: '0.08em' }}>
          mealandmotion.app/{tab}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr' }}>
        <div style={{ padding: 24, borderRight: '1px solid var(--line)', minHeight: 800 }}>
          <MMLogo size={22}/>
          <div className="col" style={{ marginTop: 32, gap: 2 }}>
            {items.map(([l, v]) => (
              <div key={v} className={'side-item' + (tab === v ? ' active' : '')}
                onClick={() => setTab(v)}>
                <span>{l}</span>
                {tab === v && <span style={{ color: 'var(--acc)' }}>●</span>}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 40, padding: 14, background: 'var(--ink-2)',
            borderRadius: 12, border: '1px solid var(--line)' }}>
            <Portrait seed={0} label="CF" height={120}/>
            <div className="serif" style={{ fontSize: 16, marginTop: 10 }}>Camila</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}>
              YOUR COACH
            </div>
          </div>
        </div>
        <div style={{ padding: 32 }}>{children}</div>
      </div>
    </div>
  );
};

const ClientToday = () => (
  <>
    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 28 }}>
      <div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>
          TUESDAY, 18 APRIL
        </div>
        <div className="serif" style={{ fontSize: 36, marginTop: 4 }}>Good afternoon, Eleni.</div>
      </div>
      <span className="chip">Week 3 of 12</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
      {[['PROTEIN','142g','86%'],['CALORIES','1820','74%'],
        ['TRAINING','38 min','on'],['SLEEP','7.2h','↑']].map(([l, v, m]) => (
        <div key={l} className="card-2" style={{ padding: 14 }}>
          <div className="mono" style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>{l}</div>
          <div className="serif" style={{ fontSize: 28, marginTop: 6 }}>{v}</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--acc)' }}>{m}</div>
        </div>
      ))}
    </div>
    <div className="card-2" style={{ padding: 16, marginBottom: 16 }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>
        NEXT UP · 18:00
      </div>
      <div style={{ fontSize: 16, marginTop: 6 }}>Push day · 5 exercises · 42 min</div>
      <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 28, borderRadius: 3,
            background: i < 12 ? 'var(--acc)' : 'var(--line)',
            opacity: i < 12 ? 0.3 + (i / 12) * 0.7 : 1 }}/>
        ))}
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div className="card" style={{ padding: 18 }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>
          TODAY'S MEALS
        </div>
        {['Steel-cut oats + berries · 430','Chickpea & tahini bowl · 560',
          'Greek yogurt + seeds · 210','Salmon, rice, greens · 640'].map((m, i) => (
          <div key={i} className="row" style={{ justifyContent: 'space-between',
            padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--line)' : 'none', fontSize: 13 }}>
            <span>{m.split(' · ')[0]}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{m.split(' · ')[1]} kcal</span>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 18, background: 'rgba(120,180,255,0.05)',
        borderColor: 'var(--acc)' }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--acc)', letterSpacing: '0.14em' }}>
          ✦ FROM CAMILA
        </div>
        <div style={{ fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
          Great numbers this week. Let's bump protein by 10g on training days —
          more cottage cheese in the AM works.
        </div>
        <div className="row gap-6" style={{ marginTop: 14 }}>
          <button className="btn btn-accent" style={{ padding: '6px 12px', fontSize: 12 }}>Reply</button>
          <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>Open chat</button>
        </div>
      </div>
    </div>
  </>
);

const ClientDiet = () => (
  <>
    <div className="serif" style={{ fontSize: 36, marginBottom: 24 }}>Diet</div>
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
      <div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)',
          letterSpacing: '0.12em', marginBottom: 12 }}>WEEK 3 · MEAL PLAN</div>
        {['Mon','Tue · Today','Wed','Thu','Fri','Sat','Sun'].map((d, i) => (
          <div key={d} className="card-2" style={{ padding: 16, marginBottom: 8 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.12em',
                color: i === 1 ? 'var(--acc)' : 'var(--fg-3)' }}>{d.toUpperCase()}</div>
              <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>1820 kcal · 142P</span>
            </div>
            <div style={{ fontSize: 14, marginTop: 6, color: 'var(--fg-2)' }}>
              Oats · Chickpea bowl · Yogurt · Salmon, rice
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 18, height: 'fit-content' }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>
          GROCERY · WEEK 3
        </div>
        <div className="col gap-8" style={{ marginTop: 12 }}>
          {['Steel-cut oats · 1kg','Chickpeas dried · 500g','Greek yogurt 0% · 1kg',
            'Salmon fillets · 4','Spinach · 200g','Tahini · 250g'].map(g => (
            <div key={g} className="row gap-8" style={{ fontSize: 13 }}>
              <span style={{ width: 14, height: 14, border: '1px solid var(--line-3)',
                borderRadius: 4 }}/> {g}
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
);

const ClientTraining = () => (
  <>
    <div className="serif" style={{ fontSize: 36, marginBottom: 24 }}>Training</div>
    <div className="card-2" style={{ padding: 20, marginBottom: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--acc)', letterSpacing: '0.14em' }}>
          PUSH DAY · 18:00
        </div>
        <span className="chip">42 min</span>
      </div>
      <div style={{ marginTop: 14 }}>
        {[['Incline bench press','4 × 6–8','RPE 7'],['Overhead press','3 × 8–10','RPE 7'],
          ['Cable fly','3 × 12','RPE 8'],['Lateral raises','3 × 15','RPE 8'],['Triceps rope','3 × 12','RPE 8']]
          .map(([n, sr, r]) => (
          <div key={n} className="row" style={{ justifyContent: 'space-between',
            padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontSize: 14 }}>{n}</span>
            <div className="row gap-16">
              <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{sr}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>{r}</span>
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-accent" style={{ marginTop: 16 }}>Start session →</button>
    </div>
  </>
);

const ClientCoach = () => (
  <>
    <div className="serif" style={{ fontSize: 36, marginBottom: 24 }}>My coach</div>
    <div className="card" style={{ padding: 24, display: 'grid', gridTemplateColumns: '120px 1fr',
      gap: 20, marginBottom: 16 }}>
      <Portrait seed={0} label="CF" height={140}/>
      <div>
        <div className="serif" style={{ fontSize: 28 }}>Camila Ferreira</div>
        <div style={{ fontSize: 14, color: 'var(--fg-2)' }}>Strength & postpartum · São Paulo</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ok)', marginTop: 8 }}>● Online · usually replies under 4h</div>
      </div>
    </div>
    <div className="card-2" style={{ padding: 16 }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em', marginBottom: 12 }}>
        RECENT MESSAGES
      </div>
      {[['Camila','Great numbers this week. Bump protein 10g.', '14:22'],
        ['You', 'Will do — more cottage cheese AM.', '14:25'],
        ['Camila', 'Squat video looks strong. Add 2.5kg next session?', '14:28']].map(([n, m, t], i) => (
        <div key={i} style={{ marginBottom: 10, display: 'flex', justifyContent: n === 'You' ? 'flex-end' : 'flex-start' }}>
          <div style={{ maxWidth: '70%', padding: 12, borderRadius: 12,
            background: n === 'You' ? 'var(--acc)' : 'var(--ink-2)',
            color: n === 'You' ? 'var(--ink-1)' : 'var(--fg)' }}>
            <div style={{ fontSize: 13 }}>{m}</div>
            <div className="mono" style={{ fontSize: 9, opacity: 0.6, marginTop: 4 }}>{t}</div>
          </div>
        </div>
      ))}
    </div>
  </>
);

const ClientApp = () => {
  const [tab, setTab] = React.useState('today');
  return (
    <ClientShell tab={tab} setTab={setTab}>
      {tab === 'today' && <ClientToday/>}
      {tab === 'diet' && <ClientDiet/>}
      {tab === 'training' && <ClientTraining/>}
      {tab === 'coach' && <ClientCoach/>}
      {(tab === 'discover' || tab === 'ai' || tab === 'settings') && (
        <div className="serif" style={{ fontSize: 36 }}>{tab[0].toUpperCase() + tab.slice(1)} <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>— TBD</span></div>
      )}
    </ClientShell>
  );
};

Object.assign(window, { ClientApp });

// Marketplace — Discover, Coach Profile, Request flow
const COACHES = [
  {id:'cf', name:'Camila Ferreira', tag:'Strength & postpartum', loc:'São Paulo · Remote',
   price:'£90/mo', rating:'4.9', reviews:62, seed:0, accepting:true,
   tags:['strength','postpartum','beginner']},
  {id:'ml', name:'Marcus Liao', tag:'Powerlifting & hybrid', loc:'London · In-person',
   price:'£140/mo', rating:'5.0', reviews:124, seed:1, accepting:true,
   tags:['strength','powerlifting','intermediate']},
  {id:'ao', name:'Aisha Okafor', tag:'Nutrition-first coaching', loc:'Lisbon · Remote',
   price:'£110/mo', rating:'4.8', reviews:88, seed:2, accepting:true,
   tags:['nutrition','fat-loss','sustainable']},
  {id:'tj', name:'Tom Jensen', tag:'Hypertrophy, runners', loc:'Copenhagen · Hybrid',
   price:'£120/mo', rating:'4.9', reviews:51, seed:3, accepting:false,
   tags:['hypertrophy','running','intermediate']},
  {id:'pm', name:'Priya Mehta', tag:'Plant-based performance', loc:'Manchester · Remote',
   price:'£95/mo', rating:'4.7', reviews:34, seed:4, accepting:true,
   tags:['plant-based','endurance']},
  {id:'da', name:'Diego Arrano', tag:'Bodyweight & mobility', loc:'Madrid · Remote',
   price:'£75/mo', rating:'4.8', reviews:71, seed:5, accepting:true,
   tags:['bodyweight','mobility','beginner']},
];

const DiscoverPage = ({ setView, setCoach }) => {
  const [q, setQ] = React.useState('');
  const [budget, setBudget] = React.useState(140);
  const filtered = COACHES.filter(c =>
    (!q || c.name.toLowerCase().includes(q.toLowerCase()) || c.tag.toLowerCase().includes(q.toLowerCase()))
    && parseInt(c.price.replace(/\D/g,'')) <= budget);
  return (
    <section style={{ padding: '60px 32px', maxWidth: 1320, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <div className="eyebrow eyebrow-dot" style={{ marginBottom: 16 }}>Find a coach</div>
        <h1 className="h2" style={{ maxWidth: 720 }}>The right coach for where you actually are.</h1>
        <p style={{ fontSize: 16, color: 'var(--fg-2)', marginTop: 16, maxWidth: 540 }}>
          Filter by what matters — goal, format, budget — or take the 60-second match quiz.
        </p>
      </div>
      <div className="card" style={{ padding: 20, marginBottom: 32,
        display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr auto', gap: 16, alignItems: 'end' }}>
        <div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>SEARCH</div>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Goal, name, style…"
            style={{ marginTop: 8, padding: '10px 12px', background: 'var(--ink-3)',
              border: '1px solid var(--line-2)', borderRadius: 10, fontSize: 14,
              color: 'var(--fg)', width: '100%' }}/>
        </div>
        <div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>FORMAT</div>
          <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--ink-3)',
            border: '1px solid var(--line-2)', borderRadius: 10, fontSize: 14 }}>Any</div>
        </div>
        <div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>
            BUDGET — UP TO £{budget}/MO
          </div>
          <input type="range" min="60" max="200" value={budget}
            onChange={e => setBudget(+e.target.value)}
            style={{ width: '100%', marginTop: 14, accentColor: 'var(--acc)' }}/>
        </div>
        <button className="btn btn-ghost">Match quiz →</button>
      </div>

      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
        <div className="mono" style={{ fontSize: 12, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>
          {filtered.length} COACHES · SORTED BY FIT
        </div>
        <div className="row gap-6">
          <span className="chip">Accepting only</span>
          <span className="chip">Verified</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
        {filtered.map(c => (
          <div key={c.id} className="card" style={{ padding: 20, cursor: 'pointer' }}
            onClick={() => { setCoach(c); setView('coachProfile'); }}>
            <Portrait seed={c.seed} label={c.name.split(' ').map(s => s[0]).join('')} height={180}/>
            <div style={{ marginTop: 14 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="serif" style={{ fontSize: 22 }}>{c.name}</div>
                <span className="mono" style={{ fontSize: 11 }}>★ {c.rating}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>{c.tag}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)',
                letterSpacing: '0.08em', marginTop: 10, textTransform: 'uppercase' }}>{c.loc}</div>
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 14 }}>
                <span className="serif" style={{ fontSize: 20 }}>{c.price}</span>
                <span className="chip" style={{ color: c.accepting ? 'var(--ok)' : 'var(--fg-4)' }}>
                  ● {c.accepting ? 'Accepting' : 'Waitlist'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const CoachProfile = ({ setView, coach }) => {
  const c = coach || COACHES[1];
  const [tab, setTab] = React.useState('about');
  return (
    <section style={{ padding: '40px 32px', maxWidth: 1320, margin: '0 auto' }}>
      <button className="btn btn-ghost" onClick={() => setView('discover')}
        style={{ marginBottom: 24, padding: '6px 12px', fontSize: 12 }}>← Back to discover</button>
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 56 }}>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 24, marginBottom: 36 }}>
            <Portrait seed={c.seed} label={c.name.split(' ').map(s=>s[0]).join('')} height={210}/>
            <div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--acc)', letterSpacing: '0.14em' }}>
                VERIFIED · {c.accepting ? 'ACCEPTING NEW CLIENTS' : 'WAITLIST OPEN'}
              </div>
              <h1 className="h2" style={{ marginTop: 10, fontSize: 56 }}>{c.name}</h1>
              <div style={{ fontSize: 16, color: 'var(--fg-2)', marginTop: 8 }}>{c.tag} · {c.loc.split(' ·')[0]}</div>
              <div className="row gap-16" style={{ marginTop: 20, flexWrap: 'wrap' }}>
                <span className="mono" style={{ fontSize: 13 }}>★ {c.rating} · {c.reviews} reviews</span>
                <span className="mono" style={{ fontSize: 13, color: 'var(--fg-2)' }}>12 yrs experience</span>
              </div>
            </div>
          </div>
          <div className="tab-row" style={{ marginBottom: 24 }}>
            {[['ABOUT','about'],['STYLE','style'],['SERVICES','services'],['REVIEWS','reviews']].map(([l,v]) => (
              <span key={v} className={'tab' + (tab === v ? ' active' : '')} onClick={() => setTab(v)}>{l}</span>
            ))}
          </div>
          {tab === 'about' && <>
            <div className="serif" style={{ fontSize: 28, lineHeight: 1.25 }}>
              "I coach lifters who want to compete — or lift like they could."
            </div>
            <p style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.6, marginTop: 16 }}>
              Twelve years coaching, eight as a competitive powerlifter. I've taken 40+ lifters
              from their first squat to regional meets. My clients are intermediates who are stuck,
              and beginners who want to build something serious from day one.
            </p>
            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[['IDEAL CLIENT','Intermediate lifters, 2+ yrs.'],
                ['CHECK-IN RHYTHM','Weekly video + daily async.'],
                ['CERTIFICATIONS','NSCA-CSCS, USAPL Coach, FMS L2'],
                ['RESPONSE TIME','Under 8 hours, Mon–Sat']].map(([l,v]) => (
                <div key={l} className="card-2" style={{ padding: 14 }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>{l}</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>{v}</div>
                </div>
              ))}
            </div>
          </>}
          {tab === 'style' && <p style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.6 }}>
            Programming is conjugate-style with weekly autoregulation. Expect detailed video review.
          </p>}
          {tab === 'services' && <div className="col gap-10">
            {[['1:1 Coaching','£140/mo'],['Meet prep (12wk)','£350 one-off'],['Form review','£40 / video']].map(([t,p]) => (
              <div key={t} className="card-2 row" style={{ padding: 14, justifyContent: 'space-between' }}>
                <span>{t}</span><span className="serif" style={{ fontSize: 18 }}>{p}</span>
              </div>
            ))}
          </div>}
          {tab === 'reviews' && <div className="col gap-12">
            {[['Sarah K.','★★★★★','Marcus pulled me out of a 2-year plateau. PRs every block now.'],
              ['Hannah W.','★★★★★','Best investment I ever made for my training.']].map(([n,s,t]) => (
              <div key={n} className="card-2" style={{ padding: 16 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14 }}>{n}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--acc)' }}>{s}</span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--fg-2)', marginTop: 8, lineHeight: 1.5 }}>{t}</div>
              </div>
            ))}
          </div>}
        </div>

        <div>
          <div className="card" style={{ padding: 24, position: 'sticky', top: 100 }}>
            <div className="serif" style={{ fontSize: 36, lineHeight: 1 }}>
              {c.price.split('/')[0]}
              <span style={{ fontSize: 14, color: 'var(--fg-3)', fontFamily: 'Geist, sans-serif' }}>
                /{c.price.split('/')[1]}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-3)', marginTop: 4 }}>£350 meet prep add-on available</div>
            <button className="btn btn-accent" style={{ width: '100%', marginTop: 20 }}
              onClick={() => setView('requestFlow')}>Request coaching →</button>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }}>Save to shortlist</button>
            <div className="divider" style={{ margin: '20px 0' }}/>
            <div className="col gap-10">
              {[['Format','Hybrid · London or remote'],['Slots open','3 of 20'],
                ['Next start','Monday 21 April'],['Languages','English · 普通话']].map(([l,v]) => (
                <div key={l} className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.08em' }}>
                    {l.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 13 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 16, padding: 16, border: '1px solid var(--line)', borderRadius: 16,
            fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>
            No cold DMs. You send one structured request. {c.name.split(' ')[0]} reviews and either accepts,
            asks one question, or declines.
          </div>
        </div>
      </div>
    </section>
  );
};

const RequestFlow = ({ setView }) => {
  const [step, setStep] = React.useState(0);
  const steps = ['Goal', 'Logistics', 'Message', 'Review'];
  return (
    <section style={{ padding: '60px 32px', maxWidth: 720, margin: '0 auto' }}>
      <div className="row gap-6" style={{ marginBottom: 32 }}>
        {steps.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 999,
            background: i <= step ? 'var(--acc)' : 'var(--line)' }}/>
        ))}
      </div>
      <div className="eyebrow" style={{ color: 'var(--acc)', marginBottom: 16 }}>
        STEP 0{step + 1} · {steps[step].toUpperCase()}
      </div>
      <h2 className="h2" style={{ marginBottom: 32 }}>
        {step === 0 && <>What's your <span className="italic-serif">main goal?</span></>}
        {step === 1 && <>When and how, <span className="italic-serif">roughly?</span></>}
        {step === 2 && <>One short note <span className="italic-serif">to Marcus.</span></>}
        {step === 3 && <>Looks <span className="italic-serif">good?</span></>}
      </h2>
      {step === 0 && (
        <div className="col gap-10">
          {['First powerlifting meet','Build strength generally','Bust through a plateau','Other'].map((o,i) => (
            <div key={o} style={{ padding: 18, borderRadius: 14,
              background: i === 0 ? 'var(--ink-3)' : 'var(--ink-2)',
              border: i === 0 ? '1px solid var(--acc)' : '1px solid var(--line-2)',
              fontSize: 16, cursor: 'pointer' }}>{o}</div>
          ))}
        </div>
      )}
      {step === 1 && (
        <div className="col gap-16">
          {[['Start','In two weeks'],['Budget','£140 / month'],['Format','Remote, weekly video']].map(([l,v]) => (
            <div key={l} className="card-2" style={{ padding: 16 }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>{l.toUpperCase()}</div>
              <div style={{ fontSize: 16, marginTop: 6 }}>{v}</div>
            </div>
          ))}
        </div>
      )}
      {step === 2 && (
        <textarea defaultValue="Hey Marcus — competing in May, intermediate lifter (BW 78kg). Squat 145, bench 105, dead 180. Need accountability and someone who'll watch my video."
          style={{ width: '100%', minHeight: 200, padding: 16, background: 'var(--ink-2)',
            border: '1px solid var(--line-2)', borderRadius: 14, color: 'var(--fg)',
            fontFamily: 'Geist', fontSize: 15, lineHeight: 1.5, resize: 'vertical' }}/>
      )}
      {step === 3 && (
        <div className="card" style={{ padding: 24 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--acc)' }}>YOUR REQUEST · TO MARCUS LIAO</div>
          <div className="serif" style={{ fontSize: 24, marginTop: 12 }}>First powerlifting meet</div>
          <div style={{ fontSize: 14, color: 'var(--fg-2)', marginTop: 8 }}>
            In two weeks · £140/mo · Remote, weekly video
          </div>
        </div>
      )}
      <div className="row gap-8" style={{ marginTop: 32 }}>
        {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>← Back</button>}
        {step < 3 && <button className="btn btn-accent" onClick={() => setStep(step + 1)}>Continue →</button>}
        {step === 3 && <button className="btn btn-accent" onClick={() => setView('home')}>Send request</button>}
      </div>
    </section>
  );
};

Object.assign(window, { DiscoverPage, CoachProfile, RequestFlow });

// Signup + Onboarding
const Signup = ({ setView, setRole }) => (
  <section style={{ padding: '80px 32px', maxWidth: 480, margin: '0 auto' }}>
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      <MMLogo size={28}/>
    </div>
    <div className="eyebrow eyebrow-dot" style={{ marginBottom: 16, justifyContent: 'center', display: 'flex' }}>
      Create your account
    </div>
    <h1 className="h2" style={{ textAlign: 'center', marginBottom: 32 }}>
      Welcome.<br/>
      <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>Are you here for…</span>
    </h1>
    <div className="col gap-12">
      {[
        ['client', 'Myself', 'I want a plan, with or without a coach later.'],
        ['coach',  'My clients', 'I am a personal trainer or nutritionist.'],
      ].map(([r, t, s]) => (
        <div key={r} onClick={() => { setRole(r); setView('onboarding'); }}
          style={{ padding: 24, border: '1px solid var(--line-2)', borderRadius: 16,
            background: 'var(--ink-2)', cursor: 'pointer' }}>
          <div className="serif" style={{ fontSize: 28 }}>{t}</div>
          <div style={{ fontSize: 14, color: 'var(--fg-2)', marginTop: 6 }}>{s}</div>
        </div>
      ))}
    </div>
    <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--fg-3)' }}>
      Already have an account? <span style={{ color: 'var(--fg)', cursor: 'pointer' }}>Sign in</span>
    </div>
  </section>
);

const Onboarding = ({ setView, role }) => {
  const [step, setStep] = React.useState(0);
  const isClient = role === 'client';
  const steps = isClient
    ? ['Name', 'Goal', 'Cadence', 'Constraints', 'Budget', 'Coach']
    : ['Name', 'Style', 'Clients', 'Pricing', 'Marketplace', 'Done'];
  const next = () => step < 5 ? setStep(step + 1) : setView(isClient ? 'clientApp' : 'coachApp');
  return (
    <section style={{ padding: '60px 32px', maxWidth: 640, margin: '0 auto' }}>
      <div className="row gap-6" style={{ marginBottom: 32 }}>
        {steps.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 999,
            background: i <= step ? 'var(--acc)' : 'var(--line)' }}/>
        ))}
      </div>
      <div className="eyebrow" style={{ color: 'var(--acc)', marginBottom: 16 }}>
        {isClient ? "LET'S MEET YOU" : 'YOUR COACHING PROFILE'} · {String(step + 1).padStart(2,'0')} / 06
      </div>
      <h2 className="h2" style={{ marginBottom: 32 }}>
        {step === 0 && <>What should we <span className="italic-serif">call you?</span></>}
        {step === 1 && (isClient
          ? <>Main goal — <span className="italic-serif">right now.</span></>
          : <>How would you describe <span className="italic-serif">your style?</span></>)}
        {step === 2 && (isClient
          ? <>How often do you <span className="italic-serif">want to train?</span></>
          : <>Are clients coming with you, <span className="italic-serif">or starting fresh?</span></>)}
        {step === 3 && (isClient
          ? <>Anything we should <span className="italic-serif">work around?</span></>
          : <>Set your <span className="italic-serif">starting price.</span></>)}
        {step === 4 && (isClient
          ? <>Weekly grocery <span className="italic-serif">budget?</span></>
          : <>Want clients to <span className="italic-serif">find you?</span></>)}
        {step === 5 && <>You're <span className="italic-serif">in.</span></>}
      </h2>
      {step === 0 && (
        <input placeholder="First name" autoFocus
          style={{ width: '100%', padding: 18, fontSize: 18, background: 'var(--ink-2)',
            border: '1px solid var(--line-2)', borderRadius: 14, color: 'var(--fg)' }}/>
      )}
      {step === 1 && (
        <div className="col gap-10">
          {(isClient
            ? ['Fat loss','Muscle gain','Strength','General health','Sport-specific']
            : ['Strength & powerlifting','Hypertrophy','Nutrition-first','General fitness','Endurance/sport']
          ).map((o, i) => (
            <div key={o} style={{ padding: 18, borderRadius: 14,
              background: i === 1 ? 'var(--ink-3)' : 'var(--ink-2)',
              border: i === 1 ? '1px solid var(--acc)' : '1px solid var(--line-2)',
              fontSize: 16, cursor: 'pointer' }}>{o}</div>
          ))}
        </div>
      )}
      {step === 2 && (
        <div className="col gap-10">
          {(isClient
            ? ['3 days a week','4 days a week','5 days a week','I want flexibility']
            : ['Bringing existing clients (we will import)','Starting fresh','Both']
          ).map(o => (
            <div key={o} style={{ padding: 18, borderRadius: 14, background: 'var(--ink-2)',
              border: '1px solid var(--line-2)', fontSize: 16, cursor: 'pointer' }}>{o}</div>
          ))}
        </div>
      )}
      {step === 3 && (isClient
        ? <div className="col gap-10">
            {['Vegetarian','No nuts','Lactose-free','Gluten-free','Halal','None'].map(o => (
              <div key={o} style={{ padding: 14, borderRadius: 12, background: 'var(--ink-2)',
                border: '1px solid var(--line-2)', fontSize: 15 }}>{o}</div>
            ))}
          </div>
        : <input placeholder="£140" style={{ width: '100%', padding: 18, fontSize: 18,
            background: 'var(--ink-2)', border: '1px solid var(--line-2)', borderRadius: 14, color: 'var(--fg)' }}/>
      )}
      {step === 4 && (
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 16 }}>{isClient ? '£60–80 / week' : 'Show me on the marketplace'}</div>
          <div style={{ fontSize: 13, color: 'var(--fg-3)', marginTop: 6 }}>
            {isClient ? 'You can change this anytime.' : 'You can switch off if you fill up.'}
          </div>
        </div>
      )}
      {step === 5 && (
        <div className="card" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
          <div className="grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.4 }}/>
          <div style={{ position: 'relative' }}>
            <div className="eyebrow eyebrow-dot" style={{ marginBottom: 16 }}>Building your space</div>
            <div className="col gap-10">
              {[['Reading your answers','✓'],['Generating first plan','✓'],
                ['Building training split','✓'],['Almost ready','...']].map(([t, s]) => (
                <div key={t} className="card-2 row" style={{ padding: 12, justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14 }}>{t}</span>
                  <span className="mono" style={{ fontSize: 11, color: s === '✓' ? 'var(--acc)' : 'var(--fg-4)' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="row gap-8" style={{ marginTop: 32 }}>
        {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>← Back</button>}
        <button className="btn btn-accent" onClick={next}>
          {step < 5 ? 'Continue →' : 'Open my app →'}
        </button>
      </div>
    </section>
  );
};

Object.assign(window, { Signup, Onboarding });

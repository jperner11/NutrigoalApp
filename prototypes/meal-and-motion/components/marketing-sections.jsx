// Marketing — For Coaches, How it Works, Pricing, FAQ
const ForCoaches = ({ setView }) => (
  <section style={{ padding: '100px 32px', background: 'var(--paper)',
    color: 'var(--paper-ink)' }}>
    <div style={{ maxWidth: 1320, margin: '0 auto',
      display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 60, alignItems: 'center' }}>
      <div>
        <div className="eyebrow" style={{ color: 'rgba(10,22,40,0.6)', marginBottom: 16 }}>
          For personal trainers
        </div>
        <h2 className="h2">
          Your studio,<br/>
          <span className="italic-serif" style={{ color: 'rgba(10,22,40,0.5)' }}>without the admin.</span>
        </h2>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: 'rgba(10,22,40,0.7)',
          marginTop: 24, maxWidth: 460 }}>
          Run your coaching business — intake, plans, check-ins, payments — from one room.
          Then, if you want more clients, turn on your public profile and let us send them.
        </p>
        <div className="col gap-10" style={{ marginTop: 32 }}>
          {[
            ['Keep 100% of your clients', 'We never touch existing relationships or charge per head.'],
            ['Marketplace is opt-in', 'Flip a switch when you want leads. Off when you are full.'],
            ['Built from your workflow', 'Reuses intake, plans, feedback loops you already know.'],
          ].map(([t,s]) => (
            <div key={t} style={{ paddingBottom: 16, borderBottom: '1px solid rgba(10,22,40,0.1)' }}>
              <div className="serif" style={{ fontSize: 22, lineHeight: 1.15 }}>{t}</div>
              <div style={{ fontSize: 14, color: 'rgba(10,22,40,0.65)', marginTop: 4 }}>{s}</div>
            </div>
          ))}
        </div>
        <div className="row gap-8" style={{ marginTop: 32 }}>
          <button className="btn" style={{ background: 'var(--paper-ink)', color: 'var(--fg)' }}
            onClick={() => setView('signup')}>Open my coach studio →</button>
          <button className="btn" style={{ borderColor: 'rgba(10,22,40,0.2)', color: 'var(--paper-ink)',
            borderWidth: 1, borderStyle: 'solid' }} onClick={() => setView('how')}>See how it works</button>
        </div>
      </div>

      <div style={{ background: 'var(--ink-2)', color: 'var(--fg)', borderRadius: 24,
        padding: 28, border: '1px solid var(--line)' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--fg-3)' }}>
            MARKETPLACE PROFILE · LIVE PREVIEW
          </div>
          <span className="chip" style={{ color: 'var(--ok)' }}>● Live</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 20 }}>
          <Portrait seed={1} label="ML" height={140}/>
          <div>
            <div className="serif" style={{ fontSize: 28 }}>Marcus Liao</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
              POWERLIFTING · HYBRID · LONDON
            </div>
            <div className="row gap-6" style={{ marginTop: 10, flexWrap: 'wrap' }}>
              <span className="chip">strength</span>
              <span className="chip">intermediate</span>
              <span className="chip">hybrid</span>
            </div>
          </div>
        </div>
        <div className="divider" style={{ margin: '20px 0' }}/>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[['From','£140/mo'],['Rating','4.9 / 124'],['Response','<8h']].map(([l,v]) => (
            <div key={l}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.1em' }}>
                {l.toUpperCase()}
              </div>
              <div className="serif" style={{ fontSize: 20, marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, padding: 14, background: 'var(--ink-3)',
          border: '1px solid var(--line)', borderRadius: 12 }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}>
            NEW LEAD · 2 MIN AGO
          </div>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            "Training for my first powerlifting meet in 12 weeks. Budget £150/mo."
          </div>
          <div className="row gap-6" style={{ marginTop: 12 }}>
            <button className="btn btn-accent" style={{ padding: '6px 12px', fontSize: 11 }}>Accept</button>
            <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 11 }}>Reply</button>
            <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 11 }}>Decline</button>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const HowItWorks = () => (
  <section style={{ padding: '100px 32px', maxWidth: 1320, margin: '0 auto' }}>
    <div style={{ marginBottom: 56 }}>
      <div className="eyebrow eyebrow-dot" style={{ marginBottom: 16 }}>How it works</div>
      <h2 className="h2">Four steps, honest ones.</h2>
    </div>
    <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)',
      letterSpacing: '0.14em', marginBottom: 16 }}>AS A CLIENT</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 }}>
      {[
        ['01','Answer nine questions','Goal, lifestyle, what you hate. No 60-screen onboarding.'],
        ['02','Get your first plan','Meals, training, grocery list — in 40 seconds.'],
        ['03','Follow it. Tweak it.',"Check boxes, log weight, regenerate anything that doesn't fit."],
        ['04','Add a coach, if you want','Browse, request, get accepted. Now your PT builds plans.'],
      ].map(([n,t,s]) => (
        <div key={n} style={{ padding: 24, border: '1px solid var(--line-2)', borderRadius: 20,
          background: 'var(--ink-2)' }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--acc)', letterSpacing: '0.14em' }}>{n}</div>
          <div className="serif" style={{ fontSize: 24, lineHeight: 1.1, marginTop: 14 }}>{t}</div>
          <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 10, lineHeight: 1.5 }}>{s}</div>
        </div>
      ))}
    </div>
    <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)',
      letterSpacing: '0.14em', marginBottom: 16 }}>AS A COACH</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
      {[
        ['01','Import your clients','Or onboard new ones with your own intake form.'],
        ['02','Build plans faster','AI drafts, you refine. 2h to 20 min.'],
        ['03','Run weekly check-ins','Structured, not chaotic DMs.'],
        ['04','Turn on discovery','Go public when you want fresh leads.'],
      ].map(([n,t,s]) => (
        <div key={n} style={{ padding: 24, border: '1px solid var(--line-2)', borderRadius: 20 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--acc)', letterSpacing: '0.14em' }}>{n}</div>
          <div className="serif" style={{ fontSize: 24, lineHeight: 1.1, marginTop: 14 }}>{t}</div>
          <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 10, lineHeight: 1.5 }}>{s}</div>
        </div>
      ))}
    </div>
  </section>
);

const Pricing = ({ setView }) => (
  <section style={{ padding: '100px 32px', maxWidth: 1320, margin: '0 auto' }}>
    <div style={{ textAlign: 'center', marginBottom: 56 }}>
      <div className="eyebrow eyebrow-dot" style={{ marginBottom: 16 }}>Pricing</div>
      <h2 className="h2">Simple on purpose.</h2>
      <p style={{ fontSize: 16, color: 'var(--fg-2)', marginTop: 16, maxWidth: 540, margin: '16px auto 0' }}>
        Free forever for solo. Pay when you want unlimited regeneration or a coach.
        Coaches keep 97%.
      </p>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginBottom: 40 }}>
      {[
        ['Free','£0','forever',['AI meal & training plan (1 active)','Basic tracking','Browse coaches'], false, 'Start free'],
        ['Pro','£9','per month',['Unlimited plan regeneration','Grocery lists + meal swaps','Weekly progress reports','Work with a coach'], true, 'Start 7-day trial'],
        ['Unlimited','£18','per month',['Everything in Pro','AI coach conversations','Hybrid plans (running, cycling)','Priority support'], false, 'Choose unlimited'],
      ].map(([n,p,u,fs,featured,cta]) => (
        <div key={n} style={{ padding: 28, borderRadius: 20,
          border: featured ? '1px solid var(--acc)' : '1px solid var(--line-2)',
          background: featured ? 'linear-gradient(180deg, rgba(90,140,210,0.08), transparent)' : 'var(--ink-2)',
          position: 'relative' }}>
          {featured && <div style={{ position: 'absolute', top: -10, left: 24,
            background: 'var(--acc)', color: 'var(--ink-1)', fontSize: 10, padding: '4px 10px',
            borderRadius: 999, fontFamily: 'Geist Mono, monospace', letterSpacing: '0.1em',
            fontWeight: 600 }}>MOST POPULAR</div>}
          <div className="serif" style={{ fontSize: 26 }}>{n}</div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span className="serif" style={{ fontSize: 48, lineHeight: 1 }}>{p}</span>
            <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{u}</span>
          </div>
          <div className="divider" style={{ margin: '20px 0' }}/>
          <div className="col gap-10">
            {fs.map(f => <div key={f} className="row gap-10" style={{ fontSize: 13 }}>
              <span style={{ color: 'var(--acc)' }}>✓</span> {f}</div>)}
          </div>
          <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 24,
            background: featured ? 'var(--acc)' : 'transparent',
            color: featured ? 'var(--ink-1)' : 'var(--fg)',
            border: featured ? 'none' : '1px solid var(--line-2)',
            fontWeight: featured ? 600 : 500 }}
            onClick={() => setView('signup')}>{cta}</button>
        </div>
      ))}
    </div>
    <div className="card" style={{ padding: 28, maxWidth: 780, margin: '0 auto' }}>
      <div className="mono" style={{ fontSize: 11, color: 'var(--acc)', letterSpacing: '0.14em' }}>FOR COACHES</div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, flexWrap: 'wrap' }}>
        <div className="serif" style={{ fontSize: 28 }}>Coach</div>
        <div>
          <span className="serif" style={{ fontSize: 48 }}>£19</span>
          <span style={{ fontSize: 12, color: 'var(--fg-3)', marginLeft: 8 }}>per month · first 3 clients free</span>
        </div>
      </div>
      <div className="divider" style={{ margin: '20px 0' }}/>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {['Unlimited clients','AI plan drafting + intake forms','Client messaging & check-ins',
          'Marketplace profile + lead inbox','Custom branded intake','Payments via Stripe (3% platform fee)']
          .map(f => (
            <div key={f} className="row gap-10" style={{ fontSize: 13 }}>
              <span style={{ color: 'var(--acc)' }}>✓</span> {f}
            </div>
          ))}
      </div>
    </div>
  </section>
);

const FAQ = () => {
  const [open, setOpen] = React.useState(0);
  const qs = [
    ['Is this for me if I already have a personal trainer?',
     'Yes — ask them to invite you. If they are on Meal & Motion their plans land in your app, you log, they watch. No friction.'],
    ['What makes the marketplace different from Instagram DMs?',
     'Coaches have structured profiles you can actually compare. You send one structured request — goal, budget, format. Coaches accept, reply with one question, or decline. No ghosting, no pricing roulette.'],
    ['Can I just use the AI without a coach?',
     'Absolutely. Free tier covers your first plan. Pro gives unlimited regeneration when life shifts and your plan needs to shift with it.'],
    ['I am a coach — will you charge me per client?',
     'No. £19/mo flat, first 3 clients free, regardless of headcount. We make money from clients on Pro, and a 3% platform fee on payments routed through us. You keep your relationships.'],
    ['Do you sell my data?',
     'No. We do not have ads, we do not sell to insurers. Account deletion wipes everything within 30 days, including AI training data.'],
  ];
  return (
    <section style={{ padding: '100px 32px', maxWidth: 920, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div className="eyebrow eyebrow-dot" style={{ marginBottom: 16 }}>Frequently asked</div>
        <h2 className="h2">Things people ask.</h2>
      </div>
      <div className="col" style={{ borderTop: '1px solid var(--line)' }}>
        {qs.map(([q,a],i) => (
          <div key={q} style={{ borderBottom: '1px solid var(--line)', padding: '24px 4px' }}>
            <div onClick={() => setOpen(open === i ? -1 : i)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer' }}>
              <div className="serif" style={{ fontSize: 22, lineHeight: 1.25 }}>{q}</div>
              <span className="mono" style={{ color: 'var(--acc)' }}>{open === i ? '−' : '+'}</span>
            </div>
            {open === i && (
              <div style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.6, marginTop: 16, maxWidth: 720 }}>
                {a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

Object.assign(window, { ForCoaches, HowItWorks, Pricing, FAQ });

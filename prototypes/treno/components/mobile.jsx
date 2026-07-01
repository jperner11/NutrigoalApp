// Mobile companion preview
const PhoneToday = () => (
  <div style={{ padding: 12 }}>
    <div className="mono" style={{ fontSize: 8, color: 'var(--fg-4)', letterSpacing: '0.14em' }}>TUE · WK 3</div>
    <div className="serif" style={{ fontSize: 18, marginTop: 6, lineHeight: 1.05 }}>Good afternoon, Eleni.</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 12 }}>
      {[['PROTEIN','142g','86%'],['CAL','1820','86%'],['TRAIN','38m','84%'],['WATER','2.1L','70%']].map(([l,v,p]) => (
        <div key={l} style={{ padding: 8, background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 8 }}>
          <div className="mono" style={{ fontSize: 7, color: 'var(--fg-4)' }}>{l}</div>
          <div className="serif" style={{ fontSize: 14, marginTop: 2 }}>{v}</div>
          <div className="mono" style={{ fontSize: 7, color: 'var(--acc)' }}>{p}</div>
        </div>
      ))}
    </div>
    <div style={{ padding: 10, background: 'rgba(120,180,255,0.06)', border: '1px solid var(--acc)',
      borderRadius: 10, marginTop: 8 }}>
      <div className="mono" style={{ fontSize: 7, color: 'var(--acc)', letterSpacing: '0.14em' }}>AI NUDGE</div>
      <div style={{ fontSize: 9, marginTop: 4 }}>Low sleep — swapped push for mobility.</div>
    </div>
  </div>
);

const PhoneTraining = () => (
  <div style={{ padding: 12 }}>
    <div className="mono" style={{ fontSize: 8, color: 'var(--fg-4)' }}>PUSH · SET 2/4</div>
    <div className="serif" style={{ fontSize: 18, marginTop: 6 }}>Incline bench</div>
    <div style={{ padding: 12, background: 'var(--ink-2)', borderRadius: 12, marginTop: 12, textAlign: 'center' }}>
      <div className="mono" style={{ fontSize: 7, color: 'var(--fg-4)' }}>TARGET</div>
      <div className="serif" style={{ fontSize: 32, marginTop: 4 }}>65<span style={{ fontSize: 12, color: 'var(--fg-3)' }}>kg</span></div>
      <div className="mono" style={{ fontSize: 8, color: 'var(--fg-3)' }}>6–8 · RPE 7</div>
    </div>
  </div>
);

const PhoneChat = () => (
  <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column' }}>
    <div className="row gap-8" style={{ paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
      <div style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--ink-3)',
        border: '1px solid var(--line-2)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 10 }}>CF</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10 }}>Camila</div>
        <div className="mono" style={{ fontSize: 7, color: 'var(--ok)' }}>● online</div>
      </div>
    </div>
    <div style={{ flex: 1, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ padding: 8, background: 'var(--ink-3)', borderRadius: 10, maxWidth: '80%', fontSize: 9 }}>
        Solid week. Bump protein 10g.
      </div>
      <div style={{ padding: 8, background: 'var(--acc)', color: 'var(--ink-1)',
        borderRadius: 10, maxWidth: '80%', fontSize: 9, alignSelf: 'flex-end' }}>
        Will do — cottage cheese AM.
      </div>
    </div>
  </div>
);

const PhoneCoach = () => (
  <div style={{ padding: 12 }}>
    <div className="mono" style={{ fontSize: 8, color: 'var(--fg-4)' }}>14 CLIENTS</div>
    <div className="serif" style={{ fontSize: 18, marginTop: 6 }}>Needs attention</div>
    <div style={{ marginTop: 10 }}>
      {[['Jordan M.','Overdue','HIGH','var(--warn)'],
        ['Tom H.','Lead 94%','NEW','var(--acc)'],
        ['Maya J.','Lead 88%','NEW','var(--acc)']].map((c,i) => (
        <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)',
          display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
          <div>
            <div style={{ fontSize: 9 }}>{c[0]}</div>
            <div className="mono" style={{ fontSize: 7, color: 'var(--fg-4)' }}>{c[1]}</div>
          </div>
          <span className="mono" style={{ fontSize: 6, color: c[3] }}>{c[2]}</span>
        </div>
      ))}
    </div>
  </div>
);

const Phone = ({ children }) => (
  <div className="phone">
    <div className="phone-inner">
      <div className="phone-status">
        <span>9:41</span>
        <span style={{ width: 60, height: 14, background: '#000', borderRadius: 999 }}/>
        <span>●●●</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>{children}</div>
    </div>
  </div>
);

const MobilePreview = () => (
  <section style={{ padding: '80px 32px', maxWidth: 1320, margin: '0 auto' }}>
    <div style={{ marginBottom: 40, maxWidth: 640 }}>
      <div className="eyebrow eyebrow-dot" style={{ marginBottom: 16 }}>Mobile companion · iOS + Android</div>
      <h2 className="h2">Log from the gym.<br/>
        <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>Message from the couch.</span>
      </h2>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24, justifyItems: 'center' }}>
      <div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)',
          letterSpacing: '0.14em', marginBottom: 12 }}>CLIENT · TODAY</div>
        <Phone><PhoneToday/></Phone>
      </div>
      <div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)',
          letterSpacing: '0.14em', marginBottom: 12 }}>CLIENT · TRAINING</div>
        <Phone><PhoneTraining/></Phone>
      </div>
      <div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)',
          letterSpacing: '0.14em', marginBottom: 12 }}>CLIENT · COACH CHAT</div>
        <Phone><PhoneChat/></Phone>
      </div>
      <div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)',
          letterSpacing: '0.14em', marginBottom: 12 }}>COACH · CLIENTS</div>
        <Phone><PhoneCoach/></Phone>
      </div>
    </div>
  </section>
);

Object.assign(window, { MobilePreview });

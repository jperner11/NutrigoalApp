// Coach web app
const CoachShell = ({ tab, setTab, children }) => {
  const items = [['Clients','clients'],['Leads','leads'],['Plans','plans'],
    ['Messages','messages'],['Marketplace','marketplace'],['Payments','payments'],['Settings','settings']];
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', margin: '20px 32px',
      maxWidth: 1320, marginLeft: 'auto', marginRight: 'auto' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)',
        display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: '#2a3a52' }}/>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: '#2a3a52' }}/>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: '#2a3a52' }}/>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', marginLeft: 16, letterSpacing: '0.08em' }}>
          mealandmotion.app/coach/{tab}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr' }}>
        <div style={{ padding: 24, borderRight: '1px solid var(--line)', minHeight: 800 }}>
          <MMLogo size={22}/>
          <div className="mono" style={{ fontSize: 9, color: 'var(--acc)', letterSpacing: '0.14em', marginTop: 6 }}>
            COACH STUDIO
          </div>
          <div className="col" style={{ marginTop: 32, gap: 2 }}>
            {items.map(([l, v]) => (
              <div key={v} className={'side-item' + (tab === v ? ' active' : '')}
                onClick={() => setTab(v)}>
                <span>{l}</span>
                {v === 'leads' && <span className="mono" style={{ fontSize: 10, color: 'var(--acc)' }}>3</span>}
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 32 }}>{children}</div>
      </div>
    </div>
  );
};

const CoachClients = () => (
  <>
    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 24 }}>
      <div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>
          14 ACTIVE · 2 STARTING SOON
        </div>
        <div className="serif" style={{ fontSize: 36, marginTop: 4 }}>Your clients</div>
      </div>
      <div className="row gap-8">
        <span className="chip" style={{ color: 'var(--ok)' }}>● Accepting leads</span>
        <button className="btn btn-accent" style={{ padding: '8px 14px', fontSize: 12 }}>+ Invite client</button>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
      {[['ACTIVE','14','2 starting soon'],['NEW LEADS','3','since Monday'],
        ['CHECK-INS','5','2 overdue'],['MRR','£1,940','+£180 this mo']].map(([l,v,d]) => (
        <div key={l} className="card" style={{ padding: 16 }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>{l}</div>
          <div className="serif" style={{ fontSize: 32, marginTop: 8 }}>{v}</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 2 }}>{d}</div>
        </div>
      ))}
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
      <div className="card" style={{ padding: 0 }}>
        <div className="mono" style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)',
          fontSize: 10, letterSpacing: '0.14em', color: 'var(--fg-4)' }}>NEEDS YOUR ATTENTION</div>
        {[
          ['Jordan M.','Check-in overdue · 3 days','HIGH','var(--warn)'],
          ['Sarah K.','Asked about deload week','REPLY','var(--fg-3)'],
          ['Tom H. (lead)','New request · fat loss','NEW','var(--acc)'],
          ['Ana P.','Weekly plan ready','SEND','var(--fg-3)'],
          ['Maya J. (lead)','Quiz match · 94%','NEW','var(--acc)'],
        ].map((r,i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto',
            gap: 14, alignItems: 'center', padding: '14px 20px',
            borderBottom: i < 4 ? '1px solid var(--line)' : 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--ink-3)',
              border: '1px solid var(--line-2)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11 }}>{r[0][0]}</div>
            <div>
              <div style={{ fontSize: 14 }}>{r[0]}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>{r[1]}</div>
            </div>
            <span className="mono" style={{ fontSize: 9, color: r[3], letterSpacing: '0.14em' }}>{r[2]}</span>
          </div>
        ))}
      </div>

      <div className="col gap-12">
        <div className="card" style={{ padding: 18 }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}>
            TODAY'S CHECK-INS
          </div>
          <div className="col" style={{ marginTop: 12 }}>
            {[['09:00','Marie L.'],['11:30','Jordan M.'],['14:00','Sarah K.'],
              ['16:30','Ana P.'],['18:00','Tom R.']].map(c => (
              <div key={c[1]} className="row" style={{ justifyContent: 'space-between',
                padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>{c[0]}</span>
                <span style={{ fontSize: 13 }}>{c[1]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: 18, background: 'rgba(120,180,255,0.05)',
          borderColor: 'var(--acc)' }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--acc)', letterSpacing: '0.14em' }}>MARKETPLACE</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>
            Profile views <b>+28%</b> this week (42 total).
          </div>
        </div>
      </div>
    </div>
  </>
);

const CoachApp = () => {
  const [tab, setTab] = React.useState('clients');
  return (
    <CoachShell tab={tab} setTab={setTab}>
      {tab === 'clients' && <CoachClients/>}
      {tab !== 'clients' && (
        <div className="serif" style={{ fontSize: 36 }}>
          {tab[0].toUpperCase() + tab.slice(1)} <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>— TBD</span>
        </div>
      )}
    </CoachShell>
  );
};

Object.assign(window, { CoachApp });

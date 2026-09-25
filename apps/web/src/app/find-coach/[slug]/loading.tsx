export default function CoachProfileLoading() {
  return (
    <section className="mx-auto max-w-[1320px] animate-pulse px-8 py-10">
      <div className="h-8 w-40 rounded" style={{ background: 'var(--line)' }} />

      <div className="mt-6 grid gap-14 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-[180px_1fr]">
            <div className="rounded-2xl" style={{ height: 210, background: 'var(--line)' }} />
            <div>
              <div className="h-3 w-32 rounded" style={{ background: 'var(--line)' }} />
              <div className="mt-3 h-8 w-48 rounded" style={{ background: 'var(--line)' }} />
              <div className="mt-3 h-4 w-56 rounded" style={{ background: 'var(--line)' }} />
              <div className="mt-4 flex flex-wrap gap-1.5">
                <div className="h-6 w-16 rounded-full" style={{ background: 'var(--line)' }} />
                <div className="h-6 w-20 rounded-full" style={{ background: 'var(--line)' }} />
                <div className="h-6 w-14 rounded-full" style={{ background: 'var(--line)' }} />
              </div>
            </div>
          </div>

          <div className="mt-10 h-7 w-3/4 rounded" style={{ background: 'var(--line)' }} />
          <div className="mt-4 h-4 w-full rounded" style={{ background: 'var(--line)' }} />
          <div className="mt-2 h-4 w-5/6 rounded" style={{ background: 'var(--line)' }} />
        </div>

        <div>
          <div className="card p-6" style={{ height: 220, background: 'var(--line)' }} />
        </div>
      </div>
    </section>
  )
}

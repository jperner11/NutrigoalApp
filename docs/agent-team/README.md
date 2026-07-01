# Treno Agent Team ("agentic loop engineering")

A small crew of scheduled Claude agents that continuously improve Treno. Each runs
every ~4h, does ONE focused, reviewable piece of work, and opens a PR **into the
`staging` branch**. A gatekeeper agent reviews + auto-merges the safe ones. You
promote `staging` → production (`main`) manually.

```
producers (every 4h, staggered)                 gatekeeper (offset +1h)
  Staff SWE  ─┐                                    for each open PR → staging:
  QA-watcher ─┼─ own git worktree → branch          ✓ CI (e2e) green?
  Design     ─┤  → PR (base: staging)               ✓ on-charter, small, safe?
  AI-eval    ─┘                                      → squash-merge to staging
                                                     ✗ else: comment / needs-human
     staging ──auto→ Vercel staging URL
     main    ──MANUAL (you) → production
```

## The crew
| Agent | Charter | Cadence (local) |
|---|---|---|
| Staff SWE | [staff-swe.md](staff-swe.md) | `9 */4 * * *` |
| QA-watcher | [qa-watcher.md](qa-watcher.md) | `19 */4 * * *` |
| Design/brand | [design-brand.md](design-brand.md) | `29 */4 * * *` |
| AI-eval (LLM-as-judge) | [ai-eval.md](ai-eval.md) | `39 */4 * * *` |
| PR-gatekeeper | [pr-gatekeeper.md](pr-gatekeeper.md) | `49 1-23/4 * * *` |

All agents obey [_shared-guardrails.md](_shared-guardrails.md).

## Operating notes / limits
- Scheduling is via Claude Code cron jobs. They fire **only while Claude Code is
  running and the REPL is idle**, and recurring jobs **auto-expire after 7 days**.
  For a permanent always-on crew, this must be moved to an always-on host or
  GitHub Actions (follow-up infra task).
- **How to pause the whole team:** ask Claude to run `CronList` then `CronDelete`
  each job, or just close Claude Code.
- **How to tune a role:** edit its charter file. The cron prompt points at the file,
  so changes take effect on the next run.
- Nothing here can touch production. Only you merge `staging` → `main`.

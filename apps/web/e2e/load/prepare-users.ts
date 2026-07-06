/* eslint-disable no-console */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createTestUser } from '../lib/seed'

// Seeds N pre-confirmed clients for the k6 write-path scenario and writes their
// credentials to e2e/load/.users.json (gitignored). The seed layer's prod-guard
// applies — this can only run against the TEST Supabase project.
//
//   npm run load:users -w apps/web            (default 50)
//   npm run load:users -w apps/web -- 100

async function main() {
  const n = Number(process.argv[2] ?? 50)
  if (!Number.isInteger(n) || n < 1 || n > 500) {
    throw new Error('Usage: load:users [count 1-500]')
  }
  const users = []
  for (let i = 0; i < n; i++) {
    users.push(await createTestUser('free'))
    if ((i + 1) % 25 === 0) console.log(`  ...${i + 1}/${n}`)
  }
  const out = join(__dirname, '.users.json')
  writeFileSync(out, JSON.stringify(users, null, 2))
  console.log(`Wrote ${n} test users to ${out}`)
  console.log('Clean them up later with: npm run e2e:seed -w apps/web -- cleanup')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

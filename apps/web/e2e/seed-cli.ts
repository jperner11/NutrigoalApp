/* eslint-disable no-console */
import {
  createTestUser,
  createLinkedPair,
  deleteTestUser,
  cleanupAllTestUsers,
  type SeedRole,
  type SeededUser,
} from './lib/seed'

// Small CLI so you (or the agent) can prepare test accounts from the terminal:
//   npm run e2e:seed -w apps/web -- create pt
//   npm run e2e:seed -w apps/web -- create client
//   npm run e2e:seed -w apps/web -- create-many 50 client
//   npm run e2e:seed -w apps/web -- pairs 20            (20 coaches, 1 client each)
//   npm run e2e:seed -w apps/web -- pairs 20 10         (20 coaches, 10 clients each)
//   npm run e2e:seed -w apps/web -- cleanup
//   npm run e2e:seed -w apps/web -- delete <userId>
//
// `pairs` mints PUBLISHED marketplace coaches with clients already linked
// (user_profiles.personal_trainer_id set) — realistic volume for /discover,
// coach client-lists, and the k6 load scenarios in e2e/load/.

function parseCount(raw: string | undefined, what: string, max: number): number {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1 || n > max) {
    throw new Error(`Usage: ${what} must be an integer between 1 and ${max}`)
  }
  return n
}

async function main() {
  const [command, arg, arg2] = process.argv.slice(2)

  switch (command) {
    case 'create': {
      const role: SeedRole = arg === 'pt' || arg === 'personal_trainer' ? 'personal_trainer' : 'free'
      const user = await createTestUser(role)
      console.log('Created pre-confirmed test user:')
      console.log(JSON.stringify(user, null, 2))
      console.log('\nLog in with these credentials to skip the signup/email step.')
      break
    }
    case 'create-many': {
      const n = parseCount(arg, 'create-many <n>', 500)
      const role: SeedRole = arg2 === 'pt' || arg2 === 'personal_trainer' ? 'personal_trainer' : 'free'
      const users: SeededUser[] = []
      for (let i = 0; i < n; i++) {
        users.push(await createTestUser(role))
        if ((i + 1) % 25 === 0) console.log(`  ...${i + 1}/${n}`)
      }
      console.log(JSON.stringify(users, null, 2))
      console.log(`\nCreated ${n} pre-confirmed ${role} user(s).`)
      break
    }
    case 'pairs': {
      const coaches = parseCount(arg, 'pairs <coaches>', 100)
      const clientsPerCoach = arg2 ? parseCount(arg2, 'pairs <coaches> <clientsPerCoach>', 50) : 1
      const out = []
      for (let i = 0; i < coaches; i++) {
        out.push(await createLinkedPair(clientsPerCoach))
        console.log(`  seeded coach ${i + 1}/${coaches} (+${clientsPerCoach} linked client(s))`)
      }
      console.log(JSON.stringify(out, null, 2))
      console.log(
        `\nCreated ${coaches} published coach(es) × ${clientsPerCoach} linked client(s) = ${
          coaches * (1 + clientsPerCoach)
        } users.`,
      )
      break
    }
    case 'delete': {
      if (!arg) throw new Error('Usage: delete <userId>')
      await deleteTestUser(arg)
      console.log(`Deleted user ${arg}`)
      break
    }
    case 'cleanup': {
      const n = await cleanupAllTestUsers()
      console.log(`Removed ${n} synthetic test user(s).`)
      break
    }
    default:
      console.log(
        'Commands: create pt | create client | create-many <n> [pt|client] | pairs <coaches> [clientsPerCoach] | delete <userId> | cleanup',
      )
      process.exit(1)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

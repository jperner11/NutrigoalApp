/* eslint-disable no-console */
import { createTestUser, deleteTestUser, cleanupAllTestUsers, type SeedRole } from './lib/seed'

// Small CLI so you (or the agent) can prepare test accounts from the terminal:
//   npm run e2e:seed -w apps/web -- create pt
//   npm run e2e:seed -w apps/web -- create client
//   npm run e2e:seed -w apps/web -- cleanup
//   npm run e2e:seed -w apps/web -- delete <userId>

async function main() {
  const [command, arg] = process.argv.slice(2)

  switch (command) {
    case 'create': {
      const role: SeedRole = arg === 'pt' || arg === 'personal_trainer' ? 'personal_trainer' : 'free'
      const user = await createTestUser(role)
      console.log('Created pre-confirmed test user:')
      console.log(JSON.stringify(user, null, 2))
      console.log('\nLog in with these credentials to skip the signup/email step.')
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
      console.log('Commands: create pt | create client | delete <userId> | cleanup')
      process.exit(1)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

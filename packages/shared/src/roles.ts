import type { UserRole } from './types'

export function isTrainerRole(role: UserRole | null | undefined): boolean {
  return role === 'personal_trainer' || role === 'nutritionist'
}

export function isManagedClientRole(role: UserRole | null | undefined): boolean {
  return role === 'personal_trainer_client' || role === 'nutritionist_client'
}

export function normalizeRole(role: UserRole | null | undefined): UserRole {
  if (role === 'nutritionist') return 'personal_trainer'
  if (role === 'nutritionist_client') return 'personal_trainer_client'
  return role ?? 'free'
}

export function getRolePlanLabel(role: UserRole | null | undefined): string {
  if (isManagedClientRole(role)) return 'Client Plan'
  if (isTrainerRole(role)) return 'Personal Trainer Plan'
  return `${normalizeRole(role)} plan`
}

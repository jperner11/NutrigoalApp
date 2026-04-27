'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { isFeatureLocked, type GatedFeature } from '@/lib/tierUtils'
import UpgradeModal from './UpgradeModal'

interface ProGateProps {
  feature: GatedFeature
  featureLabel?: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function ProGate({ feature, featureLabel, children, fallback }: ProGateProps) {
  const { profile } = useUser()
  const [showUpgrade, setShowUpgrade] = useState(false)

  const role = profile?.role ?? 'free'

  if (!isFeatureLocked(role, feature)) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <>
      <div className="relative">
        <div className="pointer-events-none select-none opacity-50 blur-sm">
          {children}
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center rounded-xl"
          style={{ background: 'rgba(255,255,255,0.6)' }}
        >
          <button
            onClick={() => setShowUpgrade(true)}
            className="pointer-events-auto col items-center gap-2"
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: 'var(--ink-3)', color: 'var(--acc)' }}
            >
              <Lock className="h-5 w-5" />
            </div>
            <span
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--acc)',
                letterSpacing: '0.14em',
                fontWeight: 600,
              }}
            >
              UPGRADE TO UNLOCK
            </span>
          </button>
        </div>
      </div>
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature={featureLabel ?? feature}
      />
    </>
  )
}

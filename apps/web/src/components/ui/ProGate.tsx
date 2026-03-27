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
        <div className="pointer-events-none select-none blur-sm opacity-50">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl">
          <button
            onClick={() => setShowUpgrade(true)}
            className="flex flex-col items-center gap-2 pointer-events-auto"
          >
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Lock className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm font-semibold text-purple-700">Upgrade to unlock</span>
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

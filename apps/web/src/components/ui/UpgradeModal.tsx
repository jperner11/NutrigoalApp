'use client'

import { X, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { PRICING } from '@/lib/constants'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  feature?: string
}

export default function UpgradeModal({ isOpen, onClose, feature }: UpgradeModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 mb-3">
            <Sparkles className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Upgrade to unlock</h3>
          {feature && (
            <p className="text-gray-500 mt-1 text-sm">
              {feature} is available on Pro and above.
            </p>
          )}
        </div>

        <div className="space-y-3 mb-6">
          {(['pro', 'unlimited'] as const).map(tier => (
            <div
              key={tier}
              className={`border rounded-xl p-4 ${
                tier === 'pro' ? 'border-purple-200 bg-purple-50/50' : 'border-indigo-200 bg-indigo-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">{PRICING[tier].name}</span>
                <span className="text-lg font-bold text-gray-900">
                  ${PRICING[tier].price}<span className="text-sm font-normal text-gray-500">/mo</span>
                </span>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                {PRICING[tier].features.slice(0, 4).map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="text-purple-500">&#10003;</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Link
          href="/pricing"
          className="block w-full text-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
          onClick={onClose}
        >
          View Plans
        </Link>
      </div>
    </div>
  )
}

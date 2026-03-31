'use client'

import Link from 'next/link'
import {
  Moon,
  Shield,
  Activity,
  ArrowRight,
  Brain,
} from 'lucide-react'

const TOOLS = [
  {
    slug: 'recovery',
    title: 'Recovery Protocol',
    description: 'Complete recovery system — sleep, mobility, stress management, deload strategy, and supplements.',
    icon: Moon,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
  },
  {
    slug: 'injury-prevention',
    title: 'Injury Prevention',
    description: 'Prehab routines, warm-up protocols, and a framework for training around niggles.',
    icon: Shield,
    color: 'text-green-500',
    bg: 'bg-green-50',
  },
  {
    slug: 'recomp',
    title: 'Body Recomposition',
    description: '16-week blueprint to build muscle and lose fat simultaneously — training, nutrition, and tracking.',
    icon: Activity,
    color: 'text-cyan-500',
    bg: 'bg-cyan-50',
  },
]

export default function AICoachingHub() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl">
            <Brain className="h-10 w-10 text-purple-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Coaching Tools</h1>
        <p className="text-gray-600 max-w-lg mx-auto">
          Expert-level analysis powered by AI. Each tool uses your profile data to deliver
          personalised, actionable advice — like having a coach on demand.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {TOOLS.map((tool) => {
          const Icon = tool.icon
          return (
            <Link
              key={tool.slug}
              href={`/ai/coaching/${tool.slug}`}
              className="card p-6 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${tool.bg}`}>
                  <Icon className={`h-6 w-6 ${tool.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                      {tool.title}
                    </h3>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

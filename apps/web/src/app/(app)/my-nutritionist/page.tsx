'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { UserCheck, MessageSquare, FileText } from 'lucide-react'
import Link from 'next/link'

interface NutritionistInfo {
  id: string
  full_name: string | null
  email: string
}

export default function MyNutritionistPage() {
  const { profile } = useUser()
  const [nutritionist, setNutritionist] = useState<NutritionistInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.nutritionist_id) {
      setLoading(false)
      return
    }

    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .eq('id', profile.nutritionist_id!)
        .single()

      if (data) setNutritionist(data)
      setLoading(false)
    }

    load()
  }, [profile])

  if (loading) return <div className="text-gray-500">Loading...</div>

  if (!nutritionist) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Nutritionist Linked</h2>
        <p className="text-gray-500">Your account is not currently linked to a nutritionist.</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Nutritionist</h1>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
            {(nutritionist.full_name || nutritionist.email)[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{nutritionist.full_name || 'Nutritionist'}</h2>
            <p className="text-sm text-gray-500">{nutritionist.email}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Your nutritionist creates and manages your meal and training plans. Any changes to your plans will come from them.
        </p>
      </div>

      <div className="space-y-3">
        <Link
          href={`/my-nutritionist/messages`}
          className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Messages</p>
            <p className="text-xs text-gray-500">Chat with your nutritionist</p>
          </div>
        </Link>

        <Link
          href={`/my-nutritionist/feedback`}
          className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <FileText className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Feedback</p>
            <p className="text-xs text-gray-500">View and respond to feedback requests</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

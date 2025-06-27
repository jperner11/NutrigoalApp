'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function TestSupabase() {
  const [status, setStatus] = useState('Testing connection...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function testConnection() {
      try {
        // Test basic connection
        const { error } = await supabase.from('user_profiles').select('count').limit(1)
        
        if (error) {
          if (error.message.includes('relation "user_profiles" does not exist')) {
            setStatus('✅ Supabase connected! Database tables not created yet.')
            setError('Please create the database tables in Supabase dashboard')
          } else {
            setStatus('❌ Supabase connection failed')
            setError(error.message)
          }
        } else {
          setStatus('✅ Supabase connected and database tables exist!')
        }
      } catch (err) {
        setStatus('❌ Connection test failed')
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    testConnection()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">🔗 Supabase Connection Test</h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-700">{status}</p>
          </div>
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          <div className="text-sm text-gray-600">
            <p><strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
            <p><strong>Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...</p>
          </div>
          
          <Link href="/" className="block w-full bg-gradient-to-r from-green-500 to-blue-500 text-white text-center py-2 px-4 rounded-lg hover:from-green-600 hover:to-blue-600 transition-all">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
} 
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { Loader2 } from 'lucide-react'

export default function LogoutPage() {
  const router = useRouter()
  const { logout } = useAuth()

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout()
      } catch (err) {
        console.error('Logout error:', err)
      } finally {
        router.replace('/login')
      }
    }

    performLogout()
  }, [logout, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black dark:from-slate-900 dark:via-slate-800 dark:to-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-300">Logging you out...</p>
      </div>
    </div>
  )
}

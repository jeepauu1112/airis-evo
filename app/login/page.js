'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { Eye, EyeOff, Lock, Mail, Loader2, CheckCircle, AlertCircle, Infinity, Sun, Moon } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login, user, loading: authLoading } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)

  // Enable dark mode on mount
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setError('')
    setLoading(true)

    try {
      const result = await login(email, password)
      
      if (result.success) {
        console.log('Login successful, redirecting...')
        setSuccess(true)
        setEmail('')
        setPassword('')
        
        // Wait longer for Supabase session to fully initialize
        // Then redirect to main page
        setTimeout(() => {
          console.log('Executing redirect to /')
          router.push('/')
        }, 1500)
      } else {
        setError(result.error || 'Login failed')
        setLoading(false)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black dark:from-slate-900 dark:via-slate-800 dark:to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black dark:from-slate-900 dark:via-slate-800 dark:to-black light:from-white light:via-slate-50 light:to-slate-100 flex items-center justify-center p-4 sm:p-0 transition-colors duration-500 relative overflow-hidden">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 dark:opacity-15 light:opacity-10 transition-opacity duration-500"
        style={{
          backgroundImage: 'url(https://res.cloudinary.com/cdb-klb1/image/upload/v1780291636/DSC06031_ewwkyo.jpg)'
        }}
      ></div>

      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-800/60 to-black/60 dark:from-slate-900/60 dark:via-slate-800/60 dark:to-black/60 light:from-white/40 light:via-slate-50/40 light:to-slate-100/40 transition-colors duration-500"></div>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 dark:bg-blue-500 light:bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 dark:bg-purple-500 light:bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-cyan-500 dark:bg-cyan-500 light:bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Login container */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-slate-800/40 dark:bg-slate-800/40 light:bg-white/80 backdrop-blur-xl border border-slate-700/50 dark:border-slate-700/50 light:border-slate-200/50 rounded-2xl shadow-2xl p-8 sm:p-12 transition-colors duration-300">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Infinity className="w-10 h-10 text-cyan-400 dark:text-cyan-400 light:text-cyan-600" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 dark:from-cyan-400 dark:to-blue-400 light:from-cyan-600 light:to-blue-600 bg-clip-text text-transparent">
                AIRIS-EVO
              </h1>
            </div>
            <p className="text-gray-400 dark:text-gray-400 light:text-gray-600 text-sm">Artificial Intelligent for Indonesia Power Services</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 dark:text-gray-300 light:text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-500 light:text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-700/50 dark:bg-slate-700/50 light:bg-white border border-slate-600 dark:border-slate-600 light:border-slate-300 rounded-lg pl-10 pr-4 py-3 text-white dark:text-white light:text-slate-900 placeholder-gray-500 dark:placeholder-gray-500 light:placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 dark:text-gray-300 light:text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-500 light:text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-700/50 dark:bg-slate-700/50 light:bg-white border border-slate-600 dark:border-slate-600 light:border-slate-300 rounded-lg pl-10 pr-12 py-3 text-white dark:text-white light:text-slate-900 placeholder-gray-500 dark:placeholder-gray-500 light:placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-500 light:text-gray-400 hover:text-gray-300 dark:hover:text-gray-300 light:hover:text-gray-600 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex gap-3 bg-red-500/10 dark:bg-red-500/10 light:bg-red-50 border border-red-500/30 dark:border-red-500/30 light:border-red-300/50 rounded-lg p-3">
                <AlertCircle className="w-5 h-5 text-red-400 dark:text-red-400 light:text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300 dark:text-red-300 light:text-red-700">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex gap-3 bg-green-500/10 dark:bg-green-500/10 light:bg-green-50 border border-green-500/30 dark:border-green-500/30 light:border-green-300/50 rounded-lg p-3">
                <CheckCircle className="w-5 h-5 text-green-400 dark:text-green-400 light:text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-300 dark:text-green-300 light:text-green-700">Login successful! Redirecting...</p>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 dark:from-cyan-500 dark:to-blue-500 light:from-cyan-600 light:to-blue-600 hover:from-cyan-600 hover:to-blue-600 dark:hover:from-cyan-600 dark:hover:to-blue-600 light:hover:from-cyan-700 light:hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Signed In!
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-gray-500 dark:text-gray-500 light:text-gray-600 text-xs mt-8">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>

      {/* Theme toggle button */}
      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        className="fixed top-4 right-4 z-50 p-3 rounded-lg bg-slate-800/60 dark:bg-slate-800/60 light:bg-white/80 border border-slate-700/50 dark:border-slate-700/50 light:border-slate-200/50 hover:bg-slate-700/80 dark:hover:bg-slate-700/80 light:hover:bg-slate-100/80 text-gray-300 dark:text-gray-300 light:text-gray-600 hover:text-cyan-400 dark:hover:text-cyan-400 light:hover:text-cyan-600 transition-all duration-300 backdrop-blur-sm"
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}

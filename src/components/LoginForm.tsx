import React, { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, LogIn, UserCheck, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface LoginFormProps {
  onLoginSuccess: () => void
  onShowSignup: () => void
  onShowForgotPassword: () => void
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  onLoginSuccess, 
  onShowSignup, 
  onShowForgotPassword 
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and click the verification link before signing in.')
        } else if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.')
        } else {
          setError(error.message)
        }
        return
      }

      if (data.user) {
        console.log('Login successful:', data.user.email)
        onLoginSuccess()
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError(null) // Clear error when user starts typing
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserCheck className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Login</h1>
        <p className="text-gray-600">Sign in to access the job management dashboard</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0"></div>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="admin@company.com"
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className="pl-10 pr-12 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-600">Remember me</span>
          </label>
          <button
            type="button"
            onClick={onShowForgotPassword}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <LogIn className="h-5 w-5" />
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-gray-600">
          Don't have an admin account?{' '}
          <button
            onClick={onShowSignup}
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Create Account
          </button>
        </p>
      </div>
    </div>
  )
}

export default LoginForm
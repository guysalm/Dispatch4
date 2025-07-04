import React, { useState } from 'react'
import { Mail, ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ForgotPasswordFormProps {
  onShowLogin: () => void
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onShowLogin }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)
    } catch (err) {
      console.error('Password reset error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Check Your Email</h1>
        <p className="text-gray-600 mb-6">
          We've sent a password reset link to <strong>{email}</strong>. 
          Please check your email and follow the instructions to reset your password.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-700 text-sm">
            <strong>Note:</strong> The reset link will expire in 1 hour for security reasons.
          </p>
        </div>
        <button
          onClick={onShowLogin}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Sign In</span>
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="h-8 w-8 text-orange-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
        <p className="text-gray-600">Enter your email to receive a password reset link</p>
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
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError(null)
              }}
              className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter your email address"
              required
              autoComplete="email"
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            We'll send you a secure link to reset your password
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white py-3 px-4 rounded-lg font-medium hover:from-orange-700 hover:to-orange-800 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Sending Reset Link...</span>
            </>
          ) : (
            <>
              <Mail className="h-5 w-5" />
              <span>Send Reset Link</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <button
          onClick={onShowLogin}
          className="text-blue-600 hover:text-blue-800 font-medium transition-colors flex items-center justify-center space-x-2 mx-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sign In</span>
        </button>
      </div>
    </div>
  )
}

export default ForgotPasswordForm
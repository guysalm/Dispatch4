import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, Mail, Lock, User, UserPlus, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface SignupFormProps {
  onSignupSuccess: () => void
  onShowLogin: () => void
}

const SignupForm: React.FC<SignupFormProps> = ({ onSignupSuccess, onShowLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    invitationToken: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [invitationValid, setInvitationValid] = useState<boolean | null>(null)
  const [invitationEmail, setInvitationEmail] = useState('')

  // Check for invitation token in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('invitation')
    
    if (token) {
      setFormData(prev => ({ ...prev, invitationToken: token }))
      validateInvitationToken(token)
    }
  }, [])

  const validateInvitationToken = async (token: string) => {
    if (!token) {
      setInvitationValid(false)
      return
    }

    try {
      const { data, error } = await supabase.rpc('validate_invitation_token', {
        token: token
      })

      if (error) throw error

      if (data.valid) {
        setInvitationValid(true)
        setInvitationEmail(data.email)
        setFormData(prev => ({ ...prev, email: data.email }))
      } else {
        setInvitationValid(false)
        setError(data.message || 'Invalid invitation token')
      }
    } catch (error: any) {
      console.error('Error validating invitation:', error)
      setInvitationValid(false)
      setError('Failed to validate invitation')
    }
  }

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long'
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Check if invitation is required and valid
    if (!formData.invitationToken) {
      setError('An invitation is required to create an admin account. Please contact an existing administrator.')
      setLoading(false)
      return
    }

    if (invitationValid === false) {
      setError('Invalid or expired invitation. Please request a new invitation.')
      setLoading(false)
      return
    }

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    const passwordError = validatePassword(formData.password)
    if (passwordError) {
      setError(passwordError)
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: 'admin',
            invitation_token: formData.invitationToken
          }
        }
      })

      if (error) {
        if (error.message.includes('already registered')) {
          setError('An account with this email already exists. Please sign in instead.')
        } else if (error.message.includes('invitation')) {
          setError('Invalid invitation. Please contact an administrator for a new invitation.')
        } else {
          setError(error.message)
        }
        return
      }

      if (data.user) {
        setSuccess(true)
        onSignupSuccess()
        console.log('Signup successful, verification email sent to:', data.user.email)
      }
    } catch (err) {
      console.error('Signup error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError(null) // Clear error when user starts typing
    
    // Validate invitation token when it changes
    if (field === 'invitationToken' && value) {
      validateInvitationToken(value)
    }
  }

  // Show invitation requirement message if no token
  if (!formData.invitationToken && invitationValid !== true) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Invitation Required</h1>
        <p className="text-gray-600 mb-6">
          Admin account creation is restricted. You need an invitation from an existing administrator to create an account.
        </p>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            <strong>Have an invitation?</strong> Check your email for an invitation link, or enter your invitation token below.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invitation Token (Optional)
            </label>
            <input
              type="text"
              value={formData.invitationToken}
              onChange={(e) => handleChange('invitationToken', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter invitation token"
            />
          </div>

          <button
            onClick={onShowLogin}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Sign In
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Need an invitation? Contact your system administrator.
          </p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Check Your Email</h1>
        <p className="text-gray-600 mb-6">
          We've sent a verification link to <strong>{formData.email}</strong>. 
          Please check your email and click the link to verify your account.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-700 text-sm">
            <strong>Important:</strong> You must verify your email before you can sign in to the admin dashboard.
          </p>
        </div>
        <button
          onClick={onShowLogin}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Back to Sign In
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Admin Account</h1>
        <p className="text-gray-600">Complete your invitation to create an admin account</p>
        {invitationEmail && (
          <p className="text-blue-600 text-sm mt-2">Invited email: {invitationEmail}</p>
        )}
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

        {invitationValid === true && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <p className="text-green-700 text-sm">Valid invitation confirmed!</p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="John Doe"
              required
              autoComplete="name"
            />
          </div>
        </div>

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
              disabled={!!invitationEmail}
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
              placeholder="Create a strong password"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Password must be at least 8 characters with uppercase, lowercase, and number
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              className="pl-10 pr-12 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Confirm your password"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || invitationValid !== true}
          className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <UserPlus className="h-5 w-5" />
              <span>Create Account</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-gray-600">
          Already have an account?{' '}
          <button
            onClick={onShowLogin}
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  )
}

export default SignupForm
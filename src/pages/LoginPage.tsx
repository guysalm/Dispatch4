import React, { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import LoginForm from '../components/LoginForm'
import SignupForm from '../components/SignupForm'
import ForgotPasswordForm from '../components/ForgotPasswordForm'

type AuthView = 'login' | 'signup' | 'forgot-password'

const LoginPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<AuthView>('login')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setIsAuthenticated(true)
        }
      } catch (error) {
        console.error('Auth check error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthenticated(true)
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
  }

  const handleSignupSuccess = () => {
    setCurrentView('login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'signup':
        return (
          <SignupForm
            onSignupSuccess={handleSignupSuccess}
            onShowLogin={() => setCurrentView('login')}
          />
        )
      case 'forgot-password':
        return (
          <ForgotPasswordForm
            onShowLogin={() => setCurrentView('login')}
          />
        )
      default:
        return (
          <LoginForm
            onLoginSuccess={handleLoginSuccess}
            onShowSignup={() => setCurrentView('signup')}
            onShowForgotPassword={() => setCurrentView('forgot-password')}
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {renderCurrentView()}
      </div>
    </div>
  )
}

export default LoginPage
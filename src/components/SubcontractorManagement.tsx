import React, { useState } from 'react'
import { Plus, User, Phone, Mail, MapPin, Edit2, Trash2 } from 'lucide-react'
import { useSubcontractors } from '../hooks/useSubcontractors'
import { Subcontractor } from '../types'

const SubcontractorManagement: React.FC = () => {
  const { subcontractors, loading, createSubcontractor } = useSubcontractors()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    region: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [phoneError, setPhoneError] = useState<string>('')
  const [emailError, setEmailError] = useState<string>('')

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '')
    
    // Check if it's exactly 10 digits (US phone number without country code)
    // or 11 digits starting with 1 (US phone number with country code)
    if (cleaned.length === 10) {
      return true
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return true
    }
    
    return false
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '')
    
    // Handle different lengths
    if (cleaned.length === 0) return ''
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    if (cleaned.length <= 10) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    
    // Handle 11 digits (with country code)
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    
    // Truncate if too long
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  }

  const handlePhoneChange = (value: string) => {
    // Format the phone number as user types
    const formatted = formatPhoneNumber(value)
    setFormData(prev => ({ ...prev, phone: formatted }))
    
    // Validate and show error if invalid
    if (value.trim() && !validatePhoneNumber(value)) {
      setPhoneError('Please enter a valid US phone number (10 digits)')
    } else {
      setPhoneError('')
    }
  }

  const handleEmailChange = (value: string) => {
    setFormData(prev => ({ ...prev, email: value }))
    
    // Validate email
    if (value.trim() && !validateEmail(value)) {
      setEmailError('Please enter a valid email address')
    } else {
      setEmailError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate phone and email before submission
    if (!validatePhoneNumber(formData.phone)) {
      setPhoneError('Please enter a valid US phone number (10 digits)')
      return
    }
    
    if (!validateEmail(formData.email)) {
      setEmailError('Please enter a valid email address')
      return
    }
    
    try {
      setSubmitting(true)
      await createSubcontractor(formData)
      setFormData({ name: '', phone: '', email: '', region: '' })
      setPhoneError('')
      setEmailError('')
      setShowForm(false)
    } catch (error) {
      console.error('Failed to create subcontractor:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const formatPhoneNumberDisplay = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Subcontractor Management</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Subcontractor</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Subcontractor</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    phoneError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="(555) 123-4567"
                  pattern="^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$"
                  title="Please enter a valid US phone number (10 digits)"
                  required
                />
                {phoneError && (
                  <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <span>{phoneError}</span>
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Format: (555) 123-4567 or 555-123-4567
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    emailError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="john@example.com"
                  required
                />
                {emailError && (
                  <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <span>{emailError}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Region *</label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., North Side, Downtown"
                  required
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setFormData({ name: '', phone: '', email: '', region: '' })
                  setPhoneError('')
                  setEmailError('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !!phoneError || !!emailError}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Adding...' : 'Add Subcontractor'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subcontractors.map((subcontractor: Subcontractor) => (
          <div key={subcontractor.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-medium text-gray-900">{subcontractor.name}</h3>
              <div className="flex space-x-1">
                <button className="text-gray-400 hover:text-blue-600 transition-colors">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button className="text-gray-400 hover:text-red-600 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2 text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{formatPhoneNumberDisplay(subcontractor.phone)}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Mail className="h-4 w-4" />
                <span className="truncate">{subcontractor.email}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{subcontractor.region}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {subcontractors.length === 0 && (
        <div className="text-center py-8">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No subcontractors yet</h3>
          <p className="text-gray-600 mb-4">Add your first subcontractor to start assigning jobs.</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Add First Subcontractor
          </button>
        </div>
      )}
    </div>
  )
}

export default SubcontractorManagement
import React, { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useSubcontractors } from '../hooks/useSubcontractors'
import { CreateJobData } from '../types'
import AddressAutocomplete from './AddressAutocomplete'

interface CreateJobModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateJob: (jobData: CreateJobData) => void
  loading?: boolean
}

const CreateJobModal: React.FC<CreateJobModalProps> = ({
  isOpen,
  onClose,
  onCreateJob,
  loading = false
}) => {
  const { subcontractors } = useSubcontractors()
  const [formData, setFormData] = useState<CreateJobData>({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    customer_issue: '',
    subcontractor_id: null,
    region: ''
  })
  const [phoneError, setPhoneError] = useState<string>('')

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
    setFormData(prev => ({ ...prev, customer_phone: formatted }))
    
    // Validate and show error if invalid
    if (value.trim() && !validatePhoneNumber(value)) {
      setPhoneError('Please enter a valid US phone number (10 digits)')
    } else {
      setPhoneError('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate phone number before submission
    if (!validatePhoneNumber(formData.customer_phone)) {
      setPhoneError('Please enter a valid US phone number (10 digits)')
      return
    }
    
    console.log('Creating job with form data:', formData)
    onCreateJob(formData)
  }

  const handleChange = (field: keyof CreateJobData, value: string) => {
    if (field === 'customer_phone') {
      handlePhoneChange(value)
    } else if (field === 'subcontractor_id') {
      setFormData(prev => ({ ...prev, [field]: value === '' ? null : value }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_phone: '',
      customer_address: '',
      customer_issue: '',
      subcontractor_id: null,
      region: ''
    })
    setPhoneError('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Job</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Customer Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => handleChange('customer_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.customer_phone}
                  onChange={(e) => handleChange('customer_phone', e.target.value)}
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <AddressAutocomplete
                value={formData.customer_address}
                onChange={(value) => {
                  console.log('Address autocomplete value changed:', value)
                  handleChange('customer_address', value)
                }}
                placeholder="Start typing address..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Description *
              </label>
              <textarea
                value={formData.customer_issue}
                onChange={(e) => handleChange('customer_issue', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the customer's issue..."
                required
              />
            </div>
          </div>

          {/* Assignment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Assignment</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subcontractor
                </label>
                <select
                  value={formData.subcontractor_id || ''}
                  onChange={(e) => {
                    console.log('Subcontractor selected:', e.target.value)
                    handleChange('subcontractor_id', e.target.value)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select subcontractor...</option>
                  {subcontractors.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} - {sub.region}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region
                </label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => handleChange('region', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., North Side, Downtown"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                resetForm()
                onClose()
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !!phoneError}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Create Job</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateJobModal
import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { 
  Phone, 
  User, 
  DollarSign, 
  FileText, 
  Upload,
  Wrench,
  Navigation,
  AlertCircle,
  TrendingUp,
  Package
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Job, UpdateJobData } from '../types'
import { getStatusColor, formatPhoneNumber, createGoogleMapsLink, canCompleteJob } from '../utils/jobUtils'
import FileUpload from '../components/FileUpload'
import NotificationContainer from '../components/NotificationContainer'
import { useNotification } from '../hooks/useNotification'

const PublicJobView: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    status: '',
    materials: '',
    price: '',
    parts_cost: '',
    job_profit: '',
    notes: ''
  })

  const { notifications, removeNotification, showSuccess, showError, showInfo } = useNotification()

  // Calculate job profit automatically
  const calculateJobProfit = (salePrice: string, partsCost: string): string => {
    const sale = parseFloat(salePrice) || 0
    const parts = parseFloat(partsCost) || 0
    const profit = sale - parts
    return profit >= 0 ? profit.toFixed(2) : '0.00'
  }

  // Update job profit when sale price or parts cost changes
  useEffect(() => {
    const newProfit = calculateJobProfit(formData.price, formData.parts_cost)
    if (formData.job_profit !== newProfit) {
      setFormData(prev => ({ ...prev, job_profit: newProfit }))
    }
  }, [formData.price, formData.parts_cost])

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) return
      
      try {
        setLoading(true)
        setError(null)
        
        console.log('Fetching job with ID:', jobId)
        
        const { data, error: fetchError } = await supabase
          .from('jobs')
          .select(`
            *,
            subcontractor:subcontractors(*)
          `)
          .eq('job_id', jobId)
          .single()

        if (fetchError) {
          console.error('Supabase error:', fetchError)
          throw new Error('Job not found')
        }

        if (!data) {
          throw new Error('Job not found')
        }

        console.log('Job data received:', data)
        setJob(data)
        setFormData({
          status: data.status,
          materials: data.materials || '',
          price: data.price?.toString() || '',
          parts_cost: data.parts_cost?.toString() || '',
          job_profit: data.job_profit?.toString() || '',
          notes: data.notes || ''
        })
      } catch (err) {
        console.error('Error fetching job:', err)
        setError(err instanceof Error ? err.message : 'Job not found')
      } finally {
        setLoading(false)
      }
    }

    fetchJob()
  }, [jobId])

  const handleUpdateJob = async (updates: UpdateJobData) => {
    if (!job) return

    try {
      setUpdating(true)
      setError(null)
      
      console.log('Updating job with data:', updates)

      const { data, error: updateError } = await supabase
        .from('jobs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)
        .select(`
          *,
          subcontractor:subcontractors(*)
        `)
        .single()

      if (updateError) {
        console.error('Update error:', updateError)
        throw new Error('Failed to update job')
      }

      console.log('Job updated successfully:', data)
      setJob(data)

      // Log the update in job_updates table
      try {
        const updateFields = Object.keys(updates)
        for (const field of updateFields) {
          const { error: logError } = await supabase
            .from('job_updates')
            .insert({
              job_id: job.id,
              field_name: field,
              old_value: job[field as keyof Job]?.toString() || null,
              new_value: updates[field as keyof UpdateJobData]?.toString() || null,
              updated_by: 'Subcontractor'
            })

          if (logError) {
            console.warn('Failed to log update:', logError)
          }
        }
      } catch (logError) {
        console.warn('Failed to log updates:', logError)
        // Don't fail the main update if logging fails
      }

      // Show success notification with details
      const updatedFields = Object.keys(updates).map(field => field.replace('_', ' ')).join(', ')
      showSuccess(`Job updated successfully! ${updatedFields ? `Updated: ${updatedFields}` : ''}`, 5000)
      
    } catch (err) {
      console.error('Failed to update job:', err)
      setError('Failed to update job. Please try again.')
      showError('Failed to update job. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const handleFileUpload = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const mockUrl = `https://example.com/receipts/${file.name}`
          await handleUpdateJob({ receipt_url: mockUrl })
          showSuccess('Receipt uploaded successfully!')
          resolve(mockUrl)
        } catch (error) {
          showError('Failed to upload receipt. Please try again.')
          reject(error)
        }
      }, 2000)
    })
  }

  // Handle Enter key press to prevent form submission
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Move focus to next input or blur current input
      const target = e.target as HTMLInputElement
      const form = target.closest('form')
      if (form) {
        const inputs = Array.from(form.querySelectorAll('input, select, textarea'))
        const currentIndex = inputs.indexOf(target)
        const nextInput = inputs[currentIndex + 1] as HTMLInputElement
        
        if (nextInput) {
          nextInput.focus()
        } else {
          target.blur()
        }
      }
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!job) return

    const updates: UpdateJobData = {
      status: formData.status as Job['status'],
      materials: formData.materials || undefined,
      price: formData.price ? parseFloat(formData.price) : undefined,
      parts_cost: formData.parts_cost ? parseFloat(formData.parts_cost) : undefined,
      job_profit: formData.job_profit ? parseFloat(formData.job_profit) : undefined,
      notes: formData.notes || undefined
    }

    await handleUpdateJob(updates)
  }

  const handleCallCustomer = () => {
    if (job) {
      window.location.href = `tel:${job.customer_phone}`
      showInfo(`Calling ${job.customer_name}...`)
    }
  }

  const handleOpenNavigation = () => {
    if (job) {
      const encodedAddress = encodeURIComponent(job.customer_address)
      
      // Enhanced mobile navigation
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      if (isMobile) {
        // Try to open in native maps app first
        const mapsUrl = `maps://maps.google.com/maps?q=${encodedAddress}`
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
        
        // Try native maps first, fallback to web
        window.location.href = mapsUrl
        setTimeout(() => {
          window.open(googleMapsUrl, '_blank')
        }, 1000)
      } else {
        const googleMapsUrl = createGoogleMapsLink(job.customer_address)
        window.open(googleMapsUrl, '_blank')
      }
      
      showInfo('Opening navigation to customer location...')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading job details...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait while we fetch your job information</p>
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Job Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The job you are looking for does not exist.'}</p>
          <p className="text-sm text-gray-500 mb-2">Job ID: {jobId}</p>
          <p className="text-sm text-gray-500 mb-4">
            If you believe this is an error, please contact your administrator.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const canComplete = canCompleteJob(job)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Notification Container */}
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />

      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{job.job_id}</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {format(new Date(job.created_at), 'MMM dd, yyyy • h:mm a')}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                    📱 Subcontractor Portal
                  </div>
                </div>
              </div>
              <span className={`px-2 sm:px-3 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium border ${getStatusColor(job.status)}`}>
                {job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('_', ' ')}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={handleCallCustomer}
                className="flex items-center space-x-2 bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-all transform hover:scale-105 shadow-md min-h-[44px]"
              >
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Call Customer</span>
                <span className="sm:hidden">Call</span>
              </button>
              <button
                onClick={handleOpenNavigation}
                className="flex items-center space-x-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-all transform hover:scale-105 shadow-md min-h-[44px]"
              >
                <Navigation className="h-4 w-4" />
                <span className="hidden sm:inline">Navigate</span>
                <span className="sm:hidden">GPS</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Customer Information */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 lg:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <span>Customer Information</span>
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 bg-gray-50 p-3 rounded-lg">{job.customer_name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg">
                    <p className="text-base sm:text-lg text-gray-900 flex-1">{formatPhoneNumber(job.customer_phone)}</p>
                    <button
                      onClick={handleCallCustomer}
                      className="text-green-600 hover:text-green-800 p-2 hover:bg-green-50 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
                    >
                      <Phone className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-900 flex-1 leading-relaxed">{job.customer_address}</p>
                    <button
                      onClick={handleOpenNavigation}
                      className="text-blue-600 hover:text-blue-800 flex-shrink-0 p-2 hover:bg-blue-50 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
                    >
                      <Navigation className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Issue Description</label>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-900 leading-relaxed">{job.customer_issue}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Job Updates Form */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 lg:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center space-x-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Wrench className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              </div>
              <span>Update Job Status</span>
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  onKeyDown={handleKeyDown}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-base"
                  style={{ fontSize: '16px' }} // Prevent zoom on iOS
                >
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed" disabled={!canComplete}>
                    Completed {!canComplete && '(Receipt Required)'}
                  </option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      onKeyDown={handleKeyDown}
                      className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-base"
                      placeholder="0.00"
                      style={{ fontSize: '16px' }} // Prevent zoom on iOS
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parts Cost</label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.parts_cost}
                      onChange={(e) => setFormData(prev => ({ ...prev, parts_cost: e.target.value }))}
                      onKeyDown={handleKeyDown}
                      className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-base"
                      placeholder="0.00"
                      style={{ fontSize: '16px' }} // Prevent zoom on iOS
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Numbers only - cost of parts/materials</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Profit</label>
                  <div className="relative">
                    <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                    <input
                      type="number"
                      step="0.01"
                      value={formData.job_profit}
                      readOnly
                      className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg bg-green-50 text-green-700 font-medium cursor-not-allowed text-base"
                      placeholder="0.00"
                      style={{ fontSize: '16px' }} // Prevent zoom on iOS
                    />
                  </div>
                  <p className="text-xs text-green-600 mt-1">Auto-calculated: Sale Price - Parts Cost</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Materials Used</label>
                <textarea
                  value={formData.materials}
                  onChange={(e) => setFormData(prev => ({ ...prev, materials: e.target.value }))}
                  onKeyDown={(e) => {
                    // Allow Enter in textarea for new lines
                    if (e.key === 'Enter' && !e.shiftKey) {
                      // Don't prevent default for textarea
                    }
                  }}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-base"
                  placeholder="List materials and parts used..."
                  style={{ fontSize: '16px' }} // Prevent zoom on iOS
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Work Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  onKeyDown={(e) => {
                    // Allow Enter in textarea for new lines
                    if (e.key === 'Enter' && !e.shiftKey) {
                      // Don't prevent default for textarea
                    }
                  }}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-base"
                  placeholder="Describe the work performed, any issues encountered, or additional notes..."
                  style={{ fontSize: '16px' }} // Prevent zoom on iOS
                />
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg min-h-[44px] text-base"
              >
                {updating ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Updating...</span>
                  </div>
                ) : (
                  'Update Job'
                )}
              </button>
            </form>
          </div>

          {/* Receipt Upload */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 lg:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <span>Receipt Upload</span>
            </h2>

            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                Upload a receipt or invoice to complete this job. Supported formats: PDF, PNG, JPG (max 5MB)
              </p>
              {!canComplete && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    <p className="text-orange-700 font-medium">
                      A receipt must be uploaded before this job can be marked as completed.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <FileUpload
              onFileUpload={handleFileUpload}
              currentFileUrl={job.receipt_url || undefined}
              accept="image/*,.pdf"
              maxSize={5}
            />
          </div>

          {/* Current Job Details */}
          {(job.materials || job.price || job.parts_cost || job.job_profit || job.notes) && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 lg:p-8">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center space-x-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                </div>
                <span>Current Job Details</span>
              </h2>

              <div className="space-y-4">
                {(job.price || job.parts_cost || job.job_profit) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {job.price && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price</label>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-xl sm:text-2xl font-bold text-blue-600">${job.price.toFixed(2)}</p>
                        </div>
                      </div>
                    )}

                    {job.parts_cost && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Parts Cost</label>
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <p className="text-xl sm:text-2xl font-bold text-orange-600">${job.parts_cost.toFixed(2)}</p>
                        </div>
                      </div>
                    )}

                    {job.job_profit && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Job Profit</label>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-xl sm:text-2xl font-bold text-green-600">${job.job_profit.toFixed(2)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {job.materials && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Materials Used</label>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-900">{job.materials}</p>
                    </div>
                  </div>
                )}

                {job.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Work Notes</label>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-900 leading-relaxed">{job.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PublicJobView
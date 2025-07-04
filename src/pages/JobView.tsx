import React, { useState, useEffect } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { format } from 'date-fns'
import { 
  Phone, 
  User, 
  DollarSign, 
  Upload,
  ExternalLink,
  Wrench,
  Clock,
  MessageCircle,
  Navigation,
  AlertCircle,
  TrendingUp,
  Package
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Job, UpdateJobData } from '../types'
import { getStatusColor, formatPhoneNumber, createGoogleMapsLink, canCompleteJob, createWhatsAppLink } from '../utils/jobUtils'
import FileUpload from '../components/FileUpload'
import JobUpdateHistory from '../components/JobUpdateHistory'
import NotificationContainer from '../components/NotificationContainer'
import { useNotification } from '../hooks/useNotification'

const JobView: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
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

  // Fetch job data directly without using hooks to avoid circular dependencies
  useEffect(() => {
    let isMounted = true

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

        if (!isMounted) return

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
        if (!isMounted) return
        console.error('Error fetching job:', err)
        setError(err instanceof Error ? err.message : 'Job not found')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchJob()

    return () => {
      isMounted = false
    }
  }, [jobId]) // Only depend on jobId

  const handleUpdateField = async (field: keyof UpdateJobData, value: any) => {
    if (!job) return

    const oldValue = job[field as keyof Job]?.toString() || null
    const newValue = value?.toString() || null

    try {
      setUpdating(true)
      setError(null)
      
      console.log('Updating job field:', field, 'from', oldValue, 'to', newValue)
      
      const updates: UpdateJobData = { [field]: value }
      
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
        throw new Error(`Failed to update job: ${updateError.message}`)
      }

      setJob(data)
      
      // Log the update
      try {
        await supabase
          .from('job_updates')
          .insert({
            job_id: job.id,
            field_name: field,
            old_value: oldValue,
            new_value: newValue,
            updated_by: 'Admin'
          })
      } catch (updateError) {
        console.warn('Failed to log update:', updateError)
      }
      
      // Update form data to reflect changes
      if (field === 'price' || field === 'parts_cost' || field === 'job_profit') {
        setFormData(prev => ({ ...prev, [field]: value?.toString() || '' }))
      }

      // Show success notification
      showSuccess(`${field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')} updated successfully!`)
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
          await handleUpdateField('receipt_url', mockUrl)
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

    try {
      setUpdating(true)
      setError(null)
      
      console.log('Submitting job updates:', formData)

      const updates: UpdateJobData = {
        status: formData.status as Job['status'],
        materials: formData.materials || undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        parts_cost: formData.parts_cost ? parseFloat(formData.parts_cost) : undefined,
        job_profit: formData.job_profit ? parseFloat(formData.job_profit) : undefined,
        notes: formData.notes || undefined
      }

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
        throw new Error(`Failed to update job: ${updateError.message}`)
      }

      setJob(data)

      // Log all changes
      const changes = []
      if (updates.status !== job.status) {
        changes.push({ field: 'status', old: job.status, new: updates.status })
      }
      if (updates.materials !== job.materials) {
        changes.push({ field: 'materials', old: job.materials, new: updates.materials })
      }
      if (updates.price !== job.price) {
        changes.push({ field: 'price', old: job.price?.toString() || null, new: updates.price?.toString() || null })
      }
      if (updates.parts_cost !== job.parts_cost) {
        changes.push({ field: 'parts_cost', old: job.parts_cost?.toString() || null, new: updates.parts_cost?.toString() || null })
      }
      if (updates.job_profit !== job.job_profit) {
        changes.push({ field: 'job_profit', old: job.job_profit?.toString() || null, new: updates.job_profit?.toString() || null })
      }
      if (updates.notes !== job.notes) {
        changes.push({ field: 'notes', old: job.notes, new: updates.notes })
      }

      for (const change of changes) {
        try {
          await supabase
            .from('job_updates')
            .insert({
              job_id: job.id,
              field_name: change.field,
              old_value: change.old,
              new_value: change.new,
              updated_by: 'Admin'
            })
        } catch (updateError) {
          console.warn('Failed to log update:', updateError)
        }
      }
      
      // Show success notification with details
      const updatedFields = changes.map(c => c.field.replace('_', ' ')).join(', ')
      showSuccess(`Job updated successfully! ${updatedFields ? `Updated: ${updatedFields}` : ''}`, 5000)
      
    } catch (err) {
      console.error('Failed to update job:', err)
      setError('Failed to update job. Please try again.')
      showError('Failed to update job. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const handleCallCustomer = () => {
    if (job) {
      window.location.href = `tel:${job.customer_phone}`
      showInfo(`Calling ${job.customer_name}...`)
    }
  }

  const handleOpenNavigation = () => {
    if (job) {
      const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(job.customer_address)}`
      const googleMapsUrl = createGoogleMapsLink(job.customer_address)
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      if (isMobile) {
        window.open(wazeUrl, '_blank')
        setTimeout(() => {
          window.open(googleMapsUrl, '_blank')
        }, 1000)
      } else {
        window.open(googleMapsUrl, '_blank')
      }
      
      showInfo('Opening navigation to customer location...')
    }
  }

  const handleSendWhatsApp = () => {
    if (job && job.subcontractor) {
      const jobLink = generatePublicJobUrl(job.job_id)
      const message = `Job Update - ${job.job_id}\n\nStatus: ${job.status}\nCustomer: ${job.customer_name}\nAddress: ${job.customer_address}\n\nView and update job: ${jobLink}`
      const whatsappLink = createWhatsAppLink(job.subcontractor.phone, message)
      window.open(whatsappLink, '_blank')
      showSuccess(`WhatsApp message sent to ${job.subcontractor.name}!`)
    }
  }

  const generatePublicJobUrl = (jobId: string): string => {
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    const port = window.location.port
    
    // Build the base URL
    let baseUrl
    if (port && port !== '80' && port !== '443') {
      baseUrl = `${protocol}//${hostname}:${port}`
    } else {
      baseUrl = `${protocol}//${hostname}`
    }
    
    // Use the React route instead of the static HTML file
    return `${baseUrl}/job/${jobId}`
  }

  const handleCopyPublicLink = () => {
    if (job) {
      const publicLink = generatePublicJobUrl(job.job_id)
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(publicLink).then(() => {
          showSuccess('Public job link copied to clipboard!')
        }).catch(err => {
          console.error('Failed to copy link:', err)
          // Fallback for mobile or unsupported browsers
          if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            const message = `Share this job link with your subcontractor:\n\n${publicLink}`
            alert(message)
          } else {
            showError('Failed to copy link. Please copy manually from the address bar.')
          }
        })
      } else {
        // Fallback for browsers that don't support clipboard API
        const message = `Share this job link with your subcontractor:\n\n${publicLink}`
        alert(message)
      }
    }
  }

  if (!jobId) {
    return <Navigate to="/" replace />
  }

  if (loading) {
    return (
      <div className="min-h-screen app-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen app-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Job Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The job you are looking for does not exist.'}</p>
          <p className="text-sm text-gray-500">Job ID: {jobId}</p>
          <p className="text-sm text-gray-500 mt-2">
            If you believe this is an error, please contact your administrator.
          </p>
        </div>
      </div>
    )
  }

  const canComplete = canCompleteJob(job)

  return (
    <div className="min-h-screen app-background">
      {/* Notification Container */}
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{job.job_id}</h1>
                <p className="text-sm text-gray-600">
                  {format(new Date(job.created_at), 'MMM dd, yyyy • h:mm a')}
                </p>
                <p className="text-xs text-purple-600 mt-1">🔧 Admin View - Full Access</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
                {job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('_', ' ')}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 overflow-x-auto pb-2">
              <button
                onClick={handleCallCustomer}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
              >
                <Phone className="h-4 w-4" />
                <span>Call Customer</span>
              </button>
              <button
                onClick={handleOpenNavigation}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <Navigation className="h-4 w-4" />
                <span>Navigate</span>
              </button>
              {job.subcontractor && (
                <button
                  onClick={handleSendWhatsApp}
                  className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 transition-colors whitespace-nowrap"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp</span>
                </button>
              )}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors whitespace-nowrap"
              >
                <Clock className="h-4 w-4" />
                <span>History</span>
              </button>
              <button
                onClick={handleCopyPublicLink}
                className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors whitespace-nowrap"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Copy Public Link</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Customer Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <span>Customer Information</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <p className="text-gray-900 font-medium">{job.customer_name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <div className="flex items-center space-x-2">
                  <p className="text-gray-900">{formatPhoneNumber(job.customer_phone)}</p>
                  <button
                    onClick={handleCallCustomer}
                    className="text-green-600 hover:text-green-800 p-1"
                  >
                    <Phone className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <div className="flex items-start space-x-2">
                  <p className="text-gray-900 flex-1">{job.customer_address}</p>
                  <button
                    onClick={handleOpenNavigation}
                    className="text-blue-600 hover:text-blue-800 flex-shrink-0 p-1"
                  >
                    <Navigation className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{job.customer_issue}</p>
              </div>
            </div>
          </div>

          {/* Job Updates Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Wrench className="h-5 w-5 text-blue-600" />
              <span>Job Updates</span>
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  onKeyDown={handleKeyDown}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      onKeyDown={handleKeyDown}
                      className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parts Cost</label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.parts_cost}
                      onChange={(e) => setFormData(prev => ({ ...prev, parts_cost: e.target.value }))}
                      onKeyDown={handleKeyDown}
                      className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Numbers only - cost of parts/materials</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Profit</label>
                  <div className="relative">
                    <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                    <input
                      type="number"
                      step="0.01"
                      value={formData.job_profit}
                      readOnly
                      className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg bg-green-50 text-green-700 font-medium cursor-not-allowed"
                      placeholder="0.00"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="List materials and parts used..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  onKeyDown={(e) => {
                    // Allow Enter in textarea for new lines
                    if (e.key === 'Enter' && !e.shiftKey) {
                      // Don't prevent default for textarea
                    }
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes or comments..."
                />
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Update Job'}
              </button>
            </form>
          </div>

          {/* Receipt Upload */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Upload className="h-5 w-5 text-blue-600" />
              <span>Receipt Upload</span>
            </h2>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Upload a receipt or invoice to complete this job. Supported formats: PDF, PNG, JPG
              </p>
              {!canComplete && (
                <p className="text-sm text-orange-600 mt-1">
                  ⚠️ A receipt must be uploaded before this job can be marked as completed.
                </p>
              )}
            </div>

            <FileUpload
              onFileUpload={handleFileUpload}
              currentFileUrl={job.receipt_url || undefined}
              accept="image/*,.pdf"
              maxSize={5}
            />
          </div>

          {/* Update History */}
          {showHistory && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <JobUpdateHistory jobId={job.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default JobView
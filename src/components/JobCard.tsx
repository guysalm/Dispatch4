import React, { useState } from 'react'
import { format } from 'date-fns'
import { MapPin, User, DollarSign, FileText, ExternalLink, Check } from 'lucide-react'
import { Job } from '../types'
import { getStatusColor, formatPhoneNumber } from '../utils/jobUtils'

interface JobCardProps {
  job: Job
  onViewDetails: (job: Job) => void
  onSendWhatsApp?: (job: Job) => void
  showSubcontractorLink?: boolean
}

const JobCard: React.FC<JobCardProps> = ({ 
  job, 
  onViewDetails, 
  onSendWhatsApp,
  showSubcontractorLink = true 
}) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onSendWhatsApp) {
      onSendWhatsApp(job)
    }
  }

  const handleCopyPublicLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Generate the proper React route URL that works across all environments
    const generatePublicUrl = () => {
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
      return `${baseUrl}/job/${job.job_id}`
    }
    
    const publicLink = generatePublicUrl()
    
    // Try to copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(publicLink).then(() => {
        setCopyStatus('success')
        setTimeout(() => setCopyStatus('idle'), 2000)
      }).catch(err => {
        console.error('Failed to copy link:', err)
        showFallbackCopy(publicLink)
      })
    } else {
      // Fallback for browsers that don't support clipboard API
      showFallbackCopy(publicLink)
    }
  }

  const showFallbackCopy = (fallbackLink: string) => {
    // Show fallback - display the link in an alert or prompt
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      const message = `Copy this link to share the job:\n\n${fallbackLink}`
      alert(message)
    } else {
      // For desktop, try to select the text
      const textArea = document.createElement('textarea')
      textArea.value = fallbackLink
      document.body.appendChild(textArea)
      textArea.select()
      
      try {
        document.execCommand('copy')
        setCopyStatus('success')
        setTimeout(() => setCopyStatus('idle'), 2000)
      } catch (err) {
        alert(`Copy this link to share the job:\n\n${fallbackLink}`)
      }
      
      document.body.removeChild(textArea)
    }
  }

  const getCopyButtonContent = () => {
    switch (copyStatus) {
      case 'success':
        return <Check className="h-4 w-4" />
      case 'error':
        return <ExternalLink className="h-4 w-4" />
      default:
        return <ExternalLink className="h-4 w-4" />
    }
  }

  const getCopyButtonClasses = () => {
    const baseClasses = "px-3 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center justify-center min-w-[44px]"
    
    switch (copyStatus) {
      case 'success':
        return `${baseClasses} bg-green-50 text-green-600 border-green-200`
      case 'error':
        return `${baseClasses} bg-red-50 text-red-600 border-red-200`
      default:
        return `${baseClasses} border-gray-300 text-gray-700 hover:bg-gray-50`
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent double-clicking and ensure only one navigation happens
    e.preventDefault()
    e.stopPropagation()
    
    console.log('Job card clicked for:', job.job_id)
    onViewDetails(job)
  }

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{job.job_id}</h3>
          <p className="text-sm text-gray-500">
            {format(new Date(job.created_at), 'MMM dd, yyyy • h:mm a')}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
          {job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('_', ' ')}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-900">{job.customer_name}</p>
            <p className="text-sm text-gray-500">{formatPhoneNumber(job.customer_phone)}</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600 line-clamp-2">{job.customer_address}</p>
        </div>

        {job.subcontractor && (
          <div className="flex items-center space-x-3">
            <User className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">{job.subcontractor.name}</p>
              <p className="text-xs text-gray-500">{job.subcontractor.region}</p>
            </div>
          </div>
        )}

        {job.price && (
          <div className="flex items-center space-x-3">
            <DollarSign className="h-4 w-4 text-green-500 flex-shrink-0" />
            <p className="text-sm font-medium text-gray-900">${job.price.toFixed(2)}</p>
          </div>
        )}

        {job.customer_issue && (
          <div className="flex items-start space-x-3">
            <FileText className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600 line-clamp-2">{job.customer_issue}</p>
          </div>
        )}
      </div>

      {showSubcontractorLink && job.subcontractor && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex space-x-2">
          <button
            onClick={handleWhatsAppClick}
            className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Send WhatsApp
          </button>
          <button
            onClick={handleCopyPublicLink}
            className={getCopyButtonClasses()}
            title="Copy public job link for subcontractor"
          >
            {getCopyButtonContent()}
          </button>
        </div>
      )}
    </div>
  )
}

export default JobCard
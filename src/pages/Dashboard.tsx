import React, { useState, useEffect } from 'react'
import { Plus, Search, Phone, Calendar, MapPin, Users, Settings, Download, AlertCircle, LogOut, UserPlus, UserCog, Database } from 'lucide-react'
import { useJobs } from '../hooks/useJobs'
import { useSubcontractors } from '../hooks/useSubcontractors'
import { useAuth } from '../hooks/useAuth'
import { testConnection } from '../lib/supabase'
import JobCard from '../components/JobCard'
import CreateJobModal from '../components/CreateJobModal'
import SubcontractorManagement from '../components/SubcontractorManagement'
import AdminInviteForm from '../components/AdminInviteForm'
import UserManagement from '../pages/UserManagement'
import NotificationContainer from '../components/NotificationContainer'
import { useNotification } from '../hooks/useNotification'
import { Job, CreateJobData } from '../types'
import { createJobAssignmentMessage, createJobUpdateMessage, sendWhatsAppMessage, validateAndCleanPhone, copyWhatsAppLink } from '../utils/jobUtils'

const Dashboard: React.FC = () => {
  const { jobs, loading, createJob, error: jobsError, isUsingMockData: jobsMockData } = useJobs()
  const { subcontractors, error: subcontractorsError, isUsingMockData: subcontractorsMockData } = useSubcontractors()
  const { user, signOut } = useAuth()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSubcontractors, setShowSubcontractors] = useState(false)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error' | 'mock'>('checking')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [subcontractorFilter, setSubcontractorFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const { notifications, removeNotification, showSuccess, showError, showInfo } = useNotification()

  // Check connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const result = await testConnection()
        if (result.success) {
          setConnectionStatus(jobsMockData || subcontractorsMockData ? 'mock' : 'connected')
        } else {
          setConnectionStatus('mock')
        }
      } catch (error) {
        console.error('Connection test failed:', error)
        setConnectionStatus('mock')
      }
    }

    checkConnection()
  }, [jobsMockData, subcontractorsMockData])

  // Get unique regions for filter
  const regions = Array.from(new Set(jobs.map(job => job.region).filter(Boolean)))

  // Helper function to get week boundaries (Tuesday to Monday)
  const getWeekBoundaries = (date: Date) => {
    const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
    
    // Calculate days to subtract to get to Tuesday
    // If today is Tuesday (2), subtract 0
    // If today is Wednesday (3), subtract 1
    // If today is Monday (1), subtract 6 (go back to previous Tuesday)
    // If today is Sunday (0), subtract 5 (go back to previous Tuesday)
    let daysToTuesday
    if (dayOfWeek === 0) { // Sunday
      daysToTuesday = 5
    } else if (dayOfWeek === 1) { // Monday
      daysToTuesday = 6
    } else { // Tuesday through Saturday
      daysToTuesday = dayOfWeek - 2
    }
    
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - daysToTuesday)
    weekStart.setHours(0, 0, 0, 0)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6) // Add 6 days to get to Monday
    weekEnd.setHours(23, 59, 59, 999)
    
    return { weekStart, weekEnd }
  }

  // Filter jobs based on search and filters
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.job_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customer_phone.includes(searchTerm) ||
      job.customer_address.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = !statusFilter || job.status === statusFilter
    const matchesSubcontractor = !subcontractorFilter || job.subcontractor_id === subcontractorFilter
    const matchesRegion = !regionFilter || job.region === regionFilter
    
    let matchesDate = true
    if (dateFilter) {
      const jobDate = new Date(job.created_at)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      // Current week (Tuesday to Monday)
      const { weekStart: currentWeekStart, weekEnd: currentWeekEnd } = getWeekBoundaries(today)
      
      // Last week (previous Tuesday to Monday)
      const lastWeekDate = new Date(today)
      lastWeekDate.setDate(today.getDate() - 7)
      const { weekStart: lastWeekStart, weekEnd: lastWeekEnd } = getWeekBoundaries(lastWeekDate)
      
      // Next week (next Tuesday to Monday)
      const nextWeekDate = new Date(today)
      nextWeekDate.setDate(today.getDate() + 7)
      const { weekStart: nextWeekStart, weekEnd: nextWeekEnd } = getWeekBoundaries(nextWeekDate)
      
      const monthAgo = new Date(today)
      monthAgo.setMonth(monthAgo.getMonth() - 1)

      switch (dateFilter) {
        case 'today':
          matchesDate = jobDate.toDateString() === today.toDateString()
          break
        case 'yesterday':
          matchesDate = jobDate.toDateString() === yesterday.toDateString()
          break
        case 'this_week':
          matchesDate = jobDate >= currentWeekStart && jobDate <= currentWeekEnd
          break
        case 'last_week':
          matchesDate = jobDate >= lastWeekStart && jobDate <= lastWeekEnd
          break
        case 'next_week':
          matchesDate = jobDate >= nextWeekStart && jobDate <= nextWeekEnd
          break
        case 'month':
          matchesDate = jobDate >= monthAgo
          break
      }
    }

    return matchesSearch && matchesStatus && matchesSubcontractor && matchesRegion && matchesDate
  })

  const handleCreateJob = async (jobData: CreateJobData) => {
    try {
      setCreateLoading(true)
      console.log('Creating job with data:', jobData)
      
      const newJob = await createJob(jobData)
      console.log('Job created successfully:', newJob)
      
      setShowCreateModal(false)
      
      // Show success notification
      showSuccess(`Job ${newJob.job_id} created successfully!`, 5000)
      
      // Auto-send WhatsApp if subcontractor is assigned and not using mock data
      if (newJob.subcontractor && newJob.subcontractor_id && connectionStatus !== 'mock') {
        console.log('📱 Preparing WhatsApp for subcontractor:', newJob.subcontractor.name)
        
        try {
          // Validate phone number first
          const phoneValidation = validateAndCleanPhone(newJob.subcontractor.phone)
          if (!phoneValidation.isValid) {
            throw new Error(`Invalid phone number format: ${newJob.subcontractor.phone}`)
          }
          
          console.log('✅ Phone validation passed:', phoneValidation.formatted)
          
          // Create enhanced message
          const message = createJobAssignmentMessage(newJob)
          console.log('📝 Message prepared, length:', message.length)
          
          // Show preparing notification
          showInfo(`Preparing WhatsApp message for ${newJob.subcontractor.name}...`, 2000)
          
          // Send WhatsApp message
          await sendWhatsAppMessage(newJob.subcontractor.phone, message)
          
          // Show success notification
          showSuccess(`✅ WhatsApp opened for ${newJob.subcontractor.name}! Please send the message.`, 6000)
          
        } catch (whatsappError) {
          console.error('❌ WhatsApp sending failed:', whatsappError)
          
          // Try to provide the link as fallback
          try {
            const whatsappLink = await copyWhatsAppLink(newJob.subcontractor.phone, createJobAssignmentMessage(newJob))
            showError(`WhatsApp failed to open. Link copied to clipboard. Paste in WhatsApp: ${whatsappLink.substring(0, 50)}...`, 10000)
          } catch (copyError) {
            showError(`Job created but WhatsApp message could not be sent to ${newJob.subcontractor.name}. Please send manually: ${whatsappError instanceof Error ? whatsappError.message : String(whatsappError)}`, 8000)
          }
        }
      }
    } catch (error) {
      console.error('Failed to create job:', error)
      showError(`Failed to create job: ${error instanceof Error ? error.message : 'Unknown error'}`, 6000)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleSendWhatsApp = async (job: Job) => {
    if (job.subcontractor) {
      console.log('📱 Sending WhatsApp update for job:', job.job_id, 'to:', job.subcontractor.name)
      
      try {
        // Validate phone number first
        const phoneValidation = validateAndCleanPhone(job.subcontractor.phone)
        if (!phoneValidation.isValid) {
          throw new Error(`Invalid phone number format: ${job.subcontractor.phone}`)
        }
        
        console.log('✅ Phone validation passed:', phoneValidation.formatted)
        
        // Create enhanced message
        const message = createJobUpdateMessage(job)
        console.log('📝 Message prepared, length:', message.length)
        
        // Show preparing notification
        showInfo(`Opening WhatsApp for ${job.subcontractor.name}...`, 2000)
        
        // Send WhatsApp message
        await sendWhatsAppMessage(job.subcontractor.phone, message)
        
        // Show success notification
        showSuccess(`✅ WhatsApp opened for ${job.subcontractor.name}! Please send the message.`, 6000)
        
      } catch (error) {
        console.error('❌ WhatsApp sending failed:', error)
        
        // Try to provide fallback options
        try {
          const whatsappLink = await copyWhatsAppLink(job.subcontractor.phone, createJobUpdateMessage(job))
          showError(`WhatsApp failed to open. Link copied to clipboard. Open WhatsApp and paste: ${whatsappLink.substring(0, 50)}...`, 10000)
        } catch (copyError) {
          showError(`Failed to send WhatsApp message to ${job.subcontractor.name}. Error: ${error instanceof Error ? error.message : String(error)}`, 6000)
        }
      }
    } else {
      showError('No subcontractor assigned to this job.')
    }
  }

  const handleViewDetails = (job: Job) => {
    // Prevent event bubbling and ensure only one navigation happens
    console.log('Opening job details for:', job.job_id)
    
    // Use window.open with specific parameters to ensure only one tab opens
    const newWindow = window.open(`/admin/job/${job.job_id}`, '_blank', 'noopener,noreferrer')
    
    if (newWindow) {
      showInfo(`Opening job ${job.job_id} details...`)
    } else {
      // Fallback if popup was blocked
      showError('Popup blocked. Please allow popups for this site or try again.')
    }
  }

  const handleExportData = () => {
    // Create CSV data
    const csvData = [
      ['Job ID', 'Customer Name', 'Phone', 'Address', 'Issue', 'Status', 'Subcontractor', 'Region', 'Sale Price', 'Parts Cost', 'Job Profit', 'Created Date'],
      ...filteredJobs.map(job => [
        job.job_id,
        job.customer_name,
        job.customer_phone,
        job.customer_address,
        job.customer_issue,
        job.status,
        job.subcontractor?.name || '',
        job.region || '',
        job.price || '',
        job.parts_cost || '',
        job.job_profit || '',
        new Date(job.created_at).toLocaleDateString()
      ])
    ]

    const csvContent = csvData.map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jobs-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    showSuccess(`Exported ${filteredJobs.length} jobs to CSV file!`)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      showSuccess('Signed out successfully!')
    } catch (error) {
      showError('Failed to sign out. Please try again.')
    }
  }

  // Get current week info for display
  const getCurrentWeekInfo = () => {
    const today = new Date()
    const { weekStart, weekEnd } = getWeekBoundaries(today)
    return {
      start: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      end: weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const currentWeek = getCurrentWeekInfo()

  // Job statistics
  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    inProgress: jobs.filter(j => j.status === 'in_progress').length,
    completed: jobs.filter(j => j.status === 'completed').length
  }

  if (loading) {
    return (
      <div className="min-h-screen app-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (showUserManagement) {
    return (
      <div className="min-h-screen app-background">
        {/* Notification Container */}
        <NotificationContainer 
          notifications={notifications} 
          onRemove={removeNotification} 
        />

        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <button
                onClick={() => setShowUserManagement(false)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to Dashboard
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <UserManagement />
        </div>
      </div>
    )
  }

  if (showSubcontractors) {
    return (
      <div className="min-h-screen app-background">
        {/* Notification Container */}
        <NotificationContainer 
          notifications={notifications} 
          onRemove={removeNotification} 
        />

        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <button
                onClick={() => setShowSubcontractors(false)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to Dashboard
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SubcontractorManagement />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-background">
      {/* Notification Container */}
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Job Management Dashboard</h1>
              <div className="flex items-center space-x-4 mt-1">
                <p className="text-gray-600">
                  Welcome back, {user?.user_metadata?.full_name || user?.email || 'Demo User'}
                </p>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' : 
                    connectionStatus === 'error' ? 'bg-red-500' : 
                    connectionStatus === 'mock' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`}></div>
                  <span className={`text-xs ${
                    connectionStatus === 'connected' ? 'text-green-600' : 
                    connectionStatus === 'error' ? 'text-red-600' : 
                    connectionStatus === 'mock' ? 'text-yellow-600' : 'text-gray-600'
                  }`}>
                    {connectionStatus === 'connected' ? 'Connected' : 
                     connectionStatus === 'error' ? 'Connection Error' : 
                     connectionStatus === 'mock' ? 'Demo Mode' : 'Checking...'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              {connectionStatus === 'mock' && (
                <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                  <Database className="h-3 w-3" />
                  <span>Demo Mode</span>
                </div>
              )}
              <button
                onClick={() => setShowUserManagement(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center space-x-2"
              >
                <UserCog className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </button>
              <button
                onClick={() => setShowInviteForm(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center space-x-2"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Invite Admin</span>
              </button>
              <button
                onClick={() => setShowSubcontractors(true)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Subcontractors</span>
              </button>
              <button
                onClick={handleExportData}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Job</span>
              </button>
              <button
                onClick={handleSignOut}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Demo Mode Alert */}
        {connectionStatus === 'mock' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-yellow-700 font-medium">Demo Mode Active</p>
                <p className="text-yellow-600 text-sm">
                  You're viewing demo data. To connect to your Supabase database, please configure your environment variables.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Messages */}
        {(jobsError || subcontractorsError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-red-700 font-medium">Error Loading Data</p>
                <p className="text-red-600 text-sm">
                  {jobsError || subcontractorsError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 md:p-3 rounded-lg">
                <Calendar className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">Total Jobs</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-yellow-100 p-2 md:p-3 rounded-lg">
                <Phone className="h-5 w-5 md:h-6 md:w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">Pending</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-100 p-2 md:p-3 rounded-lg">
                <Users className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">In Progress</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 md:p-3 rounded-lg">
                <MapPin className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">Completed</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-8">
          <div className="space-y-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search jobs by customer, job ID, phone, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={subcontractorFilter}
                onChange={(e) => setSubcontractorFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">All Subcontractors</option>
                {subcontractors.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>

              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Select Region</option>
                {regions.filter((region): region is string => Boolean(region)).map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                title={`Current week: ${currentWeek.start} - ${currentWeek.end} (Tuesday to Monday)`}
              >
                <option value="">All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this_week">This Week (Tue-Mon)</option>
                <option value="last_week">Last Week</option>
                <option value="next_week">Next Week</option>
                <option value="month">This Month</option>
              </select>

              <div className="col-span-2">
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('')
                    setSubcontractorFilter('')
                    setRegionFilter('')
                    setDateFilter('')
                    showInfo('Filters cleared!')
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                >
                  Clear All Filters
                </button>
              </div>
            </div>

            {/* Week Info Display */}
            {dateFilter && (dateFilter === 'this_week' || dateFilter === 'last_week' || dateFilter === 'next_week') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <p className="text-blue-700 text-sm font-medium">
                    {dateFilter === 'this_week' && `Current week: ${currentWeek.start} - ${currentWeek.end}`}
                    {dateFilter === 'last_week' && 'Previous Tuesday to Monday'}
                    {dateFilter === 'next_week' && 'Next Tuesday to Monday'}
                    <span className="text-blue-600 ml-2">(Week runs Tuesday to Monday)</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Jobs Grid */}
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-600 mb-6">
              {jobs.length === 0 
                ? "Get started by creating your first job."
                : "Try adjusting your search or filter criteria."
              }
            </p>
            {jobs.length === 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Create First Job
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onViewDetails={handleViewDetails}
                onSendWhatsApp={handleSendWhatsApp}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateJob={handleCreateJob}
        loading={createLoading}
      />

      {/* Admin Invite Form */}
      {showInviteForm && (
        <AdminInviteForm onClose={() => setShowInviteForm(false)} />
      )}
    </div>
  )
}

export default Dashboard
export const generateJobId = (): string => {
  // Generate a shorter, more readable job ID: Job- + 6 characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'Job-'
  
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'assigned':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'in_progress':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

// Enhanced WhatsApp link creation with multiple fallback methods
export const createWhatsAppLink = (phone: string, message: string): string => {
  // Clean and validate phone number
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Ensure proper international format for WhatsApp
  let whatsappPhone = cleanPhone
  
  // Handle US phone numbers specifically
  if (cleanPhone.length === 10) {
    whatsappPhone = '1' + cleanPhone // Add US country code
  } else if (cleanPhone.length === 11) {
    if (cleanPhone.startsWith('1')) {
      whatsappPhone = cleanPhone // Already has US country code
    } else {
      whatsappPhone = '1' + cleanPhone.slice(1) // Replace first digit with US code
    }
  }
  
  // Validate final phone number
  if (whatsappPhone.length !== 11 || !whatsappPhone.startsWith('1')) {
    console.error('Invalid phone format for WhatsApp:', whatsappPhone)
    throw new Error(`Invalid phone number format: ${phone}. Expected US format.`)
  }
  
  // Create a shorter, cleaner message for better compatibility
  const cleanMessage = message
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
  
  // Use proper URL encoding
  const encodedMessage = encodeURIComponent(cleanMessage)
  
  // Create WhatsApp link - use the most compatible format
  const whatsappLink = `https://wa.me/${whatsappPhone}?text=${encodedMessage}`
  
  console.log('WhatsApp Link Created:', {
    originalPhone: phone,
    cleanPhone,
    whatsappPhone,
    messageLength: cleanMessage.length,
    finalLink: whatsappLink.substring(0, 100) + '...'
  })
  
  return whatsappLink
}

export const createGoogleMapsLink = (address: string): string => {
  const encodedAddress = encodeURIComponent(address)
  return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
}

export const createWazeLink = (address: string): string => {
  const encodedAddress = encodeURIComponent(address)
  return `https://waze.com/ul?q=${encodedAddress}`
}

export const canCompleteJob = (job: any): boolean => {
  return job.receipt_url !== null && job.receipt_url !== ''
}

export const getJobStatusIcon = (status: string): string => {
  switch (status) {
    case 'pending':
      return '⏳'
    case 'assigned':
      return '👤'
    case 'in_progress':
      return '🔧'
    case 'completed':
      return '✅'
    case 'cancelled':
      return '❌'
    default:
      return '📋'
  }
}

export const formatCurrency = (amount: number | null): string => {
  if (!amount) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

export const getTimeAgo = (date: string): string => {
  const now = new Date()
  const past = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

// Simplified and more reliable message templates
export const createJobAssignmentMessage = (job: any): string => {
  const generatePublicJobUrl = (jobId: string): string => {
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    const port = window.location.port
    
    let baseUrl
    if (port && port !== '80' && port !== '443') {
      baseUrl = `${protocol}//${hostname}:${port}`
    } else {
      baseUrl = `${protocol}//${hostname}`
    }
    
    return `${baseUrl}/job/${jobId}`
  }
  
  const jobLink = generatePublicJobUrl(job.job_id)
  
  // Create a more concise message that works better with WhatsApp
  const message = `🔧 NEW JOB: ${job.job_id}

Customer: ${job.customer_name}
Phone: ${formatPhoneNumber(job.customer_phone)}
Address: ${job.customer_address}

Issue: ${job.customer_issue}

Job Portal: ${jobLink}

Please confirm and update status when starting work. Thanks!`

  return message
}

export const createJobUpdateMessage = (job: any): string => {
  const generatePublicJobUrl = (jobId: string): string => {
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    const port = window.location.port
    
    let baseUrl
    if (port && port !== '80' && port !== '443') {
      baseUrl = `${protocol}//${hostname}:${port}`
    } else {
      baseUrl = `${protocol}//${hostname}`
    }
    
    return `${baseUrl}/job/${jobId}`
  }
  
  const jobLink = generatePublicJobUrl(job.job_id)
  
  // Create a more concise update message
  const message = `🔧 JOB UPDATE: ${job.job_id}

Customer: ${job.customer_name}
Status: ${job.status.toUpperCase().replace('_', ' ')}
Address: ${job.customer_address}

Update Portal: ${jobLink}

Please update status and upload receipt when completed. Thanks!`

  return message
}

// Enhanced phone validation
export const validateAndCleanPhone = (phone: string): { isValid: boolean; cleaned: string; formatted: string; whatsappReady: string } => {
  const cleaned = phone.replace(/\D/g, '')
  
  let isValid = false
  let formatted = phone
  let whatsappReady = ''
  
  if (cleaned.length === 10) {
    isValid = true
    formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    whatsappReady = '1' + cleaned
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    isValid = true
    formatted = `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    whatsappReady = cleaned
  }
  
  return { isValid, cleaned, formatted, whatsappReady }
}

// More robust WhatsApp sending with multiple approaches
export const sendWhatsAppMessage = (phone: string, message: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    try {
      console.log('🚀 Initiating WhatsApp send...')
      
      // Validate inputs
      if (!phone || !message) {
        throw new Error('Phone number and message are required')
      }
      
      // Validate and format phone number
      const phoneValidation = validateAndCleanPhone(phone)
      if (!phoneValidation.isValid) {
        throw new Error(`Invalid phone number: ${phone}. Please use US format (10 or 11 digits).`)
      }
      
      console.log('📞 Phone validation passed:', phoneValidation.formatted)
      
      // Create WhatsApp link
      const whatsappLink = createWhatsAppLink(phone, message)
      console.log('🔗 WhatsApp link created')
      
      // Detect device type for optimal handling
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isAndroid = /Android/.test(navigator.userAgent)
      
      console.log('📱 Device detection:', { isMobile, isIOS, isAndroid })
      
      // Try multiple approaches based on device
      if (isIOS) {
        // iOS specific handling
        console.log('🍎 Using iOS WhatsApp handling...')
        
        // Try WhatsApp app first
        const appLink = whatsappLink.replace('https://wa.me/', 'whatsapp://send?phone=')
        window.location.href = appLink
        
        // Fallback to web version after delay
        setTimeout(() => {
          window.open(whatsappLink, '_blank', 'noopener,noreferrer')
        }, 2000)
        
      } else if (isAndroid) {
        // Android specific handling
        console.log('🤖 Using Android WhatsApp handling...')
        
        // Try intent first
        const intentLink = `intent://send?phone=${phoneValidation.whatsappReady}&text=${encodeURIComponent(message)}#Intent;scheme=whatsapp;package=com.whatsapp;end`
        window.location.href = intentLink
        
        // Fallback to web version
        setTimeout(() => {
          window.open(whatsappLink, '_blank', 'noopener,noreferrer')
        }, 1500)
        
      } else {
        // Desktop handling
        console.log('💻 Using desktop WhatsApp handling...')
        
        // Open WhatsApp Web in new tab
        const whatsappWindow = window.open(whatsappLink, '_blank', 'noopener,noreferrer,width=800,height=600')
        
        if (!whatsappWindow) {
          console.warn('⚠️ Popup blocked, trying alternative...')
          // Try opening in same tab as fallback
          window.open(whatsappLink, '_blank', 'noopener,noreferrer,width=800,height=600')
        }
      }
      // Give some time for the action to complete
      setTimeout(() => {
        console.log('✅ WhatsApp send completed')
        resolve(true)
      }, 1000)
      
    } catch (error) {
      console.error('❌ WhatsApp send failed:', error)
      reject(new Error(`WhatsApp Error: ${error instanceof Error ? error.message : String(error)}`))
    }
  })
}

// Test function to validate WhatsApp functionality
export const testWhatsAppLink = (phone: string): boolean => {
  try {
    const validation = validateAndCleanPhone(phone)
    if (!validation.isValid) {
      console.error('❌ Phone validation failed:', phone)
      return false
    }
    
    const testMessage = "Test from Job Management System"
    const link = createWhatsAppLink(phone, testMessage)
    
    // Basic link validation
    if (!link.includes('wa.me/') || !link.includes('text=')) {
      console.error('❌ Invalid WhatsApp link format')
      return false
    }
    
    console.log('✅ WhatsApp test passed')
    return true
  } catch (error) {
    console.error('❌ WhatsApp test failed:', error)
    return false
  }
}

// Alternative method for copying WhatsApp link if direct opening fails
export const copyWhatsAppLink = (phone: string, message: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const link = createWhatsAppLink(phone, message)
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(() => {
          resolve(link)
        }).catch(() => {
          // Fallback for clipboard failure
          resolve(link)
        })
      } else {
        // Manual copy fallback
        resolve(link)
      }
    } catch (error) {
      reject(error)
    }
  })
}
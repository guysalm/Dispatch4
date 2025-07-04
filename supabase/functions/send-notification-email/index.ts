import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailNotificationRequest {
  jobId: string
  jobTitle: string
  fieldName: string
  oldValue: string | null
  newValue: string | null
  updatedBy: string
  customerName: string
  subcontractorName: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      jobId, 
      jobTitle, 
      fieldName, 
      oldValue, 
      newValue, 
      updatedBy, 
      customerName, 
      subcontractorName 
    }: EmailNotificationRequest = await req.json()

    // Format field name for display
    const formatFieldName = (field: string): string => {
      return field.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    }

    // Create email content
    const subject = `Job Update: ${jobTitle} - ${formatFieldName(fieldName)} Changed`
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin: 0;">Job Update Notification</h2>
        </div>
        
        <div style="background-color: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h3 style="color: #374151; margin-top: 0;">Job: ${jobTitle}</h3>
          
          <div style="margin: 20px 0;">
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Subcontractor:</strong> ${subcontractorName}</p>
            <p><strong>Updated by:</strong> ${updatedBy}</p>
            <p><strong>Field changed:</strong> ${formatFieldName(fieldName)}</p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <div style="margin-bottom: 10px;">
              <strong>Previous value:</strong>
              <span style="background-color: #fef2f2; color: #dc2626; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">
                ${oldValue || 'Empty'}
              </span>
            </div>
            <div>
              <strong>New value:</strong>
              <span style="background-color: #f0fdf4; color: #16a34a; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">
                ${newValue || 'Empty'}
              </span>
            </div>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This is an automated notification from your Job Management System.
            </p>
          </div>
        </div>
      </div>
    `

    // In a real implementation, you would use a service like SendGrid, Resend, or similar
    // For now, we'll just log the email content and return success
    console.log('Email notification would be sent:', {
      subject,
      htmlContent,
      timestamp: new Date().toISOString()
    })

    // Mock email sending - replace with actual email service
    const emailSent = true // This would be the result of your email service call

    if (emailSent) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email notification sent successfully' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } else {
      throw new Error('Failed to send email')
    }

  } catch (error) {
    console.error('Error sending email notification:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
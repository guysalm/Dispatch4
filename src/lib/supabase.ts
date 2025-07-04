import { createClient } from '@supabase/supabase-js'

// For development, we'll use proper fallback values that won't break the app
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://example.supabase.co'
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YW1wbGUiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxOTU3MzQ1MjAwfQ.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'

console.log('Supabase configuration:', {
  url: supabaseUrl,
  keyLength: supabaseAnonKey?.length || 0,
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  isPlaceholder: supabaseUrl.includes('example')
})

// Validate URL format before creating client
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

if (!isValidUrl(supabaseUrl)) {
  console.error('Invalid Supabase URL provided:', supabaseUrl)
  throw new Error('Invalid Supabase URL. Please check your VITE_SUPABASE_URL environment variable.')
}

// Create Supabase client with proper configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'job-management-system'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    timeout: 30000
  }
})

// Enhanced connection test with better error handling
export const testConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Testing Supabase connection...')
    
    // If using placeholder values, return mock success for development
    if (supabaseUrl.includes('example')) {
      console.log('Using example Supabase configuration - mock mode')
      return { success: true }
    }
    
    // Set a timeout for the request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    const { error } = await supabase
      .from('jobs')
      .select('id')
      .limit(1)

    clearTimeout(timeoutId)

    if (error) {
      console.error('Supabase connection test failed:', error)
      return { 
        success: false, 
        error: `Database error: ${error.message}. Please check your Supabase project status and RLS policies.` 
      }
    }

    console.log('Supabase connection test successful')
    return { success: true }
  } catch (error) {
    console.error('Supabase connection test error:', error)
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { 
          success: false, 
          error: 'Connection timeout. Please check your internet connection and Supabase project status.' 
        }
      }
      
      if (error.message.includes('Failed to fetch')) {
        return { 
          success: false, 
          error: 'Network error. Please check your internet connection and verify your Supabase URL is correct.' 
        }
      }
      
      return { 
        success: false, 
        error: `Connection error: ${error.message}` 
      }
    }
    
    return { 
      success: false, 
      error: 'Unknown connection error occurred.' 
    }
  }
}

export type Database = {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string
          job_id: string
          customer_name: string
          customer_phone: string
          customer_address: string
          customer_issue: string
          subcontractor_id: string | null
          status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
          materials: string | null
          price: number | null
          notes: string | null
          receipt_url: string | null
          created_at: string
          updated_at: string
          region: string | null
          parts_cost: number | null
          job_profit: number | null
        }
        Insert: {
          id?: string
          job_id: string
          customer_name: string
          customer_phone: string
          customer_address: string
          customer_issue: string
          subcontractor_id?: string | null
          status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
          materials?: string | null
          price?: number | null
          notes?: string | null
          receipt_url?: string | null
          created_at?: string
          updated_at?: string
          region?: string | null
          parts_cost?: number | null
          job_profit?: number | null
        }
        Update: {
          id?: string
          job_id?: string
          customer_name?: string
          customer_phone?: string
          customer_address?: string
          customer_issue?: string
          subcontractor_id?: string | null
          status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
          materials?: string | null
          price?: number | null
          notes?: string | null
          receipt_url?: string | null
          created_at?: string
          updated_at?: string
          region?: string | null
          parts_cost?: number | null
          job_profit?: number | null
        }
      }
      subcontractors: {
        Row: {
          id: string
          name: string
          phone: string
          email: string
          region: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          email: string
          region: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          email?: string
          region?: string
          created_at?: string
        }
      }
      job_updates: {
        Row: {
          id: string
          job_id: string
          field_name: string
          old_value: string | null
          new_value: string | null
          updated_by: string
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          field_name: string
          old_value?: string | null
          new_value?: string | null
          updated_by: string
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          field_name?: string
          old_value?: string | null
          new_value?: string | null
          updated_by?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          role: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          role?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          role?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
  }
}
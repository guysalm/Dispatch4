import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'

const app = express()
const PORT = 3001

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  console.error('Stack:', error.stack)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

app.use(cors())
app.use(express.json())

// Initialize Supabase clients
let supabase
let adminSupabase

try {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.error('Missing required environment variables:')
    console.error('VITE_SUPABASE_URL:', !!supabaseUrl)
    console.error('VITE_SUPABASE_ANON_KEY:', !!supabaseAnonKey)
    console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
    throw new Error('Missing Supabase environment variables. Please check your .env file.')
  }

  console.log('Initializing Supabase clients with:', {
    url: supabaseUrl,
    anonKeyLength: supabaseAnonKey?.length || 0,
    serviceKeyLength: supabaseServiceKey?.length || 0
  })

  // Regular client for non-admin operations
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })

  // Admin client for admin operations
  adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })

  console.log('Supabase clients initialized successfully')
} catch (error) {
  console.error('Failed to initialize Supabase:', error)
  process.exit(1)
}

// Global error handler middleware
app.use((error: any, _req: any, res: any, _next: any) => {
  console.error('Express error handler:', error)
  res.status(500).json({
    error: 'Internal server error',
    message: error instanceof Error ? error.message : String(error)
  })
})

// Get Supabase config
app.get('/api/config', (_req, res) => {
  try {
    console.log('Config requested')
    res.json({
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      supabaseKey: process.env.VITE_SUPABASE_ANON_KEY
    })
  } catch (error) {
    console.error('Error in config endpoint:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
  }
})

// Admin endpoint to list users
app.get('/api/admin/users', async (_req, res) => {
  try {
    console.log('API: Fetching admin users list')
    
    if (!adminSupabase) {
      throw new Error('Admin Supabase client not initialized')
    }
    
    // Get users from profiles table
    const { data: profilesData, error: profilesError } = await adminSupabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profilesError) throw profilesError

    // Get auth users data using admin client
    const { data: authData, error: authError } = await adminSupabase.auth.admin.listUsers()
    
    if (authError) {
      console.warn('Could not fetch auth data:', authError)
      // Continue with profiles data only
    }

    // Merge profile and auth data
    const mergedUsers = profilesData.map(profile => {
      const authUser = authData?.users?.find(u => u.id === profile.id)
      return {
        ...profile,
        email_confirmed_at: authUser?.email_confirmed_at || null,
        last_sign_in_at: authUser?.last_sign_in_at || null,
        is_active: !(authUser as any)?.banned_until
      }
    })

    console.log('API: Users fetched successfully:', mergedUsers.length)
    res.json(mergedUsers)
  } catch (error) {
    console.error('Error fetching admin users:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

// Get job by job ID
app.get('/api/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params
    console.log('API: Fetching job with ID:', jobId)
    
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }
    
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        subcontractor:subcontractors(*)
      `)
      .eq('job_id', jobId)
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return res.status(404).json({ 
        error: `Job not found: ${error instanceof Error ? error.message : String(error)}`,
        details: error
      })
    }

    if (!data) {
      console.log('No data returned for job:', jobId)
      return res.status(404).json({ 
        error: 'Job not found: No data returned'
      })
    }

    console.log('API: Job found:', data)
    res.json(data)
  } catch (error) {
    console.error('Error fetching job:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

// Update job by job ID
app.put('/api/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params
    const updates = req.body
    console.log('API: Updating job with ID:', jobId, 'Updates:', updates)
    
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }
    
    const { data, error } = await supabase
      .from('jobs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('job_id', jobId)
      .select(`
        *,
        subcontractor:subcontractors(*)
      `)
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      return res.status(400).json({ 
        error: `Failed to update job: ${error instanceof Error ? error.message : String(error)}`,
        details: error
      })
    }

    console.log('API: Job updated:', data)
    res.json(data)
  } catch (error) {
    console.error('Error updating job:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

// Health check endpoint
app.get('/api/health', (_req, res) => {
  try {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      supabase: {
        url: process.env.VITE_SUPABASE_URL,
        connected: !!supabase,
        adminConnected: !!adminSupabase
      }
    })
  } catch (error) {
    console.error('Error in health check:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
  }
})

// Start server with error handling
try {
  const server = app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`)
    console.log(`Health check: http://localhost:${PORT}/api/health`)
  })

  server.on('error', (error) => {
    console.error('Server error:', error)
    if ((error as any).code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Please stop any other processes using this port.`)
    }
    process.exit(1)
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully')
    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })
  })

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully')
    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })
  })

} catch (error) {
  console.error('Failed to start server:', error)
  process.exit(1)
}
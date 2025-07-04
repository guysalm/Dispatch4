import { useState, useEffect } from 'react'
import { supabase, testConnection } from '../lib/supabase'
import { Job, CreateJobData, UpdateJobData } from '../types'
import { generateJobId } from '../utils/jobUtils'

// Mock data for development when Supabase is not configured
const mockJobs: Job[] = [
  {
    id: '1',
    job_id: 'Job-ABC123',
    customer_name: 'John Smith',
    customer_phone: '(555) 123-4567',
    customer_address: '123 Main St, Anytown, USA 12345',
    customer_issue: 'Kitchen sink is leaking and needs repair',
    subcontractor_id: '1',
    status: 'pending',
    materials: null,
    price: null,
    parts_cost: null,
    job_profit: null,
    notes: null,
    receipt_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    region: 'Downtown',
    subcontractor: {
      id: '1',
      name: 'Mike Johnson',
      phone: '(555) 987-6543',
      email: 'mike@example.com',
      region: 'Downtown',
      created_at: new Date().toISOString()
    }
  },
  {
    id: '2',
    job_id: 'Job-DEF456',
    customer_name: 'Sarah Wilson',
    customer_phone: '(555) 234-5678',
    customer_address: '456 Oak Ave, Somewhere, USA 67890',
    customer_issue: 'Bathroom faucet replacement needed',
    subcontractor_id: null,
    status: 'assigned',
    materials: 'New faucet, pipe fittings',
    price: 150.00,
    parts_cost: 75.00,
    job_profit: 75.00,
    notes: 'Customer prefers chrome finish',
    receipt_url: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    region: 'Northside',
    subcontractor: null
  }
]

const mockSubcontractors = [
  {
    id: '1',
    name: 'Mike Johnson',
    phone: '(555) 987-6543',
    email: 'mike@example.com',
    region: 'Downtown',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Lisa Davis',
    phone: '(555) 876-5432',
    email: 'lisa@example.com',
    region: 'Northside',
    created_at: new Date().toISOString()
  }
]

export const useJobs = () => {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUsingMockData, setIsUsingMockData] = useState(false)

  const fetchJobs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Fetching jobs from Supabase...')
      
      // Test connection first
      const connectionResult = await testConnection()
      if (!connectionResult.success) {
        console.log('Supabase not available, using mock data')
        setJobs(mockJobs)
        setIsUsingMockData(true)
        return
      }

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          subcontractor:subcontractors(*)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase fetch error:', error)
        console.log('Falling back to mock data')
        setJobs(mockJobs)
        setIsUsingMockData(true)
        return
      }

      console.log('Jobs fetched successfully:', data?.length || 0, 'jobs')
      setJobs(data || [])
      setIsUsingMockData(false)
    } catch (err) {
      console.error('Error in fetchJobs:', err)
      console.log('Using mock data due to error')
      setJobs(mockJobs)
      setIsUsingMockData(true)
    } finally {
      setLoading(false)
    }
  }

  const createJob = async (jobData: CreateJobData) => {
    try {
      console.log('Creating job with data:', jobData)
      
      // Validate required fields
      if (!jobData.customer_name || !jobData.customer_phone || !jobData.customer_address || !jobData.customer_issue) {
        throw new Error('Missing required fields: customer name, phone, address, and issue description are required')
      }

      const job_id = generateJobId()
      console.log('Generated job ID:', job_id)

      const jobToInsert = {
        ...jobData,
        job_id,
        status: 'pending' as const,
        updated_at: new Date().toISOString()
      }

      // If using mock data, just add to local state
      if (isUsingMockData) {
        const newJob: Job = {
          id: Date.now().toString(),
          ...jobToInsert,
          materials: null,
          price: null,
          parts_cost: null,
          job_profit: null,
          notes: null,
          receipt_url: null,
          created_at: new Date().toISOString(),
          subcontractor_id: jobData.subcontractor_id ?? null,
          subcontractor: jobData.subcontractor_id
            ? mockSubcontractors.find(s => s.id === jobData.subcontractor_id) ?? null
            : null,
          region: jobData.region ?? null // ✅ The only change to fix your specific error
        }
        
        setJobs(prev => [newJob, ...prev])
        return newJob
      }

      // Test connection first
      const connectionResult = await testConnection()
      if (!connectionResult.success) {
        throw new Error(connectionResult.error || 'Unable to connect to database. Please check your Supabase configuration.')
      }

      console.log('Inserting job:', jobToInsert)

      const { data, error } = await supabase
        .from('jobs')
        .insert(jobToInsert)
        .select(`
          *,
          subcontractor:subcontractors(*)
        `)
        .single()

      if (error) {
        console.error('Supabase insert error:', error)
        throw new Error(`Failed to create job: ${error.message}`)
      }

      if (!data) {
        throw new Error('No data returned after job creation')
      }

      console.log('Job created successfully:', data)
      
      setJobs(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('Error in createJob:', err)
      throw new Error(err instanceof Error ? err.message : 'Failed to create job')
    }
  }

  const updateJob = async (jobId: string, updates: UpdateJobData) => {
    try {
      console.log('Updating job:', jobId, 'with updates:', updates)

      // If using mock data, update local state
      if (isUsingMockData) {
        setJobs(prev => prev.map(job => 
          job.id === jobId ? { ...job, ...updates, updated_at: new Date().toISOString() } : job
        ))
        return jobs.find(job => job.id === jobId)
      }

      // Test connection first
      const connectionResult = await testConnection()
      if (!connectionResult.success) {
        throw new Error(connectionResult.error || 'Unable to connect to database. Please check your Supabase configuration.')
      }

      const { data, error } = await supabase
        .from('jobs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .select(`
          *,
          subcontractor:subcontractors(*)
        `)
        .single()

      if (error) {
        console.error('Supabase update error:', error)
        throw new Error(`Failed to update job: ${error.message}`)
      }

      if (!data) {
        throw new Error('No data returned after job update')
      }

      console.log('Job updated successfully:', data)

      setJobs(prev => prev.map(job => job.id === jobId ? data : job))
      
      return data
    } catch (err) {
      console.error('Error in updateJob:', err)
      throw new Error(err instanceof Error ? err.message : 'Failed to update job')
    }
  }

  const getJobByJobId = async (jobId: string) => {
    try {
      console.log('Fetching job by job_id:', jobId)

      // If using mock data, find in local state
      if (isUsingMockData) {
        const job = mockJobs.find(j => j.job_id === jobId)
        if (!job) {
          throw new Error('Job not found')
        }
        return job
      }

      // Test connection first
      const connectionResult = await testConnection()
      if (!connectionResult.success) {
        throw new Error(connectionResult.error || 'Unable to connect to database. Please check your Supabase configuration.')
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
        console.error('Supabase fetch error:', error)
        throw new Error(`Job not found: ${error.message}`)
      }

      if (!data) {
        throw new Error('Job not found')
      }

      console.log('Job fetched successfully:', data)
      return data
    } catch (err) {
      console.error('Error in getJobByJobId:', err)
      throw new Error(err instanceof Error ? err.message : 'Job not found')
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  return {
    jobs,
    loading,
    error,
    fetchJobs,
    createJob,
    updateJob,
    getJobByJobId,
    isUsingMockData
  }
}

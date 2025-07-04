import { supabase } from '../lib/supabase'
import { Job } from '../types'

export async function getJobByJobId(jobId: string): Promise<Job> {
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      subcontractor:subcontractors(*)
    `)
    .eq('job_id', jobId)
    .single()

  if (error) {
    throw new Error(`Job not found: ${error.message}`)
  }

  return data
}

export async function updateJobById(jobId: string, updates: any): Promise<Job> {
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
    throw new Error(`Failed to update job: ${error.message}`)
  }

  return data
}
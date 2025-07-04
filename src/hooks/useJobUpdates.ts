import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { JobUpdate } from '../types'

export const useJobUpdates = (jobId?: string) => {
  const [updates, setUpdates] = useState<JobUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUpdates = async () => {
    if (!jobId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('job_updates')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUpdates(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const createUpdate = async (
    jobId: string,
    fieldName: string,
    oldValue: string | null,
    newValue: string | null,
    updatedBy: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('job_updates')
        .insert({
          job_id: jobId,
          field_name: fieldName,
          old_value: oldValue,
          new_value: newValue,
          updated_by: updatedBy
        })
        .select()
        .single()

      if (error) throw error
      
      setUpdates(prev => [data, ...prev])
      return data
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create update')
    }
  }

  useEffect(() => {
    if (jobId) {
      fetchUpdates()
    }
  }, [jobId])

  return {
    updates,
    loading,
    error,
    fetchUpdates,
    createUpdate
  }
}
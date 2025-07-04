import express from 'express'
import cors from 'cors'
import { getJobByJobId, updateJobById } from '../api/jobs'

const app = express()

app.use(cors())
app.use(express.json())

// Get Supabase config
app.get('/api/config', (_req, res) => {
  res.json({
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    supabaseKey: process.env.VITE_SUPABASE_ANON_KEY
  })
})

// Get job by job ID
app.get('/api/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params
    const job = await getJobByJobId(jobId)
    res.json(job)
  } catch (error) {
    console.error('Error fetching job:', error)
    res.status(404).json({ error: error instanceof Error ? error.message : String(error) })
  }
})

// Update job by job ID
app.put('/api/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params
    const updates = req.body
    const job = await updateJobById(jobId, updates)
    res.json(job)
  } catch (error) {
    console.error('Error updating job:', error)
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) })
  }
})

export default app
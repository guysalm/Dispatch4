export interface Job {
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
  parts_cost: number | null
  job_profit: number | null
  notes: string | null
  receipt_url: string | null
  created_at: string
  updated_at: string
  region: string | null
  subcontractor?: Subcontractor | null
}

export interface Subcontractor {
  id: string
  name: string
  phone: string
  email: string
  region: string
  created_at: string
}

export interface JobUpdate {
  id: string
  job_id: string
  field_name: string
  old_value: string | null
  new_value: string | null
  updated_by: string
  created_at: string
}

export interface CreateJobData {
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_issue: string
  subcontractor_id?: string | null
  region?: string
}

export interface UpdateJobData {
  status?: Job['status']
  materials?: string
  price?: number
  parts_cost?: number | null
  job_profit?: number | null
  notes?: string | null
  receipt_url?: string
}
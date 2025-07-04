import React from 'react'
import { format } from 'date-fns'
import { Clock, User, Edit } from 'lucide-react'
import { useJobUpdates } from '../hooks/useJobUpdates'

interface JobUpdateHistoryProps {
  jobId: string
}

const JobUpdateHistory: React.FC<JobUpdateHistoryProps> = ({ jobId }) => {
  const { updates, loading } = useJobUpdates(jobId)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (updates.length === 0) {
    return (
      <div className="text-center py-6">
        <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No updates yet</p>
      </div>
    )
  }

  const formatFieldName = (fieldName: string): string => {
    return fieldName.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const formatValue = (value: string | null): string => {
    if (!value) return 'Empty'
    if (value.length > 50) return value.substring(0, 50) + '...'
    return value
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
        <Clock className="h-5 w-5 text-blue-600" />
        <span>Update History</span>
      </h3>

      <div className="space-y-3">
        {updates.map((update) => (
          <div key={update.id} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Edit className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-900">
                  {formatFieldName(update.field_name)}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {format(new Date(update.created_at), 'MMM dd, h:mm a')}
              </span>
            </div>
            
            <div className="ml-6 space-y-1">
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">Updated by: {update.updated_by}</span>
              </div>
              
              {update.old_value !== update.new_value && (
                <div className="text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500">From:</span>
                    <span className="text-red-600 bg-red-50 px-2 py-1 rounded">
                      {formatValue(update.old_value)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-gray-500">To:</span>
                    <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
                      {formatValue(update.new_value)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default JobUpdateHistory
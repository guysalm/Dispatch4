import React, { useState } from 'react'
import { Mail, RefreshCw, UserPlus, X, Clock, Trash2, AlertCircle, CheckCircle, Copy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useNotification } from '../hooks/useNotification'

interface AdminInviteFormProps {
  onClose: () => void
}

interface PendingInvitation {
  id: string
  email: string
  invited_by_email: string
  expires_at: string
  created_at: string
}

const AdminInviteForm: React.FC<AdminInviteFormProps> = ({ onClose }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(true)
  const [invitationLink, setInvitationLink] = useState<string | null>(null)
  const { showSuccess, showError, showInfo } = useNotification()

  // Normalize email for consistent comparison
  const normalizeEmail = (email: string): string => {
    return email.trim().toLowerCase()
  }

  // Load pending invitations on component mount
  React.useEffect(() => {
    loadPendingInvitations()
  }, [])

  const loadPendingInvitations = async (): Promise<PendingInvitation[]> => {
    try {
      setLoadingInvitations(true)
      const { data, error } = await supabase.rpc('get_pending_invitations')
      
      if (error) throw error
      
      const invitations = data || []
      setPendingInvitations(invitations)
      return invitations
    } catch (error) {
      console.error('Error loading invitations:', error)
      showError('Failed to load pending invitations')
      return []
    } finally {
      setLoadingInvitations(false)
    }
  }

  const generateInvitationLink = (token: string): string => {
    const baseUrl = window.location.origin
    return `${baseUrl}/login?invitation=${token}`
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showSuccess('Invitation link copied to clipboard!')
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        showSuccess('Invitation link copied to clipboard!')
      } catch (err) {
        showError('Failed to copy link. Please copy manually.')
      }
      document.body.removeChild(textArea)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setInvitationLink(null)

    try {
      // Normalize the email input
      const normalizedEmail = normalizeEmail(email)

      // Refresh pending invitations to ensure we have the latest data
      const currentInvitations = await loadPendingInvitations()

      // Check if an invitation for this email already exists using normalized comparison
      const existingInvitation = currentInvitations.find(
        invitation => normalizeEmail(invitation.email) === normalizedEmail
      )

      if (existingInvitation) {
        showError(`An invitation for ${normalizedEmail} is already pending. Please revoke the existing invitation first or use a different email address.`)
        setLoading(false)
        return
      }

      const { data, error } = await supabase.rpc('create_admin_invitation', {
        p_invitation_email: normalizedEmail
      })

      if (error) throw error

      // Check if the response indicates success
      if (data && data.success) {
        const inviteLink = generateInvitationLink(data.token)
        setInvitationLink(inviteLink)
        
        showSuccess(`Invitation created for ${normalizedEmail}!`)
        showInfo('Since email service is not configured, please copy and share the invitation link manually.')
        
        setEmail('')
        
        // Reload pending invitations
        await loadPendingInvitations()
      } else {
        throw new Error(data?.message || 'Failed to create invitation')
      }
    } catch (error: any) {
      console.error('Error creating invitation:', error)
      
      // Handle specific database constraint errors
      if (error.message && error.message.includes('duplicate key value violates unique constraint')) {
        const normalizedEmail = normalizeEmail(email)
        showError(`An invitation for ${normalizedEmail} already exists. Please revoke the existing invitation first or use a different email address.`)
      } else {
        showError(error.message || 'Failed to create invitation')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeInvitation = async (invitationId: string, email: string) => {
    try {
      const { data, error } = await supabase.rpc('revoke_invitation', {
        p_invitation_id: invitationId
      })

      if (error) throw error

      if (data && data.success) {
        showSuccess(`Invitation for ${email} has been revoked`)
        await loadPendingInvitations()
      } else {
        throw new Error(data?.message || 'Failed to revoke invitation')
      }
    } catch (error: any) {
      console.error('Error revoking invitation:', error)
      showError(error.message || 'Failed to revoke invitation')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isExpiringSoon = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt)
    const now = new Date()
    const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursUntilExpiry <= 24
  }

  // Check if the current email has a pending invitation using normalized comparison
  const hasExistingInvitation = pendingInvitations.some(
    invitation => normalizeEmail(invitation.email) === normalizeEmail(email)
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <UserPlus className="h-6 w-6 text-blue-600" />
            <span>Invite New Admin</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Email Service Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <h3 className="font-medium text-yellow-900">Email Service Not Configured</h3>
            </div>
            <p className="text-yellow-700 text-sm">
              Automatic email sending is not set up. You'll need to manually share the invitation link with the recipient.
            </p>
          </div>

          {/* Invite Form */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Mail className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-blue-900">Create Admin Invitation</h3>
            </div>
            <p className="text-blue-700 text-sm mb-4">
              Create an invitation link that allows someone to create an admin account. 
              Invitations expire after 7 days.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`pl-10 pr-4 py-3 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      hasExistingInvitation 
                        ? 'border-orange-300 bg-orange-50' 
                        : 'border-gray-300'
                    }`}
                    placeholder="admin@company.com"
                    required
                  />
                </div>
                {hasExistingInvitation && (
                  <p className="mt-2 text-sm text-orange-600 flex items-center space-x-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>This email already has a pending invitation</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || hasExistingInvitation}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Creating Invitation...</span>
                  </>
                ) : hasExistingInvitation ? (
                  <>
                    <AlertCircle className="h-5 w-5" />
                    <span>Invitation Already Exists</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    <span>Create Invitation</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Generated Invitation Link */}
          {invitationLink && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-medium text-green-900">Invitation Link Generated</h3>
              </div>
              <p className="text-green-700 text-sm mb-3">
                Copy this link and send it to the person you want to invite:
              </p>
              <div className="bg-white border border-green-300 rounded-lg p-3 mb-3">
                <code className="text-sm text-gray-800 break-all">{invitationLink}</code>
              </div>
              <button
                onClick={() => copyToClipboard(invitationLink)}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Copy className="h-4 w-4" />
                <span>Copy Invitation Link</span>
              </button>
            </div>
          )}

          {/* Pending Invitations */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                <Clock className="h-5 w-5 text-gray-600" />
                <span>Pending Invitations</span>
              </h3>
              <button
                onClick={loadPendingInvitations}
                disabled={loadingInvitations}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {loadingInvitations ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {loadingInvitations ? (
              <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500">Loading invitations...</p>
              </div>
            ) : pendingInvitations.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Mail className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No pending invitations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className={`border rounded-lg p-4 ${
                      isExpiringSoon(invitation.expires_at)
                        ? 'border-orange-200 bg-orange-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">{invitation.email}</p>
                          {isExpiringSoon(invitation.expires_at) && (
                            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                              Expiring Soon
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Invited by {invitation.invited_by_email}
                        </p>
                        <p className="text-xs text-gray-500">
                          Expires: {formatDate(invitation.expires_at)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRevokeInvitation(invitation.id, invitation.email)}
                        className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Revoke invitation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">How to Use Invitations:</h4>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Create an invitation for the person's email address</li>
              <li>• Copy the generated invitation link</li>
              <li>• Send the link to them via email, text, or other secure method</li>
              <li>• They can use the link to create their admin account</li>
              <li>• Invitations expire after 7 days for security</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminInviteForm
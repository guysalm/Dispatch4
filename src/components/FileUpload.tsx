import React, { useState, useRef } from 'react'
import { Upload, File, X, Check } from 'lucide-react'

interface FileUploadProps {
  onFileUpload: (file: File) => Promise<string>
  currentFileUrl?: string
  accept?: string
  maxSize?: number // in MB
  className?: string
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  currentFileUrl,
  accept = "image/*,.pdf",
  maxSize = 5,
  className = ""
}) => {
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`)
      return
    }

    setError(null)
    setUploading(true)
    setUploadSuccess(false)

    try {
      await onFileUpload(file)
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemove = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setError(null)
    setUploadSuccess(false)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div 
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all
          ${uploading ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${error ? 'border-red-300 bg-red-50' : ''}
          ${uploadSuccess ? 'border-green-300 bg-green-50' : ''}
        `}
      >
        <div className="flex flex-col items-center space-y-2">
          {uploading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          ) : uploadSuccess ? (
            <Check className="h-8 w-8 text-green-600" />
          ) : (
            <Upload className="h-8 w-8 text-gray-400" />
          )}
          
          <div className="text-center">
            {uploading ? (
              <p className="text-sm text-blue-600">Uploading...</p>
            ) : uploadSuccess ? (
              <p className="text-sm text-green-600">Upload successful!</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-900">
                  Click to upload file
                </p>
                <p className="text-xs text-gray-500">
                  PDF, PNG, JPG up to {maxSize}MB
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {currentFileUrl && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <File className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-700">File uploaded</span>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={currentFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View
            </a>
            <button
              onClick={handleRemove}
              className="text-gray-400 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

export default FileUpload
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Upload, File, X, Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { Document } from '@/types/database'

interface DocumentUploadProps {
  foundationId: string
  entityType: 'organization' | 'grant'
  entityId: string
  documents: Document[]
  canUpload: boolean
  canDelete: boolean
}

export function DocumentUpload({
  foundationId,
  entityType,
  entityId,
  documents,
  canUpload,
  canDelete,
}: DocumentUploadProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      if (!profile) {
        throw new Error('Profile not found')
      }

      // Generate unique file path
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${foundationId}/${entityType}/${entityId}/${fileName}`

      setProgress(25)

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      setProgress(75)

      // Create document record
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          foundation_id: foundationId,
          entity_type: entityType,
          entity_id: entityId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: profile.id,
        })

      if (dbError) {
        // Clean up uploaded file
        await supabase.storage.from('documents').remove([filePath])
        throw dbError
      }

      setProgress(100)
      toast.success('Document uploaded')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
      setProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDownload = async (doc: Document) => {
    const supabase = createClient()

    const { data, error } = await supabase.storage
      .from('documents')
      .download(doc.file_path)

    if (error) {
      toast.error('Download failed')
      return
    }

    // Create download link
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = doc.file_name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    const supabase = createClient()

    // Delete from storage
    await supabase.storage.from('documents').remove([doc.file_path])

    // Delete from database
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id)

    if (error) {
      toast.error('Failed to delete document')
      return
    }

    toast.success('Document deleted')
    router.refresh()
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      {canUpload && (
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <Card className={`border-2 border-dashed transition-colors ${uploading ? 'opacity-50' : 'hover:border-gray-400'}`}>
            <CardContent className="py-6">
              <div className="flex flex-col items-center text-center">
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium">
                  {uploading ? 'Uploading...' : 'Click or drag to upload'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max file size: 10MB
                </p>
              </div>
              {uploading && (
                <Progress value={progress} className="mt-4" />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Documents list */}
      {documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-gray-50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-gray-100 rounded">
                  <File className="h-4 w-4 text-gray-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)} · {format(new Date(doc.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(doc)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(doc)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No documents uploaded
        </p>
      )}
    </div>
  )
}

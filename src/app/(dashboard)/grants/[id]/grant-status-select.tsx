'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { GrantStatus } from '@/types/database'

interface GrantStatusSelectProps {
  grantId: string
  currentStatus: GrantStatus
  userId: string
  hasScheduledPayments?: boolean
}

const statusOptions: { value: GrantStatus; label: string }[] = [
  { value: 'review', label: 'Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'declined', label: 'Declined' },
  { value: 'closed', label: 'Closed' },
]

export function GrantStatusSelect({
  grantId,
  currentStatus,
  userId,
  hasScheduledPayments,
}: GrantStatusSelectProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleStatusChange = async (newStatus: GrantStatus) => {
    if (newStatus === currentStatus) return

    setLoading(true)
    const supabase = createClient()

    const updateData: Record<string, unknown> = { status: newStatus }

    // If approving, set approved_by
    if (newStatus === 'approved' && currentStatus !== 'approved') {
      updateData.approved_by = userId
    }

    const { error } = await supabase
      .from('grants')
      .update(updateData)
      .eq('id', grantId)

    if (error) {
      toast.error('Failed to update status')
      setLoading(false)
      return
    }

    // Log activity
    const { data: grant } = await supabase
      .from('grants')
      .select('foundation_id')
      .eq('id', grantId)
      .single()

    if (grant) {
      await supabase.from('activity_log').insert({
        foundation_id: grant.foundation_id,
        user_id: userId,
        action: 'grant_status_changed',
        entity_type: 'grant',
        entity_id: grantId,
        details: { from: currentStatus, to: newStatus },
      })
    }

    toast.success(`Status updated to ${newStatus.replace('_', ' ')}`)
    setLoading(false)
    router.refresh()
  }

  return (
    <Select
      value={currentStatus}
      onValueChange={(v) => handleStatusChange(v as GrantStatus)}
      disabled={loading}
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statusOptions
          .filter((option) => !(option.value === 'paid' && hasScheduledPayments))
          .map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  )
}

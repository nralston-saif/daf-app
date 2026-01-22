'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Grant, GrantStatus, GrantRecurrence } from '@/types/database'

type SimpleOrganization = { id: string; name: string }

const recurrenceOptions: { value: GrantRecurrence; label: string }[] = [
  { value: 'one_time', label: 'One-time' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
]

interface GrantFormProps {
  grant?: Grant
  organizations: SimpleOrganization[]
  userId: string
  foundationId: string
  defaultOrganizationId?: string
}

const statusOptions: { value: GrantStatus; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'research', label: 'Research' },
  { value: 'review', label: 'Review' },
  { value: 'pending_vote', label: 'Pending Vote' },
  { value: 'approved', label: 'Approved' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'paid', label: 'Paid' },
  { value: 'declined', label: 'Declined' },
  { value: 'closed', label: 'Closed' },
]

export function GrantForm({
  grant,
  organizations,
  userId,
  foundationId,
  defaultOrganizationId,
}: GrantFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [organizationId, setOrganizationId] = useState(
    grant?.organization_id || defaultOrganizationId || ''
  )
  const [amount, setAmount] = useState(grant?.amount?.toString() || '')
  const [purpose, setPurpose] = useState(grant?.purpose || '')
  const [status, setStatus] = useState<GrantStatus>(grant?.status || 'idea')
  const [recurrenceType, setRecurrenceType] = useState<GrantRecurrence>(grant?.recurrence_type || 'one_time')
  const [nextPaymentDate, setNextPaymentDate] = useState<Date | undefined>(
    grant?.next_payment_date ? new Date(grant.next_payment_date) : undefined
  )
  const [startDate, setStartDate] = useState<Date | undefined>(
    grant?.start_date ? new Date(grant.start_date) : undefined
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    grant?.end_date ? new Date(grant.end_date) : undefined
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!organizationId) {
      setError('Please select an organization')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setLoading(true)

    const supabase = createClient()

    const grantData = {
      organization_id: organizationId,
      foundation_id: foundationId,
      amount: parseFloat(amount),
      purpose: purpose || null,
      status,
      recurrence_type: recurrenceType,
      next_payment_date: recurrenceType !== 'one_time' && nextPaymentDate
        ? format(nextPaymentDate, 'yyyy-MM-dd')
        : null,
      start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
      end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
      proposed_by: userId,
    }

    if (grant) {
      // Update
      const { error } = await supabase
        .from('grants')
        .update(grantData)
        .eq('id', grant.id)

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      toast.success('Grant updated')
    } else {
      // Create
      const { data, error } = await supabase
        .from('grants')
        .insert(grantData)
        .select()
        .single()

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Log activity
      const org = organizations.find(o => o.id === organizationId)
      await supabase.from('activity_log').insert({
        foundation_id: foundationId,
        user_id: userId,
        action: 'grant_created',
        entity_type: 'grant',
        entity_id: data.id,
        details: { organization: org?.name, amount: parseFloat(amount) },
      })

      toast.success('Grant created')
      router.push(`/grants/${data.id}`)
      return
    }

    setLoading(false)
    router.push(`/grants/${grant?.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Grant Details</CardTitle>
          <CardDescription>Basic information about this grant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organization">Organization *</Label>
            <Select value={organizationId} onValueChange={setOrganizationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {organizations.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No organizations yet.{' '}
                <a href="/organizations/new" className="text-blue-600 hover:underline">
                  Add one first
                </a>
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="pl-7"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as GrantStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose / Description</Label>
            <Textarea
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Describe the purpose of this grant..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recurrence">Recurrence</Label>
              <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as GrantRecurrence)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recurrenceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {recurrenceType !== 'one_time' && (
              <div className="space-y-2">
                <Label>Next Payment Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !nextPaymentDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {nextPaymentDate ? format(nextPaymentDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={nextPaymentDate}
                      onSelect={setNextPaymentDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Grant period dates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : grant ? 'Update Grant' : 'Create Grant'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

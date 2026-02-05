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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MultiSelect } from '@/components/ui/multi-select'
import { CalendarIcon, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Grant, GrantStatus, GrantRecurrence } from '@/types/database'

const FOCUS_AREA_OPTIONS = [
  'Education',
  'Healthcare',
  'Environment',
  'Poverty Alleviation',
  'Arts & Culture',
  'Human Rights',
  'Animal Welfare',
  'Community Development',
  'Disaster Relief',
  'Scientific Research',
  'Youth Development',
  'Senior Services',
  'Mental Health',
  'Housing',
  'Food Security',
]

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
  organizations: initialOrganizations,
  userId,
  foundationId,
  defaultOrganizationId,
}: GrantFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Local organizations list that can be updated when new orgs are created
  const [organizations, setOrganizations] = useState<SimpleOrganization[]>(initialOrganizations)

  const [organizationId, setOrganizationId] = useState(
    grant?.organization_id || defaultOrganizationId || ''
  )

  // New organization dialog state
  const [newOrgDialogOpen, setNewOrgDialogOpen] = useState(false)
  const [newOrgLoading, setNewOrgLoading] = useState(false)
  const [newOrgError, setNewOrgError] = useState<string | null>(null)
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgEin, setNewOrgEin] = useState('')
  const [newOrgWebsite, setNewOrgWebsite] = useState('')
  const [newOrgMission, setNewOrgMission] = useState('')
  const [newOrgTaxStatus, setNewOrgTaxStatus] = useState('')
  const [newOrgTags, setNewOrgTags] = useState<string[]>([])

  const resetNewOrgForm = () => {
    setNewOrgName('')
    setNewOrgEin('')
    setNewOrgWebsite('')
    setNewOrgMission('')
    setNewOrgTaxStatus('')
    setNewOrgTags([])
    setNewOrgError(null)
  }

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) {
      setNewOrgError('Organization name is required')
      return
    }

    setNewOrgLoading(true)
    setNewOrgError(null)

    const supabase = createClient()

    const { data, error } = await supabase
      .from('organizations')
      .insert({
        name: newOrgName,
        ein: newOrgEin || null,
        website: newOrgWebsite || null,
        mission: newOrgMission || null,
        tax_status: newOrgTaxStatus || null,
        tags: newOrgTags,
        foundation_id: foundationId,
        created_by: userId,
      })
      .select('id, name')
      .single()

    if (error) {
      setNewOrgError(error.message)
      setNewOrgLoading(false)
      return
    }

    // Log activity
    await supabase.from('activity_log').insert({
      foundation_id: foundationId,
      user_id: userId,
      action: 'organization_created',
      entity_type: 'organization',
      entity_id: data.id,
      details: { name: newOrgName },
    })

    // Add to local list and select it
    setOrganizations(prev => [...prev, { id: data.id, name: data.name }].sort((a, b) => a.name.localeCompare(b.name)))
    setOrganizationId(data.id)

    toast.success('Organization created')
    setNewOrgLoading(false)
    setNewOrgDialogOpen(false)
    resetNewOrgForm()
  }
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
            <div className="flex gap-2">
              <Select value={organizationId} onValueChange={setOrganizationId}>
                <SelectTrigger className="flex-1">
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
              <Dialog open={newOrgDialogOpen} onOpenChange={(open) => {
                setNewOrgDialogOpen(open)
                if (!open) resetNewOrgForm()
              }}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>New Organization</DialogTitle>
                    <DialogDescription>
                      Add a new organization to your portfolio
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {newOrgError && (
                      <Alert variant="destructive">
                        <AlertDescription>{newOrgError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="newOrgName">Organization Name *</Label>
                      <Input
                        id="newOrgName"
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        placeholder="Organization name"
                      />
                    </div>
                    <div className="grid gap-4 grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="newOrgEin">EIN (Tax ID)</Label>
                        <Input
                          id="newOrgEin"
                          value={newOrgEin}
                          onChange={(e) => setNewOrgEin(e.target.value)}
                          placeholder="XX-XXXXXXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newOrgTaxStatus">Tax Status</Label>
                        <Select value={newOrgTaxStatus} onValueChange={setNewOrgTaxStatus}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="501c3">501(c)(3)</SelectItem>
                            <SelectItem value="501c4">501(c)(4)</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newOrgWebsite">Website</Label>
                      <Input
                        id="newOrgWebsite"
                        type="url"
                        value={newOrgWebsite}
                        onChange={(e) => setNewOrgWebsite(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newOrgMission">Mission Statement</Label>
                      <Textarea
                        id="newOrgMission"
                        value={newOrgMission}
                        onChange={(e) => setNewOrgMission(e.target.value)}
                        placeholder="Describe the organization's mission..."
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tags / Focus Areas</Label>
                      <MultiSelect
                        options={FOCUS_AREA_OPTIONS}
                        selected={newOrgTags}
                        onChange={setNewOrgTags}
                        placeholder="Select focus areas..."
                        allowCustom
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNewOrgDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCreateOrganization}
                      disabled={newOrgLoading}
                    >
                      {newOrgLoading ? 'Creating...' : 'Create Organization'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {organizations.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No organizations yet. Click the + button to add one.
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

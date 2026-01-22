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
import { CalendarIcon, Plus, X } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Meeting, MeetingType, MeetingFormat, User } from '@/types/database'

const formatOptions: { value: MeetingFormat; label: string }[] = [
  { value: 'zoom', label: 'Zoom' },
  { value: 'call', label: 'Phone Call' },
  { value: 'in_person', label: 'In Person' },
]

const timezoneOptions = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'UTC', label: 'UTC' },
]

interface MeetingFormProps {
  meeting?: Meeting
  users: Pick<User, 'id' | 'name' | 'email'>[]
  userId: string
  foundationId: string
}

export function MeetingForm({ meeting, users, userId, foundationId }: MeetingFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(meeting?.title || '')
  const [type, setType] = useState<MeetingType>(meeting?.type || 'adhoc')
  const [meetingFormat, setMeetingFormat] = useState<MeetingFormat>(meeting?.format || 'zoom')
  const [meetingLink, setMeetingLink] = useState(meeting?.meeting_link || '')
  const [timezone, setTimezone] = useState(meeting?.timezone || 'America/New_York')
  const [date, setDate] = useState<Date | undefined>(
    meeting?.date_time ? new Date(meeting.date_time) : undefined
  )
  const [time, setTime] = useState(
    meeting?.date_time
      ? format(new Date(meeting.date_time), 'HH:mm')
      : '10:00'
  )
  const [agendaItems, setAgendaItems] = useState<string[]>(meeting?.agenda_items || [''])
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>(meeting?.attendees || [])
  const [minutes, setMinutes] = useState(meeting?.minutes || '')

  const addAgendaItem = () => {
    setAgendaItems([...agendaItems, ''])
  }

  const removeAgendaItem = (index: number) => {
    setAgendaItems(agendaItems.filter((_, i) => i !== index))
  }

  const updateAgendaItem = (index: number, value: string) => {
    const updated = [...agendaItems]
    updated[index] = value
    setAgendaItems(updated)
  }

  const toggleAttendee = (userId: string) => {
    if (selectedAttendees.includes(userId)) {
      setSelectedAttendees(selectedAttendees.filter(id => id !== userId))
    } else {
      setSelectedAttendees([...selectedAttendees, userId])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Please enter a meeting title')
      return
    }

    if (!date) {
      setError('Please select a date')
      return
    }

    setLoading(true)

    // Combine date and time
    const [hours, mins] = time.split(':').map(Number)
    const dateTime = new Date(date)
    dateTime.setHours(hours, mins, 0, 0)

    const supabase = createClient()

    const meetingData = {
      foundation_id: foundationId,
      title: title.trim(),
      type,
      format: meetingFormat,
      meeting_link: meetingFormat !== 'in_person' ? meetingLink || null : null,
      timezone,
      date_time: dateTime.toISOString(),
      agenda_items: agendaItems.filter(item => item.trim()),
      attendees: selectedAttendees,
      minutes: minutes || null,
    }

    if (meeting) {
      // Update
      const { error } = await supabase
        .from('meetings')
        .update(meetingData)
        .eq('id', meeting.id)

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      toast.success('Meeting updated')
    } else {
      // Create
      const { data, error } = await supabase
        .from('meetings')
        .insert(meetingData)
        .select()
        .single()

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Log activity
      await supabase.from('activity_log').insert({
        foundation_id: foundationId,
        user_id: userId,
        action: 'meeting_scheduled',
        entity_type: 'meeting',
        entity_id: data.id,
        details: { title, type, date: dateTime.toISOString() },
      })

      toast.success('Meeting scheduled')
      router.push(`/meetings/${data.id}`)
      return
    }

    setLoading(false)
    router.push(`/meetings/${meeting?.id}`)
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
          <CardTitle>Meeting Details</CardTitle>
          <CardDescription>Basic information about the meeting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Q4 Grant Review Meeting"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as MeetingType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarterly">Quarterly Review</SelectItem>
                  <SelectItem value="annual">Annual Meeting</SelectItem>
                  <SelectItem value="adhoc">Ad-hoc</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Select value={meetingFormat} onValueChange={(v) => setMeetingFormat(v as MeetingFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formatOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {meetingFormat !== 'in_person' && (
            <div className="space-y-2">
              <Label htmlFor="meetingLink">Meeting Link</Label>
              <Input
                id="meetingLink"
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder={meetingFormat === 'zoom' ? 'https://zoom.us/j/...' : 'Phone number or link'}
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezoneOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agenda</CardTitle>
          <CardDescription>What will be discussed at this meeting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {agendaItems.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={item}
                onChange={(e) => updateAgendaItem(index, e.target.value)}
                placeholder={`Agenda item ${index + 1}`}
              />
              {agendaItems.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAgendaItem(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addAgendaItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Agenda Item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendees</CardTitle>
          <CardDescription>Who will attend this meeting</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => toggleAttendee(user.id)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                  selectedAttendees.includes(user.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                )}
              >
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium',
                  selectedAttendees.includes(user.id)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                )}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {meeting && (
        <Card>
          <CardHeader>
            <CardTitle>Minutes</CardTitle>
            <CardDescription>Record notes from the meeting</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="Meeting notes and decisions..."
              rows={6}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : meeting ? 'Update Meeting' : 'Schedule Meeting'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

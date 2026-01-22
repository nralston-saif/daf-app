import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { ArrowLeft, Edit, Calendar, Clock, Users, FileText, CheckCircle } from 'lucide-react'
import { format, isPast } from 'date-fns'

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, foundation_id, role')
    .eq('auth_id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Get meeting
  const { data: meeting, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', id)
    .eq('foundation_id', profile.foundation_id)
    .single()

  if (error || !meeting) {
    notFound()
  }

  // Get attendee details
  const { data: attendeeUsers } = meeting.attendees && meeting.attendees.length > 0
    ? await supabase
        .from('users')
        .select('id, name, email')
        .in('id', meeting.attendees)
    : { data: [] }

  const canEdit = ['primary_advisor', 'advisor'].includes(profile.role)
  const meetingDate = new Date(meeting.date_time)
  const isCompleted = isPast(meetingDate)

  const meetingTypeLabels: Record<string, string> = {
    quarterly: 'Quarterly Review',
    annual: 'Annual Meeting',
    adhoc: 'Ad-hoc Meeting',
  }

  const meetingTypeColors: Record<string, string> = {
    quarterly: 'bg-blue-100 text-blue-800',
    annual: 'bg-purple-100 text-purple-800',
    adhoc: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/meetings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
              <Badge className={meetingTypeColors[meeting.type] || 'bg-gray-100'}>
                {meetingTypeLabels[meeting.type] || meeting.type}
              </Badge>
              {isCompleted && (
                <Badge variant="secondary">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(meetingDate, 'EEEE, MMMM d, yyyy')}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {format(meetingDate, 'h:mm a')}
              </div>
            </div>
          </div>
        </div>
        {canEdit && (
          <Link href={`/meetings/${id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agenda */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Agenda
              </CardTitle>
            </CardHeader>
            <CardContent>
              {meeting.agenda_items && meeting.agenda_items.length > 0 ? (
                <ol className="space-y-3">
                  {meeting.agenda_items.map((item: string, index: number) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                        {index + 1}
                      </span>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No agenda items</p>
              )}
            </CardContent>
          </Card>

          {/* Minutes */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting Minutes</CardTitle>
              <CardDescription>
                {isCompleted ? 'Notes and decisions from this meeting' : 'Notes will be added after the meeting'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {meeting.minutes ? (
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{meeting.minutes}</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isCompleted
                      ? 'No minutes recorded'
                      : 'Minutes will be added after the meeting'}
                  </p>
                  {canEdit && isCompleted && (
                    <Link href={`/meetings/${id}/edit`}>
                      <Button variant="outline" size="sm" className="mt-4">
                        Add Minutes
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Attendees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Attendees
              </CardTitle>
              <CardDescription>
                {attendeeUsers?.length || 0} people invited
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendeeUsers && attendeeUsers.length > 0 ? (
                <div className="space-y-3">
                  {attendeeUsers.map((attendee: any) => (
                    <div key={attendee.id} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                        {attendee.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{attendee.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{attendee.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No attendees selected
                </p>
              )}
            </CardContent>
          </Card>

          {/* Meeting info */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium">{meetingTypeLabels[meeting.type] || meeting.type}</p>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">Date & Time</p>
                <p className="font-medium">
                  {format(meetingDate, 'MMMM d, yyyy')}
                  <br />
                  {format(meetingDate, 'h:mm a')}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">
                  {isCompleted ? 'Completed' : 'Upcoming'}
                </p>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">
                Created {format(new Date(meeting.created_at), 'MMM d, yyyy h:mm a')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Plus, Calendar, Clock, Users } from 'lucide-react'
import { format, isPast, isFuture, isToday } from 'date-fns'
import type { Meeting } from '@/types/database'

export default async function MeetingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, foundation_id, role')
    .eq('auth_id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Get all meetings
  const { data: meetings } = await supabase
    .from('meetings')
    .select('*')
    .eq('foundation_id', profile.foundation_id)
    .order('date_time', { ascending: true })

  const now = new Date()
  const upcomingMeetings = meetings?.filter(m => isFuture(new Date(m.date_time)) || isToday(new Date(m.date_time))) || []
  const pastMeetings = meetings?.filter(m => isPast(new Date(m.date_time)) && !isToday(new Date(m.date_time))) || []

  const canCreate = ['primary_advisor', 'advisor'].includes(profile.role)

  const meetingTypeColors: Record<string, string> = {
    quarterly: 'bg-blue-100 text-blue-800',
    annual: 'bg-purple-100 text-purple-800',
    adhoc: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-500 mt-1">
            {upcomingMeetings.length} upcoming · {pastMeetings.length} past
          </p>
        </div>
        {canCreate && (
          <Link href="/meetings/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          </Link>
        )}
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcomingMeetings.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastMeetings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {upcomingMeetings.length > 0 ? (
            <div className="space-y-4">
              {upcomingMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  typeColors={meetingTypeColors}
                />
              ))}
            </div>
          ) : (
            <EmptyState canCreate={canCreate} type="upcoming" />
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {pastMeetings.length > 0 ? (
            <div className="space-y-4">
              {pastMeetings.reverse().map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  typeColors={meetingTypeColors}
                  isPast
                />
              ))}
            </div>
          ) : (
            <EmptyState canCreate={canCreate} type="past" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MeetingCard({
  meeting,
  typeColors,
  isPast = false,
}: {
  meeting: Meeting
  typeColors: Record<string, string>
  isPast?: boolean
}) {
  const meetingDate = new Date(meeting.date_time)
  const isUpcomingToday = isToday(meetingDate)

  return (
    <Link href={`/meetings/${meeting.id}`}>
      <Card className={`hover:shadow-md transition-shadow ${isPast ? 'opacity-75' : ''}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${isUpcomingToday ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Calendar className={`h-6 w-6 ${isUpcomingToday ? 'text-green-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{meeting.title}</h3>
                  <Badge className={typeColors[meeting.type] || 'bg-gray-100'}>
                    {meeting.type}
                  </Badge>
                  {isUpcomingToday && (
                    <Badge className="bg-green-100 text-green-800">Today</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(meetingDate, 'EEEE, MMMM d, yyyy')}
                    <span className="mx-1">at</span>
                    {format(meetingDate, 'h:mm a')}
                  </div>
                  {meeting.attendees && meeting.attendees.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                {meeting.agenda_items && meeting.agenda_items.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {meeting.agenda_items.length} agenda item{meeting.agenda_items.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm">
              View
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function EmptyState({ canCreate, type }: { canCreate: boolean; type: 'upcoming' | 'past' }) {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {type === 'upcoming' ? 'No upcoming meetings' : 'No past meetings'}
          </h3>
          <p className="text-gray-500 mb-4">
            {type === 'upcoming'
              ? 'Schedule a meeting to discuss grants and foundation business.'
              : 'Past meetings will appear here.'}
          </p>
          {canCreate && type === 'upcoming' && (
            <Link href="/meetings/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { MeetingForm } from '../../meeting-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditMeetingPage({
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

  // Check permissions
  if (!['primary_advisor', 'advisor'].includes(profile.role)) {
    redirect(`/meetings/${id}`)
  }

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

  // Get foundation users
  const { data: users } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('foundation_id', profile.foundation_id)
    .order('name', { ascending: true })

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/meetings/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Meeting</h1>
          <p className="text-gray-500 mt-1">{meeting.title}</p>
        </div>
      </div>

      <MeetingForm
        meeting={meeting}
        users={users || []}
        userId={profile.id}
        foundationId={profile.foundation_id}
      />
    </div>
  )
}

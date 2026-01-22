import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MeetingForm } from '../meeting-form'

export default async function NewMeetingPage() {
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
    redirect('/meetings')
  }

  // Get foundation users for attendee selection
  const { data: users } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('foundation_id', profile.foundation_id)
    .order('name', { ascending: true })

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Schedule Meeting</h1>
        <p className="text-gray-500 mt-1">Create a new foundation meeting</p>
      </div>

      <MeetingForm
        users={users || []}
        userId={profile.id}
        foundationId={profile.foundation_id}
      />
    </div>
  )
}

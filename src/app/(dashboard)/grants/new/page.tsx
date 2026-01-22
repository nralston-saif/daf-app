import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GrantForm } from '../grant-form'

export default async function NewGrantPage({
  searchParams,
}: {
  searchParams: Promise<{ organization?: string }>
}) {
  const params = await searchParams
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
    redirect('/grants')
  }

  // Get organizations for the dropdown
  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('foundation_id', profile.foundation_id)
    .order('name', { ascending: true })

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Grant</h1>
        <p className="text-gray-500 mt-1">Create a new grant proposal</p>
      </div>

      <GrantForm
        organizations={organizations || []}
        userId={profile.id}
        foundationId={profile.foundation_id}
        defaultOrganizationId={params.organization}
      />
    </div>
  )
}
